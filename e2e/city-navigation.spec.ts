import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const evidence = 'artifacts/evidence/city-reconstruction';

test('shared city geometry supports street travel, wall slides, dashes and enemy routing', async ({ page }) => {
  test.setTimeout(90_000);
  mkdirSync(evidence, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1365, height: 900 });
  await page.goto('/?test=1');
  await page.getByRole('button', { name: /PLAY NOW/i }).click();
  await expect.poll(() => page.evaluate(() => window.__GG_TEST__?.getRendererState().cityMapLoaded)).toBe(true);
  await page.evaluate(() => {
    const state = window.__GG_TEST__?.getState(); if (!state) return;
    state.enemies.length = 0; state.projectiles.length = 0; state.spawnTimer = 100_000;
    state.player.attackTimer = 100_000; state.player.piercingTimer = 100_000; state.player.invulnerable = 100_000;
  });
  await page.evaluate(() => window.__GG_TEST__?.setPlayerPosition(600, 600));
  await page.screenshot({ path: `${evidence}/city-intersection.png` });

  await page.keyboard.press('F4');
  await page.screenshot({ path: `${evidence}/collision-overlay.png` });
  await page.keyboard.press('F4');

  await page.evaluate(() => window.__GG_TEST__?.setPlayerPosition(500, 220));
  await page.keyboard.down('a');
  await expect.poll(() => page.evaluate(() => window.__GG_TEST__?.getState()?.player.x ?? 0)).toBeGreaterThanOrEqual(466);
  await page.waitForTimeout(350);
  await page.keyboard.up('a');
  const wallPosition = await page.evaluate(() => window.__GG_TEST__?.getState()?.player);
  expect(wallPosition?.x).toBeLessThan(480);
  expect(wallPosition?.y).toBeGreaterThanOrEqual(18);
  await page.screenshot({ path: `${evidence}/blue-pinwheel-wall-slide.png` });

  await page.evaluate(() => window.__GG_TEST__?.setPlayerPosition(480, 220));
  await page.keyboard.down('a'); await page.waitForTimeout(80); await page.keyboard.up('a');
  await page.keyboard.down('Shift'); await page.waitForTimeout(250); await page.keyboard.up('Shift');
  const dashPosition = await page.evaluate(() => window.__GG_TEST__?.getState()?.player);
  expect(dashPosition?.x).toBeGreaterThanOrEqual(466);
  expect(dashPosition?.x).toBeLessThan(480);
  await page.screenshot({ path: `${evidence}/blue-pinwheel-dash-wall-stop.png` });

  await page.evaluate(() => window.__GG_TEST__?.setPlayerPosition(600, 600));
  await page.keyboard.down('w');
  await expect.poll(() => page.evaluate(() => window.__GG_TEST__?.getState()?.player.y ?? 1200)).toBeLessThan(288);
  await page.keyboard.up('w');
  const verticalTravel = await page.evaluate(() => window.__GG_TEST__?.getState()?.player.y);
  expect(verticalTravel).toBeLessThan(288);

  const startDistance = await page.evaluate(() => {
    const state = window.__GG_TEST__?.getState(); if (!state) return null;
    window.__GG_TEST__?.setPlayerPosition(300, 500);
    state.player.attackTimer = 100_000; state.player.piercingTimer = 100_000; state.spawnTimer = 100_000;
    window.__GG_TEST__?.spawn('thug', 300, 20);
    const enemy = state.enemies.at(-1)!; enemy.health = enemy.maxHealth = 1_000_000;
    return { x: enemy.x, y: enemy.y, distance: Math.hypot(enemy.x - state.player.x, enemy.y - state.player.y) };
  });
  expect(startDistance).not.toBeNull();
  await page.evaluate(() => window.__GG_TEST__?.advance(12));
  const endRoute = await page.evaluate(() => {
    const state = window.__GG_TEST__?.getState(); const enemy = state?.enemies.at(-1);
    return state && enemy ? { x: enemy.x, y: enemy.y, distance: Math.hypot(enemy.x - state.player.x, enemy.y - state.player.y), terrain: state.stage.terrain[Math.floor(enemy.y / state.stage.cellSize) * state.stage.columns + Math.floor(enemy.x / state.stage.cellSize)] } : null;
  });
  expect(endRoute).not.toBeNull();
  expect(endRoute?.distance).toBeLessThan(startDistance!.distance);
  expect(endRoute?.terrain).not.toBe(3);
  await page.screenshot({ path: `${evidence}/enemy-routed-through-city.png` });
  expect(errors).toEqual([]);
});
