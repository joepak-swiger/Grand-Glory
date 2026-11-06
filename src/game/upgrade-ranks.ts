import type { Player } from './simulation';
import { HEROIC_TRAITS, PASSIVE_IDS, WEAPON_REGISTRY, type UpgradeId, type WeaponId } from './definitions';

export interface UpgradeRankProgress { current: number; next: number; maximum: number; label: string }

/** Skill ranks are separate from the player's overall level and use the same caps as upgrade eligibility. */
export function getUpgradeRankProgress(id: UpgradeId, player: Player, chosen: readonly UpgradeId[]): UpgradeRankProgress {
  let current: number;
  let maximum: number;
  if (id === 'orbit') { current = player.weaponRanks.orbitGuard; maximum = WEAPON_REGISTRY.orbitGuard.maxRank; }
  else if (id in WEAPON_REGISTRY) { const weapon = id as WeaponId; current = player.weaponRanks[weapon]; maximum = WEAPON_REGISTRY[weapon].maxRank; }
  else if (id === 'mastery') { current = chosen.filter(choice => choice === 'mastery').length; maximum = 20; }
  else if (PASSIVE_IDS.includes(id as (typeof PASSIVE_IDS)[number])) { const trait = id as (typeof PASSIVE_IDS)[number]; current = Math.max(player.passiveRanks[trait], chosen.filter(choice => choice === trait).length); maximum = HEROIC_TRAITS[trait].maxRank; }
  else { current = chosen.filter(choice => choice === id).length; maximum = 5; }
  const next = Math.min(maximum, current + 1);
  const label = current === 0 ? 'NEW · LEVEL 1' : current >= maximum ? 'MAX LEVEL' : `LEVEL ${current} → LEVEL ${next}`;
  return { current, next, maximum, label };
}
