import { HEROIC_TRAITS, type PassiveId } from './definitions';

export type HeroicStat = 'damage' | 'cooldown' | 'area' | 'projectileSpeed' | 'duration' | 'amount' | 'incomingDamage' | 'maxHealth' | 'regeneration' | 'moveSpeed' | 'pickupReach' | 'xp' | 'luck';
export type HeroicTraitRanks = Readonly<Record<PassiveId, number>>;

const STAT_TRAITS: Readonly<Record<HeroicStat, readonly PassiveId[]>> = {
  damage: ['might'], cooldown: ['tempo'], area: ['reach'], projectileSpeed: ['momentum'], duration: ['persistence'], amount: ['multiplicity'], incomingDamage: ['resilience'], maxHealth: ['vitality'], regeneration: ['regeneration'], moveSpeed: ['agility'], pickupReach: ['attraction'], xp: ['wisdom'], luck: ['fortune'],
};

/** Shared stat aggregation keeps hero-specific weapon code from inventing trait variants. */
export function heroicTraitValue(ranks: HeroicTraitRanks, trait: PassiveId): number {
  const definition = HEROIC_TRAITS[trait];
  return Math.max(0, Math.min(definition.maxRank, ranks[trait])) * definition.perRank;
}

export function heroicStatMultiplier(ranks: HeroicTraitRanks, stat: HeroicStat): number {
  if (stat === 'incomingDamage') return Math.max(0.75, 1 - heroicTraitValue(ranks, 'resilience'));
  if (stat === 'amount') return Math.min(3, 1 + heroicTraitValue(ranks, 'multiplicity'));
  const trait = STAT_TRAITS[stat][0]!;
  if (stat === 'pickupReach' || stat === 'regeneration') return heroicTraitValue(ranks, trait);
  if (stat === 'cooldown') return Math.max(0.55, 1 - heroicTraitValue(ranks, trait));
  return 1 + heroicTraitValue(ranks, trait);
}

export function heroicTraitRankCap(trait: PassiveId): number {
  return HEROIC_TRAITS[trait].maxRank;
}
