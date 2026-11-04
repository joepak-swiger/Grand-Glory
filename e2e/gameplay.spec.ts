import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const evidence = 'artifacts/evidence';
test('real browser vertical slice and gameplay evidence', async ({ page }) => {
  mkdirSync(evidence, { recursive: true });
  const errors: string[] = [];
  const failedAssets: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('requestfailed', request => { if (request.url().includes('/assets/')) failedAssets.push(request.url()); });
  await page.setViewportSize({ width: 1365, height: 900 });
  await page.goto('/?test=1');
  await expect(page.getByRole('heading', { name: 'GRAND GLORY' })).toBeVisible();
  const portrait = page.locator('.hero-portrait');
  await expect(portrait).toBeVisible();
  await expect.poll(() => portrait.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth === 1254)).toBe(true);
  await page.screenshot({ path: `${evidence}/01-title.png` });

  await page.getByRole('button', { name: 'Start Game' }).click();
  await expect(page.getByText('BLUE PINWHEEL')).toBeVisible();
  await page.evaluate(() => { const state = window.__GG_TEST__?.getState(); if (state) window.__GG_TEST__?.spawn('fastThug', state.player.x + 36, state.player.y); });
  await expect.poll(() => page.evaluate(() => window.__GG_TEST__?.getRendererState().playerTextureLoaded ?? false)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.__GG_TEST__?.getRendererState().enemySprites ?? 0)).toBeGreaterThan(0);
  await page.screenshot({ path: `${evidence}/blue-pinwheel-standing.png` });
  const startX = await page.evaluate(() => window.__GG_TEST__?.getState()?.player.x);
  await page.keyboard.down('d');
  await expect.poll(() => page.evaluate(() => window.__GG_TEST__?.getRendererState().moving)).toBe(true);
  const firstMovingFrame = await page.evaluate(() => window.__GG_TEST__?.getRendererState().playerFrame ?? -1);
  await expect.poll(() => page.evaluate(() => window.__GG_TEST__?.getRendererState().playerFrame ?? -1), { timeout: 2000 }).not.toBe(firstMovingFrame);
  expect(await page.evaluate(() => window.__GG_TEST__?.getRendererState().playerFacing)).toBe('right');
  await page.screenshot({ path: `${evidence}/blue-pinwheel-moving.png` });
  await page.waitForTimeout(160); await page.keyboard.up('d');
  await page.keyboard.down('a'); await expect.poll(() => page.evaluate(() => window.__GG_TEST__?.getRendererState().playerFacing)).toBe('left');
  await page.screenshot({ path: `${evidence}/blue-pinwheel-facing-left.png` }); await page.keyboard.up('a');
  const movedX = await page.evaluate(() => window.__GG_TEST__?.getState()?.player.x);
  expect(movedX).toBeGreaterThan(startX ?? 0);
  const facing = await page.evaluate(() => {
    const state = window.__GG_TEST__?.getState();
    if (!state) return null;
    const left = state.player.x - 170; const right = state.player.x + 170; const y = state.player.y + 150;
    window.__GG_TEST__?.spawn('thug', left, y); window.__GG_TEST__?.spawn('fastThug', right, y);
    return { left, right, y };
  });
  expect(facing).not.toBeNull();
  await expect.poll(() => page.evaluate(() => window.__GG_TEST__?.getRendererState().enemies.filter(enemy => enemy.scaleX !== 0).length ?? 0)).toBeGreaterThanOrEqual(2);
  await expect.poll(() => page.evaluate(() => {
    const items = window.__GG_TEST__?.getRendererState().enemies ?? [];
    return items.some(enemy => enemy.facing === 'left' && enemy.scaleX < 0) && items.some(enemy => enemy.facing === 'right' && enemy.scaleX > 0);
  })).toBe(true);
  await page.screenshot({ path: `${evidence}/blue-pinwheel-and-enemies-facing.png` });
  await expect.poll(() => page.evaluate(() => window.__GG_TEST__?.getState()?.player.damageDealt ?? 0)).toBeGreaterThan(0);
  const maximumHealth = await page.evaluate(() => window.__GG_TEST__?.getState()?.player.maxHealth ?? 140);
  await expect.poll(() => page.evaluate(() => window.__GG_TEST__?.getState()?.player.health ?? 140)).toBeLessThan(maximumHealth);
  await page.screenshot({ path: `${evidence}/02-active-combat.png` });

  await page.evaluate(() => window.__GG_TEST__?.injectPickup(30));
  await expect(page.getByRole('heading', { name: 'Choose an upgrade' })).toBeVisible();
  await page.screenshot({ path: `${evidence}/03-level-up-choices.png` });
  const chosenId = await page.evaluate(() => window.__GG_TEST__?.getState()?.options[0]);
  const beforeUpgrade = await page.evaluate(() => { const state = window.__GG_TEST__?.getState(); return state ? { speed: state.player.speed, damage: state.player.damageBonus, shots: state.player.extraShots, health: state.player.maxHealth, pickup: state.player.pickupRadius, orbit: state.player.orbit, weaponRanks: state.player.weaponRanks, powerRank: state.player.powerRank, evolved: state.player.evolvedPinwheel } : null; });
  if (!chosenId) throw new Error('No upgrade was offered');
  await page.locator(`[data-upgrade="${chosenId}"]`).click();
  await expect.poll(() => page.evaluate(() => window.__GG_TEST__?.getState()?.chosen.length ?? 0)).toBeGreaterThan(0);
  const afterUpgrade = await page.evaluate(() => { const state = window.__GG_TEST__?.getState(); return state ? { speed: state.player.speed, damage: state.player.damageBonus, shots: state.player.extraShots, health: state.player.maxHealth, pickup: state.player.pickupRadius, orbit: state.player.orbit, weaponRanks: state.player.weaponRanks, powerRank: state.player.powerRank, evolved: state.player.evolvedPinwheel } : null; });
  expect(afterUpgrade).not.toEqual(beforeUpgrade);
  await page.evaluate(() => window.__GG_TEST__?.spawn('fastThug'));
  await page.screenshot({ path: `${evidence}/04-upgrade-and-combat.png` });

  await page.keyboard.press('Escape'); await expect(page.getByRole('heading', { name: 'PAUSED' })).toBeVisible();
  const frozen = await page.evaluate(() => window.__GG_TEST__?.getState()?.elapsed);
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => window.__GG_TEST__?.getState()?.elapsed)).toBe(frozen);
  await page.screenshot({ path: `${evidence}/05-paused.png` });
  await page.getByRole('button', { name: 'Resume' }).click();
  await page.evaluate(() => window.__GG_TEST__?.startBoss());
  await expect(page.getByText('GANG LEADER · PROTOTYPE')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__GG_TEST__?.getRendererState().enemies.some(enemy => !enemy.hasSprite) ?? false)).toBe(true);
  const bossFacing = await page.evaluate(() => window.__GG_TEST__?.getRendererState().enemies.find(enemy => !enemy.hasSprite)?.facing);
  expect(['left', 'right']).toContain(bossFacing);
  await page.screenshot({ path: `${evidence}/06-boss-encounter.png` });
  await page.evaluate(() => window.__GG_TEST__?.prepareBossForAttack());
  await page.evaluate(() => window.__GG_TEST__?.advance(0.5));
  await expect.poll(() => page.evaluate(() => window.__GG_TEST__?.getState()?.bossDefeated ?? false), { timeout: 6000 }).toBe(true);
  await expect(page.getByRole('heading', { name: 'VICTORY' })).toBeVisible();
  await page.screenshot({ path: `${evidence}/07-victory.png` });

  await page.getByRole('button', { name: 'Play Again' }).click();
  await expect(page.getByText('BLUE PINWHEEL')).toBeVisible();
  await page.evaluate(() => window.__GG_TEST__?.damagePlayer(200));
  await expect(page.getByRole('heading', { name: 'DEFEAT' })).toBeVisible();
  await page.screenshot({ path: `${evidence}/08-defeat.png` });
  await page.getByRole('button', { name: 'Play Again' }).click();
  await expect(page.getByText('BLUE PINWHEEL')).toBeVisible();
  await page.keyboard.press('F3');
  await expect(page.locator('.debug-panel')).toContainText('frame');
  await expect(page.locator('.debug-panel')).toContainText('enemies');
  expect(errors).toEqual([]);
  expect(failedAssets).toEqual([]);
});

test('standard configuration naturally builds an early horde in the browser', async ({ page }) => {
  test.setTimeout(240_000);
  mkdirSync(evidence, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1365, height: 900 });
  await page.goto('/?test=normal');
  await page.getByRole('button', { name: 'Start Game' }).click();
  let sawUpgrade = false;
  let capturedHorde = false;
  let liveRenderMetrics: { enemies: number; fps: number; frameMs: number } | null = null;
  let lateHordeMetrics: { enemies: number; kinds: string[]; fps: number; frameMs: number } | null = null;
  let naturalBossMetrics: { elapsed: number; health: number; bossHealth: number; enemies: number } | null = null;
  for (let segment = 0; segment < 70; segment++) {
    await page.evaluate(() => window.__GG_TEST__?.advance(4, 0, 0, true, true, true));
    const status = await page.evaluate(() => window.__GG_TEST__?.getState()?.status);
    if (status === 'upgrade') {
      if (!sawUpgrade) { await page.screenshot({ path: `${evidence}/10-standard-level-up.png` }); sawUpgrade = true; }
      const option = await page.evaluate(() => {
        const choices = window.__GG_TEST__?.getState()?.options ?? [];
        const priority = ['vitality', 'recovery', 'pinwheel', 'power', 'piercingThrow', 'orbit', 'speed', 'damage', 'tempo', 'extra', 'magnet'];
        return [...choices].sort((a, b) => priority.indexOf(a) - priority.indexOf(b))[0];
      });
      if (option) await page.locator(`[data-upgrade="${option}"]`).click();
    }
    const moment = await page.evaluate(() => { const state = window.__GG_TEST__?.getState(); return state ? { elapsed: state.elapsed, status: state.status } : null; });
    if (!capturedHorde && moment && moment.elapsed >= 15 && moment.status === 'playing') {
      await page.screenshot({ path: `${evidence}/09-standard-natural-horde.png` });
      liveRenderMetrics = await page.evaluate(() => {
        const state = window.__GG_TEST__?.getState(); const render = window.__GG_TEST__?.getRendererState();
        return state && render ? { enemies: state.enemies.length, fps: render.renderFps, frameMs: render.renderFrameMs } : null;
      });
      capturedHorde = true;
    }
    if (lateHordeMetrics === null && moment && moment.elapsed >= 75 && moment.status === 'playing') {
      await page.screenshot({ path: `${evidence}/11-late-natural-horde.png` });
      lateHordeMetrics = await page.evaluate(() => {
        const state = window.__GG_TEST__?.getState(); const render = window.__GG_TEST__?.getRendererState();
        return state && render ? { enemies: state.enemies.length, kinds: [...new Set(state.enemies.map(enemy => enemy.kind))], fps: render.renderFps, frameMs: render.renderFrameMs } : null;
      });
    }
    if (naturalBossMetrics === null) {
      const encounter = await page.evaluate(() => {
        const state = window.__GG_TEST__?.getState(); const boss = state?.enemies.find(enemy => enemy.kind === 'boss' && !enemy.dead);
        return state && boss && state.status === 'playing' ? { elapsed: state.elapsed, health: state.player.health, bossHealth: boss.health, enemies: state.enemies.length } : null;
      });
      if (encounter) { await page.screenshot({ path: `${evidence}/12-standard-boss-arrival.png` }); naturalBossMetrics = encounter; }
    }
    if (status === 'defeat' || status === 'victory') break;
  }
  const result = await page.evaluate(() => {
    const state = window.__GG_TEST__?.getState();
    const boss = state?.enemies.find(enemy => enemy.kind === 'boss' && !enemy.dead);
    return state ? { elapsed: state.elapsed, enemies: state.enemies.length, kinds: [...new Set(state.enemies.map(enemy => enemy.kind))], level: state.player.level, health: state.player.health, kills: state.kills, xp: state.player.xp, status: state.status, endReason: state.endReason, bossHealth: boss?.health ?? 0, weapons: state.player.weaponRanks, powerRank: state.player.powerRank } : null;
  });
  console.info(`STANDARD_NATURAL_BROWSER ${JSON.stringify({ ...result, liveRenderMetrics, lateHordeMetrics, naturalBossMetrics })}`);
  expect(result).not.toBeNull();
  expect(result?.elapsed).toBeGreaterThan(12);
  expect(result?.enemies ?? 0).toBeGreaterThan(0);
  expect(naturalBossMetrics).not.toBeNull();
  expect(['victory', 'defeat']).toContain(result?.status);
  expect(result?.elapsed).toBeGreaterThan(180);
  if (result?.status === 'victory') await page.screenshot({ path: `${evidence}/13-standard-victory.png` });
  else await page.screenshot({ path: `${evidence}/13-standard-defeat.png` });
  await expect.poll(() => page.evaluate(() => window.__GG_TEST__?.getRendererState().playerTextureLoaded ?? false)).toBe(true);
  if (!capturedHorde) await page.screenshot({ path: `${evidence}/09-standard-natural-horde.png` });
  expect(errors).toEqual([]);
});
