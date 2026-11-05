export type SoundCue = 'menu' | 'upgrade' | 'attack' | 'hit' | 'defeat' | 'pickup' | 'dash' | 'special' | 'boss' | 'victory' | 'loss';
const STORAGE_KEY = 'grand-glory-sound-enabled';
const VOLUME_KEY = 'grand-glory-sfx-volume';
export interface AudioPreferenceStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function browserStorage(): AudioPreferenceStorage | undefined {
  try { return globalThis.localStorage; } catch { return undefined; }
}

/** Small synthesized SFX layer. AudioContext is created only after an explicit user gesture. */
export class GameAudio {
  private context?: AudioContext;
  private enabled: boolean;
  private volume: number;
  private lastCueAt = new Map<SoundCue, number>();

  constructor(private readonly storage: AudioPreferenceStorage | undefined = browserStorage()) {
    this.enabled = this.readEnabled();
    this.volume = this.readVolume();
  }

  isEnabled(): boolean { return this.enabled; }
  getVolume(): number { return this.volume; }

  private readEnabled(): boolean {
    try { return this.storage?.getItem(STORAGE_KEY) !== 'false'; } catch { return true; }
  }

  private readVolume(): number {
    try {
      const stored = this.storage?.getItem(VOLUME_KEY);
      if (stored === null || stored === undefined || stored.trim() === '') return 0.55;
      const value = Number(stored);
      return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0.55;
    } catch { return 0.55; }
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    try { this.storage?.setItem(VOLUME_KEY, String(this.volume)); } catch { /* Optional preference. */ }
  }

  toggle(): boolean {
    this.enabled = !this.enabled;
    try { this.storage?.setItem(STORAGE_KEY, String(this.enabled)); } catch { /* Optional preference. */ }
    return this.enabled;
  }

  play(cue: SoundCue): void {
    if (!this.enabled) return;
    const now = performance.now();
    const throttleMs = cue === 'hit' || cue === 'defeat' || cue === 'pickup' ? 95 : 0;
    if (now - (this.lastCueAt.get(cue) ?? -Infinity) < throttleMs) return;
    this.lastCueAt.set(cue, now);
    try {
      this.context ??= new AudioContext();
      if (this.context.state === 'suspended') void this.context.resume();
      const presets: Record<SoundCue, [number, number, OscillatorType, number]> = {
        menu: [420, 0.055, 'square', 0.035], upgrade: [660, 0.13, 'triangle', 0.055], attack: [560, 0.045, 'triangle', 0.018],
        hit: [180, 0.055, 'square', 0.025], defeat: [120, 0.095, 'sawtooth', 0.026], pickup: [880, 0.075, 'sine', 0.025],
        dash: [300, 0.11, 'sawtooth', 0.035], special: [220, 0.24, 'triangle', 0.055], boss: [110, 0.34, 'sawtooth', 0.05],
        victory: [740, 0.38, 'triangle', 0.045], loss: [145, 0.4, 'sine', 0.04],
      };
      const [frequency, duration, type, volume] = presets[cue];
      const oscillator = this.context.createOscillator(); const gain = this.context.createGain();
      oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, this.context.currentTime);
      if (cue === 'upgrade' || cue === 'victory') oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.5, this.context.currentTime + duration);
      if (cue === 'boss' || cue === 'loss') oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.55, this.context.currentTime + duration);
      gain.gain.setValueAtTime(Math.max(0.0001, volume * this.volume), this.context.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + duration);
      oscillator.connect(gain); gain.connect(this.context.destination); oscillator.start(); oscillator.stop(this.context.currentTime + duration);
    } catch { /* Browsers may disable audio; gameplay remains unaffected. */ }
  }
}
