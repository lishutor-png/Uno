/**
 * Procedural Web Audio API sound synthesizer for UNO Arena.
 * Combines filtered noise bursts (cardstock snap/slide) with warm harmonic chimes.
 * Zero external audio dependencies, offline-safe, with instant mute toggle.
 */
class SoundEngine {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private enabled = true;

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  private ensureContext(): AudioContext | null {
    if (!this.enabled || typeof window === 'undefined') {
      return null;
    }
    try {
      if (!this.ctx) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        if (!AudioCtx) return null;
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      if (!this.noiseBuffer && this.ctx) {
        const sampleRate = this.ctx.sampleRate;
        const length = Math.floor(sampleRate * 0.15);
        const buffer = this.ctx.createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < length; i += 1) {
          data[i] = Math.random() * 2 - 1;
        }
        this.noiseBuffer = buffer;
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    gainPeak = 0.08,
    delay = 0,
    freqEnd?: number
  ): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      if (freqEnd !== undefined) {
        osc.frequency.exponentialRampToValueAtTime(
          Math.max(40, freqEnd),
          now + duration
        );
      }

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(gainPeak, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + duration + 0.02);
    } catch {
      // Ignore audio errors when context isn't unlocked yet
    }
  }

  private playCardFlick(
    filterFreq: number,
    duration = 0.055,
    gainPeak = 0.09,
    delay = 0
  ): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;

    try {
      const now = ctx.currentTime + delay;
      const source = ctx.createBufferSource();
      source.buffer = this.noiseBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(filterFreq, now);
      filter.Q.setValueAtTime(1.4, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(gainPeak, now + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      source.start(now);
      source.stop(now + duration + 0.01);
    } catch {
      // Ignore audio errors
    }
  }

  playButtonTap(): void {
    this.playTone(580, 0.045, 'triangle', 0.045, 0, 440);
  }

  playShuffle(): void {
    this.playCardFlick(1800, 0.04, 0.06, 0);
    this.playCardFlick(2200, 0.04, 0.06, 0.045);
    this.playCardFlick(2500, 0.04, 0.07, 0.09);
  }

  playCardPlay(): void {
    this.playCardFlick(1650, 0.055, 0.11, 0);
    this.playTone(220, 0.065, 'sine', 0.07, 0, 140);
    this.playTone(540, 0.05, 'triangle', 0.035, 0.015, 660);
  }

  playCardDraw(): void {
    this.playCardFlick(2400, 0.065, 0.08, 0);
    this.playTone(310, 0.07, 'sine', 0.045, 0.01, 420);
  }

  playCardDeal(): void {
    this.playCardFlick(2100, 0.045, 0.075, 0);
    this.playCardFlick(2400, 0.045, 0.075, 0.07);
    this.playCardFlick(2600, 0.045, 0.075, 0.14);
  }

  playSkip(): void {
    this.playCardFlick(1500, 0.05, 0.08, 0);
    this.playTone(520, 0.085, 'triangle', 0.065, 0, 260);
    this.playTone(240, 0.11, 'triangle', 0.055, 0.065, 165);
  }

  playReverse(): void {
    this.playCardFlick(1900, 0.05, 0.07, 0);
    this.playTone(340, 0.085, 'triangle', 0.06, 0, 580);
    this.playTone(580, 0.11, 'triangle', 0.06, 0.07, 360);
  }

  playDrawPenalty(): void {
    this.playCardFlick(1200, 0.07, 0.11, 0);
    this.playTone(230, 0.12, 'sawtooth', 0.055, 0, 145);
    this.playTone(175, 0.15, 'triangle', 0.075, 0.08, 110);
  }

  playWild(): void {
    this.playCardFlick(2000, 0.05, 0.08, 0);
    this.playTone(440, 0.09, 'sine', 0.055, 0);
    this.playTone(554.37, 0.09, 'sine', 0.055, 0.055);
    this.playTone(659.25, 0.14, 'triangle', 0.07, 0.11);
  }

  playUnoShout(): void {
    this.playTone(587.33, 0.11, 'triangle', 0.085, 0);
    this.playTone(880, 0.24, 'triangle', 0.1, 0.085);
    this.playTone(1174.66, 0.18, 'sine', 0.05, 0.11);
  }

  playVictory(): void {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      this.playTone(n, 0.24, 'triangle', 0.075, idx * 0.09);
    });
    this.playTone(1046.5, 0.38, 'sine', 0.05, 0.28);
  }

  playDefeat(): void {
    this.playTone(392, 0.16, 'triangle', 0.055, 0, 349);
    this.playTone(329.63, 0.24, 'triangle', 0.055, 0.15, 246.94);
  }
}

export const soundEngine = new SoundEngine();
