import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { GAME_ASSETS } from '../src/game/assets';
import { HEROES } from '../src/game/definitions';
import viteConfig from '../vite.config';

function assetUrls(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (!value || typeof value !== 'object') return [];
  return Object.values(value).flatMap(assetUrls);
}

describe('runtime asset registry', () => {
  it('resolves every registered asset to its stable game path', () => {
    const urls = assetUrls(GAME_ASSETS);
    expect(urls.length).toBeGreaterThan(10);
    for (const url of urls) {
      expect(url).toMatch(/^\/assets\/game\//);
      expect(existsSync(path.join(process.cwd(), 'public', url.slice(1)))).toBe(true);
    }
  });

  it('keeps hero animation paths within their own registered identity', () => {
    for (const hero of Object.values(HEROES)) {
      expect(hero.animation.idle.asset).toContain(`/heroes/${hero.id}/`);
      expect(hero.animation.move.asset).toContain(`/heroes/${hero.id}/`);
    }
  });

  it('keeps only registered game-ready images in the web-served runtime tree', () => {
    const registered = new Set(assetUrls(GAME_ASSETS).map(url => url.slice('/assets/game/'.length)));
    const root = path.join(process.cwd(), 'public', 'assets');
    const walk = (directory: string): string[] => readdirSync(directory).flatMap(name => {
      const absolute = path.join(directory, name);
      return statSync(absolute).isDirectory() ? walk(absolute) : [path.relative(path.join(root, 'game'), absolute).replaceAll('\\', '/')];
    });
    const gameFiles = walk(path.join(root, 'game')).filter(file => /\.(png|gif|jpe?g|webp|bmp|avif|tiff?)$/i.test(file));
    expect(gameFiles.sort()).toEqual([...registered].sort());
  });

  it('excludes the local source library from watching without enabling global polling', () => {
    const ignored = viteConfig.server?.watch?.ignored;
    expect(ignored).toContain('**/art-library/**');
    expect(viteConfig.server?.watch?.usePolling).toBeUndefined();
  });
});
