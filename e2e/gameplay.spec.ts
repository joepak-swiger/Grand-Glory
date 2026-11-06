import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const evidence = 'artifacts/evidence/living-city/run/gameplay';
test('real browser vertical slice and gameplay evidence', async ({ page }) => {
  mkdirSync(evidence, { recursive: true });
  const errors: string[] = [];
  const failedAssets: string[] = [];
  await page.addInitScript(() => {
    localStorage.removeItem('grand-glory-sfx-volume');
    const NativeAudioContext = window.AudioContext;
    Object.defineProperty(window, '__GG_AUDIO_CREATED__', { value: false, writable: true });
    window.AudioContext = class extends NativeAudioContext {
      constructor() { super(); (window as Window & { __GG_AUDIO_CREATED__?: boolean }).__GG_AUDIO_CREATED__ = true; }
    };
  });
  page.on('pageerror', error => errors.push(error.message));
  page.on('requestfailed', request => { if (request.url().includes('/assets/')) failedAssets.push(request.url()); });
  await page.setViewportSize({ width: 1365, height: 900 });
  await page.goto('/?test=1');
  await expect(page.getByRole('heading', { name: 'GRAND GLORY' })).toBeVisible();
  await expect(page.getByLabel('Sound effects volume')).toHaveValue('0.55');
  await page.getByLabel('Difficulty').selectOption('heroic');
  await page.getByLabel('Difficulty').selectOption('normal');
  await page.getByLabel('Camera scale').selectOption('close');
  await page.getByRole('button', { name: 'SOUND ON' }).click();
  await expect(page.getByRole('button', { name: 'SOUND OFF' })).toBeVisible();
  await page.getByRole('button', { name: 'SOUND OFF' }).click();
  await expect.poll(() => page.evaluate(() => window.__GG_TEST__?.getRendererState().cityMapLoaded ?? false)).toBe(true);
  expect(await page.evaluate(() => window.__GG_TEST__?.getRendererState().cityMapSize)).toEqual({ width: 1800, height: 1200 });
  const portrait = page.locator('.hero-portrait');
  await expect(portrait).toBeVisible();
  await expect.poll(() => portrait.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth === 1254)).toBe(true);
  await page.screenshot({ path: `${evidence}/01-title.png` });
  for (const [width, height] of [[1920, 1080], [1366, 768], [1280, 720], [900, 600]] as const) {
    await page.setViewportSize({ width, height });
    await expect(page.getByRole('button', { name: /PLAY NOW/i })).toBeVisible();
    await page.screenshot({ path: `${evidence}/title-${width}x${height}.png` });
  }
  await page.setViewportSize({ width: 1365, height: 900 });

  await page.getByRole('button', { name: /PLAY NOW/i }).click();
  expect(await page.evaluate(() => (window as Window & { __GG_AUDIO_CREATED__?: boolean }).__GG_AUDIO_CREATED__)).toBe(true);
  expect(await page.evaluate(() => window.__GG_TEST__?.getRendererState().cameraZoom)).toBe(1.2);
  await expect(page.getByText('BLUE PINWHEEL')).toBeVisible();
  await page.evaluate(() => { const state = window.__GG_TEST__?.getState(); if (state) window.__GG_TEST__?.spawn('fastThug', state.player.x + 36, state.player.y); });
  // Keep this short facing/animation scenario independent from slow CI frame pacing,
  // early XP level-ups, and incidental enemy contact. Combat assertions follow below.
  await page.evaluate(() => window.__GG_TEST__?.prepareFacingCheck());
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
  await page.evaluate(() => window.__GG_TEST__?.finishFacingCheck());
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
  await expect(page.getByRole('heading', { name: 'Choose your next move' })).toBeVisible();
  await page.screenshot({ path: `${evidence}/03-level-up-choices.png` });
  await expect(page.locator('.upgrade-rank')).toHaveCount(3);
  await expect(page.locator('.upgrade-rank').first()).toContainText(/NEW · LEVEL 1|LEVEL \d+ → LEVEL \d+|MAX LEVEL/);
  const chosenId = await page.evaluate(() => window.__GG_TEST__?.getState()?.options[0]);
  const beforeUpgrade = await page.evaluate(() => { const state = window.__GG_TEST__?.getState(); return state ? { speed: state.player.speed, damage: state.player.damageBonus, shots: state.player.extraShots, health: state.player.maxHealth, pickup: state.player.pickupRadius, orbit: state.player.orbit, weaponRanks: state.player.weaponRanks, passiveRanks: state.player.passiveRanks, evolved: state.player.evolvedPinwheel } : null; });
  if (!chosenId) throw new Error('No upgrade was offered');
  await page.locator(`[data-upgrade="${chosenId}"]`).click();
  await expect.poll(() => page.evaluate(() => window.__GG_TEST__?.getState()?.chosen.length ?? 0)).toBeGreaterThan(0);
  const afterUpgrade = await page.evaluate(() => { const state = window.__GG_TEST__?.getState(); return state ? { speed: state.player.speed, damage: state.player.damageBonus, shots: state.player.extraShots, health: state.player.maxHealth, pickup: state.player.pickupRadius, orbit: state.player.orbit, weaponRanks: state.player.weaponRanks, passiveRanks: state.player.passiveRanks, evolved: state.player.evolvedPinwheel } : null; });
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
  await expect(page.locator('.boss-arrival').getByText('GANG BOSS')).toBeVisible();
  await expect(page.getByText('MAJOR THREAT')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__GG_TEST__?.getRendererState().enemies.some(enemy => enemy.kind === 'boss' && enemy.hasSprite) ?? false)).toBe(true);
  const bossFrame = await page.evaluate(() => window.__GG_TEST__?.getRendererState().enemies.find(enemy => enemy.kind === 'boss')?.frame ?? -1);
  await expect.poll(() => page.evaluate(() => window.__GG_TEST__?.getRendererState().enemies.find(enemy => enemy.kind === 'boss')?.frame ?? -1)).not.toBe(bossFrame);
  const bossFacing = await page.evaluate(() => window.__GG_TEST__?.getRendererState().enemies.find(enemy => enemy.kind === 'boss')?.facing);
  expect(['left', 'right']).toContain(bossFacing);
  await page.screenshot({ path: `${evidence}/06-boss-encounter.png` });
  await page.evaluate(() => window.__GG_TEST__?.prepareBossForAttack());
  await expect.poll(() => page.evaluate(() => window.__GG_TEST__?.getState()?.bossDefeated ?? false), { timeout: 6000 }).toBe(true);
  await expect(page.getByRole('heading', { name: 'VICTORY' })).toBeVisible();
  await expect(page.locator('.stats')).toContainText('Damage dealt');
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
  await page.getByRole('button', { name: 'Copy run diagnostics' }).click();
  expect(errors).toEqual([]);
  expect(failedAssets).toEqual([]);
});

test('real boss-cache UI offers and applies a qualifying weapon evolution', async ({ page }) => {
  mkdirSync(evidence, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1365, height: 900 });
  await page.goto('/?test=1');
  await page.getByRole('button', { name: /PLAY NOW/i }).click();
  await page.evaluate(() => {
    const test = window.__GG_TEST__; const state = test?.getState(); if (!test || !state) return;
    state.endless = true; state.enemies.length = 0; state.projectiles.length = 0; state.pickups.length = 0;
    state.player.weaponRanks.pinwheel = 5; state.player.passiveRanks.might = 1; state.player.attackTimer = 10_000;
    state.pickups.push({ id: state.nextId++, x: state.player.x, y: state.player.y, value: 0, kind: 'boss-evolution' });
    test.advance(0.05);
  });
  await expect(page.getByRole('heading', { name: 'Choose a weapon evolution' })).toBeVisible();
  await expect(page.locator('.evolution-card')).toContainText('Typhoon Rings');
  await page.screenshot({ path: `${evidence}/boss-cache-evolution-card.png` });
  await page.locator('[data-reward="typhoon-rings"]').click();
  await expect.poll(() => page.evaluate(() => window.__GG_TEST__?.getState()?.player.evolvedPinwheel ?? false)).toBe(true);
  await expect(page.locator('.combat-hud')).toContainText('Typhoon Rings');
  await expect(page.locator('.upgrade-rank')).toHaveCount(0);
  await page.screenshot({ path: `${evidence}/post-evolution-combat.png` });
  expect(errors).toEqual([]);
});

test('standard configuration naturally builds an early horde in the browser', async ({ page }) => {
  test.setTimeout(240_000);
  mkdirSync(evidence, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1365, height: 900 });
  await page.goto('/?test=normal');
  await page.getByRole('button', { name: /PLAY NOW/i }).click();
  let sawUpgrade = false;
  let capturedHorde = false;
  let liveRenderMetrics: { enemies: number; fps: number; frameMs: number } | null = null;
  let lateHordeMetrics: { enemies: number; kinds: string[]; fps: number; frameMs: number } | null = null;
  let naturalBossMetrics: { elapsed: number; health: number; bossHealth: number; enemies: number } | null = null;
  let capturedSurge = false;
  let capturedBossCombat = false;
  let capturedMultiWeapon = false;
  let capturedEvolution = false;
  let postBossContinuation: { elapsed: number; bossesDefeated: number; factions: string[] } | null = null;
  const naturalProgression: Array<Record<string, unknown>> = [];
  for (let segment = 0; segment < 70; segment++) {
    const movement = await page.evaluate(() => {
      const state = window.__GG_TEST__?.getState();
      if (!state) return { x: 0, y: 0 };
      const player = state.player;
      const healthRatio = player.health / player.maxHealth;
      let closestThreat = null as { x: number; y: number; distance: number } | null;
      for (const enemy of state.enemies) {
        if (enemy.dead) continue;
        const distance = Math.hypot(enemy.x - player.x, enemy.y - player.y);
        if (!closestThreat || distance < closestThreat.distance) closestThreat = { x: enemy.x, y: enemy.y, distance };
      }
      // The repeatable test strategy avoids nearby contact pressure instead of relying on
      // perfect combat stats. It still travels for XP and does not dodge distant threats.
      if (closestThreat && healthRatio < 0.75 && closestThreat.distance < 115) {
        return { x: (player.x - closestThreat.x) / closestThreat.distance, y: (player.y - closestThreat.y) / closestThreat.distance };
      }
      let nearest = null as { x: number; y: number; distance: number } | null;
      for (const pickup of state.pickups) {
        const distance = Math.hypot(pickup.x - player.x, pickup.y - player.y);
        if (!nearest || distance < nearest.distance) nearest = { x: pickup.x, y: pickup.y, distance };
      }
      if (nearest && nearest.distance > 24 && nearest.distance < 420) {
        return { x: (nearest.x - player.x) / nearest.distance, y: (nearest.y - player.y) / nearest.distance };
      }
      const angle = state.elapsed * 0.5;
      return { x: Math.cos(angle), y: Math.sin(angle) };
    });
    await page.evaluate(({ x, y }) => window.__GG_TEST__?.advance(4, x, y, true, true, false), movement);
    const status = await page.evaluate(() => window.__GG_TEST__?.getState()?.status);
    if (status === 'upgrade') {
      if (!sawUpgrade) { await page.screenshot({ path: `${evidence}/10-standard-level-up.png` }); sawUpgrade = true; }
      const option = await page.evaluate(() => {
        const state = window.__GG_TEST__?.getState();
        const choices = state?.options ?? [];
        const hpRatio = state ? state.player.health / state.player.maxHealth : 1;
        const upgradeRank = (id: string) => state ? Math.max(state.player.passiveRanks[id as keyof typeof state.player.passiveRanks] ?? 0, state.chosen.filter(chosen => chosen === id).length) : 0;
        const speedRank = upgradeRank('agility');
        const defensiveChoices = state
          ? (['vitality', 'regeneration', 'resilience'] as const).filter(id => upgradeRank(id) === 0)
          : [];
        const emergencyChoices = hpRatio < 0.55 ? ['regeneration', 'vitality', 'resilience'] : [];
        const speedChoice = speedRank === 0 ? ['agility'] : [];
        // Keep this as an offensive-but-not-perfect repeatable strategy: build meaningful
        // damage early, then select a defensive option only when health is genuinely low.
        const weaponBuild = ['pinwheel', 'piercingThrow', 'orbit', 'ricochetRing'];
        const priority = hpRatio < 0.45
          ? [...emergencyChoices, ...defensiveChoices, ...weaponBuild, 'might', 'tempo', 'vitality', 'regeneration', 'resilience', ...speedChoice, 'agility', 'multiplicity', 'attraction', 'wisdom', 'fortune', 'persistence', 'mastery']
          : [...weaponBuild, 'might', 'tempo', ...speedChoice, 'agility', 'vitality', 'regeneration', 'resilience', 'multiplicity', 'attraction', 'wisdom', 'fortune', 'persistence', 'mastery'];
        const rank = (id: string) => { const index = priority.indexOf(id); return index < 0 ? priority.length : index; };
        return [...choices].sort((a, b) => rank(a) - rank(b))[0];
      });
      if (option) await page.locator(`[data-upgrade="${option}"]`).click();
    }
    if (!postBossContinuation) {
      const continuation = await page.evaluate(() => {
        const state = window.__GG_TEST__?.getState();
        return state && state.status === 'playing' && state.bossesDefeated > 0
          ? { elapsed: state.elapsed, bossesDefeated: state.bossesDefeated, factions: [...state.factionsEncountered] }
          : null;
      });
      if (continuation) {
        postBossContinuation = continuation;
        await page.screenshot({ path: `${evidence}/13-endless-continues-after-boss.png` });
      }
    }
    const moment = await page.evaluate(() => { const state = window.__GG_TEST__?.getState(); return state ? { elapsed: state.elapsed, status: state.status } : null; });
    if (!capturedSurge && moment?.status === 'playing') {
      const surge = await page.evaluate(() => { const state = window.__GG_TEST__?.getState(); return state?.surgeRemaining ? { side: state.surgeDirection, remaining: state.surgeRemaining } : null; });
      if (surge) { await expect(page.locator('.surge-alert')).toContainText(`FROM THE ${surge.side.toUpperCase()}`); await page.screenshot({ path: `${evidence}/natural-horde-surge.png` }); console.info(`NATURAL_SURGE_EVIDENCE ${JSON.stringify(surge)}`); capturedSurge = true; }
    }
    const weaponEvidence = await page.evaluate(() => {
      const state = window.__GG_TEST__?.getState();
      return state ? { piercing: state.player.weaponRanks.piercingThrow > 0, orbit: state.player.weaponRanks.orbitGuard > 0, evolved: state.player.evolvedPinwheel } : null;
    });
    if (!capturedMultiWeapon && weaponEvidence && (weaponEvidence.piercing || weaponEvidence.orbit)) { await page.screenshot({ path: `${evidence}/natural-multiple-weapons.png` }); capturedMultiWeapon = true; }
    if (!capturedEvolution && weaponEvidence?.evolved) { await page.screenshot({ path: `${evidence}/natural-pinwheel-evolution.png` }); capturedEvolution = true; }
    for (const mark of [15, 30, 35, 60, 90, 120, 150]) {
      if (!moment || moment.elapsed < mark || moment.status !== 'playing' || naturalProgression.some(sample => sample.time === mark)) continue;
      const sample = await page.evaluate(() => {
        const state = window.__GG_TEST__?.getState(); const diagnostic = window.__GG_TEST__?.getPerformanceDiagnostics(); const renderer = window.__GG_TEST__?.getRendererState();
        return state && diagnostic && renderer ? { elapsed: state.elapsed, active: diagnostic.activeEnemies, visible: diagnostic.visibleEnemies, kinds: [...new Set(state.enemies.map(enemy => enemy.kind))], target: state.hordeTarget, deficit: state.hordeDeficit, spawnRate: state.spawnRate, totalSpawned: state.enemiesSpawned, peak: state.peakEnemies, belowTargetSeconds: state.timeBelowHordeTarget, kills: state.kills, level: state.player.level, health: state.player.health, fps: renderer.renderFps, frameMs: renderer.renderFrameMs } : null;
      });
      if (sample) {
        naturalProgression.push({ time: mark, ...sample });
        await page.screenshot({ path: `${evidence}/natural-${String(mark).padStart(3, '0')}s-population.png` });
      }
    }
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
    if (!capturedBossCombat && moment && moment.elapsed >= 154 && moment.status === 'playing') {
      const bossHealth = await page.evaluate(() => window.__GG_TEST__?.getState()?.enemies.find(enemy => enemy.kind === 'boss' && !enemy.dead)?.health ?? 0);
      if (bossHealth > 0) {
        // Boss-combat capture is supplementary evidence; slow SwiftShader readback must not consume the normal-run timeout.
        try { await page.screenshot({ path: `${evidence}/natural-boss-combat.png`, timeout: 20_000 }); capturedBossCombat = true; }
        catch (error) { console.warn(`OPTIONAL_BOSS_SCREENSHOT_SKIPPED ${error instanceof Error ? error.message : String(error)}`); }
      }
    }
    if (status === 'defeat' || status === 'victory') break;
  }
  const result = await page.evaluate(() => {
    const state = window.__GG_TEST__?.getState();
    const boss = state?.enemies.find(enemy => enemy.kind === 'boss' && !enemy.dead);
    return state ? { endless: state.endless, bossesDefeated: state.bossesDefeated, factionsEncountered: state.factionsEncountered, elapsed: state.elapsed, enemies: state.enemies.length, kinds: [...new Set(state.enemies.map(enemy => enemy.kind))], level: state.player.level, health: state.player.health, kills: state.kills, xp: state.player.xp, status: state.status, endReason: state.endReason, bossHealth: boss?.health ?? 0, weapons: state.player.weaponRanks, passiveRanks: state.player.passiveRanks, evolutions: state.player.evolutions, spawned: state.enemiesSpawned, peak: state.peakEnemies, belowTargetSeconds: state.timeBelowHordeTarget, placementFallbacks: state.spawnPlacementFallbacks, recycled: state.recycledEnemies, spawnRate: state.spawnRate, killRate: state.killRate, chosen: state.chosen } : null;
  });
  console.info(`STANDARD_NATURAL_BROWSER ${JSON.stringify({ ...result, liveRenderMetrics, lateHordeMetrics, naturalBossMetrics, naturalProgression })}`);
  expect(result).not.toBeNull();
  expect(result?.elapsed).toBeGreaterThan(12);
  expect(result?.enemies ?? 0).toBeGreaterThan(0);
  expect(naturalBossMetrics).not.toBeNull();
  expect(result?.endless).toBe(true);
  expect(result?.bossesDefeated).toBeGreaterThan(0);
  expect(postBossContinuation).not.toBeNull();
  expect(result?.elapsed ?? 0).toBeGreaterThan((postBossContinuation?.elapsed ?? 0) + 1);
  expect(result?.status).not.toBe('victory');
  expect(result?.factionsEncountered).toContain('dr-smile');
  expect(result?.kinds).toEqual(expect.arrayContaining(['smiler', 'molar']));
  expect(result?.elapsed).toBeGreaterThan(150);
  expect(capturedSurge).toBe(true);
  await page.screenshot({ path: `${evidence}/14-endless-run-result.png` });
  await expect.poll(() => page.evaluate(() => window.__GG_TEST__?.getRendererState().playerTextureLoaded ?? false)).toBe(true);
  if (!capturedHorde) await page.screenshot({ path: `${evidence}/09-standard-natural-horde.png` });
  expect(errors).toEqual([]);
});
