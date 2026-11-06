const FULL_TURN = Math.PI * 2;

/** Returns collision/render angles for a shared phase and evenly spaced orbit slots. */
export function getOrbitRingAngles(phase: number, count: number): number[] {
  if (count <= 0) return [];
  const normalizedPhase = ((phase % FULL_TURN) + FULL_TURN) % FULL_TURN;
  return Array.from({ length: count }, (_, index) => normalizedPhase + FULL_TURN * index / count);
}
