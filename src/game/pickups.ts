import type { DifficultyId } from './definitions';

export type PickupId = 'xp' | 'boss-evolution' | 'recovery-rations' | 'xp-recall' | 'inferno-curry' | 'field-cache' | 'hero-cache';
export type PickupCategory = 'experience' | 'recovery' | 'collection' | 'temporary-buff' | 'reward-cache';
export type PickupRarity = 'common' | 'uncommon' | 'rare' | 'boss';
export type DropSource = 'ordinary' | 'elite' | 'prop';
export interface PickupDefinition {
  readonly id: PickupId;
  readonly name: string;
  readonly category: PickupCategory;
  readonly rarity: PickupRarity;
  readonly icon: string;
  readonly collisionRadius: number;
  readonly durationSeconds: number | null;
  readonly maxActive: number;
  readonly despawnSeconds: number | null;
  readonly collect: 'touch' | 'global-recall' | 'boss-cache' | 'upgrade-choice';
  readonly eligibleSources: readonly DropSource[];
  readonly sound: 'pickup' | 'upgrade';
  readonly animation: 'pulse' | 'recall' | 'open-cache' | 'none';
  readonly description: string;
}

/** Active pickup definitions. XP piles keep their value in the simulation entity. */
export const PICKUPS: Readonly<Record<PickupId, PickupDefinition>> = {
  xp: { id: 'xp', name: 'Experience Gem', category: 'experience', rarity: 'common', icon: 'xp-small', collisionRadius: 24, durationSeconds: null, maxActive: 1200, despawnSeconds: null, collect: 'touch', eligibleSources: ['ordinary', 'elite'], sound: 'pickup', animation: 'pulse', description: 'A dropped experience gem.' },
  'boss-evolution': { id: 'boss-evolution', name: 'Boss Cache', category: 'reward-cache', rarity: 'boss', icon: 'evolution', collisionRadius: 34, durationSeconds: null, maxActive: 1, despawnSeconds: null, collect: 'boss-cache', eligibleSources: [], sound: 'upgrade', animation: 'open-cache', description: 'Choose an eligible evolution or a recovery reward.' },
  'recovery-rations': { id: 'recovery-rations', name: 'Recovery Rations', category: 'recovery', rarity: 'uncommon', icon: 'ration', collisionRadius: 25, durationSeconds: null, maxActive: 3, despawnSeconds: 150, collect: 'touch', eligibleSources: ['ordinary', 'elite', 'prop'], sound: 'pickup', animation: 'pulse', description: 'Restore 35 HP or 20% maximum HP, whichever is greater.' },
  'xp-recall': { id: 'xp-recall', name: 'XP Recall', category: 'collection', rarity: 'rare', icon: 'recall', collisionRadius: 25, durationSeconds: null, maxActive: 2, despawnSeconds: 180, collect: 'global-recall', eligibleSources: ['ordinary', 'elite', 'prop'], sound: 'pickup', animation: 'recall', description: 'Recall all experience gems across the city.' },
  'inferno-curry': { id: 'inferno-curry', name: 'Inferno Curry', category: 'temporary-buff', rarity: 'rare', icon: 'curry', collisionRadius: 25, durationSeconds: 8, maxActive: 2, despawnSeconds: 180, collect: 'touch', eligibleSources: ['ordinary', 'elite', 'prop'], sound: 'pickup', animation: 'pulse', description: 'Breathe a directional cone of flame for 8 seconds.' },
  'field-cache': { id: 'field-cache', name: 'Field Cache', category: 'reward-cache', rarity: 'uncommon', icon: 'field-cache', collisionRadius: 30, durationSeconds: null, maxActive: 4, despawnSeconds: null, collect: 'upgrade-choice', eligibleSources: ['elite'], sound: 'upgrade', animation: 'open-cache', description: 'Choose an available upgrade from the supply cache.' },
  'hero-cache': { id: 'hero-cache', name: 'Hero Cache', category: 'reward-cache', rarity: 'rare', icon: 'hero-cache', collisionRadius: 30, durationSeconds: null, maxActive: 3, despawnSeconds: null, collect: 'upgrade-choice', eligibleSources: ['elite'], sound: 'upgrade', animation: 'open-cache', description: 'A rare supply case with a powerful upgrade choice.' },
};

/** Fortune applies a documented multiplicative bonus, capped at 40%; Heroic lowers ordinary utility-drop odds. */
export function rollUtilityDrop(source: DropSource, difficulty: DifficultyId, fortuneRank: number, roll: number): Exclude<PickupId, 'xp' | 'boss-evolution' | 'field-cache' | 'hero-cache'> | null {
  const difficultyScale = difficulty === 'heroic' ? 0.55 : 1;
  const luckScale = Math.min(1.4, 1 + Math.max(0, Math.min(5, fortuneRank)) * 0.08);
  const table = source === 'ordinary'
    ? [['recovery-rations', 0.012], ['xp-recall', 0.0012], ['inferno-curry', 0.0015]] as const
    : source === 'elite'
      ? [['recovery-rations', 0.08], ['xp-recall', 0.035], ['inferno-curry', 0.04]] as const
      : [['recovery-rations', 0.12], ['xp-recall', 0.035], ['inferno-curry', 0.035]] as const;
  const weighted = table.map(([id, chance]) => [id, chance * difficultyScale * luckScale] as const);
  const total = weighted.reduce((sum, [, chance]) => sum + chance, 0);
  if (roll < 0 || roll >= total) return null;
  let cursor = roll;
  for (const [id, chance] of weighted) { cursor -= chance; if (cursor < 0) return id; }
  return null;
}

export function cacheTierForFortune(fortuneRank: number, roll: number): 'field-cache' | 'hero-cache' {
  const heroChance = Math.min(0.55, 0.22 + Math.max(0, Math.min(5, fortuneRank)) * 0.05);
  return roll < heroChance ? 'hero-cache' : 'field-cache';
}

/** Future concepts remain explicit and absent from the active pickup registry/drop pools. */
export const FUTURE_PICKUPS = [
  { id: 'crisis-pulse', name: 'Crisis Pulse', available: false },
  { id: 'stasis-field', name: 'Stasis Field', available: false },
  { id: 'heroic-surge', name: 'Heroic Surge', available: false },
  { id: 'second-wind', name: 'Second Wind', available: false },
  { id: 'fortune-token', name: 'Fortune Token', available: false },
] as const;
