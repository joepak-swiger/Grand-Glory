import { describe, expect, it } from 'vitest';
import { ENEMIES, type EnemyAnimationState } from '../src/game/definitions';

describe('temporary enemy animation metadata', () => {
  it('declares right-facing source frames and valid indices for every supported state', () => {
    const states: readonly EnemyAnimationState[] = ['idle', 'walking', 'attacking', 'damage', 'dying', 'telegraph', 'recovery'];
    for (const kind of ['gangster', 'bruiser', 'boss'] as const) {
      const animation = ENEMIES[kind].prototypeAnimation;
      expect(animation?.sourceFacing).toBe('right');
      expect(animation?.frameWidth).toBeGreaterThan(0);
      expect(animation?.frameHeight).toBeGreaterThan(0);
      expect(animation?.frameDurationMs).toBeGreaterThan(0);
      for (const state of states) {
        expect(animation?.states[state].length).toBeGreaterThan(0);
        expect(animation?.states[state].every(frame => frame >= 0 && frame < (animation?.frameCount ?? 0))).toBe(true);
      }
    }
  });
});
