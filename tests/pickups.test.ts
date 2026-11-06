import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ENEMIES, testRun } from '../src/game/definitions';
import { PICKUPS, cacheTierForFortune, rollUtilityDrop } from '../src/game/pickups';
import { applyEnemyDamage, chooseUpgrade, createGame, spawnEliteEnemy, spawnEnemy, spawnPickup, updateGame, type InputState, type Pickup } from '../src/game/simulation';

const idle: InputState = { x: 0, y: 0, dash: false, special: false };
function tick(state: ReturnType<typeof createGame>, count: number, config = testRun): void {
  for (let i = 0; i < count; i++) updateGame(state, 1 / 60, idle, config);
}

describe('supply pickup registry and Dr. Smile art frames', () => {
  it('has distinct pickup definitions, bounded utility drops, and Fortune-aware cache tiers', () => {
    expect(PICKUPS['recovery-rations'].category).toBe('recovery');
    expect(PICKUPS['xp-recall'].category).toBe('collection');
    expect(PICKUPS['inferno-curry'].durationSeconds).toBe(8);
    expect(PICKUPS['field-cache'].maxActive).toBe(4);
    expect(rollUtilityDrop('ordinary', 'normal', 0, 0.99)).toBeNull();
    expect(rollUtilityDrop('ordinary', 'normal', 0, 0)).toBe('recovery-rations');
    expect(rollUtilityDrop('ordinary', 'heroic', 0, 0.009)).toBeNull();
    expect(cacheTierForFortune(0, 0.5)).toBe('field-cache');
    expect(cacheTierForFortune(5, 0.4)).toBe('hero-cache');
  });

  it('matches Smiler and Molar frame metadata to the processed PNG dimensions', () => {
    for (const kind of ['smiler', 'molar'] as const) {
      const clip = ENEMIES[kind].animation!;
      const url = new URL(`../public${clip.asset}`, import.meta.url);
      const png = readFileSync(url);
      const width = png.readUInt32BE(16);
      const height = png.readUInt32BE(20);
      expect(width).toBe(clip.frameWidth * clip.frameCount);
      expect(height).toBe(clip.frameHeight);
      expect(clip.frameHeight).toBe(341);
    }
  });

  it('keeps Recovery Rations on the ground when full and heals the greater configured amount on touch', () => {
    const cfg = { ...testRun, horde: { ...testRun.horde, targetCounts: [{ at: 0, count: 0 }], maxActive: 0 } };
    const s = createGame(1201, cfg); s.spawnTimer = 10_000; s.player.attackTimer = 10_000; s.player.piercingTimer = 10_000;
    const ration = spawnPickup(s, 'recovery-rations', { x: s.player.x, y: s.player.y });
    tick(s, 1, cfg);
    expect(s.pickups).toContain(ration);
    s.player.health -= 40;
    tick(s, 1, cfg);
    expect(s.player.health).toBe(s.player.maxHealth - 5);
    expect(s.pickups).not.toContain(ration);
  });

  it('recalls every XP pile once and credits Wisdom only when recall reaches the player', () => {
    const cfg = { ...testRun, horde: { ...testRun.horde, targetCounts: [{ at: 0, count: 0 }], maxActive: 0 } };
    const s = createGame(1202, cfg); s.spawnTimer = 10_000; s.player.attackTimer = 10_000; s.player.piercingTimer = 10_000;
    s.player.passiveRanks.wisdom = 2;
    s.xpSpawned = 35;
    s.pickups.push({ id: 7001, x: s.player.x + 240, y: s.player.y, value: 20, kind: 'xp' });
    s.pickups.push({ id: 7002, x: s.player.x + 390, y: s.player.y + 120, value: 15, kind: 'xp' });
    spawnPickup(s, 'xp-recall', { x: s.player.x, y: s.player.y });
    tick(s, 1, cfg);
    expect(s.xpCollected).toBe(0);
    expect(s.pickups.filter(p => p.kind === 'xp').every(p => p.recalling)).toBe(true);
    tick(s, 45, cfg);
    expect(s.xpCollected).toBe(35);
    expect(s.player.level).toBe(2);
    expect(s.player.xp + 30).toBeCloseTo(35 * 1.16);
    expect(s.pickups.filter(p => p.kind === 'xp')).toHaveLength(0);
    expect(s.xpCollected).toBe(35);
    expect(s.xpSpawned).toBe(s.xpCollected + s.pickups.reduce((sum, pile) => sum + pile.value, 0) + s.xpLost);
  });

  it('uses an explicit pulse for recalled XP whose direct route crosses a solid building', () => {
    const cfg = { ...testRun, horde: { ...testRun.horde, targetCounts: [{ at: 0, count: 0 }], maxActive: 0 } };
    const s = createGame(1207, cfg); s.spawnTimer = 10_000; s.player.attackTimer = 10_000; s.player.piercingTimer = 10_000;
    const building = s.stage.buildings[0]!;
    const gem: Pickup = { id: 7101, x: (building.x + building.width / 2) * s.stage.cellSize, y: (building.y + building.height / 2) * s.stage.cellSize, value: 10, kind: 'xp' };
    s.xpSpawned = 10; s.pickups.push(gem);
    spawnPickup(s, 'xp-recall', { x: s.player.x, y: s.player.y });
    tick(s, 1, cfg);
    expect(gem.recalling).toBe(true);
    expect(gem.recallBlocked).toBe(true);
    expect(s.xpCollected).toBe(0);
    tick(s, 24, cfg);
    expect(s.xpCollected).toBe(10);
    expect(s.pickups.some(pickup => pickup.id === gem.id)).toBe(false);
    expect(s.xpSpawned).toBe(s.xpCollected + s.pickups.reduce((sum, pile) => sum + pile.value, 0) + s.xpLost);
  });

  it('keeps Curry directional, cooldown-limited, temporary, and shared across heroes', () => {
    const s = createGame(1203, testRun, 'bok-goo'); s.spawnTimer = 10_000; s.player.attackTimer = 10_000;
    s.player.facing = { x: 1, y: 0 }; s.player.infernoCurryTimer = 8;
    const ahead = spawnEnemy(s, 'thug', testRun, { x: s.player.x + 105, y: s.player.y }); ahead.speed = 0;
    const behind = spawnEnemy(s, 'thug', testRun, { x: s.player.x - 105, y: s.player.y }); behind.speed = 0;
    s.enemies.push(ahead, behind);
    tick(s, 1);
    expect(ahead.health).toBeLessThan(ahead.maxHealth);
    expect(behind.health).toBe(behind.maxHealth);
    const damaged = ahead.health; tick(s, 1);
    expect(ahead.health).toBe(damaged);
    tick(s, 60 * 8);
    expect(s.player.infernoCurryTimer).toBe(0);
  });

  it('allows Blue Pinwheel, Bok-Goo, and Da-Ri to use the shared Curry effect', () => {
    const cfg = { ...testRun, horde: { ...testRun.horde, targetCounts: [{ at: 0, count: 0 }], maxActive: 0 } };
    for (const [index, hero] of (['blue-pinwheel', 'bok-goo', 'da-ri'] as const).entries()) {
      const s = createGame(1210 + index, cfg, hero); s.spawnTimer = 10_000; s.player.attackTimer = 10_000; s.player.infernoCurryTimer = 1;
      const target = spawnEnemy(s, 'thug', cfg, { x: s.player.x + 100, y: s.player.y }); target.speed = 0; s.enemies.push(target);
      tick(s, 1, cfg);
      expect(target.health, hero).toBeLessThan(target.maxHealth);
    }
  });

  it('spawns elites with bounded stronger stats and a guaranteed cache on defeat', () => {
    const s = createGame(1204, testRun); s.spawnTimer = 10_000;
    const normal = spawnEnemy(s, 'smiler', testRun, { x: s.player.x + 180, y: s.player.y });
    const elite = spawnEliteEnemy(s, 'smiler', testRun, { x: s.player.x + 240, y: s.player.y });
    s.enemies.push(normal, elite);
    expect(elite.elite).toBe(true);
    expect(elite.maxHealth).toBe(normal.maxHealth * 2);
    applyEnemyDamage(s, elite, elite.health, { x: 1, y: 0 }, testRun);
    expect(s.elitesDefeated).toBe(1);
    expect(s.pickups.some(pickup => pickup.kind === 'field-cache' || pickup.kind === 'hero-cache')).toBe(true);
  });

  it('keeps city supply boxes nonblocking and makes them breakable by real player projectiles', () => {
    const cfg = { ...testRun, horde: { ...testRun.horde, targetCounts: [{ at: 0, count: 0 }], maxActive: 0 } };
    const s = createGame(1205, cfg); s.spawnTimer = 10_000;
    const box = s.props[0]!;
    expect(box.kind).toBe('supply-box');
    const projectile = { id: 9901, x: box.x, y: box.y, vx: 0, vy: 0, damage: box.maxHealth, life: 1, pierce: 0, hitIds: [], special: false, owner: 'player' as const, spin: 0, weaponId: 'pinwheel' as const };
    s.projectiles.push(projectile);
    tick(s, 1, cfg);
    expect(box.destroyed).toBe(true);
    expect(s.projectiles).not.toContain(projectile);
    expect(s.props).toHaveLength(4);
  });

  it('keeps a cache choice paused and applies one valid upgrade before resuming', () => {
    const cfg = { ...testRun, horde: { ...testRun.horde, targetCounts: [{ at: 0, count: 0 }], maxActive: 0 } };
    const s = createGame(1206, cfg); s.spawnTimer = 10_000; s.player.attackTimer = 10_000; s.player.piercingTimer = 10_000;
    spawnPickup(s, 'field-cache', { x: s.player.x, y: s.player.y });
    tick(s, 1, cfg);
    expect(s.status).toBe('upgrade');
    expect(s.supplyCacheTier).toBe('field-cache');
    const upgrade = s.options[0]!;
    expect(chooseUpgrade(s, upgrade)).toBe(true);
    expect(s.status).toBe('playing');
    expect(s.supplyCacheTier).toBeNull();
  });

  it('serializes a cache reward and queued XP level-up without losing the pickup or choice', () => {
    const cfg = { ...testRun, horde: { ...testRun.horde, targetCounts: [{ at: 0, count: 0 }], maxActive: 0 } };
    const s = createGame(1210, cfg); s.spawnTimer = 10_000; s.player.attackTimer = 10_000; s.player.piercingTimer = 10_000;
    s.player.xpNext = 30;
    spawnPickup(s, 'field-cache', { x: s.player.x, y: s.player.y });
    spawnPickup(s, 'xp', { x: s.player.x, y: s.player.y }, 30);

    tick(s, 1, cfg);
    expect(s.status).toBe('upgrade');
    expect(s.supplyCacheTier).toBe('field-cache');
    expect(s.xpCollected).toBe(0);
    expect(s.pickups.some(pickup => pickup.kind === 'xp' && pickup.value === 30)).toBe(true);

    expect(chooseUpgrade(s, s.options[0]!)).toBe(true);
    tick(s, 1, cfg);
    expect(s.xpCollected).toBe(30);
    expect(s.player.level).toBe(2);
    expect(s.status).toBe('upgrade');
    expect(s.supplyCacheTier).toBeNull();
    expect(s.options.length).toBeGreaterThan(0);
  });

  it('opens overlapping supply caches one at a time instead of discarding either reward', () => {
    const cfg = { ...testRun, horde: { ...testRun.horde, targetCounts: [{ at: 0, count: 0 }], maxActive: 0 } };
    const s = createGame(1211, cfg); s.spawnTimer = 10_000; s.player.attackTimer = 10_000; s.player.piercingTimer = 10_000;
    spawnPickup(s, 'field-cache', { x: s.player.x, y: s.player.y });
    spawnPickup(s, 'hero-cache', { x: s.player.x, y: s.player.y });

    tick(s, 1, cfg);
    expect(s.supplyCacheTier).toBe('field-cache');
    expect(s.pickups.some(pickup => pickup.kind === 'hero-cache')).toBe(true);
    expect(chooseUpgrade(s, s.options[0]!)).toBe(true);
    tick(s, 1, cfg);
    expect(s.status).toBe('upgrade');
    expect(s.supplyCacheTier).toBe('hero-cache');
    expect(s.pickups.some(pickup => pickup.kind === 'hero-cache')).toBe(false);
  });
});
