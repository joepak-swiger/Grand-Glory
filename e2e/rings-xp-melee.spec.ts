import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const evidence = 'artifacts/evidence/rings-xp-and-melee';
const orbitEvidence = 'artifacts/evidence/living-city/run/orbit';

test('rings, persistent XP collection, skill ranks, and baseball pitcher render in the game', async ({ page }) => {
  mkdirSync(evidence, { recursive: true });
  const errors: string[] = [];
  const failedAssets: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('requestfailed', request => { if (request.url().includes('/assets/')) failedAssets.push(request.url()); });
  await page.setViewportSize({ width: 1365, height: 900 });
  await page.goto('/?test=1');
  await page.getByRole('button', { name: /PLAY NOW/i }).click();
  await expect.poll(() => page.evaluate(() => window.__GG_TEST__?.getRendererState().playerTextureLoaded ?? false)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.__GG_TEST__?.getRendererState().cityMapLoaded ?? false)).toBe(true);

  const ringSetup = await page.evaluate(() => {
    const test = window.__GG_TEST__; const state = test?.getState();
    if (!test || !state) return null;
    state.spawnTimer = 10_000; state.player.attackTimer = 0; state.player.piercingTimer = 0;
    state.player.weaponRanks.piercingThrow = 1;
    test.spawn('thug', state.player.x + 220, state.player.y);
    const target = state.enemies.at(-1); if (target) { target.speed = 0; target.health = target.maxHealth = 100_000; }
    test.advance(0.12);
    return state.projectiles.filter(projectile => projectile.owner === 'player').map(projectile => projectile.weaponId);
  });
  expect(ringSetup).toContain('pinwheel');
  expect(ringSetup).toContain('piercingThrow');
  await page.screenshot({ path: `${evidence}/blue-ring-weapons.png` });

  const drop = await page.evaluate(() => {
    const test = window.__GG_TEST__; const state = test?.getState();
    if (!test || !state) return null;
    state.projectiles.length = 0; state.enemies.length = 0; state.player.attackTimer = 10_000; state.player.piercingTimer = 10_000;
    const oldXp = state.player.xp;
    test.spawn('thug', state.player.x + 240, state.player.y);
    const enemy = state.enemies.at(-1); if (!enemy) return null;
    enemy.speed = 0; test.defeatEnemy(enemy.id);
    const pickup = state.pickups.at(-1); if (!pickup) return null;
    const location = { x: pickup.x, y: pickup.y, value: pickup.value };
    test.advance(0.25);
    const remained = state.pickups.some(pile => pile.id === pickup.id && pile.x === location.x && pile.y === location.y);
    return { playerXp: state.player.xp, oldXp, remained, x: pickup.x, y: pickup.y, value: pickup.value };
  });
  expect(drop).not.toBeNull();
  expect(drop?.remained).toBe(true);
  expect(drop?.playerXp).toBe(drop?.oldXp);
  await page.screenshot({ path: `${evidence}/xp-stationary-drop.png` });
  const collection = await page.evaluate(({ x, y }) => {
    const test = window.__GG_TEST__; const state = test?.getState(); if (!test || !state) return null;
    test.setPlayerPosition(x - 42, y); test.advance(0.7);
    return { collectedXp: state.xpCollected, totalXp: state.player.xp, piles: state.pickups.length };
  }, { x: drop!.x, y: drop!.y });
  expect(collection?.collectedXp).toBe(drop?.value);
  expect(collection?.piles).toBe(0);
  await page.screenshot({ path: `${evidence}/xp-returned-and-collected.png` });

  await page.evaluate(() => window.__GG_TEST__?.grantXp(30));
  await expect(page.locator('.upgrade-card')).toHaveCount(3);
  await expect(page.locator('.upgrade-rank')).toHaveCount(3);
  await expect(page.locator('.upgrade-rank').first()).toContainText(/LEVEL|NEW/);
  await page.screenshot({ path: `${evidence}/upgrade-skill-ranks.png` });
  await page.locator('.upgrade-card').first().click();

  const pitcherPosition = await page.evaluate(() => {
    const test = window.__GG_TEST__; const state = test?.getState();
    if (!test || !state) return null;
    state.enemies.length = 0; state.projectiles.length = 0; state.player.health = state.player.maxHealth; state.player.invulnerable = 0; state.player.attackTimer = 10_000; state.player.piercingTimer = 10_000;
    test.spawn('gangster', state.player.x + 180, state.player.y);
    const pitcher = state.enemies.at(-1); if (!pitcher) return null;
    pitcher.speed = 0; pitcher.rangedTimer = 0.8; pitcher.phase = 0;
    test.advance(0.22);
    const windup = pitcher.attackState;
    test.advance(0.82);
    return { windup, projectileKinds: state.projectiles.filter(projectile => projectile.owner === 'enemy').map(projectile => projectile.weaponId) };
  });
  expect(pitcherPosition?.windup).toBe('ranged-telegraph');
  expect(pitcherPosition?.projectileKinds).toContain('baseball');
  await page.screenshot({ path: `${evidence}/street-pitcher-baseball.png` });

  const batWindup = await page.evaluate(() => {
    const test = window.__GG_TEST__; const state = test?.getState(); if (!test || !state) return null;
    state.enemies.length = 0; state.projectiles.length = 0; state.player.health = state.player.maxHealth; state.player.invulnerable = 0; state.player.attackTimer = 10_000; state.player.piercingTimer = 10_000;
    test.spawn('fastThug', state.player.x + 40, state.player.y);
    const batThug = state.enemies.at(-1); if (!batThug) return null;
    batThug.speed = 0; test.advance(0.05);
    return { attackState: batThug.attackState, projectileCount: state.projectiles.filter(projectile => projectile.owner === 'enemy').length };
  });
  expect(batWindup?.attackState).toBe('melee-telegraph');
  expect(batWindup?.projectileCount).toBe(0);
  await page.screenshot({ path: `${evidence}/bat-thug-melee-telegraph.png` });
  expect(errors).toEqual([]);
  expect(failedAssets).toEqual([]);
});

test('Orbit Guard formations render evenly spaced at one through maximum ring counts', async ({ page }) => {
  mkdirSync(orbitEvidence, { recursive: true });
  await page.setViewportSize({ width: 1365, height: 900 });
  await page.goto('/?test=1');
  await page.getByRole('button', { name: /PLAY NOW/i }).click();
  await expect.poll(() => page.evaluate(() => window.__GG_TEST__?.getRendererState().cityMapLoaded ?? false)).toBe(true);

  const formations = [
    { name: 'one-ring', rank: 1, multiplicity: 0, eternal: false, count: 1 },
    { name: 'two-rings', rank: 2, multiplicity: 0, eternal: false, count: 2 },
    { name: 'three-rings', rank: 4, multiplicity: 0, eternal: false, count: 3 },
    { name: 'four-rings', rank: 5, multiplicity: 0, eternal: false, count: 4 },
    { name: 'maximum-six-rings', rank: 5, multiplicity: 2, eternal: true, count: 6 },
  ] as const;

  for (const formation of formations) {
    const count = await page.evaluate(({ rank, multiplicity, eternal }) => {
      const test = window.__GG_TEST__; const state = test?.getState(); if (!test || !state) return -1;
      state.player.weaponRanks.orbitGuard = rank;
      state.player.passiveRanks.multiplicity = multiplicity;
      state.player.orbit = true;
      if (eternal && !state.player.evolutions.includes('eternal-halo')) state.player.evolutions.push('eternal-halo');
      test.advance(0.06);
      return state.player.orbitRings.length;
    }, formation);
    expect(count).toBe(formation.count);
    await page.screenshot({ path: `${orbitEvidence}/${formation.name}.png` });
  }
});
