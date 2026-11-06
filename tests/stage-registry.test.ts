import { describe, expect, it } from 'vitest';
import { FUTURE_STAGE_SLOTS, STAGE_REGISTRY } from '../src/game/definitions';

describe('stage selection registry', () => {
  it('keeps Seoulumbus Downtown as the single available playable stage', () => {
    const available = Object.values(STAGE_REGISTRY).filter(stage => stage.available);
    expect(available.map(stage => stage.id)).toEqual(['seoulumbus-downtown']);
    expect(available[0]?.name).toBe('Seoulumbus — Downtown');
    expect(available[0]?.run.arenaWidth).toBe(1800);
    expect(available[0]?.run.arenaHeight).toBe(1200);
    expect(available[0]?.factions).toContain('street-gang');
  });

  it('exposes disabled future slots without inventing stage IDs or canon', () => {
    expect(FUTURE_STAGE_SLOTS).toBe(2);
    expect(Object.keys(STAGE_REGISTRY)).toEqual(['seoulumbus-downtown']);
  });
});
