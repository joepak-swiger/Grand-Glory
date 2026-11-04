export type GameStatus = 'title' | 'playing' | 'upgrade' | 'paused' | 'victory' | 'defeat';
export type EnemyKind = 'thug' | 'fastThug' | 'gangster' | 'bruiser' | 'boss';
export type UpgradeId = 'damage' | 'tempo' | 'extra' | 'speed' | 'vitality' | 'recovery' | 'magnet' | 'orbit' | 'pinwheel' | 'piercingThrow' | 'power' | 'evolvePinwheel';

export interface HeroDefinition {
  readonly id: string;
  readonly name: string;
  readonly placeholder: boolean;
  readonly maxHealth: number;
  readonly moveSpeed: number;
  readonly attackName: string;
  readonly animation: {
    readonly anchor: { readonly x: number; readonly y: number };
    readonly mirrorLeft: boolean;
    readonly verticalFacingFallback: string;
    readonly idle: AnimationClipDefinition;
    readonly move: AnimationClipDefinition;
    readonly damage: AnimationClipDefinition;
    readonly defeat: AnimationClipDefinition;
    readonly ability: AnimationClipDefinition;
  };
}

export interface AnimationClipDefinition { readonly asset: string; readonly frameWidth: number; readonly frameHeight: number; readonly frameCount: number; readonly frameDurationMs: number }

export const BLUE_PINWHEEL: HeroDefinition = {
  id: 'blue-pinwheel', name: 'Blue Pinwheel', placeholder: false, maxHealth: 160, moveSpeed: 210,
  attackName: 'Pinwheel (Prototype)',
  animation: {
    anchor: { x: 0.5, y: 1 }, mirrorLeft: true, verticalFacingFallback: 'right-facing profile, mirrored when facing left',
    idle: { asset: '/assets/blue-pinwheel/idle-cycle.png', frameWidth: 543, frameHeight: 724, frameCount: 4, frameDurationMs: 360 },
    move: { asset: '/assets/blue-pinwheel/idle-cycle.png', frameWidth: 543, frameHeight: 724, frameCount: 4, frameDurationMs: 120 },
    damage: { asset: '/assets/blue-pinwheel/standing-pose.png', frameWidth: 611, frameHeight: 906, frameCount: 1, frameDurationMs: 120 },
    defeat: { asset: '/assets/blue-pinwheel/standing-pose.png', frameWidth: 611, frameHeight: 906, frameCount: 1, frameDurationMs: 120 },
    ability: { asset: '/assets/blue-pinwheel/standing-pose.png', frameWidth: 611, frameHeight: 906, frameCount: 1, frameDurationMs: 120 },
  },
};

export interface EnemyDefinition { readonly kind: EnemyKind; readonly health: number; readonly speed: number; readonly damage: number; readonly radius: number; readonly xp: number; readonly animation?: AnimationClipDefinition; readonly ranged?: boolean; readonly preferredRange?: number }
export interface AttackDefinition { readonly id: string; readonly name: string; readonly damage: number; readonly cooldown: number; readonly projectileSpeed: number; readonly lifetime: number; readonly targetRange: number; readonly pierce?: number; readonly rankDamage?: readonly number[]; readonly rankCooldown?: readonly number[]; readonly rankPierce?: readonly number[] }
export const ATTACKS: Readonly<Record<'pinwheel' | 'orbitGuard' | 'piercingThrow' | 'special', AttackDefinition>> = {
  pinwheel: { id: 'pinwheel-prototype', name: 'Pinwheel (Prototype)', damage: 18, cooldown: 0.76, projectileSpeed: 410, lifetime: 1.5, targetRange: 520, rankDamage: [1, 1.18, 1.36, 1.55, 1.8], rankCooldown: [1, 1, 0.84, 0.84, 0.78], rankPierce: [0, 0, 0, 1, 1] },
  orbitGuard: { id: 'orbit-guard-prototype', name: 'Orbit Guard (Prototype)', damage: 11, cooldown: 0.42, projectileSpeed: 0, lifetime: 0, targetRange: 78, rankDamage: [1, 1.2, 1.4, 1.65, 1.9], rankCooldown: [1, 0.925, 0.85, 0.775, 0.7] },
  piercingThrow: { id: 'piercing-throw-prototype', name: 'Piercing Throw (Prototype)', damage: 26, cooldown: 1.8, projectileSpeed: 345, lifetime: 2.0, targetRange: 470, pierce: 2, rankDamage: [1, 1.2, 1.4, 1.65, 1.9], rankCooldown: [1, 1, 0.82, 0.82, 0.72], rankPierce: [2, 2, 3, 3, 4] },
  special: { id: 'special-prototype', name: 'Prototype Special — Canon TBD', damage: 115, cooldown: 0.7, projectileSpeed: 0, lifetime: 0, targetRange: 230 },
};
export interface EvolutionDefinition { readonly id: 'pinwheel-evolution'; readonly weapon: 'pinwheel'; readonly requiredWeaponRank: number; readonly requiredPowerRank: number; readonly name: string; readonly bonusPierce: number; readonly cooldownMultiplier: number }
export const PINWHEEL_EVOLUTION: EvolutionDefinition = { id: 'pinwheel-evolution', weapon: 'pinwheel', requiredWeaponRank: 5, requiredPowerRank: 2, name: 'Pinwheel Evolution (Prototype)', bonusPierce: 2, cooldownMultiplier: 0.7 };
export interface BossDefinition { readonly name: string; readonly health: number; readonly speed: number; readonly contactDamage: number; readonly radius: number; readonly xp: number; readonly phaseLength: number; readonly approachUntil: number; readonly rangedTelegraphStart: number; readonly rangedTelegraphEnd: number; readonly rangedDamage: number; readonly rangedSpeed: number; readonly chargeStart: number; readonly chargeEnd: number; readonly chargeActiveEnd: number; readonly recoveryEnd: number; readonly chargeRange: number; readonly chargeSpeed: number }
export const GANG_LEADER: BossDefinition = { name: 'Gang Leader · Prototype', health: 460, speed: 45, contactDamage: 18, radius: 31, xp: 120, phaseLength: 6.2, approachUntil: 1.0, rangedTelegraphStart: 1.0, rangedTelegraphEnd: 1.65, rangedDamage: 16, rangedSpeed: 280, chargeStart: 3.15, chargeEnd: 3.85, chargeActiveEnd: 4.4, recoveryEnd: 5.4, chargeRange: 320, chargeSpeed: 430 };
export const ENEMIES: Readonly<Record<EnemyKind, EnemyDefinition>> = {
  thug: { kind: 'thug', health: 34, speed: 55, damage: 5, radius: 15, xp: 12, animation: { asset: '/assets/enemies/thug-walk-cycle.png', frameWidth: 543, frameHeight: 724, frameCount: 4, frameDurationMs: 150 } },
  fastThug: { kind: 'fastThug', health: 24, speed: 92, damage: 4, radius: 13, xp: 16, animation: { asset: '/assets/enemies/fast-thug-bat-walk-cycle.png', frameWidth: 543, frameHeight: 724, frameCount: 4, frameDurationMs: 110 } },
  gangster: { kind: 'gangster', health: 38, speed: 40, damage: 4, radius: 15, xp: 22, ranged: true, preferredRange: 270, animation: { asset: '/assets/enemies/thug-walk-cycle.png', frameWidth: 543, frameHeight: 724, frameCount: 4, frameDurationMs: 165 } },
  bruiser: { kind: 'bruiser', health: 112, speed: 31, damage: 10, radius: 21, xp: 30 },
  boss: { kind: 'boss', health: GANG_LEADER.health, speed: GANG_LEADER.speed, damage: GANG_LEADER.contactDamage, radius: GANG_LEADER.radius, xp: GANG_LEADER.xp },
};

export const UPGRADES: ReadonlyArray<{ id: UpgradeId; title: string; detail: string }> = [
  { id: 'damage', title: 'Sharper Pinwheels', detail: '+30% starter attack damage' },
  { id: 'tempo', title: 'Quick Rotation', detail: 'Attack 20% more often' },
  { id: 'extra', title: 'Double Pattern', detail: 'Fire one extra projectile' },
  { id: 'speed', title: 'Light Footwork', detail: '+12% movement speed' },
  { id: 'vitality', title: 'Second Wind', detail: '+25 maximum health and heal 25' },
  { id: 'recovery', title: 'Steady Recovery', detail: '+0.45 health recovered per second' },
  { id: 'magnet', title: 'Wide Pickup', detail: '+45% XP collection radius' },
  { id: 'orbit', title: 'Orbit Guard (Prototype)', detail: 'Unlock a close-range rotating attack' },
  { id: 'pinwheel', title: 'Pinwheel Rank', detail: 'Strengthen the automatic starter attack' },
  { id: 'piercingThrow', title: 'Piercing Throw (Prototype)', detail: 'Unlock / rank a long piercing shot' },
  { id: 'power', title: 'Prototype Power', detail: '+15% damage; required for an evolution' },
  { id: 'evolvePinwheel', title: 'PINWHEEL EVOLUTION', detail: 'Evolve at Pinwheel Rank 5 + Prototype Power Rank 2' },
];

export type HordeEntrySide = 'left' | 'right' | 'top' | 'bottom';
export interface HordeConfig { readonly targetCounts: readonly { readonly at: number; readonly count: number }[]; readonly batchMin: number; readonly batchMax: number; readonly baseBatchInterval: number; readonly maxSpawnPerSecond: number; readonly maxSpawnPerUpdate: number; readonly surgeEvery: number; readonly surgeDuration: number; readonly surgeBonus: number; readonly maxActive: number; readonly spawnMarginX: number; readonly spawnMarginY: number; readonly recycleAfter: number }
export interface RunConfig { readonly duration: number; readonly bossAt: number; readonly overtimeLimit: number; readonly seed: number; readonly arenaWidth: number; readonly arenaHeight: number; readonly maxEnemies: number; readonly testMode: boolean; readonly horde: HordeConfig }
export interface StageDefinition { readonly id: string; readonly name: string; readonly run: RunConfig; readonly visualStyle: 'city-street-placeholder' }
const standardHorde: HordeConfig = { targetCounts: [{ at: 0, count: 8 }, { at: 15, count: 24 }, { at: 30, count: 40 }, { at: 60, count: 64 }, { at: 90, count: 82 }, { at: 120, count: 104 }, { at: 150, count: 120 }], batchMin: 3, batchMax: 5, baseBatchInterval: 0.95, maxSpawnPerSecond: 14, maxSpawnPerUpdate: 4, surgeEvery: 35, surgeDuration: 10, surgeBonus: 12, maxActive: 128, spawnMarginX: 84, spawnMarginY: 74, recycleAfter: 4.5 };
export const standardRun: RunConfig = { duration: 180, bossAt: 150, overtimeLimit: 60, seed: 1741, arenaWidth: 1800, arenaHeight: 1200, maxEnemies: 128, testMode: false, horde: standardHorde };
export const testRun: RunConfig = { ...standardRun, duration: 36, bossAt: 20, overtimeLimit: 12, seed: 1741, maxEnemies: 56, testMode: true, horde: { ...standardHorde, targetCounts: [{ at: 0, count: 5 }, { at: 5, count: 12 }, { at: 15, count: 22 }, { at: 25, count: 32 }], batchMin: 2, batchMax: 3, baseBatchInterval: 0.65, surgeEvery: 10, surgeDuration: 4, surgeBonus: 8, maxActive: 56 } };
export const CITY_STREET_STAGE: StageDefinition = { id: 'city-street', name: 'City Street (Prototype)', run: standardRun, visualStyle: 'city-street-placeholder' };
