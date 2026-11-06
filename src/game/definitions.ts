export type GameStatus = 'title' | 'playing' | 'upgrade' | 'boss-reward' | 'paused' | 'victory' | 'defeat' | 'retired';
export type HeroId = 'blue-pinwheel' | 'bok-goo' | 'da-ri';
export type ImplementedBossId = 'gang-boss' | 'dr-smile';
export type FactionId = 'street-gang' | 'dr-smile';
export interface PlannedVillainDefinition { readonly id: string; readonly name: string; readonly faction: string; readonly enabled: boolean }
export const PLANNED_VILLAINS: readonly PlannedVillainDefinition[] = [
  { id: 'tiger-mom', name: 'The Tiger Mom', faction: 'Tiger faction', enabled: false },
  { id: 'dr-eggplant', name: 'Dr. Eggplant', faction: 'Eggplant faction', enabled: false },
  { id: 'clownasaurus-rex', name: 'Clownasaurus Rex', faction: 'Clownasaurus faction', enabled: false },
];
export type EnemyKind = 'thug' | 'fastThug' | 'gangster' | 'bruiser' | 'yoYoPunk' | 'smiler' | 'molar' | 'boss';
export type PassiveId = 'might' | 'tempo' | 'reach' | 'momentum' | 'persistence' | 'multiplicity' | 'resilience' | 'vitality' | 'regeneration' | 'agility' | 'attraction' | 'fortune' | 'wisdom';
export const PASSIVE_IDS: readonly PassiveId[] = ['might', 'tempo', 'reach', 'momentum', 'persistence', 'multiplicity', 'resilience', 'vitality', 'regeneration', 'agility', 'attraction', 'fortune', 'wisdom'];
export interface HeroicTraitDefinition { readonly id: PassiveId; readonly name: string; readonly maxRank: number; readonly perRank: number; readonly unit: string; readonly compatibility: string }
export const HEROIC_TRAITS: Readonly<Record<PassiveId, HeroicTraitDefinition>> = {
  might: { id: 'might', name: 'Might', maxRank: 5, perRank: 0.10, unit: 'applicable damage', compatibility: 'All damaging weapons' },
  tempo: { id: 'tempo', name: 'Tempo', maxRank: 5, perRank: 0.08, unit: 'cooldown reduction', compatibility: 'All timed attacks' },
  reach: { id: 'reach', name: 'Reach', maxRank: 5, perRank: 0.10, unit: 'attack area', compatibility: 'Area, melee arcs, and attack lines' },
  momentum: { id: 'momentum', name: 'Momentum', maxRank: 5, perRank: 0.10, unit: 'projectile speed', compatibility: 'Traveling projectiles' },
  persistence: { id: 'persistence', name: 'Persistence', maxRank: 5, perRank: 0.10, unit: 'active duration', compatibility: 'Orbiting weapons, ricochets, and lingering attacks' },
  multiplicity: { id: 'multiplicity', name: 'Multiplicity', maxRank: 2, perRank: 1, unit: 'compatible projectile or attack', compatibility: 'Weapons with explicit bounded volleys' },
  resilience: { id: 'resilience', name: 'Resilience', maxRank: 5, perRank: 0.05, unit: 'incoming damage reduction', compatibility: 'All incoming damage; capped at 25%' },
  vitality: { id: 'vitality', name: 'Vitality', maxRank: 5, perRank: 0.15, unit: 'maximum health', compatibility: 'All heroes' },
  regeneration: { id: 'regeneration', name: 'Regeneration', maxRank: 5, perRank: 0.2, unit: 'health per second', compatibility: 'All heroes' },
  agility: { id: 'agility', name: 'Agility', maxRank: 5, perRank: 0.10, unit: 'movement speed', compatibility: 'All heroes' },
  attraction: { id: 'attraction', name: 'Attraction', maxRank: 5, perRank: 14, unit: 'XP attraction reach', compatibility: 'Collectible XP gems' },
  fortune: { id: 'fortune', name: 'Fortune', maxRank: 5, perRank: 0.08, unit: 'quality-cache chance', compatibility: 'Non-evolution boss rewards' },
  wisdom: { id: 'wisdom', name: 'Wisdom', maxRank: 5, perRank: 0.08, unit: 'collected XP bonus', compatibility: 'XP awarded on gem collection' },
};
export const PLANNED_HEROIC_TRAITS = [
  { id: 'prosperity', name: 'Prosperity', available: false, reason: 'Requires a persistent currency system.' },
  { id: 'provocation', name: 'Provocation', available: false, reason: 'Requires a risk-for-reward horde modifier.' },
  { id: 'second-chance', name: 'Second Chance', available: false, reason: 'Limited revival is not implemented.' },
  { id: 'overdrive', name: 'Overdrive', available: false, reason: 'Difficulty-tradeoff trait is deferred.' },
] as const;
export type UpgradeId = PassiveId | 'orbit' | 'pinwheel' | 'piercingThrow' | 'ricochetRing' | 'clubSweep' | 'boulderToss' | 'groundSlam' | 'spearThrust' | 'spearToss' | 'spearSweep' | 'mastery';
export type WeaponId = 'pinwheel' | 'orbitGuard' | 'piercingThrow' | 'ricochetRing' | 'clubSweep' | 'boulderToss' | 'groundSlam' | 'spearThrust' | 'spearToss' | 'spearSweep';
export interface WeaponDefinition { readonly id: WeaponId; readonly name: string; readonly hero: HeroId; readonly maxRank: 5; readonly traits: readonly PassiveId[]; readonly ranks: readonly [string, string, string, string, string] }
export const WEAPON_SLOT_LIMIT = 6;
export const PASSIVE_SLOT_LIMIT = 6;
export const WEAPON_REGISTRY: Readonly<Record<WeaponId, WeaponDefinition>> = {
  pinwheel: { id: 'pinwheel', name: 'Starter Ring Throw', hero: 'blue-pinwheel', maxRank: 5, traits: ['might','tempo','reach','momentum','multiplicity'], ranks: ['Locks to a nearby target and throws a blue ring.','Increases ring damage.','Increases ring damage and cadence.','Adds one piercing hit.','Strengthens damage and piercing.'] },
  orbitGuard: { id: 'orbitGuard', name: 'Orbit Guard', hero: 'blue-pinwheel', maxRank: 5, traits: ['might','tempo','reach','persistence','multiplicity'], ranks: ['Unlocks one orbiting damaging ring.','Adds a second ring.','Widens coverage and rotation speed.','Adds a third ring and improves damage.','Adds a fourth ring and shortens downtime.'] },
  piercingThrow: { id: 'piercingThrow', name: 'Piercing Ring', hero: 'blue-pinwheel', maxRank: 5, traits: ['might','tempo','reach','momentum','multiplicity'], ranks: ['Unlocks a long piercing ring throw.','Increases damage.','Increases piercing and cadence.','Improves damage and piercing.','Increases damage and penetration.'] },
  ricochetRing: { id: 'ricochetRing', name: 'Ricochet Rings', hero: 'blue-pinwheel', maxRank: 5, traits: ['might','tempo','reach','momentum','persistence','multiplicity','resilience'], ranks: ['Unlocks a ring that bounces once from solid terrain.','Increases ring damage.','Adds another terrain bounce.','Increases penetration and damage.','Adds another bounce and improves damage.'] },
  clubSweep: { id: 'clubSweep', name: 'Club Sweep', hero: 'bok-goo', maxRank: 5, traits: ['might','tempo','reach'], ranks: ['Wide forward club swing.','Increases strike damage.','Wider reach and heavier knockback.','Adds a timed follow-up swing.','Improves area and reduces cooldown.'] },
  boulderToss: { id: 'boulderToss', name: 'Boulder Toss', hero: 'bok-goo', maxRank: 5, traits: ['might','tempo','reach','momentum','multiplicity'], ranks: ['Throws one arcing boulder.','Increases impact damage.','Throws a second boulder.','Increases impact area.','Throws three boulders and reduces cooldown.'] },
  groundSlam: { id: 'groundSlam', name: 'Ground Slam', hero: 'bok-goo', maxRank: 5, traits: ['might','tempo','reach','persistence'], ranks: ['Creates a close-range expanding ground wave.','Increases wave radius.','Increases impact damage.','Shortens cooldown and adds knockback.','Adds a bounded secondary impact.'] },
  spearThrust: { id: 'spearThrust', name: 'Spear Thrust', hero: 'da-ri', maxRank: 5, traits: ['might','tempo','reach'], ranks: ['One precise piercing thrust.','Increases thrust damage.','Extends the attack line.','Adds a separate timed follow-up thrust.','Improves penetration and cadence.'] },
  spearToss: { id: 'spearToss', name: 'Spear Toss', hero: 'da-ri', maxRank: 5, traits: ['might','tempo','momentum','multiplicity'], ranks: ['Throws one long-range spear.','Increases spear damage.','Improves penetration.','Adds a second spear to the volley.','Improves frequency and travel distance.'] },
  spearSweep: { id: 'spearSweep', name: 'Spear Sweep', hero: 'da-ri', maxRank: 5, traits: ['might','tempo','reach'], ranks: ['Unlocks a broad forward sweep.','Widens the sweep.','Increases sweep damage.','Adds an opposite-direction follow-up sweep.','Improves reach and attack cadence.'] },
};
export type WeaponEvolutionId = 'typhoon-rings' | 'eternal-halo' | 'shatterstorm' | 'earthbreaker' | 'avalanche-toss' | 'obsidian-tempest' | 'returning-lance';
export interface WeaponEvolutionDefinition { readonly id: WeaponEvolutionId; readonly name: string; readonly weaponId: WeaponId; readonly requiredRank: number; readonly passive: PassiveId; readonly hero: HeroId; readonly effect: string }
export const WEAPON_EVOLUTIONS: readonly WeaponEvolutionDefinition[] = [
  { id: 'typhoon-rings', name: 'Typhoon Rings', weaponId: 'pinwheel', requiredRank: 5, passive: 'might', hero: 'blue-pinwheel', effect: 'Starter rings gain bonus piercing and a shorter cooldown.' },
  { id: 'eternal-halo', name: 'Eternal Halo', weaponId: 'orbitGuard', requiredRank: 5, passive: 'persistence', hero: 'blue-pinwheel', effect: 'Orbit Guard stays active and circles with four damaging rings.' },
  { id: 'shatterstorm', name: 'Shatterstorm', weaponId: 'ricochetRing', requiredRank: 5, passive: 'resilience', hero: 'blue-pinwheel', effect: 'Ricochet rings create a bounded burst on wall bounces.' },
  { id: 'earthbreaker', name: 'Earthbreaker', weaponId: 'clubSweep', requiredRank: 5, passive: 'reach', hero: 'bok-goo', effect: 'Club Sweep releases an additional expanding impact wave.' },
  { id: 'avalanche-toss', name: 'Avalanche Toss', weaponId: 'boulderToss', requiredRank: 5, passive: 'multiplicity', hero: 'bok-goo', effect: 'Boulder Toss launches a wider spread of arcing boulders.' },
  { id: 'obsidian-tempest', name: 'Obsidian Tempest', weaponId: 'spearThrust', requiredRank: 5, passive: 'tempo', hero: 'da-ri', effect: 'Spear Thrust performs a rapid fan of penetrating strikes.' },
  { id: 'returning-lance', name: 'Returning Lance', weaponId: 'spearToss', requiredRank: 5, passive: 'momentum', hero: 'da-ri', effect: 'Thrown spears return through enemies along their outward path.' },
];
export type DifficultyId = 'normal' | 'heroic';
export interface DifficultyDefinition { readonly id: DifficultyId; readonly label: string; readonly enemyDamageMultiplier: number; readonly enemyProjectileSpeedMultiplier: number; readonly rangedAttackIntervalMultiplier: number; readonly playerInvulnerabilitySeconds: number; readonly dashCooldownSeconds: number }
export const DIFFICULTIES: Readonly<Record<DifficultyId, DifficultyDefinition>> = {
  normal: { id: 'normal', label: 'NORMAL', enemyDamageMultiplier: 0.72, enemyProjectileSpeedMultiplier: 0.88, rangedAttackIntervalMultiplier: 1.12, playerInvulnerabilitySeconds: 1.05, dashCooldownSeconds: 2.7 },
  heroic: { id: 'heroic', label: 'HEROIC', enemyDamageMultiplier: 1, enemyProjectileSpeedMultiplier: 1, rangedAttackIntervalMultiplier: 1, playerInvulnerabilitySeconds: 0.8, dashCooldownSeconds: 3 },
};

export interface HeroDefinition {
  readonly id: string;
  readonly name: string;
  readonly title?: string;
  readonly role?: string;
  readonly startingWeapon?: string;
  readonly specialty?: string;
  readonly description?: string;
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
  id: 'blue-pinwheel', name: 'Blue Pinwheel', title: 'The Mobile Specialist', role: 'MOBILE RANGED SPECIALIST', startingWeapon: 'Starter Ring Throw', specialty: 'Fast ranged targeting', description: 'Stay in motion and shape the crowd with spinning blue rings.', placeholder: false, maxHealth: 160, moveSpeed: 210,
  attackName: 'Starter Ring Throw (Prototype)',
  animation: {
    anchor: { x: 0.5, y: 1 }, mirrorLeft: true, verticalFacingFallback: 'right-facing profile, mirrored when facing left',
    idle: { asset: '/assets/blue-pinwheel/idle-cycle.png', frameWidth: 543, frameHeight: 724, frameCount: 4, frameDurationMs: 360 },
    move: { asset: '/assets/blue-pinwheel/idle-cycle.png', frameWidth: 543, frameHeight: 724, frameCount: 4, frameDurationMs: 120 },
    damage: { asset: '/assets/blue-pinwheel/standing-pose.png', frameWidth: 611, frameHeight: 906, frameCount: 1, frameDurationMs: 120 },
    defeat: { asset: '/assets/blue-pinwheel/standing-pose.png', frameWidth: 611, frameHeight: 906, frameCount: 1, frameDurationMs: 120 },
    ability: { asset: '/assets/blue-pinwheel/standing-pose.png', frameWidth: 611, frameHeight: 906, frameCount: 1, frameDurationMs: 120 },
  },
};

export const HEROES: Readonly<Record<HeroId, HeroDefinition>> = {
  'blue-pinwheel': BLUE_PINWHEEL,
  'bok-goo': {
    id: 'bok-goo', name: 'Bok-Goo', title: '복구 · The Boulder', role: 'DURABLE MELEE FIGHTER', startingWeapon: 'Club Sweep', specialty: 'Broad close-range control', description: 'Hold your ground with sweeping club strikes and heavy crowd knockback.', placeholder: false, maxHealth: 225, moveSpeed: 180, attackName: 'Club Sweep (Prototype)',
    animation: { anchor: { x: 0.5, y: 1 }, mirrorLeft: true, verticalFacingFallback: 'right-facing profile, mirrored when facing left',
      idle: { asset: '/assets/milestone010/bok-goo/walk.png', frameWidth: 256, frameHeight: 341, frameCount: 4, frameDurationMs: 360 },
      move: { asset: '/assets/milestone010/bok-goo/walk.png', frameWidth: 256, frameHeight: 341, frameCount: 4, frameDurationMs: 145 },
      damage: { asset: '/assets/milestone010/bok-goo/walk.png', frameWidth: 256, frameHeight: 341, frameCount: 4, frameDurationMs: 100 },
      defeat: { asset: '/assets/milestone010/bok-goo/walk.png', frameWidth: 256, frameHeight: 341, frameCount: 1, frameDurationMs: 120 },
      ability: { asset: '/assets/milestone010/bok-goo/walk.png', frameWidth: 256, frameHeight: 341, frameCount: 4, frameDurationMs: 90 } },
  },
  'da-ri': {
    id: 'da-ri', name: 'Da-Ri', title: '다리 · The Obsidian', role: 'AGILE SPEAR FIGHTER', startingWeapon: 'Spear Thrust', specialty: 'Long-reach precision', description: 'Align attacks through a lane, pierce the front rank, and reposition quickly.', placeholder: false, maxHealth: 145, moveSpeed: 225, attackName: 'Spear Thrust (Prototype)',
    animation: { anchor: { x: 0.5, y: 1 }, mirrorLeft: true, verticalFacingFallback: 'right-facing profile, mirrored when facing left',
      idle: { asset: '/assets/milestone010/da-ri/walk-gif.png', frameWidth: 625, frameHeight: 627, frameCount: 4, frameDurationMs: 360 },
      move: { asset: '/assets/milestone010/da-ri/walk-gif.png', frameWidth: 625, frameHeight: 627, frameCount: 4, frameDurationMs: 150 },
      damage: { asset: '/assets/milestone010/da-ri/walk-gif.png', frameWidth: 625, frameHeight: 627, frameCount: 4, frameDurationMs: 100 },
      defeat: { asset: '/assets/milestone010/da-ri/walk-gif.png', frameWidth: 625, frameHeight: 627, frameCount: 1, frameDurationMs: 120 },
      ability: { asset: '/assets/milestone010/da-ri/walk-gif.png', frameWidth: 625, frameHeight: 627, frameCount: 4, frameDurationMs: 90 } },
  },
};

export type EnemyAnimationState = 'idle' | 'walking' | 'attacking' | 'damage' | 'dying' | 'telegraph' | 'recovery';
export interface EnemyPrototypeAnimationDefinition {
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly frameCount: number;
  readonly frameDurationMs: number;
  readonly sourceFacing: 'right';
  readonly states: Readonly<Record<EnemyAnimationState, readonly number[]>>;
}
const prototypeAnimation: EnemyPrototypeAnimationDefinition = {
  frameWidth: 48, frameHeight: 56, frameCount: 4, frameDurationMs: 200, sourceFacing: 'right',
  states: { idle: [0], walking: [0, 1, 2, 3], attacking: [3], damage: [1], dying: [3], telegraph: [1], recovery: [2] },
};
export interface RangedAttackDefinition { readonly projectile: 'baseball' | 'enemy'; readonly projectileSpeed: number; readonly attackInterval: number; readonly telegraphSeconds: number; readonly preferredRange: number }
export interface EnemyDefinition { readonly kind: EnemyKind; readonly health: number; readonly speed: number; readonly damage: number; readonly radius: number; readonly xp: number; readonly animation?: AnimationClipDefinition; readonly attackAnimation?: AnimationClipDefinition; readonly prototypeAnimation?: EnemyPrototypeAnimationDefinition; readonly ranged?: RangedAttackDefinition }
export const DR_SMILE_BOSS_ANIMATION: AnimationClipDefinition = { asset: '/assets/milestone010/dr-smile/walk.png', frameWidth: 256, frameHeight: 341, frameCount: 4, frameDurationMs: 150 };
export interface AttackDefinition { readonly id: string; readonly name: string; readonly projectileShape?: 'ring'; readonly damage: number; readonly cooldown: number; readonly projectileSpeed: number; readonly lifetime: number; readonly targetRange: number; readonly pierce?: number; readonly rankDamage?: readonly number[]; readonly rankCooldown?: readonly number[]; readonly rankPierce?: readonly number[] }
export const ATTACKS: Readonly<Record<'pinwheel' | 'orbitGuard' | 'piercingThrow' | 'special', AttackDefinition>> = {
  pinwheel: { id: 'pinwheel-prototype', name: 'Starter Ring Throw (Prototype)', projectileShape: 'ring', damage: 18, cooldown: 0.76, projectileSpeed: 410, lifetime: 1.5, targetRange: 520, rankDamage: [1, 1.18, 1.36, 1.55, 1.8], rankCooldown: [1, 1, 0.84, 0.84, 0.78], rankPierce: [0, 0, 0, 1, 1] },
  orbitGuard: { id: 'orbit-guard-prototype', name: 'Orbit Guard (Prototype)', damage: 11, cooldown: 0.42, projectileSpeed: 0, lifetime: 0, targetRange: 78, rankDamage: [1, 1.2, 1.4, 1.65, 1.9], rankCooldown: [1, 0.925, 0.85, 0.775, 0.7] },
  piercingThrow: { id: 'piercing-throw-prototype', name: 'Piercing Ring (Prototype)', projectileShape: 'ring', damage: 26, cooldown: 1.8, projectileSpeed: 345, lifetime: 2.0, targetRange: 470, pierce: 2, rankDamage: [1, 1.2, 1.4, 1.65, 1.9], rankCooldown: [1, 1, 0.82, 0.82, 0.72], rankPierce: [2, 2, 3, 3, 4] },
  special: { id: 'special-prototype', name: 'Prototype Special — Canon TBD', damage: 115, cooldown: 0.7, projectileSpeed: 0, lifetime: 0, targetRange: 230 },
};
export interface PinwheelEvolutionAttackBonus { readonly bonusPierce: number; readonly cooldownMultiplier: number }
export const PINWHEEL_EVOLUTION: PinwheelEvolutionAttackBonus = { bonusPierce: 2, cooldownMultiplier: 0.7 };
export interface BossDefinition { readonly name: string; readonly health: number; readonly speed: number; readonly contactDamage: number; readonly radius: number; readonly xp: number; readonly phaseLength: number; readonly approachUntil: number; readonly rangedTelegraphStart: number; readonly rangedTelegraphEnd: number; readonly rangedDamage: number; readonly rangedSpeed: number; readonly chargeStart: number; readonly chargeEnd: number; readonly chargeActiveEnd: number; readonly recoveryEnd: number; readonly chargeRange: number; readonly chargeSpeed: number }
export const GANG_LEADER: BossDefinition = { name: 'Gang Leader · Prototype', health: 460, speed: 45, contactDamage: 18, radius: 31, xp: 120, phaseLength: 6.2, approachUntil: 1.0, rangedTelegraphStart: 1.0, rangedTelegraphEnd: 1.65, rangedDamage: 16, rangedSpeed: 280, chargeStart: 3.15, chargeEnd: 3.85, chargeActiveEnd: 4.4, recoveryEnd: 5.4, chargeRange: 320, chargeSpeed: 430 };
export const ENEMIES: Readonly<Record<EnemyKind, EnemyDefinition>> = {
  thug: { kind: 'thug', health: 34, speed: 55, damage: 5, radius: 15, xp: 12, animation: { asset: '/assets/enemies/thug-walk-cycle.png', frameWidth: 543, frameHeight: 724, frameCount: 4, frameDurationMs: 150 } },
  fastThug: { kind: 'fastThug', health: 24, speed: 92, damage: 4, radius: 13, xp: 16, animation: { asset: '/assets/enemies/fast-thug-bat-walk-cycle.png', frameWidth: 543, frameHeight: 724, frameCount: 4, frameDurationMs: 110 } },
  gangster: { kind: 'gangster', health: 38, speed: 40, damage: 4, radius: 15, xp: 22, animation: { asset: '/assets/enemies/street-pitcher-walk-cycle.png', frameWidth: 418, frameHeight: 941, frameCount: 4, frameDurationMs: 150 }, attackAnimation: { asset: '/assets/enemies/street-pitcher-throw-pose.png', frameWidth: 1024, frameHeight: 1536, frameCount: 1, frameDurationMs: 140 }, ranged: { projectile: 'baseball', projectileSpeed: 260, attackInterval: 3.2, telegraphSeconds: 0.62, preferredRange: 265 } },
  bruiser: { kind: 'bruiser', health: 112, speed: 31, damage: 10, radius: 21, xp: 30, prototypeAnimation },
  yoYoPunk: { kind: 'yoYoPunk', health: 44, speed: 46, damage: 13, radius: 15, xp: 28, animation: { asset: '/assets/milestone010/yo-yo-punk/walk.png', frameWidth: 256, frameHeight: 341, frameCount: 4, frameDurationMs: 150 } },
  // Processed sheets are 1024×341: four 256×341 frames. Using 170px clipped
  // each frame through the body and made the walk cycle appear malformed.
  smiler: { kind: 'smiler', health: 47, speed: 48, damage: 6, radius: 15, xp: 18, animation: { asset: '/assets/milestone010/smiler/walk.png', frameWidth: 256, frameHeight: 341, frameCount: 4, frameDurationMs: 140 } },
  molar: { kind: 'molar', health: 24, speed: 86, damage: 4, radius: 11, xp: 15, animation: { asset: '/assets/milestone010/molar/walk.png', frameWidth: 256, frameHeight: 341, frameCount: 4, frameDurationMs: 90 } },
  boss: { kind: 'boss', health: GANG_LEADER.health, speed: GANG_LEADER.speed, damage: GANG_LEADER.contactDamage, radius: GANG_LEADER.radius, xp: GANG_LEADER.xp, prototypeAnimation, animation: { asset: '/assets/milestone010/gang-boss/walk.png', frameWidth: 256, frameHeight: 341, frameCount: 4, frameDurationMs: 150 } },
};

export const UPGRADES: ReadonlyArray<{ id: UpgradeId; title: string; detail: string }> = [
  { id: 'might', title: 'Might', detail: '+10% applicable weapon damage per rank' },
  { id: 'tempo', title: 'Tempo', detail: '−8% cooldown for eligible attacks per rank' },
  { id: 'reach', title: 'Reach', detail: '+10% area, width, or melee reach for compatible attacks' },
  { id: 'momentum', title: 'Momentum', detail: '+10% speed for traveling projectiles per rank' },
  { id: 'persistence', title: 'Persistence', detail: '+10% active duration for compatible attacks per rank' },
  { id: 'multiplicity', title: 'Multiplicity', detail: '+1 compatible projectile or attack per rank (maximum rank 2)' },
  { id: 'resilience', title: 'Resilience', detail: '−5% incoming damage per rank (maximum 25%)' },
  { id: 'vitality', title: 'Vitality', detail: '+15% maximum health per rank, with immediate recovery' },
  { id: 'regeneration', title: 'Regeneration', detail: '+0.2 health per second per rank' },
  { id: 'agility', title: 'Agility', detail: '+10% movement speed per rank' },
  { id: 'attraction', title: 'Attraction', detail: '+14 world units of XP attraction reach per rank' },
  { id: 'fortune', title: 'Fortune', detail: 'Improves the seeded chance of a higher-quality boss field cache' },
  { id: 'wisdom', title: 'Wisdom', detail: '+8% credited XP when collecting gems per rank' },
  { id: 'orbit', title: 'Orbit Guard (Prototype)', detail: 'Unlock a close-range rotating attack' },
  { id: 'pinwheel', title: 'Starter Ring Rank', detail: 'Strengthen the automatic ring attack' },
  { id: 'piercingThrow', title: 'Piercing Ring (Prototype)', detail: 'Unlock / rank a long piercing ring' },
  { id: 'ricochetRing', title: 'Ricochet Ring', detail: 'Unlock / rank a ring that bounces from city walls' },
  { id: 'clubSweep', title: 'Club Sweep', detail: 'Increase sweep damage and impact reach' },
  { id: 'boulderToss', title: 'Boulder Toss', detail: 'Unlock or strengthen an aimed heavy stone' },
  { id: 'groundSlam', title: 'Ground Slam', detail: 'Unlock or strengthen an expanding close-range shockwave' },
  { id: 'spearThrust', title: 'Spear Thrust', detail: 'Increase narrow-line reach and piercing' },
  { id: 'spearToss', title: 'Spear Toss', detail: 'Unlock or strengthen a piercing thrown spear' },
  { id: 'spearSweep', title: 'Spear Sweep', detail: 'Unlock or strengthen a wide defensive sweep' },
  { id: 'mastery', title: 'Limit Break Mastery', detail: '+5% attack damage (repeatable, capped at 20 ranks)' },
];

export type HordeEntrySide = 'left' | 'right' | 'top' | 'bottom';
export interface HordeConfig { readonly targetCounts: readonly { readonly at: number; readonly count: number }[]; readonly batchMin: number; readonly batchMax: number; readonly baseBatchInterval: number; readonly maxSpawnPerSecond: number; readonly maxSpawnPerUpdate: number; readonly surgeEvery: number; readonly surgeDuration: number; readonly surgeBonus: number; readonly maxActive: number; readonly spawnMarginX: number; readonly spawnMarginY: number; readonly recycleAfter: number }
export interface RunConfig { readonly duration: number; readonly bossAt: number; readonly overtimeLimit: number; readonly seed: number; readonly arenaWidth: number; readonly arenaHeight: number; readonly maxEnemies: number; readonly testMode: boolean; readonly difficulty: DifficultyId; readonly horde: HordeConfig; readonly gameMode?: 'endless' | 'finite' }
export interface StageDefinition { readonly id: string; readonly name: string; readonly run: RunConfig; readonly visualStyle: 'kenney-city-grid' }
const standardHorde: HordeConfig = { targetCounts: [{ at: 0, count: 8 }, { at: 15, count: 24 }, { at: 30, count: 40 }, { at: 60, count: 64 }, { at: 90, count: 82 }, { at: 120, count: 104 }, { at: 150, count: 120 }], batchMin: 3, batchMax: 5, baseBatchInterval: 0.95, maxSpawnPerSecond: 14, maxSpawnPerUpdate: 4, surgeEvery: 35, surgeDuration: 10, surgeBonus: 12, maxActive: 128, spawnMarginX: 84, spawnMarginY: 74, recycleAfter: 4.5 };
export const standardRun: RunConfig = { duration: 180, bossAt: 150, overtimeLimit: 60, seed: 1741, arenaWidth: 1800, arenaHeight: 1200, maxEnemies: 128, testMode: false, difficulty: 'normal', gameMode: 'endless', horde: standardHorde };
export const testRun: RunConfig = { ...standardRun, duration: 36, bossAt: 20, overtimeLimit: 12, seed: 1741, maxEnemies: 56, testMode: true, gameMode: 'finite', horde: { ...standardHorde, targetCounts: [{ at: 0, count: 5 }, { at: 5, count: 12 }, { at: 15, count: 22 }, { at: 25, count: 32 }], batchMin: 2, batchMax: 3, baseBatchInterval: 0.65, surgeEvery: 10, surgeDuration: 4, surgeBonus: 8, maxActive: 56 } };
export const CITY_STREET_STAGE: StageDefinition = { id: 'city-street', name: 'City Street (Prototype)', run: standardRun, visualStyle: 'kenney-city-grid' };
