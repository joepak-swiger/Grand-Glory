import { describe, it } from 'vitest';
import { standardRun, type EnemyKind } from '../src/game/definitions';
import { createGame, random, spawnEnemy, updateGame } from '../src/game/simulation';

const enabled = process.env.GG_RUN_PERF === '1';
const kinds: EnemyKind[] = ['thug', 'fastThug', 'gangster', 'bruiser'];
const percentile = (samples: number[], fraction: number): number => samples[Math.min(samples.length - 1, Math.floor((samples.length - 1) * fraction))] ?? 0;

function makeScene(count: number, seed: number) {
  const config = {
    ...standardRun,
    duration: 1_000_000,
    bossAt: 1_000_000,
    overtimeLimit: 1_000_000,
    maxEnemies: 240,
    horde: { ...standardRun.horde, targetCounts: [{ at: 0, count: 0 }], maxActive: 0, batchMin: 0, batchMax: 0, baseBatchInterval: 1_000_000, surgeEvery: 1_000_000, recycleAfter: 1_000_000 },
  };
  const state = createGame(seed, config);
  state.spawnTimer = 1_000_000;
  state.player.attackTimer = 1_000_000;
  state.player.piercingTimer = 1_000_000;
  state.player.health = state.player.maxHealth = 1_000_000;
  state.player.pickupRadius = 1;
  state.pickupMergeTimer = 1_000_000;
  // A seeded radial crowd fills the visible street and surrounding camera area.
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const jitter = random(state);
    const radius = 90 + Math.sqrt(jitter) * 410;
    const kind = kinds[i % kinds.length]!;
    const enemy = spawnEnemy(state, kind, config, {
      x: Math.max(30, Math.min(config.arenaWidth - 30, state.player.x + Math.cos(angle) * radius)),
      y: Math.max(290, Math.min(748, state.player.y + Math.sin(angle) * radius * 0.42)),
    });
    enemy.health = enemy.maxHealth = 10_000;
    enemy.hitFlash = (i % 5) * 0.03;
    enemy.animationTime = random(state) * 2;
    state.enemies.push(enemy);
  }
  // Persistent seeded shots, pickups, and float labels exercise the same update paths as combat.
  const playerShots = Math.max(12, Math.floor(count * 0.25));
  for (let i = 0; i < playerShots; i++) state.projectiles.push({ id: state.nextId++, x: 25 + (i % 120) * 13, y: 282, vx: 110 + (i % 3) * 20, vy: 0, damage: 12, life: 1000, pierce: 2, hitIds: [], special: false, owner: 'player', spin: i, weaponId: 'pinwheel' });
  for (let i = 0; i < Math.max(8, Math.floor(count * 0.12)); i++) state.projectiles.push({ id: state.nextId++, x: 20 + (i % 120) * 13, y: 760, vx: 70, vy: 0, damage: 6, life: 1000, pierce: 0, hitIds: [], special: false, owner: 'enemy', spin: 0, weaponId: 'enemy' });
  for (let i = 0; i < Math.max(12, Math.floor(count * 0.35)); i++) {
    state.pickups.push({ id: state.nextId++, x: state.player.x + 340 + (i % 5) * 24, y: state.player.y + (i % 3) * 18, value: 12 });
  }
  for (let i = 0; i < Math.max(8, Math.floor(count * 0.18)); i++) state.numbers.push({ id: state.nextId++, x: 40 + (i % 130) * 12, y: 320, text: '12', life: 1000 });
  return { state, config };
}

describe('reproducible crowd performance benchmark', () => {
  it.skipIf(!enabled)('reports seeded simulation update distribution for realistic mixed crowds', () => {
    const iterations = Number(process.env.GG_PERF_STEPS ?? 900);
    const warmup = Math.min(120, Math.floor(iterations / 4));
    const rows = [25, 50, 100, 150, 200].map(count => {
      const { state, config } = makeScene(count, 0x475247 + count);
      const input = { x: 0, y: 0, dash: false, special: false };
      for (let i = 0; i < warmup; i++) updateGame(state, 1 / 60, input, config);
      const samples: number[] = [];
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        updateGame(state, 1 / 60, input, config);
        samples.push(performance.now() - start);
      }
      samples.sort((a, b) => a - b);
      return { targetEnemies: count, activeEnemies: state.enemies.length, status: state.status, elapsed: +state.elapsed.toFixed(3), projectiles: state.projectiles.length, pickups: state.pickups.length, damageTexts: state.numbers.length, medianMs: +percentile(samples, 0.5).toFixed(5), p95Ms: +percentile(samples, 0.95).toFixed(5), worstMs: +Math.max(...samples).toFixed(5) };
    });
    console.info(`GG_PERFORMANCE ${JSON.stringify({ node: process.version, platform: process.platform, arch: process.arch, seed: '0x475247 + population', iterations, warmup, rows })}`);
  });

});
