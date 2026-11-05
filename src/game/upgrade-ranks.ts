import type { Player } from './simulation';
import { PASSIVE_IDS, type UpgradeId } from './definitions';

export interface UpgradeRankProgress { current: number; next: number; maximum: number; label: string }

/** Skill ranks are separate from the player's overall level and use the same caps as upgrade eligibility. */
export function getUpgradeRankProgress(id: UpgradeId, player: Player, chosen: readonly UpgradeId[]): UpgradeRankProgress {
  let current: number;
  let maximum: number;
  if (id === 'pinwheel') { current = player.weaponRanks.pinwheel; maximum = 5; }
  else if (id === 'orbit') { current = player.weaponRanks.orbitGuard; maximum = 5; }
  else if (id === 'piercingThrow') { current = player.weaponRanks.piercingThrow; maximum = 5; }
  else if (id === 'ricochetRing') { current = player.weaponRanks.ricochetRing; maximum = 5; }
  else if (id === 'clubSweep') { current = player.weaponRanks.clubSweep; maximum = 5; }
  else if (id === 'boulderToss') { current = player.weaponRanks.boulderToss; maximum = 5; }
  else if (id === 'groundSlam') { current = player.weaponRanks.groundSlam; maximum = 5; }
  else if (id === 'spearThrust') { current = player.weaponRanks.spearThrust; maximum = 5; }
  else if (id === 'spearToss') { current = player.weaponRanks.spearToss; maximum = 5; }
  else if (id === 'spearSweep') { current = player.weaponRanks.spearSweep; maximum = 5; }
  else if (id === 'mastery') { current = chosen.filter(choice => choice === 'mastery').length; maximum = 20; }
  else if (id === 'power') { current = player.powerRank; maximum = 5; }
  else if (PASSIVE_IDS.includes(id as (typeof PASSIVE_IDS)[number])) { current = Math.max(player.passiveRanks[id as (typeof PASSIVE_IDS)[number]], chosen.filter(choice => choice === id).length); maximum = id === 'extra' ? 4 : 5; }
  else { current = chosen.filter(choice => choice === id).length; maximum = 5; }
  const next = Math.min(maximum, current + 1);
  const label = current === 0 ? 'NEW · LEVEL 1' : current >= maximum ? 'MAX LEVEL' : `LEVEL ${current} → LEVEL ${next}`;
  return { current, next, maximum, label };
}
