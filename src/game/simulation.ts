import { ATTACKS, BLUE_PINWHEEL, ENEMIES, GANG_LEADER, PINWHEEL_EVOLUTION, standardRun, UPGRADES, type EnemyKind, type GameStatus, type RunConfig, type UpgradeId } from './definitions';
import { SpatialGrid } from './spatial-grid';

export interface Vec { x: number; y: number }
export type HorizontalFacing = 'left' | 'right';
export type WeaponId = 'pinwheel' | 'orbitGuard' | 'piercingThrow';
export interface Player extends Vec { health: number; maxHealth: number; speed: number; healthRegen: number; level: number; xp: number; xpNext: number; invulnerable: number; attackTimer: number; dashTimer: number; dashCooldown: number; special: number; facing: Vec; horizontalFacing: HorizontalFacing; damageBonus: number; extraShots: number; pickupRadius: number; orbit: boolean; orbitTimer: number; damageDealt: number; weaponRanks: Record<WeaponId, number>; powerRank: number; evolvedPinwheel: boolean; piercingTimer: number }
export type BossAttackState = 'idle' | 'ranged-telegraph' | 'charge-telegraph' | 'charging' | 'recovering';
export interface Enemy extends Vec { id: number; kind: EnemyKind; health: number; maxHealth: number; speed: number; damage: number; radius: number; xp: number; knockback: Vec; hitFlash: number; attackState: BossAttackState; attackDirection: Vec; horizontalFacing: HorizontalFacing; animationTime: number; chargeReady: boolean; chargeConnected: boolean; dead: boolean; phase: number; rangedTimer: number; distantTime: number }
export interface Projectile extends Vec { id: number; vx: number; vy: number; damage: number; life: number; pierce: number; hitIds: number[]; special: boolean; owner: 'player' | 'enemy'; spin: number; weaponId?: WeaponId | 'special' | 'enemy' }
export interface Pickup extends Vec { id: number; value: number }
export interface FloatText extends Vec { id: number; text: string; life: number }
export interface SimState {
  status: GameStatus; player: Player; enemies: Enemy[]; projectiles: Projectile[]; pickups: Pickup[]; numbers: FloatText[];
  readonly enemyGrid: SpatialGrid<Enemy>;
  readonly enemyQueryScratch: Enemy[];
  readonly pickupGrid: SpatialGrid<Pickup>;
  readonly pickupQueryScratch: Pickup[];
  elapsed: number; kills: number; bossDefeated: boolean; endReason: 'player-down' | 'boss-escaped' | null; seed: number; nextId: number; spawnTimer: number; levelChoices: number; surgeRemaining: number; surgeCount: number; pickupMergeTimer: number;
  peakEnemies: number; enemiesSpawned: number; spawnWindowCount: number; spawnWindowSeconds: number; spawnRate: number; hordeTarget: number; hordeDeficit: number; timeBelowHordeTarget: number; spawnPlacementFallbacks: number; recycledEnemies: number;
  options: UpgradeId[]; chosen: UpgradeId[]; attacks: string[]; messages: string[]; specialTimer: number;
}
export interface InputState { x: number; y: number; dash: boolean; special: boolean }
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const dist2 = (a: Vec, b: Vec) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
const normalize = (x: number, y: number): Vec => { const m = Math.hypot(x, y); return m > 0 ? { x: x / m, y: y / m } : { x: 0, y: 0 }; };

export function createGame(seed = standardRun.seed, config: RunConfig = standardRun): SimState {
  return {
    status: 'playing', player: { x: config.arenaWidth / 2, y: config.arenaHeight / 2, health: BLUE_PINWHEEL.maxHealth, maxHealth: BLUE_PINWHEEL.maxHealth, speed: BLUE_PINWHEEL.moveSpeed, healthRegen: 0, level: 1, xp: 0, xpNext: 30, invulnerable: 0, attackTimer: 0.25, dashTimer: 0, dashCooldown: 0, special: 0, facing: { x: 1, y: 0 }, horizontalFacing: 'right', damageBonus: 0, extraShots: 0, pickupRadius: 150, orbit: false, orbitTimer: 0, damageDealt: 0, weaponRanks: { pinwheel: 1, orbitGuard: 0, piercingThrow: 0 }, powerRank: 0, evolvedPinwheel: false, piercingTimer: 0.6 },
    enemies: [], projectiles: [], pickups: [], numbers: [], enemyGrid: new SpatialGrid<Enemy>(config.arenaWidth, config.arenaHeight), enemyQueryScratch: [], pickupGrid: new SpatialGrid<Pickup>(config.arenaWidth, config.arenaHeight, 32), pickupQueryScratch: [], elapsed: 0, kills: 0, bossDefeated: false, endReason: null, seed: seed >>> 0, nextId: 1, spawnTimer: 0.25, levelChoices: 0, surgeRemaining: 0, surgeCount: 0, pickupMergeTimer: 0.5, peakEnemies: 0, enemiesSpawned: 0, spawnWindowCount: 0, spawnWindowSeconds: 0, spawnRate: 0, hordeTarget: 0, hordeDeficit: 0, timeBelowHordeTarget: 0, spawnPlacementFallbacks: 0, recycledEnemies: 0, options: [], chosen: [], attacks: [BLUE_PINWHEEL.attackName], messages: [], specialTimer: 0,
  };
}

export function random(state: SimState): number {
  state.seed = (Math.imul(1664525, state.seed) + 1013904223) >>> 0;
  return state.seed / 4294967296;
}

export function movePlayer(player: Player, dx: number, dy: number, dt: number, config: RunConfig): void {
  const dir = normalize(dx, dy);
  if (dir.x || dir.y) player.facing = dir;
  if (dir.x > 0.08) player.horizontalFacing = 'right';
  else if (dir.x < -0.08) player.horizontalFacing = 'left';
  player.x = clamp(player.x + dir.x * player.speed * dt, 28, config.arenaWidth - 28);
  player.y = clamp(player.y + dir.y * player.speed * dt, 288, Math.min(config.arenaHeight - 28, 752));
}

export function spawnEnemy(state: SimState, kind: EnemyKind, config: RunConfig = standardRun, position?: Vec, spatialIndex?: SpatialGrid<Enemy>): Enemy {
  const def = ENEMIES[kind]; let x: number; let y: number;
  if (position) ({ x, y } = position);
  else {
    // Spawn just outside the current camera view so waves enter the street visibly.
    const bounds = { left: 28, right: config.arenaWidth - 28, top: 288, bottom: Math.min(config.arenaHeight - 28, 752) };
    const sample = (): Vec => {
      const side = Math.floor(random(state) * 4); const mx = config.horde.spawnMarginX; const my = config.horde.spawnMarginY;
      const cameraLeft = clamp(state.player.x - 480, bounds.left, bounds.right); const cameraRight = clamp(state.player.x + 480, bounds.left, bounds.right);
      const cameraTop = clamp(state.player.y - 320, bounds.top, bounds.bottom); const cameraBottom = clamp(state.player.y + 320, bounds.top, bounds.bottom);
      if (side === 0) return { x: clamp(cameraLeft - mx - random(state) * 110, bounds.left, bounds.right), y: clamp(cameraTop + random(state) * Math.max(1, cameraBottom - cameraTop), bounds.top, bounds.bottom) };
      if (side === 1) return { x: clamp(cameraRight + mx + random(state) * 110, bounds.left, bounds.right), y: clamp(cameraTop + random(state) * Math.max(1, cameraBottom - cameraTop), bounds.top, bounds.bottom) };
      if (side === 2) return { x: clamp(cameraLeft + random(state) * Math.max(1, cameraRight - cameraLeft), bounds.left, bounds.right), y: clamp(cameraTop - my - random(state) * 90, bounds.top, bounds.bottom) };
      return { x: clamp(cameraLeft + random(state) * Math.max(1, cameraRight - cameraLeft), bounds.left, bounds.right), y: clamp(cameraBottom + my + random(state) * 90, bounds.top, bounds.bottom) };
    };
    const minimumDistanceSquared = 180 ** 2; let safest: Vec | undefined; let chosen: Vec | undefined; let bestClearance = -1;
    const nearby: Enemy[] = [];
    for (let attempt = 0; attempt < 48; attempt++) {
      const candidate = sample(); const playerDistance = dist2(candidate, state.player);
      if (playerDistance < minimumDistanceSquared) continue;
      let nearestEnemyDistance = Number.POSITIVE_INFINITY;
      if (spatialIndex) {
        spatialIndex.queryRadius(candidate.x, candidate.y, 160, nearby);
        for (const enemy of nearby) if (!enemy.dead) nearestEnemyDistance = Math.min(nearestEnemyDistance, dist2(candidate, enemy));
        nearestEnemyDistance = Math.min(nearestEnemyDistance, 160 ** 2);
      } else for (const enemy of state.enemies) if (!enemy.dead) nearestEnemyDistance = Math.min(nearestEnemyDistance, dist2(candidate, enemy));
      if (nearestEnemyDistance > bestClearance) { safest = candidate; bestClearance = nearestEnemyDistance; }
      const safeSpacing = (def.radius + 24) ** 2;
      if (nearestEnemyDistance >= safeSpacing) { chosen = candidate; break; }
    }
    if (!chosen) state.spawnPlacementFallbacks++;
    const spawn = chosen ?? safest ?? { x: (bounds.left + bounds.right) / 2, y: bounds.top };
    x = spawn.x; y = spawn.y;
  }
  state.enemiesSpawned++; state.spawnWindowCount++;
  return { id: state.nextId++, x, y, kind, health: def.health, maxHealth: def.health, speed: def.speed, damage: def.damage, radius: def.radius, xp: def.xp, knockback: { x: 0, y: 0 }, hitFlash: 0, attackState: 'idle', attackDirection: { x: 0, y: 0 }, horizontalFacing: 'right', animationTime: 0, chargeReady: false, chargeConnected: false, dead: false, phase: 0, rangedTimer: 1.2, distantTime: 0 };
}

function updateFacingFromHorizontal(enemy: Enemy, directionX: number): void {
  // Dead zone prevents tiny target changes or near-vertical movement from flickering the sprite.
  if (directionX > 0.08) enemy.horizontalFacing = 'right';
  else if (directionX < -0.08) enemy.horizontalFacing = 'left';
}

function spawnBossForEncounter(state: SimState, config: RunConfig): Enemy {
  // Enter from a visible horizontal side of the street, not beneath the fixed HUD at the top edge.
  const left = 28; const right = config.arenaWidth - 28; const gap = 360;
  const canSpawnLeft = state.player.x - gap >= left; const canSpawnRight = state.player.x + gap <= right;
  const side = canSpawnLeft && canSpawnRight ? (random(state) < 0.5 ? -1 : 1) : canSpawnRight ? 1 : -1;
  const safeTop = Math.min(360, config.arenaHeight - 60); const safeBottom = Math.min(680, config.arenaHeight - 60);
  return spawnEnemy(state, 'boss', config, { x: clamp(state.player.x + side * gap, left, right), y: clamp(state.player.y, safeTop, safeBottom) });
}

export function acquireTarget(state: SimState, range = 520): Enemy | undefined {
  const boss = state.enemies.find(enemy => enemy.kind === 'boss' && !enemy.dead);
  if (boss && dist2(state.player, boss) < range * range) return boss;
  let target: Enemy | undefined; let best = range * range;
  for (const enemy of state.enemies) if (!enemy.dead) { const d = dist2(state.player, enemy); if (d < best) { target = enemy; best = d; } }
  return target;
}

function acquireTargetFromGrid(state: SimState, range: number, nearby: Enemy[]): Enemy | undefined {
  const boss = state.enemies.find(enemy => enemy.kind === 'boss' && !enemy.dead);
  if (boss && dist2(state.player, boss) < range * range) return boss;
  let target: Enemy | undefined; let best = range * range;
  for (const enemy of state.enemyGrid.queryRadius(state.player.x, state.player.y, range, nearby)) {
    if (enemy.dead) continue;
    const d = dist2(state.player, enemy);
    if (d < best) { target = enemy; best = d; }
  }
  return target;
}

function float(state: SimState, text: string, x: number, y: number): void { state.numbers.push({ id: state.nextId++, text, x, y, life: 0.75 }); }
function applyEnemyDamage(state: SimState, enemy: Enemy, damage: number, direction: Vec, config: RunConfig): void {
  if (enemy.dead || enemy.health <= 0) return;
  const actualDamage = Math.min(enemy.health, damage);
  enemy.health = Math.max(0, enemy.health - actualDamage); enemy.hitFlash = 0.16;
  enemy.knockback.x += direction.x * (enemy.kind === 'boss' ? 90 : 230);
  enemy.knockback.y += direction.y * (enemy.kind === 'boss' ? 90 : 230);
  state.player.damageDealt += actualDamage;
  if (enemy.health === 0) { enemy.dead = true; state.kills++; state.pickups.push({ id: state.nextId++, x: enemy.x, y: enemy.y, value: enemy.xp }); if (enemy.kind === 'boss') state.bossDefeated = true; }
  else float(state, `${Math.round(actualDamage)}`, enemy.x, enemy.y - enemy.radius);
  if (enemy.kind !== 'boss') enemy.phase = Math.min(1, enemy.phase + 0.12);
  void config;
}

function launchShot(state: SimState, target: Enemy, damage: number, weaponId: WeaponId | 'special', pierce = 0, special = false): void {
  const dir = normalize(target.x - state.player.x, target.y - state.player.y);
  const spread = state.player.extraShots;
  for (let i = 0; i <= spread; i++) {
    const angle = Math.atan2(dir.y, dir.x) + (i - spread / 2) * 0.18;
    const def = weaponId === 'piercingThrow' ? ATTACKS.piercingThrow : ATTACKS.pinwheel;
    state.projectiles.push({ id: state.nextId++, x: state.player.x, y: state.player.y, vx: Math.cos(angle) * def.projectileSpeed, vy: Math.sin(angle) * def.projectileSpeed, damage, life: def.lifetime, pierce, hitIds: [], special, owner: 'player', spin: 0, weaponId });
  }
}

function populateOptions(state: SimState): void {
  const p = state.player;
  const candidates = UPGRADES.filter(u => {
    if (u.id === 'orbit') return p.weaponRanks.orbitGuard < 5;
    if (u.id === 'piercingThrow') return p.weaponRanks.piercingThrow < 5;
    if (u.id === 'pinwheel') return p.weaponRanks.pinwheel < 5;
    if (u.id === 'evolvePinwheel') return p.weaponRanks.pinwheel >= PINWHEEL_EVOLUTION.requiredWeaponRank && p.powerRank >= PINWHEEL_EVOLUTION.requiredPowerRank && !p.evolvedPinwheel;
    if (u.id === 'recovery') return state.chosen.filter(chosen => chosen === 'recovery').length < 5;
    if (u.id === 'damage' || u.id === 'tempo' || u.id === 'extra' || u.id === 'speed' || u.id === 'vitality' || u.id === 'magnet') return state.chosen.filter(chosen => chosen === u.id).length < (u.id === 'extra' ? 4 : 5);
    if (u.id === 'power') return p.powerRank < 5;
    return false;
  });
  const pool = [...candidates]; state.options = [];
  const groups: UpgradeId[][] = [
    pool.filter(upgrade => ['pinwheel', 'orbit', 'piercingThrow', 'evolvePinwheel'].includes(upgrade.id)).map(upgrade => upgrade.id),
    pool.filter(upgrade => ['vitality', 'recovery', 'speed', 'magnet'].includes(upgrade.id)).map(upgrade => upgrade.id),
    pool.filter(upgrade => ['damage', 'tempo', 'extra', 'power'].includes(upgrade.id)).map(upgrade => upgrade.id),
  ];
  for (const group of groups) {
    if (state.options.length >= 3 || !group.length) continue;
    const vitalityRanks = state.chosen.filter(id => id === 'vitality').length;
    const recoveryRanks = state.chosen.filter(id => id === 'recovery').length;
    const defensivePick = group.includes('vitality') && vitalityRanks < 2 ? 'vitality' : group.includes('recovery') && recoveryRanks < 3 ? 'recovery' : undefined;
    const freshWeapon = group.find(id => (id === 'orbit' && p.weaponRanks.orbitGuard === 0) || (id === 'piercingThrow' && p.weaponRanks.piercingThrow === 0));
    const picked = defensivePick ?? freshWeapon ?? group[Math.floor(random(state) * group.length)];
    if (picked) { state.options.push(picked); const removeIndex = pool.findIndex(upgrade => upgrade.id === picked); if (removeIndex >= 0) pool.splice(removeIndex, 1); }
  }
  while (state.options.length < 3 && pool.length) { const index = Math.floor(random(state) * pool.length); const picked = pool.splice(index, 1)[0]; if (picked) state.options.push(picked.id); }
}
function offerLevel(state: SimState): void {
  state.player.level++;
  state.player.xpNext = Math.round(30 * Math.pow(state.player.level, 1.28));
  state.levelChoices++;
  state.status = 'upgrade';
  populateOptions(state);
}

export function chooseUpgrade(state: SimState, id: UpgradeId): boolean {
  if (state.status !== 'upgrade' || !state.options.includes(id)) return false;
  const p = state.player;
  if (id === 'damage') p.damageBonus += 0.3;
  if (id === 'tempo') p.attackTimer = Math.min(p.attackTimer, 0.25);
  if (id === 'extra') p.extraShots++;
  if (id === 'speed') p.speed *= 1.12;
  if (id === 'vitality') { p.maxHealth += 25; p.health = Math.min(p.maxHealth, p.health + 25); }
  if (id === 'recovery') p.healthRegen += 0.45;
  if (id === 'magnet') p.pickupRadius *= 1.45;
  if (id === 'orbit') { p.weaponRanks.orbitGuard++; p.orbit = true; if (p.weaponRanks.orbitGuard === 1) state.attacks.push('Orbit Guard (Prototype)'); }
  if (id === 'pinwheel') p.weaponRanks.pinwheel++;
  if (id === 'piercingThrow') { p.weaponRanks.piercingThrow++; if (p.weaponRanks.piercingThrow === 1) state.attacks.push(ATTACKS.piercingThrow.name); }
  if (id === 'power') { p.powerRank++; p.damageBonus += 0.15; }
  if (id === 'evolvePinwheel') { p.evolvedPinwheel = true; state.attacks.push(PINWHEEL_EVOLUTION.name); }
  state.chosen.push(id); state.levelChoices--; state.options = [];
  if (state.levelChoices > 0) { state.status = 'upgrade'; populateOptions(state); } else { state.status = 'playing'; while (p.xp >= p.xpNext && state.status === 'playing') { p.xp -= p.xpNext; offerLevel(state); } }
  return true;
}

export function damagePlayer(state: SimState, amount: number): boolean {
  const p = state.player;
  if (state.status !== 'playing' || p.invulnerable > 0 || p.health <= 0 || !Number.isFinite(amount) || amount <= 0) return false;
  p.health = Math.max(0, p.health - amount); p.invulnerable = 0.8;
  if (p.health === 0) { state.status = 'defeat'; state.endReason = 'player-down'; }
  return true;
}

function hordeTargetAt(config: RunConfig, elapsed: number): number {
  const points = config.horde.targetCounts;
  const nextIndex = points.findIndex(point => point.at > elapsed);
  if (nextIndex <= 0) return points[points.length - 1]?.count ?? 0;
  const before = points[nextIndex - 1]!; const after = points[nextIndex]!;
  const t = clamp((elapsed - before.at) / Math.max(0.001, after.at - before.at), 0, 1);
  return Math.round(before.count + (after.count - before.count) * t);
}

function chooseEnemyKind(state: SimState, elapsed: number, bossPhase: boolean): EnemyKind {
  const roll = random(state);
  if (elapsed >= 72 && roll < 0.14) return 'bruiser';
  if (elapsed >= 36 && roll < 0.36) return 'gangster';
  if (elapsed >= 16 && roll < 0.62) return 'fastThug';
  if (bossPhase && roll < 0.5) return 'fastThug';
  return 'thug';
}

function spawnBatch(state: SimState, config: RunConfig, targetCount: number, bossPhase: boolean): void {
  let livingOrdinary = 0;
  for (const enemy of state.enemies) if (!enemy.dead && enemy.kind !== 'boss') livingOrdinary++;
  const pressureCap = bossPhase ? Math.max(1, Math.floor(config.horde.maxActive * 0.68)) : config.horde.maxActive;
  const desired = Math.min(targetCount, pressureCap, config.maxEnemies);
  const deficit = desired - livingOrdinary;
  if (deficit <= 0) return;
  const size = Math.min(deficit, config.horde.batchMin + Math.floor(random(state) * (config.horde.batchMax - config.horde.batchMin + 1)));
  for (let i = 0; i < size; i++) {
    const enemy = spawnEnemy(state, chooseEnemyKind(state, state.elapsed, bossPhase), config, undefined, state.enemyGrid);
    state.enemies.push(enemy);
    state.enemyGrid.insert(enemy);
  }
}

function updateHordeDirector(state: SimState, step: number, config: RunConfig): void {
  const bossPhase = state.elapsed >= config.bossAt;
  const surgeIndex = Math.floor(state.elapsed / config.horde.surgeEvery);
  if (surgeIndex > state.surgeCount && !bossPhase) {
    state.surgeCount = surgeIndex;
    state.surgeRemaining = config.horde.surgeDuration;
    state.messages.push(`HORDE SURGE ${state.surgeCount} · PROTOTYPE`);
  } else state.surgeRemaining = Math.max(0, state.surgeRemaining - step);
  state.spawnTimer -= step;
  if (state.spawnTimer <= 0 && state.elapsed < config.duration + config.overtimeLimit) {
    const baseTarget = hordeTargetAt(config, Math.min(state.elapsed, config.duration));
    const target = baseTarget + (state.surgeRemaining > 0 ? config.horde.surgeBonus : 0);
    spawnBatch(state, config, target, bossPhase);
    const pressure = state.elapsed / Math.max(1, config.duration);
    const haste = state.surgeRemaining > 0 ? 0.68 : 1;
    state.spawnTimer = Math.max(0.32, config.horde.baseBatchInterval * (1 - Math.min(0.45, pressure * 0.34)) * haste);
  }
  const request = hordeTargetAt(config, Math.min(state.elapsed, config.duration)) + (state.surgeRemaining > 0 ? config.horde.surgeBonus : 0);
  const cap = bossPhase ? Math.max(1, Math.floor(config.horde.maxActive * 0.68)) : config.horde.maxActive;
  const desired = Math.min(request, cap, config.maxEnemies);
  let active = 0;
  for (const enemy of state.enemies) if (!enemy.dead && enemy.kind !== 'boss') active++;
  state.hordeTarget = desired;
  state.hordeDeficit = Math.max(0, desired - active);
  state.peakEnemies = Math.max(state.peakEnemies, active);
  if (active < desired) state.timeBelowHordeTarget += step;
  state.spawnWindowSeconds += step;
  if (state.spawnWindowSeconds >= 1) {
    state.spawnRate = state.spawnWindowCount / state.spawnWindowSeconds;
    state.spawnWindowCount = 0; state.spawnWindowSeconds = 0;
  }
}

function fireEnemyVolley(state: SimState, enemy: Enemy, aim: Vec): void {
  for (const offset of [-0.18, 0, 0.18]) {
    const angle = Math.atan2(aim.y, aim.x) + offset;
    state.projectiles.push({ id: state.nextId++, x: enemy.x, y: enemy.y, vx: Math.cos(angle) * 235, vy: Math.sin(angle) * 235, damage: enemy.damage, life: 2.6, pierce: 0, hitIds: [], special: false, owner: 'enemy', spin: 0, weaponId: 'enemy' });
  }
}

function separateEnemies(state: SimState, config: RunConfig): void {
  const enemies = state.enemies; const grid = state.enemyGrid; const nearby = state.enemyQueryScratch;
  grid.rebuild(enemies, enemy => !enemy.dead);
  for (const enemy of enemies) {
    if (enemy.dead) continue;
    grid.queryRadius(enemy.x, enemy.y, 56, nearby);
    for (const other of nearby) {
      if (other.id <= enemy.id || other.dead) continue;
      const dx = other.x - enemy.x; const dy = other.y - enemy.y; const minimum = (enemy.radius + other.radius) * 0.84; const d2 = dx * dx + dy * dy;
      if (d2 >= minimum * minimum) continue;
      const d = Math.sqrt(d2) || 0.001; const push = (minimum - d) * 0.28; const nx = dx / d; const ny = dy / d;
      enemy.x = clamp(enemy.x - nx * push, enemy.radius, config.arenaWidth - enemy.radius); enemy.y = clamp(enemy.y - ny * push, 288, Math.min(752, config.arenaHeight - enemy.radius));
      other.x = clamp(other.x + nx * push, other.radius, config.arenaWidth - other.radius); other.y = clamp(other.y + ny * push, 288, Math.min(752, config.arenaHeight - other.radius));
    }
  }
}

function mergeNearbyPickups(state: SimState): void {
  const grid = state.pickupGrid; const nearby = state.pickupQueryScratch;
  grid.rebuild(state.pickups, pickup => pickup.value > 0);
  for (const pickup of state.pickups) {
    if (pickup.value <= 0) continue;
    for (const other of grid.queryRadius(pickup.x, pickup.y, 28, nearby)) {
      if (other.id <= pickup.id || other.value <= 0 || dist2(pickup, other) > 28 ** 2) continue;
      const total = pickup.value + other.value;
      pickup.x = (pickup.x * pickup.value + other.x * other.value) / total; pickup.y = (pickup.y * pickup.value + other.y * other.value) / total;
      pickup.value = total; other.value = 0;
    }
  }
  let write = 0;
  for (const pickup of state.pickups) if (pickup.value > 0) state.pickups[write++] = pickup;
  state.pickups.length = write;
}

export function updateGame(state: SimState, dt: number, input: InputState, config: RunConfig = standardRun): void {
  if (state.status !== 'playing') return;
  const step = Math.min(dt, 0.05); const p = state.player;
  state.elapsed += step; p.health = Math.min(p.maxHealth, p.health + p.healthRegen * step); p.invulnerable = Math.max(0, p.invulnerable - step); p.dashCooldown = Math.max(0, p.dashCooldown - step); p.dashTimer = Math.max(0, p.dashTimer - step); state.specialTimer = Math.max(0, state.specialTimer - step);
  const startingDash = input.dash && p.dashCooldown === 0;
  if (startingDash) { p.dashTimer = 0.16; p.dashCooldown = 3; p.invulnerable = Math.max(p.invulnerable, 0.22); }
  const dashX = input.x || (startingDash ? p.facing.x : 0); const dashY = input.y || (startingDash ? p.facing.y : 0);
  movePlayer(p, dashX, dashY, step * (p.dashTimer > 0 ? 2.7 : 1), config);
  state.enemyGrid.rebuild(state.enemies, enemy => !enemy.dead);
  const nearbyEnemies = state.enemyQueryScratch;
  if (input.special && p.special >= 100 && state.specialTimer === 0) {
    p.special = 0; state.specialTimer = ATTACKS.special.cooldown; state.messages.push(ATTACKS.special.name);
    for (const e of state.enemyGrid.queryRadius(p.x, p.y, ATTACKS.special.targetRange, nearbyEnemies)) if (!e.dead && dist2(p, e) < ATTACKS.special.targetRange ** 2) applyEnemyDamage(state, e, ATTACKS.special.damage * (1 + p.damageBonus), normalize(e.x - p.x, e.y - p.y), config);
  }
  if (state.elapsed >= config.bossAt && !state.enemies.some(e => e.kind === 'boss' && !e.dead) && !state.bossDefeated) { const boss = spawnBossForEncounter(state, config); state.enemies.push(boss); state.enemyGrid.insert(boss); state.messages.push('GANG LEADER ARRIVED · PROTOTYPE'); }
  updateHordeDirector(state, step, config);
  // Orbit Guard prototype: short-range recurring pulse, visibly separate from the starter projectile.
  p.orbitTimer -= step;
  if (p.orbit && p.orbitTimer <= 0) { const rank = p.weaponRanks.orbitGuard; const rankIndex = Math.max(0, rank - 1); const range = ATTACKS.orbitGuard.targetRange + (rank - 1) * 7; p.orbitTimer = ATTACKS.orbitGuard.cooldown * (ATTACKS.orbitGuard.rankCooldown?.[rankIndex] ?? 1); for (const e of state.enemyGrid.queryRadius(p.x, p.y, range, nearbyEnemies)) if (!e.dead && dist2(p, e) < range ** 2) applyEnemyDamage(state, e, ATTACKS.orbitGuard.damage * (1 + p.damageBonus) * (ATTACKS.orbitGuard.rankDamage?.[rankIndex] ?? 1), normalize(e.x - p.x, e.y - p.y), config); }
  p.attackTimer -= step;
  if (p.attackTimer <= 0) {
    const target = acquireTargetFromGrid(state, ATTACKS.pinwheel.targetRange, nearbyEnemies);
    if (target) {
      const rank = p.weaponRanks.pinwheel;
      const rankIndex = Math.max(0, rank - 1);
      const damage = ATTACKS.pinwheel.damage * (1 + p.damageBonus) * (ATTACKS.pinwheel.rankDamage?.[rankIndex] ?? 1);
      const pierce = (ATTACKS.pinwheel.rankPierce?.[rankIndex] ?? 0) + (p.evolvedPinwheel ? PINWHEEL_EVOLUTION.bonusPierce : 0);
      launchShot(state, target, damage, 'pinwheel', pierce);
      p.attackTimer = Math.max(0.24, ATTACKS.pinwheel.cooldown * Math.pow(0.8, state.chosen.filter(x => x === 'tempo').length) * (ATTACKS.pinwheel.rankCooldown?.[rankIndex] ?? 1) * (p.evolvedPinwheel ? PINWHEEL_EVOLUTION.cooldownMultiplier : 1));
    }
  }
  if (p.weaponRanks.piercingThrow > 0) {
    p.piercingTimer -= step;
    if (p.piercingTimer <= 0) {
      const target = acquireTargetFromGrid(state, ATTACKS.piercingThrow.targetRange, nearbyEnemies);
      if (target) {
        const rank = p.weaponRanks.piercingThrow;
        const rankIndex = Math.max(0, rank - 1);
        launchShot(state, target, ATTACKS.piercingThrow.damage * (1 + p.damageBonus) * (ATTACKS.piercingThrow.rankDamage?.[rankIndex] ?? 1), 'piercingThrow', ATTACKS.piercingThrow.rankPierce?.[rankIndex] ?? ATTACKS.piercingThrow.pierce ?? 0);
        p.piercingTimer = ATTACKS.piercingThrow.cooldown * (ATTACKS.piercingThrow.rankCooldown?.[rankIndex] ?? 1);
      }
    }
  }
  for (const shot of state.projectiles) {
    shot.x += shot.vx * step; shot.y += shot.vy * step; shot.life -= step; shot.spin += step * 16;
    if (shot.owner === 'player') for (const e of state.enemyGrid.queryRadius(shot.x, shot.y, GANG_LEADER.radius + 9, nearbyEnemies)) if (!e.dead && !shot.hitIds.includes(e.id) && dist2(shot, e) < (e.radius + 9) ** 2) { applyEnemyDamage(state, e, shot.damage, normalize(e.x - p.x, e.y - p.y), config); shot.hitIds.push(e.id); if (shot.pierce > 0) shot.pierce--; else { shot.life = 0; break; } }
  }
  let writeProjectiles = 0;
  for (const shot of state.projectiles) if (shot.life > 0 && shot.x > 0 && shot.y > 0 && shot.x < config.arenaWidth && shot.y < config.arenaHeight) state.projectiles[writeProjectiles++] = shot;
  state.projectiles.length = writeProjectiles;
  for (const enemy of state.enemies) {
    if (enemy.dead) continue;
    const toward = normalize(p.x - enemy.x, p.y - enemy.y);
    enemy.animationTime += step;
    const dx = enemy.x - p.x; const dy = enemy.y - p.y; const d = Math.hypot(dx, dy);
    if (enemy.kind === 'boss') {
      const previousPhase = enemy.phase % GANG_LEADER.phaseLength;
      enemy.phase += step;
      const phase = enemy.phase % GANG_LEADER.phaseLength;
      const beginsSegment = (start: number) => previousPhase < start && phase >= start;
      if (phase >= GANG_LEADER.rangedTelegraphStart && phase < GANG_LEADER.rangedTelegraphEnd) {
        if (beginsSegment(GANG_LEADER.rangedTelegraphStart)) enemy.attackDirection = normalize(p.x - enemy.x, p.y - enemy.y);
        enemy.attackState = 'ranged-telegraph';
      } else if (previousPhase < GANG_LEADER.rangedTelegraphEnd && phase >= GANG_LEADER.rangedTelegraphEnd) {
        const aim = enemy.attackDirection;
        state.projectiles.push({ id: state.nextId++, x: enemy.x, y: enemy.y, vx: aim.x * GANG_LEADER.rangedSpeed, vy: aim.y * GANG_LEADER.rangedSpeed, damage: GANG_LEADER.rangedDamage, life: 2, pierce: 0, hitIds: [], special: false, owner: 'enemy', spin: 0, weaponId: 'enemy' });
        enemy.attackState = 'recovering';
      } else if (phase >= GANG_LEADER.chargeStart && phase < GANG_LEADER.chargeEnd) {
        if (beginsSegment(GANG_LEADER.chargeStart)) { enemy.chargeReady = d < GANG_LEADER.chargeRange; enemy.chargeConnected = false; if (enemy.chargeReady) enemy.attackDirection = normalize(p.x - enemy.x, p.y - enemy.y); }
        enemy.attackState = enemy.chargeReady ? 'charge-telegraph' : 'idle';
      } else if (phase >= GANG_LEADER.chargeEnd && phase < GANG_LEADER.chargeActiveEnd) {
        if (enemy.chargeReady) { enemy.x += enemy.attackDirection.x * GANG_LEADER.chargeSpeed * step; enemy.y += enemy.attackDirection.y * GANG_LEADER.chargeSpeed * step; enemy.attackState = 'charging'; }
        else enemy.attackState = 'idle';
      } else if (phase >= GANG_LEADER.rangedTelegraphEnd && phase < GANG_LEADER.recoveryEnd) enemy.attackState = 'recovering';
      else enemy.attackState = 'idle';
      if (enemy.attackState === 'ranged-telegraph' || enemy.attackState === 'charge-telegraph' || enemy.attackState === 'charging' || enemy.attackState === 'recovering') updateFacingFromHorizontal(enemy, enemy.attackDirection.x);
      else updateFacingFromHorizontal(enemy, toward.x);
      if (enemy.attackState === 'idle' && d > 125) { enemy.x += toward.x * enemy.speed * step; enemy.y += toward.y * enemy.speed * step; }
      if (enemy.attackState === 'charging' && !enemy.chargeConnected && Math.hypot(enemy.x - p.x, enemy.y - p.y) < enemy.radius + 18) {
        enemy.chargeConnected = true;
        damagePlayer(state, GANG_LEADER.contactDamage);
      }
    } else if (ENEMIES[enemy.kind].ranged) {
      enemy.rangedTimer -= step; enemy.phase = Math.max(0, enemy.phase - step);
      if (enemy.rangedTimer <= 0) { fireEnemyVolley(state, enemy, enemy.attackDirection); enemy.rangedTimer = 2.8; enemy.phase = 0.38; enemy.attackState = 'recovering'; }
      else if (enemy.phase > 0) enemy.attackState = 'recovering';
      else if (enemy.rangedTimer <= 0.46) { if (enemy.attackState !== 'ranged-telegraph') enemy.attackDirection = toward; enemy.attackState = 'ranged-telegraph'; }
      else enemy.attackState = 'idle';
      updateFacingFromHorizontal(enemy, enemy.attackState === 'ranged-telegraph' ? enemy.attackDirection.x : toward.x);
      const preferred = ENEMIES[enemy.kind].preferredRange ?? 250;
      if (d > preferred + 24) { enemy.x += toward.x * enemy.speed * step; enemy.y += toward.y * enemy.speed * step; }
      else if (d < preferred - 36) { enemy.x -= toward.x * enemy.speed * 0.72 * step; enemy.y -= toward.y * enemy.speed * 0.72 * step; }
    } else { updateFacingFromHorizontal(enemy, toward.x); enemy.x += toward.x * enemy.speed * step; enemy.y += toward.y * enemy.speed * step; }
    enemy.x += enemy.knockback.x * step; enemy.y += enemy.knockback.y * step; enemy.knockback.x *= Math.exp(-9 * step); enemy.knockback.y *= Math.exp(-9 * step); enemy.hitFlash = Math.max(0, enemy.hitFlash - step);
    enemy.x = clamp(enemy.x, enemy.radius, config.arenaWidth - enemy.radius); enemy.y = clamp(enemy.y, 288, Math.min(752, config.arenaHeight - enemy.radius));
    const distance = Math.hypot(enemy.x - p.x, enemy.y - p.y);
    if (distance < enemy.radius + 18 && enemy.kind !== 'boss') damagePlayer(state, enemy.damage);
    if (enemy.kind !== 'boss' && distance > 940) enemy.distantTime += step; else enemy.distantTime = 0;
    if (enemy.distantTime >= config.horde.recycleAfter) { const recycled = spawnEnemy(state, enemy.kind, config); enemy.x = recycled.x; enemy.y = recycled.y; enemy.distantTime = 0; state.recycledEnemies++; }
    if (state.status !== 'playing') break;
  }
  separateEnemies(state, config);
  // Resolve enemy projectiles against the player after movement (boss attacks are telegraphed in the renderer).
  for (const s of state.projectiles) if (s.owner === 'enemy' && dist2(s, p) < 30 ** 2) { damagePlayer(state, s.damage); s.life = 0; }
  writeProjectiles = 0;
  for (const shot of state.projectiles) if (shot.life > 0) state.projectiles[writeProjectiles++] = shot;
  state.projectiles.length = writeProjectiles;
  let writeEnemies = 0;
  for (const enemy of state.enemies) if (!enemy.dead) state.enemies[writeEnemies++] = enemy;
  state.enemies.length = writeEnemies;
  state.pickupMergeTimer -= step;
  if (state.pickupMergeTimer <= 0) { mergeNearbyPickups(state); state.pickupMergeTimer = 0.5; }
  for (const pickup of state.pickups) {
    const dx = p.x - pickup.x; const dy = p.y - pickup.y; const d2 = dx * dx + dy * dy;
    if (d2 < p.pickupRadius ** 2) { p.xp += pickup.value; p.special = Math.min(100, p.special + pickup.value * 0.42); float(state, `+${pickup.value} XP`, pickup.x, pickup.y); pickup.value = 0; }
    else if (d2 < 300 ** 2) { const distance = Math.sqrt(d2) || 1; const pull = Math.min(distance, 230 * step); pickup.x += dx / distance * pull; pickup.y += dy / distance * pull; }
  }
  let writePickups = 0;
  for (const pickup of state.pickups) if (pickup.value > 0) state.pickups[writePickups++] = pickup;
  state.pickups.length = writePickups;
  let writeNumbers = 0;
  for (const number of state.numbers) { number.life -= step; number.y -= 24 * step; if (number.life > 0) state.numbers[writeNumbers++] = number; }
  state.numbers.length = writeNumbers;
  while (p.xp >= p.xpNext && state.status === 'playing') { p.xp -= p.xpNext; offerLevel(state); }
  if (state.bossDefeated && !state.enemies.some(e => !e.dead && e.kind === 'boss')) state.status = 'victory';
  if (state.elapsed >= config.duration + config.overtimeLimit && !state.bossDefeated && state.status === 'playing') { state.status = 'defeat'; state.endReason = 'boss-escaped'; }
}

export function getUpgrade(id: UpgradeId) { return UPGRADES.find(x => x.id === id)!; }
export function distanceSquared(a: Vec, b: Vec): number { return dist2(a, b); }
