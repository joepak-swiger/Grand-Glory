import { describe, expect, it } from 'vitest';
import { GameAudio, type AudioPreferenceStorage } from '../src/game/audio';

class MemoryStorage implements AudioPreferenceStorage {
  private readonly values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
  seed(key: string, value: string): void { this.values.set(key, value); }
}

describe('local synthesized audio preferences', () => {
  it('uses an audible 55% default when no volume preference is stored', () => {
    expect(new GameAudio(new MemoryStorage()).getVolume()).toBe(0.55);
  });

  it('preserves a deliberately saved zero volume', () => {
    const storage = new MemoryStorage(); storage.seed('grand-glory-sfx-volume', '0');
    expect(new GameAudio(storage).getVolume()).toBe(0);
  });

  it('loads a valid saved volume and clamps volume changes', () => {
    const storage = new MemoryStorage(); storage.seed('grand-glory-sfx-volume', '0.8');
    const audio = new GameAudio(storage);
    expect(audio.getVolume()).toBe(0.8);
    audio.setVolume(1.4); expect(audio.getVolume()).toBe(1);
    audio.setVolume(-2); expect(audio.getVolume()).toBe(0);
  });

  it('uses the default for invalid saved volume data', () => {
    const storage = new MemoryStorage(); storage.seed('grand-glory-sfx-volume', 'not-a-volume');
    expect(new GameAudio(storage).getVolume()).toBe(0.55);
  });

  it('loads a deliberately muted state and toggles without AudioContext creation', () => {
    const storage = new MemoryStorage(); storage.seed('grand-glory-sound-enabled', 'false');
    const audio = new GameAudio(storage);
    expect(audio.isEnabled()).toBe(false);
    expect(audio.toggle()).toBe(true);
    expect(audio.toggle()).toBe(false);
    expect(storage.getItem('grand-glory-sound-enabled')).toBe('false');
  });

  it('falls back safely when browser storage reads or writes fail', () => {
    const unavailable: AudioPreferenceStorage = {
      getItem: () => { throw new Error('storage blocked'); },
      setItem: () => { throw new Error('storage blocked'); },
    };
    const audio = new GameAudio(unavailable);
    expect(audio.getVolume()).toBe(0.55);
    expect(audio.isEnabled()).toBe(true);
    expect(() => { audio.setVolume(0.3); audio.toggle(); }).not.toThrow();
  });
});
