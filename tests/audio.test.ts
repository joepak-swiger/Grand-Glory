import { describe, expect, it } from 'vitest';
import { GameAudio } from '../src/game/audio';

describe('local synthesized audio preferences', () => {
  it('starts with a usable volume and clamps volume changes', () => {
    const audio = new GameAudio();
    expect(audio.getVolume()).toBeGreaterThan(0);
    audio.setVolume(1.4); expect(audio.getVolume()).toBe(1);
    audio.setVolume(-2); expect(audio.getVolume()).toBe(0);
  });

  it('toggles sound effects without requiring AudioContext creation', () => {
    const audio = new GameAudio(); const wasEnabled = audio.isEnabled();
    expect(audio.toggle()).toBe(!wasEnabled);
    expect(audio.isEnabled()).toBe(!wasEnabled);
    expect(audio.toggle()).toBe(wasEnabled);
  });
});
