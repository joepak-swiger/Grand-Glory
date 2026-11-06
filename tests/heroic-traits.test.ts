import { describe, expect, it } from 'vitest';
import { HEROIC_TRAITS, PASSIVE_SLOT_LIMIT, WEAPON_EVOLUTIONS, WEAPON_REGISTRY, WEAPON_SLOT_LIMIT } from '../src/game/definitions';
import { heroicStatMultiplier, heroicTraitValue } from '../src/game/heroic-traits';

const emptyRanks = Object.fromEntries(Object.keys(HEROIC_TRAITS).map(id => [id, 0])) as Record<keyof typeof HEROIC_TRAITS, number>;

describe('universal Heroic Traits and weapon registry', () => {
  it('caps the run build at six weapons and six distinct traits', () => {
    expect(WEAPON_SLOT_LIMIT).toBe(6);
    expect(PASSIVE_SLOT_LIMIT).toBe(6);
    expect(Object.values(WEAPON_REGISTRY).every(weapon => weapon.maxRank === 5 && weapon.ranks.length === 5)).toBe(true);
  });

  it('applies every universal trait through its shared stat mapping', () => {
    const stats = [
      ['might', 'damage', 1.1], ['tempo', 'cooldown', 0.92], ['reach', 'area', 1.1],
      ['momentum', 'projectileSpeed', 1.1], ['persistence', 'duration', 1.1], ['multiplicity', 'amount', 2],
      ['resilience', 'incomingDamage', 0.95], ['vitality', 'maxHealth', 1.15],
      ['regeneration', 'regeneration', 0.2], ['agility', 'moveSpeed', 1.1],
      ['attraction', 'pickupReach', 14], ['wisdom', 'xp', 1.08], ['fortune', 'luck', 1.08],
    ] as const;
    for (const [trait, stat, expected] of stats) {
      const ranks = { ...emptyRanks, [trait]: 1 };
      expect(heroicTraitValue(ranks, trait)).toBe(HEROIC_TRAITS[trait].perRank);
      expect(heroicStatMultiplier(ranks, stat)).toBe(expected);
    }
  });

  it('caps Resilience at 25% damage reduction and Multiplicity at three total attacks', () => {
    expect(heroicStatMultiplier({ ...emptyRanks, resilience: 5 }, 'incomingDamage')).toBe(0.75);
    expect(heroicStatMultiplier({ ...emptyRanks, multiplicity: 5 }, 'amount')).toBe(3);
  });

  it('registers all seven evolutions with their assigned matching trait', () => {
    expect(WEAPON_EVOLUTIONS.map(evolution => [evolution.weaponId, evolution.passive])).toEqual([
      ['pinwheel', 'might'], ['orbitGuard', 'persistence'], ['ricochetRing', 'resilience'],
      ['clubSweep', 'reach'], ['boulderToss', 'multiplicity'], ['spearThrust', 'tempo'], ['spearToss', 'momentum'],
    ]);
  });
});
