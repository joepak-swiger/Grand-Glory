import { ATTACKS, BLUE_PINWHEEL, ENEMIES, GANG_LEADER, standardRun, UPGRADES, type EnemyKind, type GameStatus, type RunConfig, type UpgradeId } from './definitions';

export interface Vec { x: number; y: number }
export interface Player extends Vec { health: number; maxHealth: number; speed: number; level: number; xp: number; xpNext: number; invulnerable: number; attackTimer: number; dashTimer: number; dashCooldown: number; special: number; facing: Vec; damageBonus: number; extraShots: number; pickupRadius: number; orbit: boolean; orbitTimer: number; damageDealt: number }
export interface Enemy extends Vec { id: number; kind: EnemyKind; health: number; maxHealth: number; speed: number; damage: number; radius: number; xp: number; knockback: Vec; hitFlash: number; attackWindup: number; dead: boolean; phase: number }
export interface Projectile extends Vec { id: number; vx: number; vy: number; damage: number; life: number; pierce: number; special: boolean; owner: 'player' | 'enemy'; spin: number }
export interface Pickup extends Vec { id: number; value: number }
export interface FloatText extends Vec { id: number; text: string; life: number }
export interface SimState {
  status: GameStatus; player: Player; enemies: Enemy[]; projectiles: Projectile[]; pickups: Pickup[]; numbers: FloatText[];
  elapsed: number; kills: number; bossDefeated: boolean; seed: number; nextId: number; spawnTimer: number; levelChoices: number;
  options: UpgradeId[]; chosen: UpgradeId[]; attacks: string[]; messages: string[]; specialTimer: number;
}
export interface InputState { x: number; y: number; dash: boolean; special: boolean }
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const dist2 = (a: Vec, b: Vec) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
const normalize = (x: number, y: number): Vec => { const m = Math.hypot(x, y); return m > 0 ? { x: x / m, y: y / m } : { x: 0, y: 0 }; };

export function createGame(seed = standardRun.seed, config: RunConfig = standardRun): SimState {
  return {
    status: 'playing', player: { x: config.arenaWidth / 2, y: config.arenaHeight / 2, health: BLUE_PINWHEEL.maxHealth, maxHealth: BLUE_PINWHEEL.maxHealth, speed: BLUE_PINWHEEL.moveSpeed, level: 1, xp: 0, xpNext: 30, invulnerable: 0, attackTimer: 0.25, dashTimer: 0, dashCooldown: 0, special: 0, facing: { x: 1, y: 0 }, damageBonus: 0, extraShots: 0, pickupRadius: 74, orbit: false, orbitTimer: 0, damageDealt: 0 },
    enemies: [], projectiles: [], pickups: [], numbers: [], elapsed: 0, kills: 0, bossDefeated: false, seed: seed >>> 0, nextId: 1, spawnTimer: 0.3, levelChoices: 0, options: [], chosen: [], attacks: [BLUE_PINWHEEL.attackName], messages: [], specialTimer: 0,
  };
}

export function random(state: SimState): number {
  state.seed = (Math.imul(1664525, state.seed) + 1013904223) >>> 0;
  return state.seed / 4294967296;
}

export function movePlayer(player: Player, dx: number, dy: number, dt: number, config: RunConfig): void {
  const dir = normalize(dx, dy);
  if (dir.x || dir.y) player.facing = dir;
  player.x = clamp(player.x + dir.x * player.speed * dt, 28, config.arenaWidth - 28);
  player.y = clamp(player.y + dir.y * player.speed * dt, 288, Math.min(config.arenaHeight - 28, 752));
}

export function spawnEnemy(state: SimState, kind: EnemyKind, config: RunConfig = standardRun, position?: Vec): Enemy {
  const def = ENEMIES[kind]; let x: number; let y: number;
  if (position) ({ x, y } = position);
  else {
    // Spawn from one of the arena edges, far enough from the player to avoid unfair overlaps.
    const edge = Math.floor(random(state) * 4); const offset = 80 + random(state) * 0.72;
    if (edge === 0) { x = offset * config.arenaWidth; y = 25; }
    else if (edge === 1) { x = config.arenaWidth - 25; y = offset * config.arenaHeight; }
    else if (edge === 2) { x = offset * config.arenaWidth; y = config.arenaHeight - 25; }
    else { x = 25; y = offset * config.arenaHeight; }
    const away = normalize(x - state.player.x, y - state.player.y);
    x = clamp(state.player.x + away.x * Math.max(170, Math.abs(x - state.player.x)), 24, config.arenaWidth - 24);
    y = clamp(state.player.y + away.y * Math.max(170, Math.abs(y - state.player.y)), 24, config.arenaHeight - 24);
  }
  return { id: state.nextId++, x, y, kind, health: def.health, maxHealth: def.health, speed: def.speed, damage: def.damage, radius: def.radius, xp: def.xp, knockback: { x: 0, y: 0 }, hitFlash: 0, attackWindup: 0, dead: false, phase: 0 };
}

export function acquireTarget(state: SimState, range = 520): Enemy | undefined {
  let target: Enemy | undefined; let best = range * range;
  for (const enemy of state.enemies) if (!enemy.dead) { const d = dist2(state.player, enemy); if (d < best) { target = enemy; best = d; } }
  return target;
}

function float(state: SimState, text: string, x: number, y: number): void { state.numbers.push({ id: state.nextId++, text, x, y, life: 0.75 }); }
function applyEnemyDamage(state: SimState, enemy: Enemy, damage: number, direction: Vec, config: RunConfig): void {
  if (enemy.dead || enemy.health <= 0) return;
  enemy.health = Math.max(0, enemy.health - damage); enemy.hitFlash = 0.16;
  enemy.knockback.x += direction.x * (enemy.kind === 'boss' ? 90 : 230);
  enemy.knockback.y += direction.y * (enemy.kind === 'boss' ? 90 : 230);
  state.player.damageDealt += damage;
  if (enemy.health === 0) { enemy.dead = true; state.kills++; state.pickups.push({ id: state.nextId++, x: enemy.x, y: enemy.y, value: enemy.xp }); if (enemy.kind === 'boss') state.bossDefeated = true; }
  else float(state, `${Math.round(damage)}`, enemy.x, enemy.y - enemy.radius);
  if (enemy.kind !== 'boss') enemy.phase = Math.min(1, enemy.phase + 0.12);
  void config;
}

function launchShot(state: SimState, target: Enemy, damage: number, special = false): void {
  const dir = normalize(target.x - state.player.x, target.y - state.player.y);
  const spread = state.player.extraShots;
  for (let i = 0; i <= spread; i++) {
    const angle = Math.atan2(dir.y, dir.x) + (i - spread / 2) * 0.18;
    state.projectiles.push({ id: state.nextId++, x: state.player.x, y: state.player.y, vx: Math.cos(angle) * ATTACKS.pinwheel.projectileSpeed, vy: Math.sin(angle) * ATTACKS.pinwheel.projectileSpeed, damage, life: ATTACKS.pinwheel.lifetime, pierce: 0, special, owner: 'player', spin: 0 });
  }
}

function populateOptions(state: SimState): void {
  const candidates = UPGRADES.filter(u => u.id !== 'orbit' || !state.player.orbit);
  const pool = [...candidates]; state.options = [];
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
  if (id === 'magnet') p.pickupRadius *= 1.45;
  if (id === 'orbit') { p.orbit = true; state.attacks.push('Orbit Guard (Prototype)'); }
  state.chosen.push(id); state.levelChoices--; state.options = [];
  if (state.levelChoices > 0) { state.status = 'upgrade'; populateOptions(state); } else { state.status = 'playing'; while (p.xp >= p.xpNext && state.status === 'playing') { p.xp -= p.xpNext; offerLevel(state); } }
  return true;
}

export function damagePlayer(state: SimState, amount: number): boolean {
  const p = state.player;
  if (state.status !== 'playing' || p.invulnerable > 0 || p.health <= 0) return false;
  p.health = Math.max(0, p.health - amount); p.invulnerable = 0.8;
  if (p.health === 0) state.status = 'defeat';
  return true;
}

export function updateGame(state: SimState, dt: number, input: InputState, config: RunConfig = standardRun): void {
  if (state.status !== 'playing') return;
  const step = Math.min(dt, 0.05); const p = state.player;
  state.elapsed += step; p.invulnerable = Math.max(0, p.invulnerable - step); p.dashCooldown = Math.max(0, p.dashCooldown - step); p.dashTimer = Math.max(0, p.dashTimer - step); state.specialTimer = Math.max(0, state.specialTimer - step);
  const startingDash = input.dash && p.dashCooldown === 0;
  if (startingDash) { p.dashTimer = 0.16; p.dashCooldown = 3; p.invulnerable = Math.max(p.invulnerable, 0.22); }
  const dashX = input.x || (startingDash ? p.facing.x : 0); const dashY = input.y || (startingDash ? p.facing.y : 0);
  movePlayer(p, dashX, dashY, step * (p.dashTimer > 0 ? 2.7 : 1), config);
  if (input.special && p.special >= 100 && state.specialTimer === 0) { p.special = 0; state.specialTimer = ATTACKS.special.cooldown; state.messages.push(ATTACKS.special.name); for (const e of state.enemies) if (!e.dead && dist2(p, e) < ATTACKS.special.targetRange ** 2) applyEnemyDamage(state, e, ATTACKS.special.damage * (1 + p.damageBonus), normalize(e.x - p.x, e.y - p.y), config); }
  state.spawnTimer -= step;
  if (state.elapsed >= config.bossAt && !state.enemies.some(e => e.kind === 'boss' && !e.dead) && !state.bossDefeated) state.enemies.push(spawnEnemy(state, 'boss', config, { x: Math.min(config.arenaWidth - 70, p.x + 300), y: p.y + 60 }));
  if (state.spawnTimer <= 0 && state.enemies.filter(e => !e.dead && e.kind !== 'boss').length < config.maxEnemies && state.elapsed < config.bossAt + 2) {
    const fast = state.elapsed > config.bossAt * 0.48 && random(state) < 0.42;
    state.enemies.push(spawnEnemy(state, fast ? 'fastThug' : 'thug', config));
    state.spawnTimer = Math.max(0.35, 1.55 - state.elapsed / config.bossAt * 0.9);
  }
  // Orbit Guard prototype: short-range recurring pulse, visibly separate from the starter projectile.
  p.orbitTimer -= step;
  if (p.orbit && p.orbitTimer <= 0) { p.orbitTimer = ATTACKS.orbitGuard.cooldown; for (const e of state.enemies) if (!e.dead && dist2(p, e) < ATTACKS.orbitGuard.targetRange ** 2) applyEnemyDamage(state, e, ATTACKS.orbitGuard.damage * (1 + p.damageBonus), normalize(e.x - p.x, e.y - p.y), config); }
  p.attackTimer -= step;
  if (p.attackTimer <= 0) { const target = acquireTarget(state, ATTACKS.pinwheel.targetRange); if (target) { launchShot(state, target, ATTACKS.pinwheel.damage * (1 + p.damageBonus)); p.attackTimer = Math.max(0.24, ATTACKS.pinwheel.cooldown * Math.pow(0.8, state.chosen.filter(x => x === 'tempo').length)); } }
  for (const shot of state.projectiles) {
    shot.x += shot.vx * step; shot.y += shot.vy * step; shot.life -= step; shot.spin += step * 16;
    if (shot.owner === 'player') for (const e of state.enemies) if (!e.dead && dist2(shot, e) < (e.radius + 9) ** 2) { applyEnemyDamage(state, e, shot.damage, normalize(e.x - p.x, e.y - p.y), config); shot.life = 0; break; }
  }
  state.projectiles = state.projectiles.filter(s => s.life > 0 && s.x > 0 && s.y > 0 && s.x < config.arenaWidth && s.y < config.arenaHeight);
  for (const enemy of state.enemies) {
    if (enemy.dead) continue;
    const toward = normalize(p.x - enemy.x, p.y - enemy.y);
    const dx = enemy.x - p.x; const dy = enemy.y - p.y; const d = Math.hypot(dx, dy);
    if (enemy.kind === 'boss') {
      enemy.phase += step; enemy.attackWindup -= step;
      const phase = (enemy.phase % GANG_LEADER.phaseLength);
      if (phase < GANG_LEADER.approachUntil && d > 125) { enemy.x += toward.x * enemy.speed * step; enemy.y += toward.y * enemy.speed * step; }
      if (phase > GANG_LEADER.rangedTelegraphStart && phase < GANG_LEADER.rangedTelegraphEnd && enemy.attackWindup <= 0) { enemy.attackWindup = GANG_LEADER.rangedCooldown; const blast = normalize(p.x - enemy.x, p.y - enemy.y); state.projectiles.push({ id: state.nextId++, x: enemy.x, y: enemy.y, vx: blast.x * GANG_LEADER.rangedSpeed, vy: blast.y * GANG_LEADER.rangedSpeed, damage: GANG_LEADER.rangedDamage, life: 2, pierce: 99, special: false, owner: 'enemy', spin: 0 }); }
      if (phase > GANG_LEADER.chargeStart && phase < GANG_LEADER.chargeEnd && d < GANG_LEADER.chargeRange) { enemy.x += toward.x * GANG_LEADER.chargeSpeed * step; enemy.y += toward.y * GANG_LEADER.chargeSpeed * step; }
    } else { enemy.x += toward.x * enemy.speed * step; enemy.y += toward.y * enemy.speed * step; }
    enemy.x += enemy.knockback.x * step; enemy.y += enemy.knockback.y * step; enemy.knockback.x *= Math.exp(-9 * step); enemy.knockback.y *= Math.exp(-9 * step); enemy.hitFlash = Math.max(0, enemy.hitFlash - step);
    if (d < enemy.radius + 18 && enemy.kind !== 'boss') { damagePlayer(state, enemy.damage * step * 1.15); }
  }
  // Resolve enemy projectiles against the player after movement (boss attacks are telegraphed in the renderer).
  for (const s of state.projectiles) if (s.owner === 'enemy' && dist2(s, p) < 25 ** 2) { damagePlayer(state, s.damage); s.life = 0; }
  state.projectiles = state.projectiles.filter(s => s.life > 0);
  state.enemies = state.enemies.filter(e => !e.dead);
  for (const pickup of state.pickups) if (dist2(pickup, p) < p.pickupRadius ** 2) { p.xp += pickup.value; p.special = Math.min(100, p.special + pickup.value * 0.42); float(state, `+${pickup.value} XP`, pickup.x, pickup.y); pickup.value = 0; }
  state.pickups = state.pickups.filter(x => x.value > 0);
  state.numbers = state.numbers.filter(n => { n.life -= step; n.y -= 24 * step; return n.life > 0; });
  while (p.xp >= p.xpNext && state.status === 'playing') { p.xp -= p.xpNext; offerLevel(state); }
  if (state.bossDefeated && !state.enemies.some(e => !e.dead && e.kind === 'boss')) state.status = 'victory';
  if (state.elapsed >= config.duration && !state.bossDefeated && state.status === 'playing') { /* boss remains a valid victory path */ }
}

export function getUpgrade(id: UpgradeId) { return UPGRADES.find(x => x.id === id)!; }
export function distanceSquared(a: Vec, b: Vec): number { return dist2(a, b); }
