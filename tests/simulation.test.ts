import { describe, expect, it } from 'vitest';
import { BLUE_PINWHEEL, standardRun, testRun, type UpgradeId } from '../src/game/definitions';
import { acquireTarget, chooseUpgrade, createGame, damagePlayer, movePlayer, random, spawnEnemy, updateGame, type InputState } from '../src/game/simulation';

const idle: InputState = { x: 0, y: 0, dash: false, special: false };
function steps(state: ReturnType<typeof createGame>, count: number, input = idle, cfg = testRun): void { for (let i = 0; i < count; i++) updateGame(state, 1 / 60, input, cfg); }
function choice(state: ReturnType<typeof createGame>): UpgradeId { const first = state.options[0]; if (!first) throw new Error('Missing upgrade choice'); return first; }

describe('deterministic gameplay simulation', () => {
  it('normalizes diagonal movement and preserves facing', () => {
    const a = createGame(1, testRun); const b = createGame(1, testRun);
    movePlayer(a.player, 1, 1, 1, testRun); movePlayer(b.player, 1, 0, 1, testRun);
    expect(Math.hypot(a.player.x - testRun.arenaWidth / 2, a.player.y - testRun.arenaHeight / 2)).toBeCloseTo(BLUE_PINWHEEL.moveSpeed);
    expect(a.player.facing.x).toBeCloseTo(Math.SQRT1_2); expect(a.player.facing.y).toBeCloseTo(Math.SQRT1_2);
    expect(b.player.x - testRun.arenaWidth / 2).toBeCloseTo(BLUE_PINWHEEL.moveSpeed);
  });

  it('keeps movement within arena and walkable street bounds', () => {
    const s = createGame(1, testRun); movePlayer(s.player, -1, -1, 200, testRun);
    expect(s.player.x).toBeGreaterThanOrEqual(28); expect(s.player.y).toBe(288);
    movePlayer(s.player, 1, 1, 200, testRun); expect(s.player.x).toBeLessThanOrEqual(testRun.arenaWidth - 28); expect(s.player.y).toBeLessThanOrEqual(752);
  });

  it('acquires the nearest living target and ignores dead enemies', () => {
    const s = createGame(10, testRun); const far = spawnEnemy(s, 'thug', testRun, { x: s.player.x + 180, y: s.player.y });
    const near = spawnEnemy(s, 'fastThug', testRun, { x: s.player.x + 75, y: s.player.y }); s.enemies.push(far, near);
    expect(acquireTarget(s)).toBe(near);
    near.dead = true; expect(acquireTarget(s)).toBe(far);
  });

  it('fires on its cooldown and projectiles hit enemies', () => {
    const s = createGame(11, testRun); const enemy = spawnEnemy(s, 'thug', testRun, { x: s.player.x + 110, y: s.player.y }); s.enemies.push(enemy);
    steps(s, 90); expect(enemy.health).toBeLessThan(34); expect(s.player.damageDealt).toBeGreaterThan(0);
    expect(s.projectiles.length).toBeLessThan(4);
  });

  it('applies damage, brief invulnerability, and defeat at zero health', () => {
    const s = createGame(12, testRun);
    expect(damagePlayer(s, 25)).toBe(true); expect(s.player.health).toBe(75);
    expect(damagePlayer(s, 25)).toBe(false); expect(s.player.health).toBe(75);
    s.player.invulnerable = 0; damagePlayer(s, 1000); expect(s.player.health).toBe(0); expect(s.status).toBe('defeat');
  });

  it('knocks ordinary enemies away after a hit', () => {
    const s = createGame(13, testRun); const e = spawnEnemy(s, 'thug', testRun, { x: s.player.x + 45, y: s.player.y }); s.enemies.push(e);
    steps(s, 45); expect(e.knockback.x).toBeGreaterThanOrEqual(-1); expect(e.x).toBeLessThan(s.player.x + 45);
  });

  it('spawns enemies away from the player and within arena bounds', () => {
    const s = createGame(14, testRun);
    for (let i = 0; i < 100; i++) { const e = spawnEnemy(s, i % 2 ? 'fastThug' : 'thug', testRun); expect(Math.hypot(e.x - s.player.x, e.y - s.player.y)).toBeGreaterThan(100); expect(e.x).toBeGreaterThanOrEqual(0); expect(e.x).toBeLessThan(testRun.arenaWidth); expect(e.y).toBeGreaterThanOrEqual(0); expect(e.y).toBeLessThan(testRun.arenaHeight); }
  });

  it('drops XP on death, collects it, and removes the dead enemy', () => {
    const s = createGame(15, testRun); const e = spawnEnemy(s, 'thug', testRun, { x: s.player.x + 35, y: s.player.y }); e.health = 1; s.enemies.push(e);
    steps(s, 70); expect(e.dead).toBe(true); expect(s.kills).toBe(1); expect(s.pickups.length).toBe(0); expect(s.player.xp).toBeGreaterThan(0);
  });

  it('levels up and pauses until a valid upgrade is selected', () => {
    const s = createGame(16, testRun); s.pickups.push({ id: 90, x: s.player.x, y: s.player.y, value: 30 }); steps(s, 1);
    expect(s.status).toBe('upgrade'); expect(s.player.level).toBe(2); expect(s.options).toHaveLength(3);
    const selected = choice(s); expect(chooseUpgrade(s, selected)).toBe(true); expect(s.status).toBe('playing');
  });

  it('offers consecutive choices when one pickup crosses multiple level thresholds', () => {
    const s = createGame(17, testRun); s.pickups.push({ id: 91, x: s.player.x, y: s.player.y, value: 180 }); steps(s, 1);
    expect(s.status).toBe('upgrade'); expect(s.player.level).toBe(2); expect(s.player.xp).toBeGreaterThan(s.player.xpNext);
    let answered = 0; while (s.status === 'upgrade' && answered < 6) { expect(s.options).toHaveLength(3); expect(chooseUpgrade(s, choice(s))).toBe(true); answered++; }
    expect(answered).toBeGreaterThan(1); expect(s.status).toBe('playing');
  });

  it('applies upgrade effects and unlocks the second prototype attack', () => {
    const s = createGame(18, testRun); s.levelChoices = 1; s.options = ['orbit', 'speed', 'vitality']; s.status = 'upgrade';
    const previous = s.player.speed; expect(chooseUpgrade(s, 'speed')).toBe(true); expect(s.player.speed).toBeGreaterThan(previous);
    s.levelChoices = 1; s.options = ['orbit', 'damage', 'magnet']; s.status = 'upgrade'; chooseUpgrade(s, 'orbit');
    expect(s.player.orbit).toBe(true); expect(s.attacks).toContain('Orbit Guard (Prototype)');
  });

  it('damages and defeats the boss through actual attacks', () => {
    const s = createGame(19, testRun); const boss = spawnEnemy(s, 'boss', testRun, { x: s.player.x + 90, y: s.player.y }); boss.health = 35; boss.maxHealth = 35; s.enemies.push(boss);
    steps(s, 240); expect(boss.dead).toBe(true); expect(s.bossDefeated).toBe(true); expect(s.status).toBe('victory');
  });

  it('freezes all simulation timers while paused or choosing an upgrade', () => {
    const s = createGame(20, testRun); s.status = 'paused'; const before = JSON.stringify(s); updateGame(s, 1, { x: 1, y: 0, dash: true, special: true }, testRun); expect(JSON.stringify(s)).toBe(before);
    s.status = 'upgrade'; const choiceBefore = JSON.stringify(s); updateGame(s, 1, idle, testRun); expect(JSON.stringify(s)).toBe(choiceBefore);
  });

  it('supports loss, boss victory, and clean restart state', () => {
    const s = createGame(21, testRun); s.player.health = 1; damagePlayer(s, 5); expect(s.status).toBe('defeat');
    const won = createGame(22, testRun); const boss = spawnEnemy(won, 'boss', testRun, { x: won.player.x + 100, y: won.player.y }); boss.health = 1; boss.maxHealth = 1; won.enemies.push(boss); steps(won, 100); expect(won.status).toBe('victory');
    const fresh = createGame(21, testRun); expect(fresh.kills).toBe(0); expect(fresh.enemies).toHaveLength(0); expect(fresh.player.health).toBe(BLUE_PINWHEEL.maxHealth); expect(fresh.elapsed).toBe(0);
  });

  it('maps animation direction metadata and produces identical seeded spawn sequences', () => {
    expect(BLUE_PINWHEEL.animation.facingRows.down).toBe(0); expect(BLUE_PINWHEEL.animation.frameWidth).toBe(48);
    const a = createGame(987, testRun); const b = createGame(987, testRun); const seqA = Array.from({ length: 8 }, () => [random(a), random(a)]); const seqB = Array.from({ length: 8 }, () => [random(b), random(b)]); expect(seqA).toEqual(seqB);
    const spawnA = createGame(987, testRun); const spawnB = createGame(987, testRun); expect(Array.from({ length: 8 }, () => { const e = spawnEnemy(spawnA, 'thug', testRun); return [e.x, e.y]; })).toEqual(Array.from({ length: 8 }, () => { const e = spawnEnemy(spawnB, 'thug', testRun); return [e.x, e.y]; }));
  });

  it('uses a bounded timestep and has separate standard and test durations', () => {
    const s = createGame(23, testRun); updateGame(s, 10, idle, testRun); expect(s.elapsed).toBeLessThanOrEqual(0.051); expect(standardRun.duration).toBeGreaterThan(testRun.duration);
  });

  it('dashes with a cooldown and temporary invulnerability', () => {
    const s = createGame(24, testRun); const x = s.player.x;
    updateGame(s, 1 / 60, { x: 1, y: 0, dash: true, special: false }, testRun);
    expect(s.player.x - x).toBeGreaterThan(s.player.speed / 60); expect(s.player.dashCooldown).toBeGreaterThan(2.9); expect(s.player.invulnerable).toBeGreaterThan(0);
  });

  it('activates the charged area special and spends its gauge', () => {
    const s = createGame(25, testRun); s.player.special = 100; const e = spawnEnemy(s, 'thug', testRun, { x: s.player.x + 145, y: s.player.y }); e.health = 200; e.maxHealth = 200; s.enemies.push(e);
    updateGame(s, 1 / 60, { x: 0, y: 0, dash: false, special: true }, testRun);
    expect(s.player.special).toBe(0); expect(e.health).toBeLessThan(200); expect(s.messages).toContain('Prototype Special — Canon TBD');
  });

  it('runs Orbit Guard damage without a starter projectile firing', () => {
    const s = createGame(26, testRun); s.player.orbit = true; s.player.attackTimer = 10;
    const e = spawnEnemy(s, 'thug', testRun, { x: s.player.x + 50, y: s.player.y }); e.health = 1000; e.maxHealth = 1000; s.enemies.push(e);
    steps(s, 30); expect(s.player.damageDealt).toBeGreaterThan(0); expect(e.health).toBeLessThan(1000);
  });

  it('emits a hostile boss projectile during its telegraphed attack window', () => {
    const s = createGame(27, testRun); const boss = spawnEnemy(s, 'boss', testRun, { x: s.player.x + 300, y: s.player.y }); boss.phase = 3.24; s.enemies.push(boss);
    steps(s, 2); expect(s.projectiles.some(projectile => projectile.owner === 'enemy')).toBe(true);
  });

  it('cleans up expired projectiles and defeated enemies', () => {
    const s = createGame(28, testRun); s.projectiles.push({ id: 999, x: 10, y: 10, vx: 0, vy: 0, damage: 1, life: 0.001, pierce: 0, special: false, owner: 'player', spin: 0 });
    const e = spawnEnemy(s, 'thug', testRun, { x: s.player.x + 30, y: s.player.y }); e.health = 1; s.enemies.push(e); steps(s, 80);
    expect(s.projectiles.some(projectile => projectile.id === 999)).toBe(false); expect(s.enemies.includes(e)).toBe(false); expect(s.player.xp).toBeGreaterThan(0);
  });

  it('measures 0/25/75 active-enemy loads and keeps entity totals bounded', () => {
    const measurements: Array<{ enemies: number; frames: number; medianMs: number }> = [];
    const performanceRun = { ...testRun, bossAt: 3_600, duration: 7_200 };
    for (const count of [0, 25, 75]) {
      const s = createGame(29, performanceRun); s.spawnTimer = 1_000; s.player.health = 1_000_000; s.player.invulnerable = 1_000; s.player.extraShots = 1;
      for (let i = 0; i < count; i++) { const enemy = spawnEnemy(s, i % 3 === 0 ? 'fastThug' : 'thug', performanceRun, { x: 180 + (i % 15) * 105, y: 330 + Math.floor(i / 15) * 76 }); enemy.health = 1_000_000; enemy.maxHealth = 1_000_000; s.enemies.push(enemy); }
      steps(s, 60, idle, performanceRun); // Warm V8 and the targeting/collision paths before timing.
      const samples: number[] = [];
      for (let sample = 0; sample < 5; sample++) { const begin = performance.now(); steps(s, 300, idle, performanceRun); samples.push(performance.now() - begin); }
      samples.sort((a, b) => a - b);
      measurements.push({ enemies: s.enemies.length, frames: 300, medianMs: Math.round((samples[2] ?? 0) * 100) / 100 });
      expect(s.enemies).toHaveLength(count); expect(s.projectiles.length).toBeLessThan(20);
    }
    console.info(`SIM_LOAD_300_FRAMES ${JSON.stringify(measurements)}`);
  });
});
