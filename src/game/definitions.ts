export type GameStatus = 'title' | 'playing' | 'upgrade' | 'paused' | 'victory' | 'defeat';
export type EnemyKind = 'thug' | 'fastThug' | 'boss';
export type UpgradeId = 'damage' | 'tempo' | 'extra' | 'speed' | 'vitality' | 'magnet' | 'orbit';

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
  id: 'blue-pinwheel', name: 'Blue Pinwheel', placeholder: false, maxHealth: 100, moveSpeed: 210,
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

export interface EnemyDefinition { readonly kind: EnemyKind; readonly health: number; readonly speed: number; readonly damage: number; readonly radius: number; readonly xp: number; readonly animation?: AnimationClipDefinition }
export interface AttackDefinition { readonly id: string; readonly name: string; readonly damage: number; readonly cooldown: number; readonly projectileSpeed: number; readonly lifetime: number; readonly targetRange: number }
export const ATTACKS: Readonly<Record<'pinwheel' | 'orbitGuard' | 'special', AttackDefinition>> = {
  pinwheel: { id: 'pinwheel-prototype', name: 'Pinwheel (Prototype)', damage: 18, cooldown: 0.76, projectileSpeed: 410, lifetime: 1.5, targetRange: 520 },
  orbitGuard: { id: 'orbit-guard-prototype', name: 'Orbit Guard (Prototype)', damage: 11, cooldown: 0.42, projectileSpeed: 0, lifetime: 0, targetRange: 78 },
  special: { id: 'special-prototype', name: 'Prototype Special — Canon TBD', damage: 115, cooldown: 0.7, projectileSpeed: 0, lifetime: 0, targetRange: 230 },
};
export interface BossDefinition { readonly name: string; readonly health: number; readonly speed: number; readonly contactDamage: number; readonly radius: number; readonly xp: number; readonly phaseLength: number; readonly approachUntil: number; readonly rangedTelegraphStart: number; readonly rangedTelegraphEnd: number; readonly rangedDamage: number; readonly rangedSpeed: number; readonly chargeStart: number; readonly chargeEnd: number; readonly chargeActiveEnd: number; readonly recoveryEnd: number; readonly chargeRange: number; readonly chargeSpeed: number }
export const GANG_LEADER: BossDefinition = { name: 'Gang Leader · Prototype', health: 760, speed: 45, contactDamage: 18, radius: 31, xp: 120, phaseLength: 7.4, approachUntil: 2.35, rangedTelegraphStart: 2.35, rangedTelegraphEnd: 3.1, rangedDamage: 16, rangedSpeed: 280, chargeStart: 4.15, chargeEnd: 4.95, chargeActiveEnd: 5.55, recoveryEnd: 6.25, chargeRange: 300, chargeSpeed: 430 };
export const ENEMIES: Readonly<Record<EnemyKind, EnemyDefinition>> = {
  thug: { kind: 'thug', health: 34, speed: 55, damage: 9, radius: 15, xp: 12, animation: { asset: '/assets/enemies/thug-walk-cycle.png', frameWidth: 543, frameHeight: 724, frameCount: 4, frameDurationMs: 150 } },
  fastThug: { kind: 'fastThug', health: 24, speed: 92, damage: 7, radius: 13, xp: 16, animation: { asset: '/assets/enemies/fast-thug-bat-walk-cycle.png', frameWidth: 543, frameHeight: 724, frameCount: 4, frameDurationMs: 110 } },
  boss: { kind: 'boss', health: GANG_LEADER.health, speed: GANG_LEADER.speed, damage: GANG_LEADER.contactDamage, radius: GANG_LEADER.radius, xp: GANG_LEADER.xp },
};

export const UPGRADES: ReadonlyArray<{ id: UpgradeId; title: string; detail: string }> = [
  { id: 'damage', title: 'Sharper Pinwheels', detail: '+30% starter attack damage' },
  { id: 'tempo', title: 'Quick Rotation', detail: 'Attack 20% more often' },
  { id: 'extra', title: 'Double Pattern', detail: 'Fire one extra projectile' },
  { id: 'speed', title: 'Light Footwork', detail: '+12% movement speed' },
  { id: 'vitality', title: 'Second Wind', detail: '+25 maximum health and heal 25' },
  { id: 'magnet', title: 'Wide Pickup', detail: '+45% XP collection radius' },
  { id: 'orbit', title: 'Orbit Guard (Prototype)', detail: 'Unlock a close-range rotating attack' },
];

export interface RunConfig { readonly duration: number; readonly bossAt: number; readonly overtimeLimit: number; readonly seed: number; readonly arenaWidth: number; readonly arenaHeight: number; readonly maxEnemies: number; readonly testMode: boolean }
export interface StageDefinition { readonly id: string; readonly name: string; readonly run: RunConfig; readonly visualStyle: 'city-street-placeholder' }
export const standardRun: RunConfig = { duration: 180, bossAt: 150, overtimeLimit: 60, seed: 1741, arenaWidth: 1800, arenaHeight: 1200, maxEnemies: 75, testMode: false };
export const testRun: RunConfig = { ...standardRun, duration: 36, bossAt: 20, overtimeLimit: 12, seed: 1741, maxEnemies: 28, testMode: true };
export const CITY_STREET_STAGE: StageDefinition = { id: 'city-street', name: 'City Street (Prototype)', run: standardRun, visualStyle: 'city-street-placeholder' };
