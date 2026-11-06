import { ATTACKS, DIFFICULTIES, ENEMIES, GANG_LEADER, HEROES, PASSIVE_IDS, PINWHEEL_EVOLUTION, standardRun, UPGRADES, WEAPON_EVOLUTIONS, type EnemyKind, type FactionId, type GameStatus, type HeroId, type HordeEntrySide, type PassiveId, type RunConfig, type UpgradeId, type WeaponEvolutionId } from './definitions';
import { SpatialGrid } from './spatial-grid';
import { buildNavigationField, createCityStage, isWalkable, moveOnStage, navigationDirection, nearestWalkablePoint, segmentHitsBuilding, type CityStage, type NavigationField } from './stage';

export interface Vec { x: number; y: number }
export type HorizontalFacing = 'left' | 'right';
export type WeaponId = 'pinwheel' | 'orbitGuard' | 'piercingThrow' | 'ricochetRing' | 'clubSweep' | 'boulderToss' | 'groundSlam' | 'spearThrust' | 'spearToss' | 'spearSweep';
export interface OrbitRing { angle: number; hitCooldowns: Record<number, number> }
export type DamageSource = 'thug-contact' | 'fast-contact' | 'bruiser-contact' | 'ranged-projectile' | 'boss-contact' | 'boss-projectile' | 'boss-charge' | 'yoyo-line' | 'boss-chain' | 'dr-smile-melee' | 'dr-smile-zone';
export type DamageBreakdown = Record<DamageSource, number>;
export const DAMAGE_SOURCES: readonly DamageSource[] = ['thug-contact', 'fast-contact', 'bruiser-contact', 'ranged-projectile', 'boss-contact', 'boss-projectile', 'boss-charge', 'yoyo-line', 'boss-chain', 'dr-smile-melee', 'dr-smile-zone'];
function emptyDamageBreakdown(): DamageBreakdown { return { 'thug-contact': 0, 'fast-contact': 0, 'bruiser-contact': 0, 'ranged-projectile': 0, 'boss-contact': 0, 'boss-projectile': 0, 'boss-charge': 0, 'yoyo-line': 0, 'boss-chain': 0, 'dr-smile-melee': 0, 'dr-smile-zone': 0 }; }
export interface Player extends Vec { heroId: HeroId; health: number; maxHealth: number; speed: number; healthRegen: number; level: number; xp: number; xpNext: number; invulnerable: number; attackTimer: number; dashTimer: number; dashCooldown: number; special: number; facing: Vec; horizontalFacing: HorizontalFacing; damageBonus: number; extraShots: number; pickupRadius: number; orbit: boolean; orbitTimer: number; orbitRings: OrbitRing[]; damageDealt: number; weaponRanks: Record<WeaponId, number>; passiveRanks: Record<PassiveId, number>; powerRank: number; evolvedPinwheel: boolean; evolutions: WeaponEvolutionId[]; piercingTimer: number; ricochetTimer: number; groundSlamTimer: number; spearSweepTimer: number; followupStrike: { kind: 'club' | 'spear'; direction: Vec; rank: number } | null; followupStrikeTimer: number; attackVisual: 'club-sweep' | 'spear-thrust' | 'ground-slam' | 'spear-sweep' | null; attackVisualTimer: number }
export type BossAttackState = 'idle' | 'ranged-telegraph' | 'charge-telegraph' | 'charging' | 'recovering' | 'melee-telegraph' | 'melee-swing' | 'yoyo-telegraph' | 'yoyo-extension' | 'yoyo-hold' | 'yoyo-retract' | 'chain-telegraph' | 'chain-swing' | 'chain-throw' | 'hazard-telegraph' | 'hazard-active';
export interface Enemy extends Vec { id: number; kind: EnemyKind; bossId: 'gang-boss' | 'dr-smile' | null; attackTarget: Vec; attackCooldown: number; health: number; maxHealth: number; speed: number; damage: number; radius: number; xp: number; knockback: Vec; hitFlash: number; attackState: BossAttackState; attackDirection: Vec; horizontalFacing: HorizontalFacing; animationTime: number; chargeReady: boolean; chargeConnected: boolean; dead: boolean; phase: number; rangedTimer: number; distantTime: number }
export interface Projectile extends Vec { id: number; vx: number; vy: number; damage: number; life: number; pierce: number; hitIds: number[]; special: boolean; owner: 'player' | 'enemy'; spin: number; arcHeight?: number; arcDuration?: number; arcElapsed?: number; bouncesRemaining?: number; splashRadius?: number; weaponId?: WeaponId | 'special' | 'enemy' | 'baseball' | 'boulder' | 'spear' | 'chainball'; damageSource?: DamageSource; sourceEnemyId?: number; maxRange?: number; returning?: boolean }
export interface Pickup extends Vec { id: number; value: number; pullSpeed?: number; kind?: 'xp' | 'boss-evolution'; consumed?: boolean }
export interface GroundWave extends Vec { id: number; radius: number; maxRadius: number; life: number; damage: number; hitIds: number[]; direction: Vec; halfAngle: number }
export interface FloatText extends Vec { id: number; text: string; life: number }
export interface SimState {
  status: GameStatus; player: Player; enemies: Enemy[]; projectiles: Projectile[]; pickups: Pickup[]; waves: GroundWave[]; numbers: FloatText[];
  readonly enemyGrid: SpatialGrid<Enemy>;
  readonly enemyQueryScratch: Enemy[];
  readonly pickupGrid: SpatialGrid<Pickup>;
  readonly pickupQueryScratch: Pickup[];
  readonly stage: CityStage;
  navigation: NavigationField;
  navigationTargetCell: number;
  elapsed: number; kills: number; bossDefeated: boolean; bossesDefeated: number; completedWaves: number; currentBossId: 'gang-boss' | 'dr-smile' | null; lastBossId: 'gang-boss' | 'dr-smile' | null; factionsEncountered: FactionId[]; nextBossAt: number; endless: boolean; bossArrivalAt: number | null; bossFightDuration: number | null; endReason: 'player-down' | 'boss-escaped' | 'retired' | null; seed: number; nextId: number; spawnTimer: number; spawnBudget: number; levelChoices: number; surgeRemaining: number; surgeCount: number; surgeDirection: HordeEntrySide; pickupMergeTimer: number;
  peakEnemies: number; enemiesSpawned: number; spawnWindowCount: number; spawnWindowSeconds: number; spawnRate: number; killWindowCount: number; killWindowSeconds: number; killRate: number; hordeTarget: number; hordeDeficit: number; timeBelowHordeTarget: number; spawnPlacementFallbacks: number; recycledEnemies: number; xpSpawned: number; xpCollected: number; xpPilesMerged: number; xpLost: number;
  options: UpgradeId[]; chosen: UpgradeId[]; evolutionOptions: Array<WeaponEvolutionId | 'field-cache'>; attacks: string[]; messages: string[]; specialTimer: number;
  damageTaken: DamageBreakdown;
}
export interface InputState { x: number; y: number; dash: boolean; special: boolean }
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const dist2 = (a: Vec, b: Vec) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
const normalize = (x: number, y: number): Vec => { const m = Math.hypot(x, y); return m > 0 ? { x: x / m, y: y / m } : { x: 0, y: 0 }; };
function distanceToSegment(point: Vec, start: Vec, end: Vec): number {
  const dx=end.x-start.x, dy=end.y-start.y, length=dx*dx+dy*dy;
  const t=length ? clamp(((point.x-start.x)*dx+(point.y-start.y)*dy)/length,0,1) : 0;
  return Math.hypot(point.x-(start.x+t*dx),point.y-(start.y+t*dy));
}

export function createGame(seed = standardRun.seed, config: RunConfig = standardRun, heroId: HeroId = 'blue-pinwheel'): SimState {
  const stage = createCityStage(config.arenaWidth, config.arenaHeight);
  const hero = HEROES[heroId];
  const player = { heroId, x: config.arenaWidth / 2, y: config.arenaHeight / 2, health: hero.maxHealth, maxHealth: hero.maxHealth, speed: hero.moveSpeed, healthRegen: 0, level: 1, xp: 0, xpNext: 30, invulnerable: 0, attackTimer: 0.25, dashTimer: 0, dashCooldown: 0, special: 0, facing: { x: 1, y: 0 }, horizontalFacing: 'right' as const, damageBonus: 0, extraShots: 0, pickupRadius: 72, orbit: false, orbitTimer: 0, orbitRings: [], damageDealt: 0, weaponRanks: { pinwheel: heroId === 'blue-pinwheel' ? 1 : 0, orbitGuard: 0, piercingThrow: 0, ricochetRing: 0, clubSweep: heroId === 'bok-goo' ? 1 : 0, boulderToss: 0, groundSlam: 0, spearThrust: heroId === 'da-ri' ? 1 : 0, spearToss: 0, spearSweep: 0 }, passiveRanks: { damage: 0, tempo: 0, extra: 0, speed: 0, vitality: 0, recovery: 0, magnet: 0, wideImpact: 0, velocityCore: 0, extendedCharge: 0, armorPlating: 0, experienceTraining: 0 }, powerRank: 0, evolvedPinwheel: false, evolutions: [], piercingTimer: 0.6, ricochetTimer: 0.9, groundSlamTimer: 2.4, spearSweepTimer: 2.1, followupStrike: null as Player['followupStrike'], followupStrikeTimer: 0, attackVisual: null as Player['attackVisual'], attackVisualTimer: 0 };
  return {
    status: 'playing', player,
    enemies: [], projectiles: [], pickups: [], waves: [], numbers: [], enemyGrid: new SpatialGrid<Enemy>(config.arenaWidth, config.arenaHeight), enemyQueryScratch: [], pickupGrid: new SpatialGrid<Pickup>(config.arenaWidth, config.arenaHeight, 32), pickupQueryScratch: [], stage, navigation: buildNavigationField(stage, player.x, player.y), navigationTargetCell: Math.floor(player.y / stage.cellSize) * stage.columns + Math.floor(player.x / stage.cellSize), elapsed: 0, kills: 0, bossDefeated: false, bossesDefeated: 0, completedWaves: 0, currentBossId: null, lastBossId: null, factionsEncountered: ['street-gang'], nextBossAt: config.bossAt, endless: (config.gameMode ?? (config.testMode ? 'finite' : 'endless')) === 'endless', bossArrivalAt: null, bossFightDuration: null, endReason: null, seed: seed >>> 0, nextId: 1, spawnTimer: 0.25, spawnBudget: config.horde.batchMin, levelChoices: 0, surgeRemaining: 0, surgeCount: 0, surgeDirection: 'right', pickupMergeTimer: 0.5, peakEnemies: 0, enemiesSpawned: 0, spawnWindowCount: 0, spawnWindowSeconds: 0, spawnRate: 0, killWindowCount: 0, killWindowSeconds: 0, killRate: 0, hordeTarget: 0, hordeDeficit: 0, timeBelowHordeTarget: 0, spawnPlacementFallbacks: 0, recycledEnemies: 0, xpSpawned: 0, xpCollected: 0, xpPilesMerged: 0, xpLost: 0, options: [], chosen: [], evolutionOptions: [], attacks: [hero.attackName], messages: [], specialTimer: 0, damageTaken: emptyDamageBreakdown(),
  };
}

export function random(state: SimState): number {
  state.seed = (Math.imul(1664525, state.seed) + 1013904223) >>> 0;
  return state.seed / 4294967296;
}

export function movePlayer(player: Player, dx: number, dy: number, dt: number, config: RunConfig, stage = createCityStage(config.arenaWidth, config.arenaHeight)): void {
  const dir = normalize(dx, dy);
  if (dir.x || dir.y) player.facing = dir;
  if (dir.x > 0.08) player.horizontalFacing = 'right';
  else if (dir.x < -0.08) player.horizontalFacing = 'left';
  const moved = moveOnStage(stage, player, { x: dir.x * player.speed * dt, y: dir.y * player.speed * dt }, 18);
  player.x = moved.x; player.y = moved.y;
}

export function spawnEnemy(state: SimState, kind: EnemyKind, config: RunConfig = standardRun, position?: Vec, spatialIndex?: SpatialGrid<Enemy>, entrySide?: HordeEntrySide): Enemy {
  const def = ENEMIES[kind]; let x: number; let y: number;
  if (position) ({ x, y } = nearestWalkablePoint(state.stage, position.x, position.y, def.radius));
  else {
    // Spawn just outside the current camera view, but only on stage-defined walkable cells.
    const bounds = { left: def.radius + 2, right: config.arenaWidth - def.radius - 2, top: def.radius + 2, bottom: config.arenaHeight - def.radius - 2 };
    const sample = (): Vec => {
      const side = entrySide ? ({ left: 0, right: 1, top: 2, bottom: 3 } as const)[entrySide] : Math.floor(random(state) * 4); const mx = config.horde.spawnMarginX; const my = config.horde.spawnMarginY;
      const cameraLeft = clamp(state.player.x - 480, bounds.left, bounds.right); const cameraRight = clamp(state.player.x + 480, bounds.left, bounds.right);
      const cameraTop = clamp(state.player.y - 320, bounds.top, bounds.bottom); const cameraBottom = clamp(state.player.y + 320, bounds.top, bounds.bottom);
      if (side === 0) return { x: clamp(cameraLeft - mx - random(state) * 120, bounds.left, bounds.right), y: clamp(cameraTop + random(state) * Math.max(1, cameraBottom - cameraTop), bounds.top, bounds.bottom) };
      if (side === 1) return { x: clamp(cameraRight + mx + random(state) * 120, bounds.left, bounds.right), y: clamp(cameraTop + random(state) * Math.max(1, cameraBottom - cameraTop), bounds.top, bounds.bottom) };
      if (side === 2) return { x: clamp(cameraLeft + random(state) * Math.max(1, cameraRight - cameraLeft), bounds.left, bounds.right), y: clamp(cameraTop - my - random(state) * 100, bounds.top, bounds.bottom) };
      return { x: clamp(cameraLeft + random(state) * Math.max(1, cameraRight - cameraLeft), bounds.left, bounds.right), y: clamp(cameraBottom + my + random(state) * 100, bounds.top, bounds.bottom) };
    };
    const minimumDistanceSquared = 180 ** 2; let safest: Vec | undefined; let chosen: Vec | undefined; let bestClearance = -1;
    const nearby: Enemy[] = [];
    for (let attempt = 0; attempt < 48; attempt++) {
      const candidate = sample(); const playerDistance = dist2(candidate, state.player);
      if (playerDistance < minimumDistanceSquared || !isWalkable(state.stage, candidate.x, candidate.y, def.radius)) continue;
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
    if (!safest) {
      // If a blocked edge meets a solid building, choose the safest walkable cell deterministically.
      for (let row = 0; row < state.stage.rows; row++) for (let column = 0; column < state.stage.columns; column++) {
        const candidate = { x: (column + 0.5) * state.stage.cellSize, y: (row + 0.5) * state.stage.cellSize };
        if (!isWalkable(state.stage, candidate.x, candidate.y, def.radius) || dist2(candidate, state.player) < minimumDistanceSquared) continue;
        const clearance = dist2(candidate, state.player);
        if (clearance > bestClearance) { safest = candidate; bestClearance = clearance; }
      }
    }
    const spawn = chosen ?? safest ?? nearestWalkablePoint(state.stage, state.player.x, state.player.y, def.radius);
    x = spawn.x; y = spawn.y;
  }
  return { id: state.nextId++, x, y, kind, bossId: kind === 'boss' ? 'gang-boss' : null, attackTarget: { x, y }, attackCooldown: 0, health: def.health, maxHealth: def.health, speed: def.speed, damage: def.damage * DIFFICULTIES[config.difficulty].enemyDamageMultiplier, radius: def.radius, xp: def.xp, knockback: { x: 0, y: 0 }, hitFlash: 0, attackState: 'idle', attackDirection: { x: 0, y: 0 }, horizontalFacing: 'right', animationTime: 0, chargeReady: false, chargeConnected: false, dead: false, phase: 0, rangedTimer: 1.2 * DIFFICULTIES[config.difficulty].rangedAttackIntervalMultiplier, distantTime: 0 };
}

function updateFacingFromHorizontal(enemy: Enemy, directionX: number): void {
  // Dead zone prevents tiny target changes or near-vertical movement from flickering the sprite.
  if (directionX > 0.08) enemy.horizontalFacing = 'right';
  else if (directionX < -0.08) enemy.horizontalFacing = 'left';
}

function spawnBossForEncounter(state: SimState, config: RunConfig): Enemy {
  // Enter from a visible horizontal side in the same walkable geometry as the city.
  const left = 28; const right = config.arenaWidth - 28; const gap = 360;
  const canSpawnLeft = state.player.x - gap >= left; const canSpawnRight = state.player.x + gap <= right;
  const side = canSpawnLeft && canSpawnRight ? (random(state) < 0.5 ? -1 : 1) : canSpawnRight ? 1 : -1;
  const x = clamp(state.player.x + side * gap, left, right);
  const y = clamp(state.player.y, 60, config.arenaHeight - 60);
  const boss = spawnEnemy(state, 'boss', config, nearestWalkablePoint(state.stage, x, y, GANG_LEADER.radius));
  boss.bossId = state.bossesDefeated === 0 ? 'gang-boss' : state.bossesDefeated === 1 ? 'dr-smile' : state.lastBossId === 'gang-boss' ? 'dr-smile' : 'gang-boss';
  if (boss.bossId === 'dr-smile' && !state.factionsEncountered.includes('dr-smile')) state.factionsEncountered.push('dr-smile');
  boss.maxHealth = GANG_LEADER.health * (boss.bossId === 'dr-smile' ? 1.2 : 1) * Math.min(2, 1 + state.bossesDefeated * 0.12);
  boss.health = boss.maxHealth;
  return boss;
}

export function acquireTarget(state: SimState, range = 520): Enemy | undefined {
  const boss = state.enemies.find(enemy => enemy.kind === 'boss' && !enemy.dead);
  if (boss && dist2(state.player, boss) < range * range) return boss;
  let target: Enemy | undefined; let best = range * range;
  for (const enemy of state.enemies) if (!enemy.dead) { const d = dist2(state.player, enemy); if (d < best) { target = enemy; best = d; } }
  return target;
}

export function eligibleWeaponEvolutions(state: SimState): WeaponEvolutionId[] {
  return WEAPON_EVOLUTIONS.filter(evolution => evolution.hero === state.player.heroId && !state.player.evolutions.includes(evolution.id) && (state.player.weaponRanks[evolution.weaponId as WeaponId] ?? 0) >= evolution.requiredRank && state.player.passiveRanks[evolution.passive] > 0).map(evolution => evolution.id);
}

export function chooseBossReward(state: SimState, id: WeaponEvolutionId | 'field-cache'): boolean {
  if (state.status !== 'boss-reward' || !state.evolutionOptions.includes(id)) return false;
  if (id === 'field-cache') {
    const heal = Math.max(36, state.player.maxHealth * 0.24);
    state.player.health = Math.min(state.player.maxHealth, state.player.health + heal);
    state.player.special = Math.min(100, state.player.special + 30);
    state.messages.push('FIELD CACHE · RECOVERY + SPECIAL CHARGE');
  } else {
    const definition = WEAPON_EVOLUTIONS.find(evolution => evolution.id === id);
    if (!definition) return false;
    state.player.evolutions.push(id);
    if (id === 'typhoon-rings') state.player.evolvedPinwheel = true;
    state.attacks.push(definition.name);
    state.messages.push(`${definition.name.toUpperCase()} EVOLVED`);
  }
  state.evolutionOptions = [];
  state.status = 'playing';
  if (!state.endless && state.bossDefeated) state.status = 'victory';
  return true;
}

function acquireTargetFromGrid(state: SimState, range: number, nearby: Enemy[]): Enemy | undefined {
  const boss = state.enemies.find(enemy => enemy.kind === 'boss' && !enemy.dead);
  if (boss && dist2(state.player, boss) < range * range && !segmentHitsBuilding(state.stage, state.player, boss)) return boss;
  let target: Enemy | undefined; let best = range * range;
  for (const enemy of state.enemyGrid.queryRadius(state.player.x, state.player.y, range, nearby)) {
    if (enemy.dead || segmentHitsBuilding(state.stage, state.player, enemy)) continue;
    const d = dist2(state.player, enemy);
    if (d < best) { target = enemy; best = d; }
  }
  return target;
}

function pursuitDirection(state: SimState, enemy: Enemy, direct: Vec): Vec {
  if (!segmentHitsBuilding(state.stage, enemy, state.player, enemy.radius + 2)) return direct;
  const direction = navigationDirection(state.stage, state.navigation, enemy.x, enemy.y);
  return direction.x || direction.y ? normalize(direction.x, direction.y) : direct;
}

function moveEnemy(state: SimState, enemy: Enemy, direction: Vec, speed: number, dt: number): void {
  const moved = moveOnStage(state.stage, enemy, { x: direction.x * speed * dt, y: direction.y * speed * dt }, enemy.radius);
  enemy.x = moved.x; enemy.y = moved.y;
}

function float(state: SimState, text: string, x: number, y: number): void { state.numbers.push({ id: state.nextId++, text, x, y, life: 0.75 }); }
export function applyEnemyDamage(state: SimState, enemy: Enemy, damage: number, direction: Vec, config: RunConfig = standardRun): void {
  if (enemy.dead || enemy.health <= 0) return;
  const actualDamage = Math.min(enemy.health, damage);
  enemy.health = Math.max(0, enemy.health - actualDamage); enemy.hitFlash = 0.16;
  enemy.knockback.x += direction.x * (enemy.kind === 'boss' ? 90 : 230);
  enemy.knockback.y += direction.y * (enemy.kind === 'boss' ? 90 : 230);
  state.player.damageDealt += actualDamage;
  if (enemy.health === 0) {
    enemy.dead = true; state.kills++; state.killWindowCount++;
    const drop = nearestWalkablePoint(state.stage, enemy.x, enemy.y, 0); state.pickups.push({ id: state.nextId++, x: drop.x, y: drop.y, value: enemy.xp, pullSpeed: 0 }); state.xpSpawned += enemy.xp;
    if (enemy.kind === 'boss') {
      state.bossDefeated = true; state.bossFightDuration = Math.max(0, state.elapsed - (state.bossArrivalAt ?? state.elapsed));
      state.bossesDefeated++; state.completedWaves++; state.lastBossId = enemy.bossId; state.currentBossId = null;
      const reward = nearestWalkablePoint(state.stage, enemy.x, enemy.y, 0);
      state.pickups.push({ id: state.nextId++, x: reward.x, y: reward.y, value: 0, kind: 'boss-evolution' });
      if (state.endless) {
        if (state.bossesDefeated === 1 && !state.factionsEncountered.includes('dr-smile')) state.factionsEncountered.push('dr-smile');
        state.nextBossAt = state.bossesDefeated === 1 ? Math.max(300, state.elapsed + 30) : state.elapsed + 180;
        state.messages.push('BOSS DEFEATED · NEW THREAT APPROACHING');
      }
    }
  }
  else float(state, `${Math.round(actualDamage)}`, enemy.x, enemy.y - enemy.radius);
  if (enemy.kind !== 'boss') enemy.phase = Math.min(1, enemy.phase + 0.12);
  void config;
}

function launchShot(state: SimState, target: Enemy, damage: number, weaponId: WeaponId | 'special', pierce = 0, special = false): void {
  const dir = normalize(target.x - state.player.x, target.y - state.player.y);
  const count = Math.min(5, 1 + state.player.extraShots);
  for (let i = 0; i < count; i++) {
    const angle = Math.atan2(dir.y, dir.x) + (i - (count - 1) / 2) * 0.18;
    const def = weaponId === 'piercingThrow' ? ATTACKS.piercingThrow : ATTACKS.pinwheel;
    const speed = def.projectileSpeed * (1 + state.player.passiveRanks.velocityCore * 0.08);
    state.projectiles.push({ id: state.nextId++, x: state.player.x, y: state.player.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, damage, life: def.lifetime, pierce, hitIds: [], special, owner: 'player', spin: 0, weaponId });
  }
}

function launchHeroProjectile(state: SimState, target: Enemy, weaponId: 'boulderToss' | 'spearToss'): void {
  const dir=normalize(target.x-state.player.x,target.y-state.player.y);
  const spear=weaponId==='spearToss'; const rank=state.player.weaponRanks[weaponId];
  const count = Math.min(6, 1 + state.player.extraShots + (spear && rank >= 4 ? 1 : 0) + (!spear && rank >= 3 ? 1 : 0) + (!spear && state.player.evolutions.includes('avalanche-toss') ? 1 : 0));
  const baseAngle = Math.atan2(dir.y, dir.x);
  for (let i = 0; i < count; i++) {
    const angle = baseAngle + (i - (count - 1) / 2) * 0.14;
    const speed = (spear ? 390 : 260) * (1 + state.player.passiveRanks.velocityCore * 0.08);
    const returningLance = spear && state.player.evolutions.includes('returning-lance');
    state.projectiles.push({ id: state.nextId++, x: state.player.x, y: state.player.y, vx:Math.cos(angle)*speed, vy:Math.sin(angle)*speed, damage:(spear?24:34)*(1+state.player.damageBonus)*(1+(rank-1)*0.22), life:spear?(returningLance?3.4:1.6):1.35, ...(!spear && rank >= 4 ? { splashRadius: 42 + rank * 2 } : {}), ...(spear ? { maxRange: 560 } : { arcDuration: 0.7, arcHeight: 0, arcElapsed: 0 }), pierce:spear?Math.min(4,1+Math.floor(rank/2)):Math.max(0,Math.floor((rank-1)/2)), hitIds:[],special:false,owner:'player',spin:0,weaponId:spear?'spear':'boulder' });
  }
}

function launchRicochetRing(state: SimState, target: Enemy): void {
  const p = state.player; const rank = p.weaponRanks.ricochetRing; const aim = normalize(target.x - p.x, target.y - p.y);
  const shatterstorm = p.evolutions.includes('shatterstorm');
  state.projectiles.push({ id: state.nextId++, x: p.x, y: p.y, vx: aim.x * 380 * (1 + p.passiveRanks.velocityCore * 0.08), vy: aim.y * 380 * (1 + p.passiveRanks.velocityCore * 0.08), damage: 19 * (1 + p.damageBonus) * (1 + (rank - 1) * 0.24) * (shatterstorm ? 1.35 : 1), life: 3.2, pierce: Math.min(4, Math.floor(rank / 2)), hitIds: [], special: false, owner: 'player', spin: 0, weaponId: 'ricochetRing', bouncesRemaining: Math.min(5, 1 + Math.floor((rank - 1) / 2) + (shatterstorm ? 2 : 0)) });
}

function updateGroundWaves(state: SimState, step: number, nearbyEnemies: Enemy[], config: RunConfig): void {
  let write = 0;
  for (const wave of state.waves) {
    const previousRadius = wave.radius; wave.life -= step;
    wave.radius = wave.maxRadius * (1 - Math.max(0, wave.life) / 0.48);
    for (const enemy of state.enemyGrid.queryRadius(wave.x, wave.y, wave.maxRadius + GANG_LEADER.radius, nearbyEnemies)) {
      if (enemy.dead || wave.hitIds.includes(enemy.id)) continue;
      const dx = enemy.x - wave.x; const dy = enemy.y - wave.y; const distance = Math.hypot(dx, dy);
      if (distance > wave.radius + enemy.radius || distance + enemy.radius < previousRadius || segmentHitsBuilding(state.stage, wave, enemy)) continue;
      if (wave.halfAngle < Math.PI && (dx * wave.direction.x + dy * wave.direction.y) / (distance || 1) < Math.cos(wave.halfAngle)) continue;
      applyEnemyDamage(state, enemy, wave.damage, wave.direction, config); wave.hitIds.push(enemy.id);
    }
    if (wave.life > 0) state.waves[write++] = wave;
  }
  state.waves.length = write;
}

function performClubStrike(state: SimState, aim: Vec, rank: number, nearby: Enemy[], config: RunConfig): void {
  const p = state.player; const range = (76 + rank * 7) * (1 + p.passiveRanks.wideImpact * 0.1); const cone = Math.cos(0.92);
  for (const enemy of state.enemyGrid.queryRadius(p.x, p.y, range, nearby)) {
    if (enemy.dead || segmentHitsBuilding(state.stage, p, enemy)) continue;
    const dx = enemy.x - p.x; const dy = enemy.y - p.y; const distance = Math.hypot(dx, dy) || 1;
    if (distance <= range + enemy.radius && (dx * aim.x + dy * aim.y) / distance >= cone) applyEnemyDamage(state, enemy, 26 * (1 + p.damageBonus) * (1 + (rank - 1) * 0.24), aim, config);
  }
}

function performSpearThrust(state: SimState, aim: Vec, rank: number, nearby: Enemy[], config: RunConfig): void {
  const p = state.player; const reach = (150 + rank * 15) * (1 + p.passiveRanks.wideImpact * 0.1); const halfWidth = (12 + rank * 1.5) * (1 + p.passiveRanks.wideImpact * 0.1);
  for (const enemy of state.enemyGrid.queryRadius(p.x, p.y, reach, nearby)) {
    if (enemy.dead || segmentHitsBuilding(state.stage, p, enemy)) continue;
    const dx = enemy.x - p.x; const dy = enemy.y - p.y; const along = dx * aim.x + dy * aim.y; const across = Math.abs(dx * aim.y - dy * aim.x);
    if (along >= 0 && along <= reach + enemy.radius && across <= halfWidth + enemy.radius) applyEnemyDamage(state, enemy, 21 * (1 + p.damageBonus) * (1 + (rank - 1) * 0.22) * (p.evolutions.includes('obsidian-tempest') ? 1.55 : 1), aim, config);
  }
}

function attackRateMultiplier(state: SimState): number {
  return Math.max(0.4, Math.pow(0.8, state.chosen.filter(id => id === 'tempo').length));
}

function orbitRingCount(rank: number): number { return rank <= 2 ? 2 : rank <= 4 ? 3 : 4; }

function syncOrbitRings(player: Player): void {
  const count = !player.orbit ? 0 : player.evolutions.includes('eternal-halo') ? 4 : orbitRingCount(Math.max(1, player.weaponRanks.orbitGuard));
  while (player.orbitRings.length < count) player.orbitRings.push({ angle: (Math.PI * 2 * player.orbitRings.length) / Math.max(1, count), hitCooldowns: {} });
  player.orbitRings.length = count;
}

function populateOptions(state: SimState): void {
  const p = state.player;
  const candidates = UPGRADES.filter(u => {
    if (u.id === 'mastery') return state.endless && state.chosen.filter(chosen => chosen === 'mastery').length < 20;
    if (u.id === 'clubSweep') return p.heroId === 'bok-goo' && p.weaponRanks.clubSweep < 5;
    if (u.id === 'boulderToss') return p.heroId === 'bok-goo' && p.weaponRanks.boulderToss < 5;
    if (u.id === 'spearThrust') return p.heroId === 'da-ri' && p.weaponRanks.spearThrust < 5;
    if (u.id === 'spearToss') return p.heroId === 'da-ri' && p.weaponRanks.spearToss < 5;
    if (u.id === 'ricochetRing') return p.heroId === 'blue-pinwheel' && p.weaponRanks.ricochetRing < 5;
    if (u.id === 'groundSlam') return p.heroId === 'bok-goo' && p.weaponRanks.groundSlam < 5;
    if (u.id === 'spearSweep') return p.heroId === 'da-ri' && p.weaponRanks.spearSweep < 5;
    if (p.heroId !== 'blue-pinwheel' && ['orbit', 'pinwheel', 'piercingThrow', 'ricochetRing', 'power'].includes(u.id)) return false;
    if (u.id === 'orbit') return p.weaponRanks.orbitGuard < 5;
    if (u.id === 'piercingThrow') return p.weaponRanks.piercingThrow < 5;
    if (u.id === 'pinwheel') return p.weaponRanks.pinwheel < 5;
    if (u.id === 'power') return p.powerRank < 5;
    if (PASSIVE_IDS.includes(u.id as PassiveId)) {
      const passive = u.id as PassiveId;
      const ownedSlots = PASSIVE_IDS.filter(id => p.passiveRanks[id] > 0 || state.chosen.includes(id)).length;
      const rank = Math.max(p.passiveRanks[passive], state.chosen.filter(chosen => chosen === passive).length);
      return rank < (passive === 'extra' ? 4 : 5) && (rank > 0 || ownedSlots < 6);
    }
    return false;
  });
  const pool = [...candidates]; state.options = [];
  const groups: UpgradeId[][] = [
    pool.filter(upgrade => ['pinwheel', 'orbit', 'piercingThrow', 'ricochetRing', 'clubSweep', 'boulderToss', 'groundSlam', 'spearThrust', 'spearToss', 'spearSweep'].includes(upgrade.id)).map(upgrade => upgrade.id),
    pool.filter(upgrade => PASSIVE_IDS.includes(upgrade.id as PassiveId) && !['damage', 'tempo', 'extra'].includes(upgrade.id)).map(upgrade => upgrade.id),
    pool.filter(upgrade => ['damage', 'tempo', 'extra', 'power', 'mastery'].includes(upgrade.id)).map(upgrade => upgrade.id),
  ];
  for (const groupedIds of groups) {
    const group = groupedIds.filter(id => pool.some(upgrade => upgrade.id === id));
    if (state.options.length >= 3 || !group.length) continue;
    const freshWeapon = group.find(id => (id === 'orbit' && p.weaponRanks.orbitGuard === 0) || (id === 'piercingThrow' && p.weaponRanks.piercingThrow === 0) || (id === 'ricochetRing' && p.weaponRanks.ricochetRing === 0) || (id === 'boulderToss' && p.weaponRanks.boulderToss === 0) || (id === 'groundSlam' && p.weaponRanks.groundSlam === 0) || (id === 'spearToss' && p.weaponRanks.spearToss === 0) || (id === 'spearSweep' && p.weaponRanks.spearSweep === 0));
    const defensiveBases: PassiveId[] = ['vitality', 'recovery', 'armorPlating'];
    const criticalDefenses: PassiveId[] = p.health / p.maxHealth < 0.5
      ? [...defensiveBases.filter(id => p.passiveRanks[id] === 0), 'recovery', 'armorPlating', 'vitality']
      : [...defensiveBases.filter(id => p.passiveRanks[id] === 0), ...defensiveBases];
    const passivePriority: PassiveId[] = p.health / p.maxHealth < 0.65
      ? [...criticalDefenses, 'speed', 'magnet', 'wideImpact', 'velocityCore', 'extendedCharge', 'experienceTraining', 'damage', 'tempo', 'extra']
      : ['speed', 'magnet', 'vitality', 'recovery', 'wideImpact', 'velocityCore', 'extendedCharge', 'armorPlating', 'experienceTraining', 'damage', 'tempo', 'extra'];
    const corePassive = passivePriority.find(id => group.includes(id));
    const picked = freshWeapon ?? corePassive ?? group[Math.floor(random(state) * group.length)];
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
  if (id === 'extra') p.extraShots = Math.min(4, p.extraShots + 1);
  if (id === 'speed') p.speed *= 1.12;
  if (id === 'vitality') { p.maxHealth += 25; p.health = Math.min(p.maxHealth, p.health + 25); }
  if (id === 'recovery') p.healthRegen += 0.45;
  if (id === 'magnet') p.pickupRadius = Math.min(160, p.pickupRadius + 20);
  if (PASSIVE_IDS.includes(id as PassiveId)) p.passiveRanks[id as PassiveId]++;
  if (id === 'orbit') { p.weaponRanks.orbitGuard++; p.orbit = true; syncOrbitRings(p); if (p.weaponRanks.orbitGuard === 1) state.attacks.push('Orbit Guard (Prototype)'); }
  if (id === 'pinwheel') p.weaponRanks.pinwheel++;
  if (id === 'piercingThrow') { p.weaponRanks.piercingThrow++; if (p.weaponRanks.piercingThrow === 1) state.attacks.push(ATTACKS.piercingThrow.name); }
  if (id === 'clubSweep') p.weaponRanks.clubSweep++;
  if (id === 'boulderToss') p.weaponRanks.boulderToss++;
  if (id === 'spearThrust') p.weaponRanks.spearThrust++;
  if (id === 'spearToss') p.weaponRanks.spearToss++;
  if (id === 'ricochetRing') p.weaponRanks.ricochetRing++;
  if (id === 'groundSlam') p.weaponRanks.groundSlam++;
  if (id === 'spearSweep') p.weaponRanks.spearSweep++;
  if (id === 'mastery') p.damageBonus = Math.min(2, p.damageBonus + 0.05);
  if (id === 'power') { p.powerRank++; p.damageBonus += 0.15; }
  state.chosen.push(id); state.levelChoices--; state.options = [];
  if (state.levelChoices > 0) { state.status = 'upgrade'; populateOptions(state); } else { state.status = 'playing'; while (p.xp >= p.xpNext && state.status === 'playing') { p.xp -= p.xpNext; offerLevel(state); } }
  return true;
}

export function damagePlayer(state: SimState, amount: number, source: DamageSource = 'thug-contact', config: RunConfig = standardRun): boolean {
  const p = state.player;
  if (state.status !== 'playing' || p.invulnerable > 0 || p.health <= 0 || !Number.isFinite(amount) || amount <= 0) return false;
  const mitigatedAmount = amount * (1 - Math.min(0.3, p.passiveRanks.armorPlating * 0.06));
  const actual = Math.min(p.health, mitigatedAmount);
  p.health = Math.max(0, p.health - actual); state.damageTaken[source] += actual; p.invulnerable = DIFFICULTIES[config.difficulty].playerInvulnerabilitySeconds;
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

function chooseEnemyKind(state: SimState, elapsed: number, bossPhase: boolean, surge: boolean): EnemyKind {
  const roll = random(state);
  if (state.endless && state.bossesDefeated > 0 && roll < 0.65) { if (!state.factionsEncountered.includes('dr-smile')) state.factionsEncountered.push('dr-smile'); return random(state) < 0.65 ? 'smiler' : 'molar'; }
  if (state.endless && elapsed > 45 && roll < (surge ? 0.16 : 0.09)) return 'yoYoPunk';
  if (elapsed >= 72 && roll < (surge ? 0.17 : 0.14)) return 'bruiser';
  if (elapsed >= 36 && roll < (surge ? 0.43 : 0.36)) return 'gangster';
  if (elapsed >= 16 && roll < (surge ? 0.76 : 0.62)) return 'fastThug';
  if (bossPhase && roll < 0.5) return 'fastThug';
  return 'thug';
}

function safeSurgeSides(state: SimState, config: RunConfig): HordeEntrySide[] {
  const left = 28; const right = config.arenaWidth - 28; const top = 28; const bottom = config.arenaHeight - 28;
  const required = 180 + Math.max(config.horde.spawnMarginX, config.horde.spawnMarginY);
  return ([
    ['left', state.player.x - left], ['right', right - state.player.x],
    ['top', state.player.y - top], ['bottom', bottom - state.player.y],
  ] as const).filter(([, distance]) => distance >= required).map(([side]) => side);
}

function spawnBatch(state: SimState, config: RunConfig, targetCount: number, bossPhase: boolean, surge: boolean, allowed: number): number {
  let livingOrdinary = 0;
  for (const enemy of state.enemies) if (!enemy.dead && enemy.kind !== 'boss') livingOrdinary++;
  const pressureCap = bossPhase ? Math.max(1, Math.floor(config.horde.maxActive * 0.68)) : config.horde.maxActive;
  const desired = Math.min(targetCount, pressureCap, config.maxEnemies);
  const deficit = desired - livingOrdinary;
  if (deficit <= 0 || allowed <= 0) return 0;
  const base = config.horde.batchMin + Math.floor(random(state) * (config.horde.batchMax - config.horde.batchMin + 1));
  const adaptive = Math.min(3, Math.floor(deficit / 24)) + Math.min(2, Math.floor(state.killRate / 2));
  const size = Math.min(deficit, allowed, config.horde.maxSpawnPerUpdate, base + adaptive);
  for (let i = 0; i < size; i++) {
    const kind = chooseEnemyKind(state, state.elapsed, bossPhase, surge);
    const enemy = spawnEnemy(state, kind, config, undefined, state.enemyGrid, surge ? state.surgeDirection : undefined);
    if (state.endless && state.bossesDefeated > 1) {
      const scale = Math.min(1.65, 1 + (state.bossesDefeated - 1) * 0.08);
      enemy.maxHealth *= scale; enemy.health = enemy.maxHealth; enemy.damage *= Math.min(1.3, 1 + (state.bossesDefeated - 1) * 0.035);
    }
    state.enemies.push(enemy);
    state.enemyGrid.insert(enemy);
    state.enemiesSpawned++; state.spawnWindowCount++;
  }
  return size;
}

function updateHordeDirector(state: SimState, step: number, config: RunConfig): void {
  const bossPhase = state.currentBossId !== null || (state.endless ? state.elapsed >= state.nextBossAt : state.elapsed >= config.bossAt);
  const surgeIndex = Math.floor(state.elapsed / config.horde.surgeEvery);
  if (surgeIndex > state.surgeCount && !bossPhase) {
    state.surgeCount = surgeIndex;
    state.surgeRemaining = config.horde.surgeDuration;
    const directions = safeSurgeSides(state, config);
    state.surgeDirection = directions[Math.floor(random(state) * directions.length)] ?? 'right';
    const directionName: Record<HordeEntrySide, string> = { left: 'WEST', right: 'EAST', top: 'NORTH', bottom: 'SOUTH' };
    state.messages.push(`HORDE SURGE ${state.surgeCount} · FROM THE ${directionName[state.surgeDirection]}`);
  } else state.surgeRemaining = Math.max(0, state.surgeRemaining - step);

  state.killWindowSeconds += step;
  if (state.killWindowSeconds >= 2) { state.killRate = state.killWindowCount / state.killWindowSeconds; state.killWindowCount = 0; state.killWindowSeconds = 0; }

  const baseTarget = hordeTargetAt(config, Math.min(state.elapsed, config.duration));
  const requested = baseTarget + (state.surgeRemaining > 0 ? config.horde.surgeBonus : 0);
  const cap = bossPhase ? Math.max(1, Math.floor(config.horde.maxActive * 0.68)) : config.horde.maxActive;
  const desired = Math.min(requested, cap, config.maxEnemies);
  let active = 0;
  for (const enemy of state.enemies) if (!enemy.dead && enemy.kind !== 'boss') active++;
  const deficit = Math.max(0, desired - active);
  const catchupRate = Math.min(5.5, deficit * 0.1);
  const clearRate = Math.min(5, state.killRate * 0.5);
  const surgeRate = state.surgeRemaining > 0 ? 1.8 : 0;
  const requestedRate = deficit > 0 ? Math.min(config.horde.maxSpawnPerSecond, config.horde.batchMax / config.horde.baseBatchInterval + catchupRate + clearRate + surgeRate) : 0;
  state.spawnBudget = Math.min(config.horde.maxSpawnPerUpdate, state.spawnBudget + requestedRate * step);
  if (deficit === 0) state.spawnBudget = 0;
  state.spawnTimer -= step;
  if (state.spawnTimer <= 0 && (state.endless || state.elapsed < config.duration + config.overtimeLimit)) {
    const allowed = Math.min(Math.floor(state.spawnBudget + 1e-6), config.horde.maxSpawnPerUpdate);
    const spawned = spawnBatch(state, config, desired, bossPhase, state.surgeRemaining > 0, allowed);
    state.spawnBudget = Math.max(0, state.spawnBudget - spawned);
    const pressure = state.elapsed / Math.max(1, config.duration);
    const deficitHaste = deficit >= 18 ? 0.32 : deficit >= 8 ? 0.55 : 1;
    const surgeHaste = state.surgeRemaining > 0 ? 0.72 : 1;
    state.spawnTimer = Math.max(0.22, config.horde.baseBatchInterval * (1 - Math.min(0.25, pressure * 0.18)) * deficitHaste * surgeHaste);
  }
  state.hordeTarget = desired;
  state.hordeDeficit = deficit;
  state.peakEnemies = Math.max(state.peakEnemies, active);
  if (active < desired) state.timeBelowHordeTarget += step;
  state.spawnWindowSeconds += step;
  if (state.spawnWindowSeconds >= 1) {
    state.spawnRate = state.spawnWindowCount / state.spawnWindowSeconds;
    state.spawnWindowCount = 0; state.spawnWindowSeconds = 0;
  }
}

function fireEnemyProjectile(state: SimState, enemy: Enemy, aim: Vec, config: RunConfig): void {
  const ranged = ENEMIES[enemy.kind].ranged;
  if (!ranged) return;
  const angle = Math.atan2(aim.y, aim.x);
  state.projectiles.push({ id: state.nextId++, x: enemy.x, y: enemy.y, vx: Math.cos(angle) * ranged.projectileSpeed * DIFFICULTIES[config.difficulty].enemyProjectileSpeedMultiplier, vy: Math.sin(angle) * ranged.projectileSpeed * DIFFICULTIES[config.difficulty].enemyProjectileSpeedMultiplier, damage: enemy.damage, life: 2.6, pierce: 0, hitIds: [], special: false, owner: 'enemy', spin: 0, weaponId: ranged.projectile, damageSource: 'ranged-projectile' });
}

function separateEnemies(state: SimState): void {
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
      const movedEnemy = moveOnStage(state.stage, enemy, { x: -nx * push, y: -ny * push }, enemy.radius);
      const movedOther = moveOnStage(state.stage, other, { x: nx * push, y: ny * push }, other.radius);
      enemy.x = movedEnemy.x; enemy.y = movedEnemy.y; other.x = movedOther.x; other.y = movedOther.y;
    }
  }
}

export function mergeNearbyPickups(state: SimState): void {
  const grid = state.pickupGrid; const nearby = state.pickupQueryScratch;
  grid.rebuild(state.pickups, pickup => pickup.value > 0 && pickup.kind !== 'boss-evolution');
  const mergeRadius = 20;
  for (const pickup of state.pickups) {
    if (pickup.value <= 0 || pickup.kind === 'boss-evolution') continue;
    for (const other of grid.queryRadius(pickup.x, pickup.y, mergeRadius, nearby)) {
      if (other.id <= pickup.id || other.value <= 0 || dist2(pickup, other) > mergeRadius ** 2 || segmentHitsBuilding(state.stage, pickup, other)) continue;
      const total = pickup.value + other.value;
      const merged = { x: (pickup.x * pickup.value + other.x * other.value) / total, y: (pickup.y * pickup.value + other.y * other.value) / total };
      if (!isWalkable(state.stage, merged.x, merged.y, 0)) continue;
      pickup.x = merged.x; pickup.y = merged.y; pickup.value = total; other.value = 0; state.xpPilesMerged++;
    }
  }
  let write = 0;
  for (const pickup of state.pickups) if (pickup.value > 0) state.pickups[write++] = pickup;
  state.pickups.length = write;
}

function updateHeroWeapons(state: SimState, step: number, nearbyEnemies: Enemy[], config: RunConfig): void {
  const p=state.player;
  p.attackVisualTimer=Math.max(0,p.attackVisualTimer-step); if(p.attackVisualTimer===0)p.attackVisual=null;
  if (p.followupStrike) {
    p.followupStrikeTimer -= step;
    if (p.followupStrikeTimer <= 0) {
      if (p.followupStrike.kind === 'club') { performClubStrike(state, p.followupStrike.direction, p.followupStrike.rank, nearbyEnemies, config); p.attackVisual = 'club-sweep'; }
      else { performSpearThrust(state, p.followupStrike.direction, p.followupStrike.rank, nearbyEnemies, config); p.attackVisual = 'spear-thrust'; }
      p.attackVisualTimer = 0.2; p.followupStrike = null;
    }
  }
  if (p.heroId === 'blue-pinwheel') {
    if (p.weaponRanks.ricochetRing > 0) {
      p.ricochetTimer -= step;
      if (p.ricochetTimer <= 0) {
        const target = acquireTargetFromGrid(state, 540, nearbyEnemies);
        if (target) { launchRicochetRing(state, target); p.ricochetTimer = Math.max(0.42, 2.1 * attackRateMultiplier(state) * Math.max(0.58, 1 - (p.weaponRanks.ricochetRing - 1) * 0.08)); }
      }
    }
    return;
  }
  p.attackTimer-=step;
  if(p.attackTimer<=0){
    const target=acquireTargetFromGrid(state,300,nearbyEnemies);
    if(p.heroId==='bok-goo'){
      const rank=p.weaponRanks.clubSweep; const aim=target?normalize(target.x-p.x,target.y-p.y):p.facing;
      p.attackVisual='club-sweep'; p.attackVisualTimer=0.32;
      performClubStrike(state, aim, rank, nearbyEnemies, config);
      if (p.evolutions.includes('earthbreaker')) state.waves.push({ id: state.nextId++, x: p.x + aim.x * 46, y: p.y + aim.y * 46, radius: 0, maxRadius: 150, life: 0.48, damage: 20 * (1 + p.damageBonus), hitIds: [], direction: aim, halfAngle: 1.1 });
      if (rank >= 4) { p.followupStrike = { kind: 'club', direction: aim, rank }; p.followupStrikeTimer = 0.2; }
      p.facing=aim; p.attackTimer=0.96*Math.max(0.58,1-(rank-1)*0.075)*attackRateMultiplier(state);
    }else{
      const rank=p.weaponRanks.spearThrust; const aim=target?normalize(target.x-p.x,target.y-p.y):p.facing;
      p.attackVisual='spear-thrust'; p.attackVisualTimer=0.24; p.facing=aim;
      performSpearThrust(state, aim, rank, nearbyEnemies, config);
      if (rank >= 4 || p.evolutions.includes('obsidian-tempest')) { p.followupStrike = { kind: 'spear', direction: aim, rank }; p.followupStrikeTimer = 0.16; }
      p.attackTimer=0.76*Math.max(0.6,1-(rank-1)*0.065)*attackRateMultiplier(state);
    }
  }
  p.piercingTimer-=step;
  const secondaryRank=p.heroId==='bok-goo'?p.weaponRanks.boulderToss:p.weaponRanks.spearToss;
  if(secondaryRank>0&&p.piercingTimer<=0){
    const target=acquireTargetFromGrid(state,520,nearbyEnemies);
    if(target)launchHeroProjectile(state,target,p.heroId==='bok-goo'?'boulderToss':'spearToss');
    p.piercingTimer=(p.heroId==='bok-goo'?2.5:1.9)*Math.max(0.58,1-(secondaryRank-1)*0.08)*attackRateMultiplier(state);
  }
  if (p.heroId === 'bok-goo' && p.weaponRanks.groundSlam > 0) {
    const rank = p.weaponRanks.groundSlam; p.groundSlamTimer -= step;
    if (p.groundSlamTimer <= 0) {
      const radius = (84 + rank * 8) * (1 + p.passiveRanks.wideImpact * 0.1);
      state.waves.push({ id: state.nextId++, x: p.x, y: p.y, radius: 0, maxRadius: radius, life: 0.48, damage: 18 * (1 + p.damageBonus) * (1 + (rank - 1) * 0.2), hitIds: [], direction: p.facing, halfAngle: Math.PI });
      p.attackVisual = 'ground-slam'; p.attackVisualTimer = 0.42;
      p.groundSlamTimer = Math.max(0.8, 2.5 * attackRateMultiplier(state) * Math.max(0.6, 1 - (rank - 1) * 0.08));
    }
  }
  if (p.heroId === 'da-ri' && p.weaponRanks.spearSweep > 0) {
    const rank = p.weaponRanks.spearSweep; p.spearSweepTimer -= step;
    if (p.spearSweepTimer <= 0) {
      const range = (102 + rank * 8) * (1 + p.passiveRanks.wideImpact * 0.1); const aim = p.facing;
      for (const enemy of state.enemyGrid.queryRadius(p.x, p.y, range, nearbyEnemies)) {
        const dx = enemy.x - p.x; const dy = enemy.y - p.y; const distance = Math.hypot(dx, dy) || 1;
        if (!enemy.dead && distance <= range + enemy.radius && (dx * aim.x + dy * aim.y) / distance > -0.25 && !segmentHitsBuilding(state.stage, p, enemy)) applyEnemyDamage(state, enemy, 16 * (1 + p.damageBonus) * (1 + (rank - 1) * 0.2), aim, config);
      }
      p.attackVisual = 'spear-sweep'; p.attackVisualTimer = 0.3;
      p.spearSweepTimer = Math.max(0.7, 2.25 * attackRateMultiplier(state) * Math.max(0.6, 1 - (rank - 1) * 0.09));
    }
  }
}

function updateYoYoPunk(state: SimState, enemy: Enemy, toward: Vec, route: Vec, distance: number, step: number, config: RunConfig): void {
  enemy.phase=Math.max(0,enemy.phase-step); enemy.rangedTimer-=step; enemy.attackCooldown=Math.max(0,enemy.attackCooldown-step);
  if(enemy.attackState==='yoyo-telegraph'){
    updateFacingFromHorizontal(enemy,enemy.attackDirection.x);
    if(enemy.phase<=0){enemy.attackState='yoyo-extension';enemy.phase=0.35;}
  }else if(enemy.attackState==='yoyo-extension'){
    if(enemy.phase<=0){enemy.attackState='yoyo-hold';enemy.phase=1.25;}
  }else if(enemy.attackState==='yoyo-hold'){
    if(distanceToSegment(state.player,enemy,enemy.attackTarget)<17&&enemy.attackCooldown<=0){damagePlayer(state,enemy.damage,'yoyo-line',config);enemy.attackCooldown=0.75;}
    if(enemy.phase<=0){enemy.attackState='yoyo-retract';enemy.phase=0.35;}
  }else if(enemy.attackState==='yoyo-retract'){
    if(enemy.phase<=0){enemy.attackState='recovering';enemy.phase=1.1;}
  }else if(enemy.attackState==='recovering'&&enemy.phase>0){
    // The recovery interval is visible and prevents repeated tether attacks.
  }else{
    enemy.attackState='idle'; updateFacingFromHorizontal(enemy,route.x);
    if(distance>250)moveEnemy(state,enemy,route,enemy.speed,step);
    else if(distance<155)moveEnemy(state,enemy,normalize(-toward.x,-toward.y),enemy.speed*0.55,step);
    if(enemy.rangedTimer<=0&&distance<=390){
      const length=Math.min(370,distance); const endpoint={x:enemy.x+toward.x*length,y:enemy.y+toward.y*length};
      if(!segmentHitsBuilding(state.stage,enemy,endpoint)){enemy.attackDirection=toward;enemy.attackTarget=endpoint;enemy.attackState='yoyo-telegraph';enemy.phase=0.55;}
      enemy.rangedTimer=3.5;
    }
  }
}

function updateNamedBoss(state: SimState, enemy: Enemy, toward: Vec, route: Vec, distance: number, step: number, config: RunConfig): void {
  enemy.attackCooldown=Math.max(0,enemy.attackCooldown-step);
  if(enemy.bossId==='gang-boss'){
    const old=enemy.phase; enemy.phase=(enemy.phase+step)%7.2; const phase=enemy.phase;
    if(phase<0.85){
      if(old>=6.3){enemy.attackDirection=toward;enemy.attackTarget={...state.player};}
      enemy.attackState='chain-telegraph';
    }else if(phase<1.75){
      enemy.attackState='chain-swing';
      if(distance<116+enemy.radius&&enemy.attackCooldown<=0){damagePlayer(state,enemy.damage*1.15,'boss-chain',config);enemy.attackCooldown=0.8;}
    }else if(phase<2.75)enemy.attackState='recovering';
    else if(phase<3.5){
      if(old<2.75){enemy.attackDirection=toward;enemy.attackTarget={x:enemy.x+toward.x*Math.min(410,distance),y:enemy.y+toward.y*Math.min(410,distance)};}
      enemy.attackState='chain-telegraph';
    }else if(phase<4.55){
      if(old<3.5){
        enemy.attackState='chain-throw';
        if(!segmentHitsBuilding(state.stage,enemy,enemy.attackTarget)){
          state.projectiles.push({id:state.nextId++,x:enemy.x,y:enemy.y,vx:enemy.attackDirection.x*350,vy:enemy.attackDirection.y*350,damage:enemy.damage*1.2,life:2.5,pierce:0,hitIds:[],special:false,owner:'enemy',spin:0,weaponId:'chainball',damageSource:'boss-chain',sourceEnemyId:enemy.id,maxRange:410});
        }
      }else enemy.attackState='chain-throw';
    }else enemy.attackState='recovering';
    updateFacingFromHorizontal(enemy,enemy.attackDirection.x);
    if(enemy.attackState==='recovering'&&distance>120)moveEnemy(state,enemy,route,enemy.speed,step);
  }else{
    const old=enemy.phase; enemy.phase=(enemy.phase+step)%6.8; const phase=enemy.phase;
    if(phase<1.5){enemy.attackState='idle';if(distance>118)moveEnemy(state,enemy,route,enemy.speed,step);}
    else if(phase<2.25){
      if(old<1.5){enemy.attackDirection=toward;enemy.attackTarget={...state.player};enemy.chargeConnected=false;}
      enemy.attackState='melee-telegraph';
    }else if(phase<2.65){
      enemy.attackState='melee-swing';
      const moved=moveOnStage(state.stage,enemy,{x:enemy.attackDirection.x*220*step,y:enemy.attackDirection.y*220*step},enemy.radius);enemy.x=moved.x;enemy.y=moved.y;
      if(!enemy.chargeConnected&&Math.hypot(enemy.x-state.player.x,enemy.y-state.player.y)<enemy.radius+26){enemy.chargeConnected=true;damagePlayer(state,enemy.damage,'dr-smile-melee',config);}
    }else if(phase<3.35)enemy.attackState='recovering';
    else if(phase<4.2){
      if(old<3.35)enemy.attackTarget={...state.player};
      enemy.attackState='hazard-telegraph';
    }else if(phase<5.05){
      enemy.attackState='hazard-active';
      if(Math.hypot(state.player.x-enemy.attackTarget.x,state.player.y-enemy.attackTarget.y)<92&&enemy.attackCooldown<=0){damagePlayer(state,enemy.damage*0.8,'dr-smile-zone',config);enemy.attackCooldown=0.75;}
    }else enemy.attackState='recovering';
    updateFacingFromHorizontal(enemy,enemy.attackDirection.x||toward.x);
  }
}

export function updateGame(state: SimState, dt: number, input: InputState, config: RunConfig = standardRun): void {
  if (state.status !== 'playing') return;
  const step = Math.min(dt, 0.05); const p = state.player;
  state.elapsed += step; p.health = Math.min(p.maxHealth, p.health + p.healthRegen * step); p.invulnerable = Math.max(0, p.invulnerable - step); p.dashCooldown = Math.max(0, p.dashCooldown - step); p.dashTimer = Math.max(0, p.dashTimer - step); state.specialTimer = Math.max(0, state.specialTimer - step);
  const startingDash = input.dash && p.dashCooldown === 0;
  if (startingDash) { p.dashTimer = 0.16; p.dashCooldown = DIFFICULTIES[config.difficulty].dashCooldownSeconds; p.invulnerable = Math.max(p.invulnerable, 0.22); }
  const dashX = input.x || (startingDash ? p.facing.x : 0); const dashY = input.y || (startingDash ? p.facing.y : 0);
  movePlayer(p, dashX, dashY, step * (p.dashTimer > 0 ? 2.7 : 1), config, state.stage);
  const playerCell = Math.floor(p.y / state.stage.cellSize) * state.stage.columns + Math.floor(p.x / state.stage.cellSize);
  if (playerCell !== state.navigationTargetCell) { state.navigationTargetCell = playerCell; state.navigation = buildNavigationField(state.stage, p.x, p.y); }
  state.enemyGrid.rebuild(state.enemies, enemy => !enemy.dead);
  const nearbyEnemies = state.enemyQueryScratch;
  if (input.special && p.special >= 100 && state.specialTimer === 0) {
    p.special = 0; state.specialTimer = ATTACKS.special.cooldown; state.messages.push(ATTACKS.special.name);
    for (const e of state.enemyGrid.queryRadius(p.x, p.y, ATTACKS.special.targetRange, nearbyEnemies)) if (!e.dead && dist2(p, e) < ATTACKS.special.targetRange ** 2 && !segmentHitsBuilding(state.stage, p, e)) applyEnemyDamage(state, e, ATTACKS.special.damage * (1 + p.damageBonus), normalize(e.x - p.x, e.y - p.y), config);
  }
  if ((state.endless ? state.elapsed >= state.nextBossAt : state.elapsed >= config.bossAt && !state.bossDefeated) && !state.enemies.some(e => e.kind === 'boss' && !e.dead)) {
    const boss = spawnBossForEncounter(state, config); state.currentBossId=boss.bossId; state.enemies.push(boss); state.enemyGrid.insert(boss); state.bossArrivalAt = state.elapsed; state.messages.push((boss.bossId==='dr-smile'?'DR. SMILE':'GANG BOSS')+' ARRIVED');
  }
  updateHordeDirector(state, step, config);
  updateGroundWaves(state, step, nearbyEnemies, config);
  // Orbit Guard entities are both rendered and collision-tested at these exact positions.
  syncOrbitRings(p);
  const orbitRank = p.weaponRanks.orbitGuard;
  if (p.orbit) {
    const effectiveOrbitRank = Math.max(1, orbitRank); const rankIndex = Math.max(0, effectiveOrbitRank - 1); const count = p.orbitRings.length;
    const angularSpeed = 2.8 * attackRateMultiplier(state) * (ATTACKS.orbitGuard.rankCooldown?.[rankIndex] ?? 1);
    const radius = (48 + Math.min(12, effectiveOrbitRank * 2) + (p.evolutions.includes('eternal-halo') ? 18 : 0)) * (1 + p.passiveRanks.wideImpact * 0.1);
    for (let ringIndex = 0; ringIndex < count; ringIndex++) {
      const ring = p.orbitRings[ringIndex]!; ring.angle = (ring.angle + angularSpeed * step) % (Math.PI * 2);
      const position = { x: p.x + Math.cos(ring.angle) * radius, y: p.y + Math.sin(ring.angle) * radius };
      for (const id of Object.keys(ring.hitCooldowns)) { ring.hitCooldowns[Number(id)] = Math.max(0, ring.hitCooldowns[Number(id)]! - step); if (ring.hitCooldowns[Number(id)] === 0) delete ring.hitCooldowns[Number(id)]; }
      for (const enemy of state.enemyGrid.queryRadius(position.x, position.y, 22, nearbyEnemies)) {
        if (enemy.dead || (ring.hitCooldowns[enemy.id] ?? 0) > 0 || dist2(position, enemy) > (enemy.radius + 13) ** 2 || segmentHitsBuilding(state.stage, p, position)) continue;
        applyEnemyDamage(state, enemy, ATTACKS.orbitGuard.damage * (1 + p.damageBonus) * (ATTACKS.orbitGuard.rankDamage?.[rankIndex] ?? 1) * (p.evolutions.includes('eternal-halo') ? 1.3 : 1), normalize(enemy.x - p.x, enemy.y - p.y), config);
        ring.hitCooldowns[enemy.id] = Math.max(0.24, ATTACKS.orbitGuard.cooldown * (ATTACKS.orbitGuard.rankCooldown?.[rankIndex] ?? 1) * attackRateMultiplier(state));
      }
    }
  }
  updateHeroWeapons(state,step,nearbyEnemies,config);
  if (p.heroId==='blue-pinwheel') p.attackTimer -= step;
  if (p.heroId==='blue-pinwheel' && p.attackTimer <= 0) {
    const target = acquireTargetFromGrid(state, ATTACKS.pinwheel.targetRange, nearbyEnemies);
    if (target) {
      const rank = p.weaponRanks.pinwheel;
      const rankIndex = Math.max(0, rank - 1);
      const damage = ATTACKS.pinwheel.damage * (1 + p.damageBonus) * (ATTACKS.pinwheel.rankDamage?.[rankIndex] ?? 1);
      const pierce = (ATTACKS.pinwheel.rankPierce?.[rankIndex] ?? 0) + (p.evolvedPinwheel ? PINWHEEL_EVOLUTION.bonusPierce : 0);
      launchShot(state, target, damage, 'pinwheel', pierce);
      p.attackTimer = Math.max(0.24, ATTACKS.pinwheel.cooldown * attackRateMultiplier(state) * (ATTACKS.pinwheel.rankCooldown?.[rankIndex] ?? 1) * (p.evolvedPinwheel ? PINWHEEL_EVOLUTION.cooldownMultiplier : 1));
    }
  }
  if (p.heroId==='blue-pinwheel' && p.weaponRanks.piercingThrow > 0) {
    p.piercingTimer -= step;
    if (p.piercingTimer <= 0) {
      const target = acquireTargetFromGrid(state, ATTACKS.piercingThrow.targetRange, nearbyEnemies);
      if (target) {
        const rank = p.weaponRanks.piercingThrow;
        const rankIndex = Math.max(0, rank - 1);
        launchShot(state, target, ATTACKS.piercingThrow.damage * (1 + p.damageBonus) * (ATTACKS.piercingThrow.rankDamage?.[rankIndex] ?? 1), 'piercingThrow', ATTACKS.piercingThrow.rankPierce?.[rankIndex] ?? ATTACKS.piercingThrow.pierce ?? 0);
        p.piercingTimer = ATTACKS.piercingThrow.cooldown * attackRateMultiplier(state) * (ATTACKS.piercingThrow.rankCooldown?.[rankIndex] ?? 1);
      }
    }
  }
  for (const shot of state.projectiles) {
    const previous = { x: shot.x, y: shot.y };
    if(shot.weaponId==='chainball'&&shot.sourceEnemyId!==undefined){
      const source=state.enemies.find(enemy=>enemy.id===shot.sourceEnemyId&&!enemy.dead);
      if(!source){shot.life=0;continue;}
      const distance=Math.hypot(shot.x-source.x,shot.y-source.y);
      if(shot.returning||distance>=(shot.maxRange??410)){
        shot.returning=true;const back=normalize(source.x-shot.x,source.y-shot.y);shot.vx=back.x*430;shot.vy=back.y*430;
        shot.x+=shot.vx*step;shot.y+=shot.vy*step;if(Math.hypot(shot.x-source.x,shot.y-source.y)<22)shot.life=0;
      }else{shot.x+=shot.vx*step;shot.y+=shot.vy*step;}
    } else if (shot.weaponId === 'spear' && shot.returning) {
      const back = normalize(p.x - shot.x, p.y - shot.y); shot.vx = back.x * 420; shot.vy = back.y * 420; shot.x += shot.vx * step; shot.y += shot.vy * step;
      if (Math.hypot(shot.x - p.x, shot.y - p.y) < 24) shot.life = 0;
    } else { shot.x += shot.vx * step; shot.y += shot.vy * step; }
    if (shot.weaponId === 'boulder' && shot.arcDuration) { shot.arcElapsed = (shot.arcElapsed ?? 0) + step; const progress = Math.min(1, shot.arcElapsed / shot.arcDuration); shot.arcHeight = Math.sin(progress * Math.PI) * 26; }
    if (shot.weaponId === 'spear' && shot.maxRange && !shot.returning && Math.hypot(shot.x - p.x, shot.y - p.y) >= shot.maxRange) {
      if (p.evolutions.includes('returning-lance')) { shot.returning = true; shot.hitIds.length = 0; shot.pierce = 5; }
      else shot.life = 0;
    }
    shot.life -= step; shot.spin += step * 16;
    if (segmentHitsBuilding(state.stage, previous, shot, 2)) {
      if (shot.weaponId === 'ricochetRing' && (shot.bouncesRemaining ?? 0) > 0) {
        const xBlocked = segmentHitsBuilding(state.stage, previous, { x: shot.x, y: previous.y }, 2);
        const yBlocked = segmentHitsBuilding(state.stage, previous, { x: previous.x, y: shot.y }, 2);
        shot.x = previous.x; shot.y = previous.y;
        if (xBlocked) shot.vx *= -1; if (yBlocked) shot.vy *= -1;
        if (!xBlocked && !yBlocked) { shot.vx *= -1; shot.vy *= -1; }
        shot.bouncesRemaining!--;
      } else { shot.life = 0; continue; }
    }
    if (shot.weaponId === 'ricochetRing' && (shot.x <= 1 || shot.x >= config.arenaWidth - 1 || shot.y <= 1 || shot.y >= config.arenaHeight - 1)) {
      if ((shot.bouncesRemaining ?? 0) <= 0) { shot.life = 0; continue; }
      if (shot.x <= 1 || shot.x >= config.arenaWidth - 1) { shot.vx *= -1; shot.x = clamp(shot.x, 2, config.arenaWidth - 2); }
      if (shot.y <= 1 || shot.y >= config.arenaHeight - 1) { shot.vy *= -1; shot.y = clamp(shot.y, 2, config.arenaHeight - 2); }
      shot.bouncesRemaining!--;
    }
    if (shot.owner === 'player') for (const e of state.enemyGrid.queryRadius(shot.x, shot.y, GANG_LEADER.radius + 9, nearbyEnemies)) {
      if (e.dead || shot.hitIds.includes(e.id) || dist2(shot, e) >= (e.radius + 9) ** 2) continue;
      applyEnemyDamage(state, e, shot.damage, normalize(e.x - p.x, e.y - p.y), config); shot.hitIds.push(e.id);
      if (shot.splashRadius) for (const nearby of state.enemies) {
        if (nearby.dead || shot.hitIds.includes(nearby.id) || dist2(nearby, shot) > (shot.splashRadius + nearby.radius) ** 2 || segmentHitsBuilding(state.stage, shot, nearby)) continue;
        applyEnemyDamage(state, nearby, shot.damage * 0.45, normalize(nearby.x - shot.x, nearby.y - shot.y), config); shot.hitIds.push(nearby.id);
      }
      if (shot.pierce > 0) shot.pierce--; else { shot.life = 0; break; }
    }
  }
  let writeProjectiles = 0;
  for (const shot of state.projectiles) if (shot.life > 0 && shot.x > 0 && shot.y > 0 && shot.x < config.arenaWidth && shot.y < config.arenaHeight) state.projectiles[writeProjectiles++] = shot;
  state.projectiles.length = writeProjectiles;
  for (const enemy of state.enemies) {
    if (enemy.dead) continue;
    const toward = normalize(p.x - enemy.x, p.y - enemy.y);
    enemy.animationTime += step;
    const dx = enemy.x - p.x; const dy = enemy.y - p.y; const d = Math.hypot(dx, dy);
    const route = pursuitDirection(state, enemy, toward);
    if (enemy.kind === 'boss' && state.endless && enemy.bossId) {
      updateNamedBoss(state,enemy,toward,route,d,step,config);
    } else if (enemy.kind === 'boss') {
      const previousPhase = enemy.phase % GANG_LEADER.phaseLength;
      enemy.phase += step;
      const phase = enemy.phase % GANG_LEADER.phaseLength;
      const beginsSegment = (start: number) => previousPhase < start && phase >= start;
      if (phase >= GANG_LEADER.rangedTelegraphStart && phase < GANG_LEADER.rangedTelegraphEnd) {
        if (beginsSegment(GANG_LEADER.rangedTelegraphStart)) enemy.attackDirection = normalize(p.x - enemy.x, p.y - enemy.y);
        enemy.attackState = 'ranged-telegraph';
      } else if (previousPhase < GANG_LEADER.rangedTelegraphEnd && phase >= GANG_LEADER.rangedTelegraphEnd) {
        const aim = enemy.attackDirection;
        const speedScale = DIFFICULTIES[config.difficulty].enemyProjectileSpeedMultiplier;
        state.projectiles.push({ id: state.nextId++, x: enemy.x, y: enemy.y, vx: aim.x * GANG_LEADER.rangedSpeed * speedScale, vy: aim.y * GANG_LEADER.rangedSpeed * speedScale, damage: GANG_LEADER.rangedDamage * DIFFICULTIES[config.difficulty].enemyDamageMultiplier, life: 2, pierce: 0, hitIds: [], special: false, owner: 'enemy', spin: 0, weaponId: 'enemy', damageSource: 'boss-projectile' });
        enemy.attackState = 'recovering';
      } else if (phase >= GANG_LEADER.chargeStart && phase < GANG_LEADER.chargeEnd) {
        if (beginsSegment(GANG_LEADER.chargeStart)) { enemy.chargeReady = d < GANG_LEADER.chargeRange; enemy.chargeConnected = false; if (enemy.chargeReady) enemy.attackDirection = normalize(p.x - enemy.x, p.y - enemy.y); }
        enemy.attackState = enemy.chargeReady ? 'charge-telegraph' : 'idle';
      } else if (phase >= GANG_LEADER.chargeEnd && phase < GANG_LEADER.chargeActiveEnd) {
        if (enemy.chargeReady) enemy.attackState = 'charging';
        else enemy.attackState = 'idle';
      } else if (phase >= GANG_LEADER.rangedTelegraphEnd && phase < GANG_LEADER.recoveryEnd) enemy.attackState = 'recovering';
      else enemy.attackState = 'idle';
      if (enemy.attackState === 'ranged-telegraph' || enemy.attackState === 'charge-telegraph' || enemy.attackState === 'charging' || enemy.attackState === 'recovering') updateFacingFromHorizontal(enemy, enemy.attackDirection.x);
      else updateFacingFromHorizontal(enemy, toward.x);
      if (enemy.attackState === 'idle' && d > 125) moveEnemy(state, enemy, route, enemy.speed, step);
      if (enemy.attackState === 'charging') {
        const moved = moveOnStage(state.stage, enemy, { x: enemy.attackDirection.x * GANG_LEADER.chargeSpeed * step, y: enemy.attackDirection.y * GANG_LEADER.chargeSpeed * step }, enemy.radius);
        enemy.x = moved.x; enemy.y = moved.y;
      }
      if (enemy.attackState === 'charging' && !enemy.chargeConnected && Math.hypot(enemy.x - p.x, enemy.y - p.y) < enemy.radius + 18) {
        enemy.chargeConnected = true;
        damagePlayer(state, GANG_LEADER.contactDamage * DIFFICULTIES[config.difficulty].enemyDamageMultiplier, 'boss-charge', config);
      }
    } else if (enemy.kind === 'fastThug') {
      enemy.phase = Math.max(0, enemy.phase - step);
      if (enemy.attackState === 'melee-telegraph') {
        updateFacingFromHorizontal(enemy, enemy.attackDirection.x);
        if (enemy.phase <= 0) {
          if (d < enemy.radius + 32) damagePlayer(state, enemy.damage, 'fast-contact', config);
          enemy.attackState = 'melee-swing'; enemy.phase = 0.12;
        }
      } else if (enemy.attackState === 'melee-swing') {
        updateFacingFromHorizontal(enemy, enemy.attackDirection.x);
        if (enemy.phase <= 0) { enemy.attackState = 'recovering'; enemy.phase = 0.62; }
      } else if (enemy.attackState === 'recovering' && enemy.phase > 0) {
        updateFacingFromHorizontal(enemy, enemy.attackDirection.x);
      } else {
        enemy.attackState = 'idle'; updateFacingFromHorizontal(enemy, route.x); moveEnemy(state, enemy, route, enemy.speed, step);
        if (d < enemy.radius + 32) { enemy.attackDirection = toward; enemy.attackState = 'melee-telegraph'; enemy.phase = 0.32; }
      }
    } else if (enemy.kind === 'yoYoPunk') {
      updateYoYoPunk(state,enemy,toward,route,d,step,config);
    } else if (ENEMIES[enemy.kind].ranged) {
      const ranged = ENEMIES[enemy.kind].ranged;
      enemy.rangedTimer -= step; enemy.phase = Math.max(0, enemy.phase - step);
      if (enemy.rangedTimer <= 0 && !segmentHitsBuilding(state.stage, enemy, p)) { fireEnemyProjectile(state, enemy, enemy.attackDirection, config); enemy.rangedTimer = (ranged?.attackInterval ?? 2.8) * DIFFICULTIES[config.difficulty].rangedAttackIntervalMultiplier; enemy.phase = 0.38; enemy.attackState = 'recovering'; }
      else if (enemy.rangedTimer <= 0) enemy.rangedTimer = 0.35;
      else if (enemy.phase > 0) enemy.attackState = 'recovering';
      else if (enemy.rangedTimer <= (ranged?.telegraphSeconds ?? 0.46)) { if (enemy.attackState !== 'ranged-telegraph') enemy.attackDirection = toward; enemy.attackState = 'ranged-telegraph'; }
      else enemy.attackState = 'idle';
      updateFacingFromHorizontal(enemy, enemy.attackState === 'ranged-telegraph' ? enemy.attackDirection.x : toward.x);
      const preferred = ranged?.preferredRange ?? 250;
      if (d > preferred + 24 || segmentHitsBuilding(state.stage, enemy, p, enemy.radius + 2)) moveEnemy(state, enemy, route, enemy.speed, step);
      else if (d < preferred - 36) moveEnemy(state, enemy, normalize(-toward.x, -toward.y), enemy.speed * 0.72, step);
    } else { updateFacingFromHorizontal(enemy, route.x); moveEnemy(state, enemy, route, enemy.speed, step); }
    const movedByKnockback = moveOnStage(state.stage, enemy, { x: enemy.knockback.x * step, y: enemy.knockback.y * step }, enemy.radius);
    enemy.x = movedByKnockback.x; enemy.y = movedByKnockback.y;
    enemy.knockback.x *= Math.exp(-9 * step); enemy.knockback.y *= Math.exp(-9 * step); enemy.hitFlash = Math.max(0, enemy.hitFlash - step);
    const distance = Math.hypot(enemy.x - p.x, enemy.y - p.y);
    if (distance < enemy.radius + 18 && enemy.kind !== 'boss' && enemy.kind !== 'fastThug') damagePlayer(state, enemy.damage, enemy.kind === 'bruiser' ? 'bruiser-contact' : 'thug-contact', config);
    if (enemy.kind !== 'boss' && distance > 760) enemy.distantTime += step; else enemy.distantTime = 0;
    if (enemy.distantTime >= config.horde.recycleAfter) { const recycled = spawnEnemy(state, enemy.kind, config); enemy.x = recycled.x; enemy.y = recycled.y; enemy.distantTime = 0; state.recycledEnemies++; }
    if (state.status !== 'playing') break;
  }
  separateEnemies(state);
  // Resolve enemy projectiles against the player after movement (boss attacks are telegraphed in the renderer).
  for (const s of state.projectiles) if (s.owner === 'enemy' && dist2(s, p) < 30 ** 2) { damagePlayer(state, s.damage, s.damageSource ?? 'ranged-projectile', config); s.life = 0; }
  writeProjectiles = 0;
  for (const shot of state.projectiles) if (shot.life > 0) state.projectiles[writeProjectiles++] = shot;
  state.projectiles.length = writeProjectiles;
  let writeEnemies = 0;
  for (const enemy of state.enemies) if (!enemy.dead) state.enemies[writeEnemies++] = enemy;
  state.enemies.length = writeEnemies;
  state.pickupMergeTimer -= step;
  if (state.pickupMergeTimer <= 0) { mergeNearbyPickups(state); state.pickupMergeTimer = 0.5; }
  const directPickupRadius = 24;
  for (const pickup of state.pickups) {
    if (pickup.kind === 'boss-evolution') {
      const nearReward = dist2(p, pickup) < 34 ** 2 && !segmentHitsBuilding(state.stage, pickup, p);
      if (nearReward) {
        const eligible = eligibleWeaponEvolutions(state);
        state.evolutionOptions = eligible.length ? eligible.slice(0, 3) : ['field-cache'];
        state.status = 'boss-reward'; pickup.consumed = true;
        state.messages.push(eligible.length ? 'BOSS REWARD · CHOOSE AN EVOLUTION' : 'BOSS REWARD · FIELD CACHE AVAILABLE');
        break;
      }
      continue;
    }
    const dx = p.x - pickup.x; const dy = p.y - pickup.y; const d2 = dx * dx + dy * dy;
    if (d2 < directPickupRadius ** 2 && !segmentHitsBuilding(state.stage, pickup, p)) { p.xp += pickup.value * (1 + p.passiveRanks.experienceTraining * 0.08); p.special = Math.min(100, p.special + pickup.value * 0.42 * (1 + p.passiveRanks.extendedCharge * 0.12)); state.xpCollected += pickup.value; float(state, `+${pickup.value} XP`, pickup.x, pickup.y); pickup.value = 0; }
    else if (d2 < p.pickupRadius ** 2 && !segmentHitsBuilding(state.stage, pickup, p)) { const distance = Math.sqrt(d2) || 1; pickup.pullSpeed = Math.min(290, (pickup.pullSpeed ?? 0) + 720 * step); const pull = Math.min(distance, pickup.pullSpeed * step); const moved = moveOnStage(state.stage, pickup, { x: dx / distance * pull, y: dy / distance * pull }, 0); pickup.x = moved.x; pickup.y = moved.y; }
    else pickup.pullSpeed = 0;
  }
  let writePickups = 0;
  for (const pickup of state.pickups) if (pickup.value > 0 || (pickup.kind === 'boss-evolution' && pickup.value === 0 && !pickup.consumed)) state.pickups[writePickups++] = pickup;
  state.pickups.length = writePickups;
  let writeNumbers = 0;
  for (const number of state.numbers) { number.life -= step; number.y -= 24 * step; if (number.life > 0) state.numbers[writeNumbers++] = number; }
  state.numbers.length = writeNumbers;
  while (p.xp >= p.xpNext && state.status === 'playing') { p.xp -= p.xpNext; offerLevel(state); }
  if (!state.endless && state.bossDefeated && !state.enemies.some(e => !e.dead && e.kind === 'boss') && state.status === 'playing') state.status = 'victory';
  if (!state.endless && state.elapsed >= config.duration + config.overtimeLimit && !state.bossDefeated && state.status === 'playing') { state.status = 'defeat'; state.endReason = 'boss-escaped'; }
}

export function retireRun(state: SimState): void {
  if (state.status === 'playing' || state.status === 'paused') { state.status='retired'; state.endReason='retired'; }
}

export function getUpgrade(id: UpgradeId) { return UPGRADES.find(x => x.id === id)!; }
export function distanceSquared(a: Vec, b: Vec): number { return dist2(a, b); }
