import type { Player } from './simulation';
import type { UpgradeId } from './definitions';

export interface UpgradeRankProgress { current: number; next: number; maximum: number; label: string }

/** Skill ranks are separate from the player's overall level and use the same caps as upgrade eligibility. */
export function getUpgradeRankProgress(id: UpgradeId, player: Player, chosen: readonly UpgradeId[]): UpgradeRankProgress {
  if (id === 'evolvePinwheel') return { current: 0, next: 1, maximum: 1, label: 'EVOLUTION READY' };
  let current: number;
  let maximum: number;
  if (id === 'pinwheel') { current = player.weaponRanks.pinwheel; maximum = 5; }
  else if (id === 'orbit') { current = player.weaponRanks.orbitGuard; maximum = 5; }
  else if (id === 'piercingThrow') { current = player.weaponRanks.piercingThrow; maximum = 5; }
  else if (id === 'clubSweep') { current = player.weaponRanks.clubSweep; maximum = 5; }
  else if (id === 'boulderToss') { current = player.weaponRanks.boulderToss; maximum = 5; }
  else if (id === 'spearThrust') { current = player.weaponRanks.spearThrust; maximum = 5; }
  else if (id === 'spearToss') { current = player.weaponRanks.spearToss; maximum = 5; }
  else if (id === 'mastery') { current = chosen.filter(choice => choice === 'mastery').length; maximum = 20; }
  else if (id === 'power') { current = player.powerRank; maximum = 5; }
  else { current = chosen.filter(choice => choice === id).length; maximum = id === 'extra' ? 4 : 5; }
  const next = Math.min(maximum, current + 1);
  const label = current === 0 ? 'NEW · LEVEL 1' : current >= maximum ? 'MAX LEVEL' : `LEVEL ${current} → LEVEL ${next}`;
  return { current, next, maximum, label };
}
