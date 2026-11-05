import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const root = path.resolve(import.meta.dirname, '..');
const source = path.resolve(process.argv[2] ?? path.join(root, 'artifacts/milestone-010-work/originals'));
const output = path.join(root, 'public/assets/milestone010');
const entries = [
  ['bok-goo', 'Caveman Warrior Boulder Walk Cycle.png', 'Pixel-art Korean Caveman Champion.png', 'sprite-animation(14).gif'],
  ['da-ri', null, 'Pixel-Art Tribal Warrior with Spear.png', 'sprite-animation(15).gif'],
  ['yo-yo-punk', 'Yo-Yo Punk Walking Cycle.png', 'Yo-Yo Punk Street Fighter Sprite.png', 'sprite-animation(9).gif'],
  ['gang-boss', 'Pixel-Art Chain Boss Walking Cycle.png', 'Pixel-Art Gang Boss with Chain Weapon.png', 'sprite-animation(10).gif'],
  ['dr-smile', 'Dr. Smile’s Pixel Lab Walk Cycle.png', 'Pixel-Art Mad Scientist with Tooth Emblem.png', 'sprite-animation(11).gif'],
  ['smiler', 'Smiler Advancing Grab Sprite Sheet.png', null, 'sprite-animation(12).gif'],
  ['molar', 'Molar’s Neon Scuttle Cycle.png', null, 'sprite-animation(13).gif'],
];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setContent('<body><canvas></canvas></body>');
const prepare = async (file, kind, frameWidth) => {
  const bytes = await readFile(file);
  const mime = path.extname(file).toLowerCase() === '.gif' ? 'image/gif' : 'image/png';
  const result = await page.evaluate(async ({ encoded, mimeType, mode, cellWidth }) => {
    const image = new Image(); image.src = `data:${mimeType};base64,${encoded}`;
    await image.decode();
    const frames = [];
    const capture = () => {
      const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true }); ctx.drawImage(image, 0, 0);
      return { width: canvas.width, height: canvas.height, pixels: ctx.getImageData(0, 0, canvas.width, canvas.height) };
    };
    if (mode === 'gif') {
      for (let i = 0; i < 4; i++) { await new Promise(resolve => setTimeout(resolve, 165)); frames.push(capture()); }
    } else frames.push(capture());
    const clean = (frame, cells) => {
      const { width, height, pixels } = frame; const data = pixels.data; const visited = new Uint8Array(width * height); const queue = new Int32Array(width * height);
      for (let cell = 0; cell < cells; cell++) {
        const left = cell * cellWidth; const right = Math.min(width, left + cellWidth); let tail = 0;
        const add = index => { if (visited[index]) return; const i = index * 4; if (data[i] <= 16 && data[i+1] <= 16 && data[i+2] <= 16) { visited[index] = 1; queue[tail++] = index; } };
        for (let x = left; x < right; x++) { add(x); if (height > 1) add((height - 1) * width + x); }
        for (let y = 1; y < height - 1; y++) { add(y * width + left); if (right - 1 !== left) add(y * width + right - 1); }
        while (tail) {
          const index = queue[--tail]; const x = index % width; const y = (index / width) | 0; data[index * 4 + 3] = 0;
          if (x > left) add(index - 1); if (x + 1 < right) add(index + 1); if (y > 0) add(index - width); if (y + 1 < height) add(index + width);
        }
      }
      return pixels;
    };
    if (mode === 'portrait') {
      const pixels = clean(frames[0], 1); const canvas = document.createElement('canvas'); canvas.width = Math.round(frames[0].width / 2); canvas.height = Math.round(frames[0].height / 2);
      const sourceCanvas = document.createElement('canvas'); sourceCanvas.width = frames[0].width; sourceCanvas.height = frames[0].height; sourceCanvas.getContext('2d').putImageData(pixels, 0, 0);
      const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false; ctx.drawImage(sourceCanvas, 0, 0, canvas.width, canvas.height); return { url: canvas.toDataURL('image/png'), width: canvas.width, height: canvas.height };
    }
    if (mode === 'sheet') {
      const src = frames[0]; const count = Math.floor(src.width / cellWidth); const outWidth = Math.floor(cellWidth / 2); const outHeight = Math.floor(src.height / 2);
      const pixels = clean(src, count); const small = new ImageData(count * outWidth, outHeight);
      for (let y = 0; y < outHeight; y++) for (let f = 0; f < count; f++) for (let x = 0; x < outWidth; x++) {
        const si = (y * 2 * src.width + f * cellWidth + x * 2) * 4; const di = (y * small.width + f * outWidth + x) * 4;
        small.data[di]=pixels.data[si]; small.data[di+1]=pixels.data[si+1]; small.data[di+2]=pixels.data[si+2]; small.data[di+3]=pixels.data[si+3];
      }
      const canvas = document.createElement('canvas'); canvas.width = small.width; canvas.height = small.height; canvas.getContext('2d').putImageData(small, 0, 0);
      return { url: canvas.toDataURL('image/png'), width: canvas.width, height: canvas.height };
    }
    const width = frames[0].width; const height = frames[0].height; const out = document.createElement('canvas'); out.width = width * frames.length; out.height = height;
    const ctx = out.getContext('2d', { willReadFrequently: true });
    frames.forEach((frame, index) => { const pixels = clean(frame, 1); const cell = document.createElement('canvas'); cell.width = width; cell.height = height; cell.getContext('2d').putImageData(pixels, 0, 0); ctx.drawImage(cell, index * width, 0); });
    return { url: out.toDataURL('image/png'), width: out.width, height: out.height };
  }, { encoded: bytes.toString('base64'), mimeType: mime, mode: kind, cellWidth: frameWidth });
  return result;
};
const save = async (data, destination) => { await mkdir(path.dirname(destination), { recursive: true }); await writeFile(destination, Buffer.from(data.url.split(',')[1], 'base64')); console.log(`${path.relative(root, destination)} ${data.width}x${data.height}`); };

try {
  for (const [id, sheetName, portraitName, gifName] of entries) {
    const dir = path.join(output, id);
    if (sheetName) await save(await prepare(path.join(source, id, sheetName), 'sheet', 512), path.join(dir, 'walk.png'));
    if (portraitName) await save(await prepare(path.join(source, id, portraitName), 'portrait', 0), path.join(dir, 'portrait.png'));
    if (!sheetName) await save(await prepare(path.join(source, id, gifName), 'gif', 0), path.join(dir, 'walk-gif.png'));
  }
} finally { await browser.close(); }
