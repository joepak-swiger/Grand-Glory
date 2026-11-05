import { describe, expect, it } from 'vitest';
import { BLUE_PINWHEEL, ENEMIES, GANG_LEADER, standardRun, testRun, type UpgradeId } from '../src/game/definitions';
import { acquireTarget, applyEnemyDamage, chooseUpgrade, createGame, damagePlayer, mergeNearbyPickups, movePlayer, random, spawnEnemy, updateGame, type InputState } from '../src/game/simulation';
import { isWalkable } from '../src/game/stage';
import { getUpgradeRankProgress } from '../src/game/upgrade-ranks';

const idle: InputState = { x: 0, y: 0, dash: false, special: false };
function steps(state: ReturnType<typeof createGame>, count: number, input = idle, cfg = testRun): void { for (let i = 0; i < count; i++) updateGame(state, 1 / 60, input, cfg); }
function choice(state: ReturnType<typeof createGame>): UpgradeId { const first = state.options[0]; if (!first) throw new Error('Missing upgrade choice'); return first; }

describe('deterministic gameplay simulation', () => {
  it('normalizes diagonal movement and preserves facing', () => {
    const a = createGame(1, testRun); const b = createGame(1, testRun);
    movePlayer(a.player, 1, 1, 1, testRun); movePlayer(b.player, 1, 0, 1, testRun);
    expect(Math.hypot(a.player.x - testRun.arenaWidth / 2, a.player.y - testRun.arenaHeight / 2)).toBeCloseTo(BLUE_PINWHEEL.moveSpeed);
    expect(a.player.facing.x).toBeCloseTo(Math.SQRT1_2); expect(a.player.facing.y).toBeCloseTo(Math.SQRT1_2);
    expect(a.player.horizontalFacing).toBe('right');
    expect(b.player.x - testRun.arenaWidth / 2).toBeCloseTo(BLUE_PINWHEEL.moveSpeed);
    movePlayer(a.player, 0, -1, 0.1, testRun); expect(a.player.horizontalFacing).toBe('right');
    movePlayer(a.player, -1, 0, 0.1, testRun); expect(a.player.horizontalFacing).toBe('left');
    movePlayer(a.player, 0, 1, 0.1, testRun); expect(a.player.horizontalFacing).toBe('left');
  });

  it('initializes supplied enemy orientation to right and turns with intended horizontal pursuit', () => {
    for (const kind of ['thug', 'fastThug', 'boss'] as const) {
      const s = createGame(101, testRun); s.player.attackTimer = 100;
      const enemy = spawnEnemy(s, kind, testRun, { x: s.player.x - 120, y: s.player.y });
      expect(enemy.horizontalFacing).toBe('right'); s.enemies.push(enemy); steps(s, 1);
      expect(enemy.horizontalFacing).toBe('right');
      enemy.x = s.player.x + 120; enemy.y = s.player.y; steps(s, 1);
      expect(enemy.horizontalFacing).toBe('left');
    }
  });

  it('retains enemy facing while moving vertically or standing still', () => {
    const s = createGame(102, testRun); s.player.attackTimer = 100;
    const enemy = spawnEnemy(s, 'thug', testRun, { x: s.player.x, y: s.player.y + 140 });
    enemy.horizontalFacing = 'left'; s.enemies.push(enemy); steps(s, 1);
    expect(enemy.horizontalFacing).toBe('left');
    enemy.y = s.player.y; steps(s, 1); expect(enemy.horizontalFacing).toBe('left');
  });

  it('uses target intent rather than knockback to decide enemy facing', () => {
    const s = createGame(103, testRun); s.player.attackTimer = 100;
    const enemy = spawnEnemy(s, 'fastThug', testRun, { x: s.player.x + 120, y: s.player.y });
    enemy.knockback = { x: 500, y: 0 }; s.enemies.push(enemy); steps(s, 1);
    expect(enemy.horizontalFacing).toBe('left');
  });

  it('keeps boss orientation aligned to its aimed charge through recovery', () => {
    const s = createGame(104, testRun); s.player.attackTimer = 100;
    const boss = spawnEnemy(s, 'boss', testRun, { x: s.player.x + 90, y: s.player.y });
    boss.phase = GANG_LEADER.chargeStart - 0.01; s.enemies.push(boss); steps(s, 1);
    expect(boss.attackState).toBe('charge-telegraph'); expect(boss.horizontalFacing).toBe('left');
    steps(s, 110); expect(boss.attackState).toBe('recovering'); expect(boss.horizontalFacing).toBe('left');
  });

  it('introduces the boss from a safe visible horizontal position', () => {
    const run = { ...testRun, bossAt: 0, duration: 1_000 };
    for (const seed of [1, 2, 3, 4]) {
      const s = createGame(seed, run); s.spawnTimer = 10_000; s.player.attackTimer = 10_000;
      updateGame(s, 1 / 60, idle, run);
      const boss = s.enemies.find(enemy => enemy.kind === 'boss');
      expect(boss).toBeDefined();
      expect(Math.abs((boss?.x ?? 0) - s.player.x)).toBeGreaterThanOrEqual(359);
      expect(boss?.y).toBeGreaterThanOrEqual(360); expect(boss?.y).toBeLessThanOrEqual(680);
      expect(boss?.horizontalFacing).toBe(boss && boss.x > s.player.x ? 'left' : 'right');
    }
  });

  it('keeps facing out of position and collision data and resets it on a fresh run', () => {
    const s = createGame(105, testRun); const enemy = spawnEnemy(s, 'thug', testRun, { x: s.player.x + 100, y: s.player.y });
    const position = { x: enemy.x, y: enemy.y, playerX: s.player.x, playerY: s.player.y };
    enemy.horizontalFacing = 'left';
    expect({ x: enemy.x, y: enemy.y, playerX: s.player.x, playerY: s.player.y }).toEqual(position);
    expect(createGame(105, testRun).player.horizontalFacing).toBe('right');
    expect(spawnEnemy(createGame(106, testRun), 'thug', testRun, position).horizontalFacing).toBe('right');
  });

  it('advances independent per-enemy animation clocks only during active simulation', () => {
    const s = createGame(106, testRun); s.player.attackTimer = 100;
    const first = spawnEnemy(s, 'thug', testRun, { x: s.player.x + 250, y: s.player.y }); s.enemies.push(first);
    steps(s, 3); const second = spawnEnemy(s, 'thug', testRun, { x: s.player.x - 250, y: s.player.y }); s.enemies.push(second);
    steps(s, 1); expect(first.animationTime).toBeGreaterThan(second.animationTime);
    s.status = 'paused'; const firstTime = first.animationTime; steps(s, 3); expect(first.animationTime).toBe(firstTime);
  });

  it('keeps movement within arena and walkable street bounds', () => {
    const s = createGame(1, testRun); movePlayer(s.player, -1, -1, 200, testRun, s.stage);
    expect(s.player.x).toBeGreaterThanOrEqual(18); expect(s.player.y).toBeGreaterThanOrEqual(18); expect(isWalkable(s.stage, s.player.x, s.player.y, 18)).toBe(true);
    movePlayer(s.player, 1, 1, 200, testRun, s.stage); expect(s.player.x).toBeLessThanOrEqual(testRun.arenaWidth - 18); expect(s.player.y).toBeLessThanOrEqual(testRun.arenaHeight - 18); expect(isWalkable(s.stage, s.player.x, s.player.y, 18)).toBe(true);
  });

  it('acquires the nearest living target and ignores dead enemies', () => {
    const s = createGame(10, testRun); const far = spawnEnemy(s, 'thug', testRun, { x: s.player.x + 180, y: s.player.y });
    const near = spawnEnemy(s, 'fastThug', testRun, { x: s.player.x + 75, y: s.player.y }); s.enemies.push(far, near);
    expect(acquireTarget(s)).toBe(near);
    near.dead = true; expect(acquireTarget(s)).toBe(far);
  });

  it('keeps the active boss as a priority target when ordinary enemies are closer', () => {
    const s = createGame(1001, testRun);
    const thug = spawnEnemy(s, 'thug', testRun, { x: s.player.x + 45, y: s.player.y });
    const boss = spawnEnemy(s, 'boss', testRun, { x: s.player.x + 320, y: s.player.y });
    s.enemies.push(thug, boss);
    expect(acquireTarget(s, 520)).toBe(boss);
  });

  it('fires on its cooldown and projectiles hit enemies', () => {
    const s = createGame(11, testRun); const enemy = spawnEnemy(s, 'thug', testRun, { x: s.player.x + 110, y: s.player.y }); s.enemies.push(enemy);
    steps(s, 90); expect(enemy.health).toBeLessThan(34); expect(s.player.damageDealt).toBeGreaterThan(0);
    expect(s.projectiles.length).toBeLessThan(4);
  });

  it('applies damage, brief invulnerability, and defeat at zero health', () => {
    const s = createGame(12, testRun);
    expect(damagePlayer(s, 25)).toBe(true); expect(s.player.health).toBe(BLUE_PINWHEEL.maxHealth - 25);
    expect(damagePlayer(s, 25)).toBe(false); expect(s.player.health).toBe(BLUE_PINWHEEL.maxHealth - 25);
    s.player.invulnerable = 0; damagePlayer(s, 1000); expect(s.player.health).toBe(0); expect(s.status).toBe('defeat');
  });

  it('uses Normal and Heroic data profiles and records clipped damage under its source', () => {
    const normal = { ...testRun, difficulty: 'normal' as const };
    const heroic = { ...testRun, difficulty: 'heroic' as const };
    const normalState = createGame(1201, normal); const heroicState = createGame(1201, heroic);
    expect(spawnEnemy(normalState, 'thug', normal, { x: normalState.player.x + 100, y: normalState.player.y }).damage).toBeCloseTo(ENEMIES.thug.damage * 0.72);
    expect(spawnEnemy(heroicState, 'thug', heroic, { x: heroicState.player.x + 100, y: heroicState.player.y }).damage).toBe(ENEMIES.thug.damage);
    expect(damagePlayer(normalState, 19, 'fast-contact', normal)).toBe(true);
    expect(normalState.damageTaken['fast-contact']).toBe(19);
    expect(normalState.damageTaken['thug-contact']).toBe(0);
    expect(normalState.player.invulnerable).toBe(1.05);
    normalState.player.invulnerable = 0; normalState.player.health = 5;
    expect(damagePlayer(normalState, 40, 'boss-projectile', normal)).toBe(true);
    expect(normalState.damageTaken['boss-projectile']).toBe(5);
    expect(normalState.player.health).toBe(0);
  });

  it('applies full per-hit thug contact damage and respects the invulnerability window', () => {
    const s = createGame(121, testRun); s.player.attackTimer = 10;
    const thug = spawnEnemy(s, 'thug', testRun, { x: s.player.x, y: s.player.y }); thug.health = 1000; thug.maxHealth = 1000; s.enemies.push(thug);
    steps(s, 1); expect(s.player.health).toBe(BLUE_PINWHEEL.maxHealth - thug.damage);
    steps(s, 62); expect(s.player.health).toBe(BLUE_PINWHEEL.maxHealth - thug.damage);
    steps(s, 1); expect(s.player.health).toBe(BLUE_PINWHEEL.maxHealth - thug.damage * 2);
  });

  it('gives the bat-wielding fast thug a short warned melee swing instead of contact damage', () => {
    const s = createGame(130, testRun); s.player.attackTimer = 10;
    const batThug = spawnEnemy(s, 'fastThug', testRun, { x: s.player.x + 42, y: s.player.y }); batThug.speed = 0; s.enemies.push(batThug);
    steps(s, 1);
    expect(batThug.attackState).toBe('melee-telegraph');
    expect(s.player.health).toBe(BLUE_PINWHEEL.maxHealth);
    expect(s.projectiles.filter(projectile => projectile.owner === 'enemy')).toHaveLength(0);
    steps(s, 20);
    expect(batThug.attackState).toBe('melee-swing');
    expect(s.player.health).toBe(BLUE_PINWHEEL.maxHealth - batThug.damage);
    steps(s, 8);
    expect(batThug.attackState).toBe('recovering');
  });

  it('lets only one of multiple simultaneous contacts damage the player during invulnerability', () => {
    const s = createGame(122, testRun); s.player.attackTimer = 10;
    for (let i = 0; i < 4; i++) { const thug = spawnEnemy(s, i % 2 ? 'fastThug' : 'thug', testRun, { x: s.player.x, y: s.player.y }); thug.health = 1000; thug.maxHealth = 1000; s.enemies.push(thug); }
    steps(s, 1); expect(s.player.health).toBeCloseTo(BLUE_PINWHEEL.maxHealth - ENEMIES.thug.damage * 0.72);
  });

  it('knocks ordinary enemies away after a hit', () => {
    const s = createGame(13, testRun); const e = spawnEnemy(s, 'thug', testRun, { x: s.player.x + 45, y: s.player.y }); s.enemies.push(e);
    steps(s, 45); expect(e.knockback.x).toBeGreaterThanOrEqual(-1); expect(e.x).toBeLessThan(s.player.x + 45);
  });

  it('spawns enemies away from the player and within arena bounds', () => {
    const s = createGame(14, testRun);
    for (let i = 0; i < 100; i++) { const e = spawnEnemy(s, i % 2 ? 'fastThug' : 'thug', testRun); expect(Math.hypot(e.x - s.player.x, e.y - s.player.y)).toBeGreaterThanOrEqual(180); expect(e.x).toBeGreaterThanOrEqual(e.radius); expect(e.x).toBeLessThanOrEqual(testRun.arenaWidth - e.radius); expect(e.y).toBeGreaterThanOrEqual(e.radius); expect(e.y).toBeLessThanOrEqual(testRun.arenaHeight - e.radius); expect(isWalkable(s.stage, e.x, e.y, e.radius)).toBe(true); }
  });

  it('distributes generated enemies across camera-adjacent street regions for multiple seeds', () => {
    const edges = { top: 0, right: 0, bottom: 0, left: 0 };
    for (const seed of [1, 14, 987, 2026, 0xdeadbeef]) {
      const s = createGame(seed, testRun);
      for (let i = 0; i < 200; i++) {
        const e = spawnEnemy(s, 'thug', testRun);
        if (e.y <= 220) edges.top++;
        else if (e.x >= s.player.x + 400) edges.right++;
        else if (e.y >= 980) edges.bottom++;
        else if (e.x <= s.player.x - 400) edges.left++;
        else throw new Error(`spawn was not on a camera-adjacent valid street region: ${e.x}, ${e.y}`);
      }
    }
    expect(edges.top).toBeGreaterThan(40); expect(edges.right).toBeGreaterThan(40);
    expect(edges.bottom).toBeGreaterThan(40); expect(edges.left).toBeGreaterThan(40);
  });

  it('reproduces spawn coordinates independently for multiple seeds', () => {
    for (const seed of [0, 1, 12345, 0xdeadbeef]) {
      const a = createGame(seed, testRun); const b = createGame(seed, testRun);
      const positionsA = Array.from({ length: 40 }, () => { const e = spawnEnemy(a, 'fastThug', testRun); return [e.x, e.y]; });
      const positionsB = Array.from({ length: 40 }, () => { const e = spawnEnemy(b, 'fastThug', testRun); return [e.x, e.y]; });
      expect(positionsA).toEqual(positionsB);
    }
  });

  it('spawns a deterministic multi-enemy horde batch while respecting the active target', () => {
    const run = { ...testRun, horde: { ...testRun.horde, targetCounts: [{ at: 0, count: 12 }], batchMin: 3, batchMax: 3, baseBatchInterval: 0.1, surgeEvery: 1000 } };
    const a = createGame(3301, run); const b = createGame(3301, run); a.spawnTimer = 0; b.spawnTimer = 0;
    steps(a, 1, idle, run); steps(b, 1, idle, run);
    expect(a.enemies).toHaveLength(3);
    expect(a.enemies.map(enemy => [enemy.kind, enemy.x, enemy.y])).toEqual(b.enemies.map(enemy => [enemy.kind, enemy.x, enemy.y]));
    for (let i = 0; i < 100; i++) steps(a, 1, idle, run);
    expect(a.enemies.filter(enemy => enemy.kind !== 'boss').length).toBeLessThanOrEqual(run.horde.maxActive);
  });

  it('introduces the Street Pitcher with a visible windup and one baseball projectile', () => {
    const s = createGame(331, testRun); s.player.attackTimer = 100;
    const gangster = spawnEnemy(s, 'gangster', testRun, { x: s.player.x - 240, y: s.player.y }); gangster.rangedTimer = 0.05; s.enemies.push(gangster);
    steps(s, 1); expect(gangster.attackState).toBe('ranged-telegraph');
    steps(s, 40); const balls = s.projectiles.filter(projectile => projectile.weaponId === 'baseball');
    expect(balls).toHaveLength(1); expect(balls[0]?.owner).toBe('enemy');
  });

  it('keeps all current non-pitcher ordinary enemies melee-only', () => {
    expect(ENEMIES.thug.ranged).toBeUndefined(); expect(ENEMIES.fastThug.ranged).toBeUndefined(); expect(ENEMIES.bruiser.ranged).toBeUndefined();
    const s = createGame(3311, testRun); s.player.attackTimer = 100; s.spawnTimer = 1000;
    for (const kind of ['thug', 'fastThug', 'bruiser'] as const) { const enemy = spawnEnemy(s, kind, testRun, { x: s.player.x - 210, y: s.player.y }); enemy.rangedTimer = 0; s.enemies.push(enemy); }
    steps(s, 240); expect(s.projectiles.filter(projectile => projectile.owner === 'enemy' && projectile.damageSource !== 'boss-projectile')).toHaveLength(0);
  });

  it('uses the bruiser as a slower, more durable enemy archetype', () => {
    const s = createGame(332, testRun); const thug = spawnEnemy(s, 'thug', testRun, { x: s.player.x - 300, y: s.player.y }); const bruiser = spawnEnemy(s, 'bruiser', testRun, { x: s.player.x + 300, y: s.player.y });
    expect(bruiser.health).toBeGreaterThan(thug.health * 2); expect(bruiser.speed).toBeLessThan(thug.speed); expect(bruiser.damage).toBeGreaterThan(thug.damage);
  });

  it('offers ranked attacks and applies a once-only qualifying Pinwheel evolution', () => {
    const s = createGame(333, testRun); s.player.weaponRanks.pinwheel = 5; s.player.powerRank = 2;
    s.status = 'upgrade'; s.levelChoices = 1; s.options = ['evolvePinwheel', 'speed', 'vitality'];
    expect(chooseUpgrade(s, 'evolvePinwheel')).toBe(true); expect(s.player.evolvedPinwheel).toBe(true); expect(s.attacks).toContain('Pinwheel Evolution (Prototype)');
    s.player.attackTimer = 0; s.player.x = 900; s.player.y = 500;
    s.enemies.push(spawnEnemy(s, 'thug', testRun, { x: 1030, y: 500 })); steps(s, 1);
    expect(s.projectiles.find(projectile => projectile.weaponId === 'pinwheel')?.pierce).toBe(3);
  });

  it('spawns periodic surges and keeps ordinary enemy counts bounded at late-run targets', () => {
    const run = { ...testRun, horde: { ...testRun.horde, surgeEvery: 2, surgeDuration: 1, surgeBonus: 10, targetCounts: [{ at: 0, count: 10 }], maxActive: 16, batchMin: 2, batchMax: 4 } };
    const s = createGame(334, run); s.spawnTimer = 0; s.elapsed = 2 - 1 / 60; s.player.attackTimer = 100;
    steps(s, 1, idle, run); expect(s.surgeRemaining).toBeGreaterThan(0); expect(s.surgeCount).toBe(1); expect(s.messages.some(message => message.includes('HORDE SURGE'))).toBe(true);
    s.elapsed = run.duration; s.spawnTimer = 0; for (const enemy of s.enemies) enemy.health = enemy.maxHealth = 1_000_000;
    steps(s, 400, idle, run); expect(s.enemies.filter(enemy => enemy.kind !== 'boss').length).toBeLessThanOrEqual(run.horde.maxActive);
    expect(s.enemies.filter(enemy => enemy.kind !== 'boss').length).toBeGreaterThan(0);
  });

  it('adapts safe spawn throughput to deficits and kill rate within configured per-tick limits', () => {
    const run = { ...testRun, horde: { ...testRun.horde, targetCounts: [{ at: 0, count: 44 }], surgeEvery: 10_000, maxSpawnPerSecond: 20, maxSpawnPerUpdate: 3, batchMin: 2, batchMax: 3, baseBatchInterval: 0.4 } };
    const a = createGame(4001, run); const b = createGame(4001, run);
    a.spawnTimer = 10; b.spawnTimer = 10; b.killRate = 8;
    updateGame(a, 1 / 60, idle, run); updateGame(b, 1 / 60, idle, run);
    expect(b.spawnBudget).toBeGreaterThan(a.spawnBudget);
    const crowded = createGame(4002, run); crowded.player.health = 100_000; crowded.player.invulnerable = 100_000; crowded.spawnBudget = run.horde.maxSpawnPerUpdate; crowded.spawnTimer = 0;
    for (let i = 0; i < 120; i++) { const previous = crowded.enemiesSpawned; updateGame(crowded, 1 / 60, idle, run); expect(crowded.enemiesSpawned - previous).toBeLessThanOrEqual(run.horde.maxSpawnPerUpdate); }
    expect(crowded.enemies.filter(enemy => enemy.kind !== 'boss').length).toBeLessThanOrEqual(44);
    expect(crowded.peakEnemies).toBeGreaterThanOrEqual(20);
  });

  it('fills most of a stationary natural target without deaths, using reproducible mixed enemies', () => {
    const run = { ...testRun, horde: { ...testRun.horde, targetCounts: [{ at: 0, count: 44 }], surgeEvery: 10_000 } };
    const a = createGame(4003, run); const b = createGame(4003, run);
    for (const state of [a, b]) { state.player.health = 100_000; state.player.invulnerable = 100_000; state.player.attackTimer = 100_000; }
    steps(a, 720, idle, run); steps(b, 720, idle, run);
    expect(a.enemies.length).toBeGreaterThanOrEqual(38);
    expect(a.enemies.length).toBeLessThanOrEqual(44);
    expect(a.enemies.map(enemy => [enemy.kind, Math.round(enemy.x), Math.round(enemy.y)])).toEqual(b.enemies.map(enemy => [enemy.kind, Math.round(enemy.x), Math.round(enemy.y)]));
    const composition = new Set(a.enemies.map(enemy => enemy.kind));
    expect(composition.has('thug')).toBe(true);
    expect(a.spawnPlacementFallbacks).toBeLessThan(12);
  }, 10_000);

  it('announces a reproducible surge direction and safely forms its group on that side', () => {
    const run = { ...testRun, horde: { ...testRun.horde, surgeEvery: 2, targetCounts: [{ at: 0, count: 20 }], maxSpawnPerUpdate: 4 } };
    const a = createGame(4004, run); const b = createGame(4004, run);
    for (const state of [a, b]) { state.elapsed = 2 - 1 / 60; state.spawnTimer = 0; state.spawnBudget = 4; state.player.attackTimer = 100_000; }
    updateGame(a, 1 / 60, idle, run); updateGame(b, 1 / 60, idle, run);
    expect(a.surgeDirection).toBe(b.surgeDirection);
    const cardinalName = { left: 'WEST', right: 'EAST', top: 'NORTH', bottom: 'SOUTH' }[a.surgeDirection];
    expect(a.messages.at(-1)).toContain(`FROM THE ${cardinalName}`);
    expect(a.enemies.length).toBeGreaterThan(0);
    for (const enemy of a.enemies) expect(Math.hypot(enemy.x - a.player.x, enemy.y - a.player.y)).toBeGreaterThan(170);
    expect(a.enemies.map(enemy => [enemy.kind, Math.round(enemy.x), Math.round(enemy.y)])).toEqual(b.enemies.map(enemy => [enemy.kind, Math.round(enemy.x), Math.round(enemy.y)]));
  });

  it('drops persistent XP at a defeat location and awards it only after close collection', () => {
    const s = createGame(15, testRun); s.spawnTimer = 1000; s.player.attackTimer = 1000;
    const e = spawnEnemy(s, 'thug', testRun, { x: s.player.x + 220, y: s.player.y }); e.health = 1; s.enemies.push(e);
    applyEnemyDamage(s, e, 1, { x: 1, y: 0 }, testRun); const drop = s.pickups[0]!;
    expect(e.dead).toBe(true); expect(s.kills).toBe(1); expect(s.player.xp).toBe(0); expect(drop.value).toBe(e.xp); expect(s.xpSpawned).toBe(e.xp);
    const droppedAt = { x: drop.x, y: drop.y }; steps(s, 1); expect(drop.x).toBe(droppedAt.x); expect(drop.y).toBe(droppedAt.y); expect(s.xpCollected).toBe(0);
    s.player.x = drop.x - 28; s.player.y = drop.y; steps(s, 30);
    expect(s.pickups).toHaveLength(0); expect(s.player.xp).toBe(e.xp); expect(s.xpCollected).toBe(e.xp);
  });

  it('merges nearby XP pickups while preserving their total value', () => {
    const s = createGame(151, testRun); s.pickupMergeTimer = 0;
    s.pickups.push({ id: 800, x: s.player.x + 190, y: s.player.y, value: 12 }, { id: 801, x: s.player.x + 205, y: s.player.y + 4, value: 16 });
    mergeNearbyPickups(s);
    expect(s.pickups).toHaveLength(1); expect(s.pickups[0]?.value).toBe(28); expect(s.xpPilesMerged).toBe(1); expect(s.xpLost).toBe(0);
  });

  it('keeps distant XP stationary and blocks attraction across buildings', () => {
    const s = createGame(152, testRun); s.spawnTimer = 1000; s.player.attackTimer = 1000;
    const pickup = { id: 802, x: s.player.x + 140, y: s.player.y, value: 20, pullSpeed: 0 }; s.pickups.push(pickup);
    steps(s, 1); expect(pickup.x).toBe(s.player.x + 140); expect(s.player.xp).toBe(0);
    expect(s.player.pickupRadius).toBe(72);
  });

  it('conserves XP through a pickup-heavy run while distant piles remain on the map', () => {
    const s = createGame(153, testRun); s.spawnTimer = 10_000; s.player.attackTimer = 10_000;
    for (let i = 0; i < 300; i++) {
      const enemy = spawnEnemy(s, i % 3 === 0 ? 'bruiser' : 'thug', testRun, { x: 120 + (i % 20) * 78, y: 100 + Math.floor(i / 20) * 58 });
      applyEnemyDamage(s, enemy, enemy.health, { x: 1, y: 0 }, testRun);
    }
    const spawned = s.xpSpawned;
    expect(s.pickups.length).toBeGreaterThan(100);
    steps(s, 360);
    const remaining = s.pickups.reduce((sum, pile) => sum + pile.value, 0);
    expect(s.xpCollected + remaining + s.xpLost).toBe(spawned);
    expect(s.pickups.length).toBeGreaterThan(100);
  }, 10_000);

  it('levels up and pauses until a valid upgrade is selected', () => {
    const s = createGame(16, testRun); s.pickups.push({ id: 90, x: s.player.x, y: s.player.y, value: 30 }); steps(s, 1);
    expect(s.status).toBe('upgrade'); expect(s.player.level).toBe(2); expect(s.options).toHaveLength(3); expect(new Set(s.options).size).toBe(3);
    expect(s.options.some(id => ['vitality', 'speed', 'magnet'].includes(id))).toBe(true);
    expect(s.options.some(id => ['damage', 'tempo', 'extra', 'power'].includes(id))).toBe(true);
    expect(s.options).not.toContain('evolvePinwheel');
    const selected = choice(s); expect(chooseUpgrade(s, selected)).toBe(true); expect(s.status).toBe('playing');
  });

  it('offers unranked prototype attack paths before repeating a starter weapon rank', () => {
    const s = createGame(161, testRun); s.pickups.push({ id: 160, x: s.player.x, y: s.player.y, value: 30 }); steps(s, 1);
    expect(s.options).toContain('orbit'); expect(chooseUpgrade(s, 'orbit')).toBe(true);
    s.pickups.push({ id: 161, x: s.player.x, y: s.player.y, value: 100 }); steps(s, 1);
    expect(s.status).toBe('upgrade'); expect(s.options).toContain('piercingThrow');
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
    s.levelChoices = 1; s.options = ['recovery', 'damage', 'magnet']; s.status = 'upgrade'; chooseUpgrade(s, 'recovery'); expect(s.player.healthRegen).toBe(0.45);
  });

  it('raises the short XP attraction range by a capped 20 units per Magnet rank', () => {
    const s = createGame(181, testRun); expect(s.player.pickupRadius).toBe(72);
    s.status = 'upgrade'; s.levelChoices = 1; s.options = ['magnet', 'speed', 'vitality'];
    expect(chooseUpgrade(s, 'magnet')).toBe(true); expect(s.player.pickupRadius).toBe(92);
    s.player.pickupRadius = 155; s.status = 'upgrade'; s.levelChoices = 1; s.options = ['magnet', 'speed', 'vitality'];
    chooseUpgrade(s, 'magnet'); expect(s.player.pickupRadius).toBe(160);
  });

  it('calculates explicit current and next skill ranks for weapons and passives', () => {
    const s = createGame(182, testRun); s.chosen.push('magnet', 'magnet', 'damage');
    expect(getUpgradeRankProgress('pinwheel', s.player, s.chosen).label).toBe('LEVEL 1 → LEVEL 2');
    expect(getUpgradeRankProgress('magnet', s.player, s.chosen).label).toBe('LEVEL 2 → LEVEL 3');
    expect(getUpgradeRankProgress('piercingThrow', s.player, s.chosen).label).toBe('NEW · LEVEL 1');
    expect(getUpgradeRankProgress('extra', s.player, ['extra', 'extra', 'extra', 'extra']).label).toBe('MAX LEVEL');
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
    expect(BLUE_PINWHEEL.animation.anchor).toEqual({ x: 0.5, y: 1 }); expect(BLUE_PINWHEEL.animation.mirrorLeft).toBe(true);
    expect(BLUE_PINWHEEL.animation.move.frameWidth).toBe(543); expect(BLUE_PINWHEEL.animation.move.frameCount).toBe(4);
    expect(BLUE_PINWHEEL.animation.verticalFacingFallback).toContain('right-facing profile');
    const a = createGame(987, testRun); const b = createGame(987, testRun); const seqA = Array.from({ length: 8 }, () => [random(a), random(a)]); const seqB = Array.from({ length: 8 }, () => [random(b), random(b)]); expect(seqA).toEqual(seqB);
    const spawnA = createGame(987, testRun); const spawnB = createGame(987, testRun); expect(Array.from({ length: 8 }, () => { const e = spawnEnemy(spawnA, 'thug', testRun); return [e.x, e.y]; })).toEqual(Array.from({ length: 8 }, () => { const e = spawnEnemy(spawnB, 'thug', testRun); return [e.x, e.y]; }));
  });

  it('uses a bounded timestep and has separate standard and test durations', () => {
    const s = createGame(23, testRun); updateGame(s, 10, idle, testRun); expect(s.elapsed).toBeLessThanOrEqual(0.051); expect(standardRun.duration).toBeGreaterThan(testRun.duration);
  });

  it('dashes with a cooldown and temporary invulnerability', () => {
    const s = createGame(24, testRun); const x = s.player.x;
    updateGame(s, 1 / 60, { x: 1, y: 0, dash: true, special: false }, testRun);
    expect(s.player.x - x).toBeGreaterThan(s.player.speed / 60); expect(s.player.dashCooldown).toBeGreaterThan(2.6); expect(s.player.invulnerable).toBeGreaterThan(0);
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
    const s = createGame(27, testRun); s.player.attackTimer = 100;
    const boss = spawnEnemy(s, 'boss', testRun, { x: s.player.x + 300, y: s.player.y }); boss.phase = GANG_LEADER.rangedTelegraphStart - 0.01; s.enemies.push(boss);
    steps(s, 1); expect(boss.attackState).toBe('ranged-telegraph'); expect(boss.attackDirection.x).toBeLessThan(0);
    steps(s, 45); expect(s.projectiles.some(projectile => projectile.owner === 'enemy')).toBe(true); expect(boss.attackState).toBe('recovering');
  });

  it('telegraphs and lands a single damaging boss charge', () => {
    const s = createGame(271, testRun); s.player.attackTimer = 100;
    const boss = spawnEnemy(s, 'boss', testRun, { x: s.player.x + 70, y: s.player.y }); boss.phase = GANG_LEADER.chargeStart - 0.01; s.enemies.push(boss);
    steps(s, 1); expect(boss.attackState).toBe('charge-telegraph'); expect(boss.attackDirection.x).toBeLessThan(0); expect(s.player.health).toBe(BLUE_PINWHEEL.maxHealth);
    const expectedDamage = GANG_LEADER.contactDamage * 0.72;
    steps(s, 51); expect(boss.attackState).toBe('charging'); expect(s.player.health).toBeCloseTo(BLUE_PINWHEEL.maxHealth - expectedDamage);
    steps(s, 10); expect(s.player.health).toBeCloseTo(BLUE_PINWHEEL.maxHealth - expectedDamage); expect(s.damageTaken['boss-charge']).toBeCloseTo(expectedDamage);
  });

  it('applies hostile projectile damage using the rendered collision radius', () => {
    const s = createGame(272, testRun); s.player.attackTimer = 100;
    s.projectiles.push({ id: 991, x: s.player.x, y: s.player.y, vx: 0, vy: 0, damage: GANG_LEADER.rangedDamage, life: 1, pierce: 0, hitIds: [], special: false, owner: 'enemy', spin: 0 });
    steps(s, 1); expect(s.player.health).toBe(BLUE_PINWHEEL.maxHealth - GANG_LEADER.rangedDamage); expect(s.projectiles.some(x => x.id === 991)).toBe(false);
  });

  it('shows overtime at the run target and resolves an escaped boss after the grace period', () => {
    const run = { ...testRun, duration: 2, bossAt: 1, overtimeLimit: 1 };
    const s = createGame(273, run); s.spawnTimer = 10_000; s.player.attackTimer = 10_000; s.player.health = 100_000;
    steps(s, 120, idle, run); expect(s.elapsed).toBeCloseTo(2); expect(s.status).toBe('playing'); expect(s.enemies.some(e => e.kind === 'boss')).toBe(true);
    steps(s, 59, idle, run); expect(s.status).toBe('playing');
    steps(s, 2, idle, run); expect(s.status).toBe('defeat'); expect(s.endReason).toBe('boss-escaped');
  });

  it('cleans up expired projectiles and defeated enemies', () => {
    const s = createGame(28, testRun); s.projectiles.push({ id: 999, x: 10, y: 10, vx: 0, vy: 0, damage: 1, life: 0.001, pierce: 0, hitIds: [], special: false, owner: 'player', spin: 0 });
    const e = spawnEnemy(s, 'thug', testRun, { x: s.player.x + 30, y: s.player.y }); e.health = 1; s.enemies.push(e); steps(s, 80);
    expect(s.projectiles.some(projectile => projectile.id === 999)).toBe(false); expect(s.enemies.includes(e)).toBe(false); expect(s.player.xp).toBeGreaterThan(0);
  });

  it('compares Normal and Heroic horde outcomes across reproducible seeds', () => {
    const observations: Array<Record<string, unknown>> = [];
    const strategies: Array<{ seed: number; strategy: UpgradeId[] }> = [
      { seed: 1741, strategy: ['piercingThrow', 'orbit', 'damage', 'tempo', 'power', 'pinwheel', 'vitality', 'recovery', 'speed', 'extra', 'magnet'] },
      { seed: 42, strategy: ['vitality', 'recovery', 'speed', 'orbit', 'piercingThrow', 'power', 'damage', 'tempo', 'pinwheel', 'extra', 'magnet'] },
      { seed: 2026, strategy: ['orbit', 'piercingThrow', 'vitality', 'recovery', 'power', 'pinwheel', 'damage', 'tempo', 'speed', 'extra', 'magnet'] },
    ];
    const scenarios = strategies.flatMap(scenario => (['normal', 'heroic'] as const).map(difficulty => ({ ...scenario, difficulty })));
    for (const { seed, strategy, difficulty } of scenarios) {
      const run = { ...standardRun, difficulty };
      const s = createGame(seed, run);
      const hordeSamples: Array<Record<string, unknown>> = []; const sampleTimes = [15, 30, 60, 90, 120, 150]; let nextSample = 0;
      let guard = 0;
      while (s.status === 'playing' || s.status === 'upgrade') {
        if (s.status === 'upgrade') {
          const selected = strategy.find(id => s.options.includes(id)) ?? s.options[0];
          if (!selected || !chooseUpgrade(s, selected)) throw new Error('A generated level-up had no valid selection');
        } else {
          const angle = s.elapsed * 0.5;
          updateGame(s, 1 / 60, { x: Math.cos(angle), y: Math.sin(angle), dash: true, special: true }, run);
          if (nextSample < sampleTimes.length && s.elapsed >= (sampleTimes[nextSample] ?? Number.POSITIVE_INFINITY)) {
            const composition = s.enemies.reduce<Record<string, number>>((counts, enemy) => { counts[enemy.kind] = (counts[enemy.kind] ?? 0) + 1; return counts; }, {});
            hordeSamples.push({ time: s.elapsed, active: s.enemies.filter(enemy => enemy.kind !== 'boss').length, target: s.hordeTarget, deficit: s.hordeDeficit, spawnRate: s.spawnRate, killRate: s.killRate, composition, fallbacks: s.spawnPlacementFallbacks, recycled: s.recycledEnemies }); nextSample++;
          }
        }
        if (++guard > 24_000) throw new Error(`Seed ${seed} exceeded the four-minute simulation bound`);
      }
      observations.push({ seed, difficulty, strategy: strategy.slice(0, 3), elapsed: Math.round(s.elapsed * 100) / 100, status: s.status, level: s.player.level, hp: Math.ceil(s.player.health), maxHp: s.player.maxHealth, kills: s.kills, enemies: s.enemies.length, peakEnemies: s.peakEnemies, spawned: s.enemiesSpawned, belowTargetSeconds: Math.round(s.timeBelowHordeTarget), bossFightSeconds: s.bossFightDuration === null ? null : Math.round(s.bossFightDuration * 100) / 100, damageTaken: s.damageTaken, placementFallbacks: s.spawnPlacementFallbacks, recycled: s.recycledEnemies, weapons: s.player.weaponRanks, evolved: s.player.evolvedPinwheel, hordeSamples });
      expect(Number.isFinite(s.player.health)).toBe(true); expect(s.player.health).toBeGreaterThanOrEqual(0);
      expect(s.enemies.length).toBeLessThanOrEqual(run.horde.maxActive + 1);
    }
    console.info(`STANDARD_SEED_SIM ${JSON.stringify(observations)}`);
  }, 60_000);

  it('measures 25/50/100/150/200 active-enemy loads and keeps entity totals bounded', () => {
    const measurements: Array<{ enemies: number; frames: number; medianMs: number }> = [];
    const performanceRun = { ...testRun, bossAt: 3_600, duration: 7_200 };
    for (const count of [25, 50, 100, 150, 200]) {
      const s = createGame(29, performanceRun); s.spawnTimer = 1_000; s.player.attackTimer = 1_000; s.player.health = 1_000_000; s.player.invulnerable = 1_000;
      for (let i = 0; i < count; i++) { const enemy = spawnEnemy(s, i % 4 === 0 ? 'fastThug' : i % 7 === 0 ? 'bruiser' : 'thug', performanceRun, { x: 48 + (i % 30) * 58, y: 290 + Math.floor(i / 30) * 65 }); enemy.health = 1_000_000; enemy.maxHealth = 1_000_000; s.enemies.push(enemy); }
      steps(s, 60, idle, performanceRun); // Warm V8 and the targeting/collision paths before timing.
      const samples: number[] = [];
      for (let sample = 0; sample < 5; sample++) { const begin = performance.now(); steps(s, 300, idle, performanceRun); samples.push(performance.now() - begin); }
      samples.sort((a, b) => a - b);
      measurements.push({ enemies: s.enemies.length, frames: 300, medianMs: Math.round((samples[2] ?? 0) * 100) / 100 });
      expect(s.enemies).toHaveLength(count); expect(s.projectiles.length).toBeLessThan(20);
    }
    console.info(`SIM_LOAD_300_FRAMES ${JSON.stringify(measurements)}`);
  });

  it('hits enemies across a spatial cell boundary and preserves piercing hit uniqueness', () => {
    const s = createGame(330, testRun); s.player.attackTimer = 10_000; s.spawnTimer = 10_000;
    const first = spawnEnemy(s, 'thug', testRun, { x: s.player.x + 50, y: s.player.y });
    const second = spawnEnemy(s, 'fastThug', testRun, { x: s.player.x + 74, y: s.player.y });
    first.health = second.health = 1_000; first.maxHealth = second.maxHealth = 1_000;
    s.enemies.push(first, second);
    const shot = { id: s.nextId++, x: s.player.x + 62, y: s.player.y, vx: 0, vy: 0, damage: 5, life: 1, pierce: 4, hitIds: [] as number[], special: false, owner: 'player' as const, spin: 0 };
    s.projectiles.push(shot);
    steps(s, 1);
    expect(shot.hitIds).toEqual(expect.arrayContaining([first.id, second.id]));
    const healthAfterFirstHit = [first.health, second.health];
    steps(s, 1);
    expect([first.health, second.health]).toEqual(healthAfterFirstHit);
    expect(new Set(shot.hitIds).size).toBe(shot.hitIds.length);
  });

  it('records only actual damage when the final projectile hit overkills an enemy', () => {
    const s = createGame(331, testRun); s.player.attackTimer = 10_000; s.spawnTimer = 10_000;
    const enemy = spawnEnemy(s, 'thug', testRun, { x: s.player.x + 120, y: s.player.y });
    enemy.health = 5; enemy.maxHealth = 34; s.enemies.push(enemy);
    s.projectiles.push({ id: s.nextId++, x: enemy.x, y: enemy.y, vx: 0, vy: 0, damage: 100, life: 1, pierce: 0, hitIds: [], special: false, owner: 'player', spin: 0 });
    steps(s, 1);
    expect(enemy.dead).toBe(true);
    expect(s.player.damageDealt).toBe(5);
  });
});
