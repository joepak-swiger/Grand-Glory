import { describe, expect, it } from 'vitest';
import { ATTACKS, ENEMIES, PLANNED_VILLAINS, type EnemyAnimationState } from '../src/game/definitions';

describe('temporary enemy animation metadata', () => {
  it('declares right-facing source frames and valid indices for every supported state', () => {
    const states: readonly EnemyAnimationState[] = ['idle', 'walking', 'attacking', 'damage', 'dying', 'telegraph', 'recovery'];
    for (const kind of ['bruiser', 'boss'] as const) {
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

  it('uses the owner-supplied Street Pitcher frames for an opt-in baseball thrower', () => {
    const pitcher = ENEMIES.gangster;
    expect(pitcher.animation?.asset).toContain('/street-pitcher/walk.png');
    expect(pitcher.animation?.frameCount).toBe(4);
    expect(pitcher.attackAnimation?.asset).toContain('/street-pitcher/attack.png');
    expect(pitcher.ranged?.projectile).toBe('baseball');
    expect(ENEMIES.thug.ranged).toBeUndefined();
    expect(ENEMIES.fastThug.ranged).toBeUndefined();
    expect(ENEMIES.bruiser.ranged).toBeUndefined();
  });

  it('defines both player attack silhouettes as rings rather than arrows', () => {
    expect(ATTACKS.pinwheel.projectileShape).toBe('ring');
    expect(ATTACKS.piercingThrow.projectileShape).toBe('ring');
    expect(ATTACKS.piercingThrow.name).toContain('Piercing Ring');
    expect(ATTACKS.piercingThrow.name).not.toMatch(/arrow/i);
  });

  it('keeps planned future villains registered but disabled', () => {
    expect(PLANNED_VILLAINS.map(villain => villain.id)).toEqual(['tiger-mom', 'dr-eggplant', 'clownasaurus-rex']);
    expect(PLANNED_VILLAINS.every(villain => !villain.enabled)).toBe(true);
  });
});
