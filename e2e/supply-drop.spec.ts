import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const evidence = 'artifacts/evidence/supply-drop';

test('Dr. Smile sprites and supply pickups render and resolve in real gameplay', async ({ page }) => {
  mkdirSync(evidence, { recursive: true });
  const errors: string[] = [];
  const failedAssets: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('requestfailed', request => { if (request.url().includes('/assets/')) failedAssets.push(request.url()); });
  await page.setViewportSize({ width: 1365, height: 900 });
  await page.goto('/?test=1');
  await page.getByRole('button', { name: /PLAY NOW/i }).click();
  await expect.poll(() => page.evaluate(() => window.__GG_TEST__?.getRendererState().cityMapLoaded ?? false)).toBe(true);

  const mixed = await page.evaluate(() => {
    const test = window.__GG_TEST__; const state = test?.getState();
    if (!test || !state) return null;
    state.status = 'playing'; state.enemies.length = 0; state.projectiles.length = 0; state.pickups.length = 0;
    state.spawnTimer = 10_000; state.player.attackTimer = 10_000; state.player.piercingTimer = 10_000;
    const types = ['thug', 'fastThug', 'gangster', 'bruiser', 'smiler', 'molar'] as const;
    types.forEach((kind, index) => {
      test.spawn(kind, state.player.x + (index % 3 - 1) * 130, state.player.y - 110 - Math.floor(index / 3) * 105);
      const enemy = state.enemies.at(-1)!; enemy.speed = 0; enemy.animationTime = index * 0.13;
    });
    test.refresh();
    const rendered = test.getRendererState();
    return { kinds: rendered.enemies.map(enemy => enemy.kind), sprites: rendered.enemySprites, loaded: rendered.enemies.every(enemy => enemy.hasSprite) };
  });
  expect(mixed?.kinds).toContain('smiler');
  expect(mixed?.kinds).toContain('molar');
  expect(mixed?.sprites).toBeGreaterThanOrEqual(6);
  expect(mixed?.loaded).toBe(true);
  await page.screenshot({ path: `${evidence}/smiler-molar-mixed-crowd.png` });

  const pickupResult = await page.evaluate(() => {
    const test = window.__GG_TEST__; const state = test?.getState();
    if (!test || !state) return null;
    state.enemies.length = 0; state.projectiles.length = 0; state.pickups.length = 0;
    state.player.attackTimer = 10_000; state.player.piercingTimer = 10_000; state.player.xp = 0;
    state.spawnTimer = 10_000;
    for (let index = 0; index < 5; index++) {
      test.spawn('thug', state.player.x - 360 + index * 40, state.player.y + 80);
      state.enemies.at(-1)!.speed = 0;
    }
    test.spawn('thug', state.player.x + 110, state.player.y); state.enemies.at(-1)!.speed = 0;
    test.spawn('thug', state.player.x - 110, state.player.y); state.enemies.at(-1)!.speed = 0;
    state.pickups.push(
      { id: state.nextId++, x: state.player.x + 190, y: state.player.y, value: 12, kind: 'xp' },
      { id: state.nextId++, x: state.player.x + 340, y: state.player.y + 70, value: 10, kind: 'xp' },
      { id: state.nextId++, x: state.player.x + 20, y: state.player.y, value: 0, kind: 'xp-recall' },
      { id: state.nextId++, x: state.player.x - 20, y: state.player.y, value: 0, kind: 'recovery-rations' },
      { id: state.nextId++, x: state.player.x + 20, y: state.player.y + 10, value: 0, kind: 'inferno-curry' },
    );
    state.player.health = state.player.maxHealth - 55;
    test.refresh();
    return { hpBefore: state.player.health, forwardHpBefore: state.enemies.find(enemy => enemy.x > state.player.x + 80)?.health ?? 0, backwardHpBefore: state.enemies.find(enemy => enemy.x < state.player.x - 80)?.health ?? 0, pendingXp: state.pickups.filter(pickup => pickup.kind === 'xp').reduce((sum, pile) => sum + pile.value, 0), pickupCount: state.pickups.length };
  });
  expect(pickupResult?.pendingXp).toBe(22);
  await page.screenshot({ path: `${evidence}/recovery-recall-and-curry-drops.png` });
  const collected = await page.evaluate(() => {
    const test = window.__GG_TEST__; const state = test?.getState(); if (!test || !state) return null;
    test.advance(0.65);
    return { hp: state.player.health, maxHp: state.player.maxHealth, xp: state.xpCollected, recallLeft: state.pickups.some(pickup => pickup.kind === 'xp-recall'), rationLeft: state.pickups.some(pickup => pickup.kind === 'recovery-rations'), curryActive: (state.player.infernoCurryTimer ?? 0) > 0, forwardEnemyHp: state.enemies.find(enemy => enemy.x > state.player.x + 80)?.health ?? 0, backwardEnemyHp: state.enemies.find(enemy => enemy.x < state.player.x - 80)?.health ?? 0 };
  });
  expect(collected?.hp).toBeLessThanOrEqual(collected?.maxHp ?? 0);
  expect(collected?.hp).toBeGreaterThan(pickupResult?.hpBefore ?? 0);
  expect(collected?.xp).toBe(22);
  expect(collected?.recallLeft).toBe(false);
  expect(collected?.rationLeft).toBe(false);
  expect(collected?.curryActive).toBe(true);
  expect(collected?.forwardEnemyHp).toBeLessThan(pickupResult?.forwardHpBefore ?? Number.POSITIVE_INFINITY);
  expect(collected?.backwardEnemyHp).toBe(pickupResult?.backwardHpBefore);
  await page.screenshot({ path: `${evidence}/xp-recalled-and-rations-collected.png` });

  const eliteReward = await page.evaluate(() => {
    const test = window.__GG_TEST__; const state = test?.getState(); if (!test || !state) return null;
    state.enemies.length = 0; state.pickups.length = 0;
    test.spawnElite('smiler', state.player.x + 180, state.player.y - 90);
    const elite = state.enemies.at(-1)!;
    test.refresh();
    const visibleElite = test.getRendererState().enemies.some(enemy => enemy.kind === 'smiler' && enemy.hasSprite);
    test.defeatEnemy(elite.id);
    return { visibleElite, eliteDefeated: state.elitesDefeated, caches: state.pickups.filter(pickup => pickup.kind === 'field-cache' || pickup.kind === 'hero-cache').length };
  });
  expect(eliteReward?.visibleElite).toBe(true);
  expect(eliteReward?.eliteDefeated).toBe(1);
  expect(eliteReward?.caches).toBeGreaterThan(0);
  expect(errors).toEqual([]);
  expect(failedAssets).toEqual([]);
});

test('cache opening and XP Recall give clear reward feedback in the live game', async ({ page }) => {
  mkdirSync(evidence, { recursive: true });
  await page.setViewportSize({ width: 1365, height: 900 });
  await page.goto('/?test=normal');
  await page.getByRole('button', { name: /PLAY NOW/i }).click();
  const inserted = await page.evaluate(() => {
    const state = window.__GG_TEST__?.getState();
    if (!state) return false;
    state.spawnTimer = 10_000; state.player.attackTimer = 10_000; state.player.piercingTimer = 10_000;
    state.pickups.push({ id: state.nextId++, x: state.player.x, y: state.player.y, value: 0, kind: 'hero-cache', age: 0 });
    window.__GG_TEST__?.advance(0.05);
    return state.status === 'upgrade' && state.supplyCacheTier === 'hero-cache';
  });
  expect(inserted).toBe(true);
  await expect(page.getByRole('heading', { name: 'Cache opened!' })).toBeVisible();
  await page.screenshot({ path: `${evidence}/assignment-013-hero-cache-open.png` });
  await page.locator('[data-upgrade]').first().click();
  await expect(page.getByText(/HERO CACHE OPENED/)).toBeVisible();

  const recallInserted = await page.evaluate(() => {
    const state = window.__GG_TEST__?.getState();
    if (!state) return false;
    state.player.xp = 0;
    state.pickups.push(
      { id: state.nextId++, x: state.player.x + 240, y: state.player.y + 30, value: 18, kind: 'xp', age: 0 },
      { id: state.nextId++, x: state.player.x, y: state.player.y, value: 0, kind: 'xp-recall', age: 0 },
    );
    window.__GG_TEST__?.advance(0.05);
    return state.xpRecallTimer > 0;
  });
  expect(recallInserted).toBe(true);
  await expect(page.getByText(/XP RECALL · 1 GEM PILES/)).toBeVisible();
  await page.screenshot({ path: `${evidence}/assignment-013-xp-recall-pulse.png` });
  await page.evaluate(() => window.__GG_TEST__?.advance(1.5));
  await expect.poll(() => page.evaluate(() => window.__GG_TEST__?.getState()?.xpCollected ?? 0)).toBe(18);
});
