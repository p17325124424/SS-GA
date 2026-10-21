/**
 * Web Audio API synthesizer for offline, zero-dependency sound effects
 */

class SoundEffectsManager {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  private getContext(): AudioContext | null {
    if (!this.enabled) return null;
    if (typeof window === 'undefined') return null;

    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    return this.ctx;
  }

  // Brush sound: rhythmic white noise burst filtered
  playBrush() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const bufferSize = ctx.sampleRate * 0.06;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1600;
      filter.Q.value = 2.5;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start();
    } catch {
      // Audio playback fails gracefully
    }
  }

  // Bubble pop
  playBubblePop() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const startFreq = 400 + Math.random() * 300;
      const endFreq = startFreq + 350;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.06);
    } catch {
      // Ignore audio error
    }
  }

  // Germ defeated cute pop & chime
  playGermDefeated() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(523.25, now); // C5
      osc1.frequency.exponentialRampToValueAtTime(783.99, now + 0.12); // G5

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1046.5, now + 0.06); // C6

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.15);
      osc2.start(now + 0.06);
      osc2.stop(now + 0.25);
    } catch {
      // Ignore
    }
  }

  // Chime when quadrant changes (e.g. from top-right to top-left)
  playQuadrantBell() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const frequencies = [587.33, 880]; // D5, A5
      frequencies.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0.18, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.4);
      });
    } catch {
      // Ignore
    }
  }

  // Star sparkle chime
  playSparkle() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(2400, now + 0.18);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.2);
    } catch {
      // Ignore
    }
  }

  // Victory fanfare on 2 minutes completion!
  playFanfare() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // C5, E5, G5, C6 arpeggio with celebratory finish
      const notes = [
        { f: 523.25, time: 0, dur: 0.18 },
        { f: 659.25, time: 0.15, dur: 0.18 },
        { f: 783.99, time: 0.3, dur: 0.18 },
        { f: 1046.5, time: 0.45, dur: 0.6 },
        { f: 1318.5, time: 0.7, dur: 0.7 },
      ];

      notes.forEach((note) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(note.f, now + note.time);

        gain.gain.setValueAtTime(0.2, now + note.time);
        gain.gain.exponentialRampToValueAtTime(0.001, now + note.time + note.dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + note.time);
        osc.stop(now + note.time + note.dur);
      });
    } catch {
      // Ignore
    }
  }

  // Notification chime (alarm for brushing time)
  playReminderChime() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [659.25, 783.99, 987.77, 1046.5]; // E5, G5, B5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.14);

        gain.gain.setValueAtTime(0.25, now + idx * 0.14);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.14 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.14);
        osc.stop(now + idx * 0.14 + 0.4);
      });
    } catch {
      // Ignore
    }
  }

  // =========================================================================
  // INSTRUMENTAL LIGHT & FUN BACKGROUND MUSIC (BGM)
  // Continuous cheerful synthesizer loop playing offline throughout the app
  // =========================================================================
  private bgmPlaying: boolean = false;
  private bgmGainNode: GainNode | null = null;
  private bgmTimer: number | null = null;
  private nextNoteTime: number = 0;
  private currentStep: number = 0;
  private bgmVolume: number = 0.12;

  // Notes frequencies in Hz (C major cheerful kids scale)
  private readonly NOTE_C3 = 130.81;
  private readonly NOTE_F3 = 174.61;
  private readonly NOTE_G3 = 196.00;
  private readonly NOTE_A3 = 220.00;
  private readonly NOTE_C4 = 261.63;
  private readonly NOTE_D4 = 293.66;
  private readonly NOTE_E4 = 329.63;
  private readonly NOTE_F4 = 349.23;
  private readonly NOTE_G4 = 392.00;
  private readonly NOTE_A4 = 440.00;
  private readonly NOTE_B4 = 493.88;
  private readonly NOTE_C5 = 523.25;
  private readonly NOTE_D5 = 587.33;
  private readonly NOTE_E5 = 659.25;
  private readonly NOTE_F5 = 698.46;
  private readonly NOTE_G5 = 783.99;
  private readonly NOTE_A5 = 880.00;
  private readonly NOTE_C6 = 1046.50;

  // 32-step melody pattern (each step is 1/8th beat at 108 BPM)
  private getMelodyPattern(): { mel: number; bass: number }[] {
    return [
      // Bar 1: C - Joyful bounce
      { mel: this.NOTE_C5, bass: this.NOTE_C3 },
      { mel: 0,            bass: 0 },
      { mel: this.NOTE_E5, bass: 0 },
      { mel: this.NOTE_G5, bass: this.NOTE_G3 },
      { mel: this.NOTE_C6, bass: 0 },
      { mel: this.NOTE_G5, bass: 0 },
      { mel: this.NOTE_E5, bass: this.NOTE_C3 },
      { mel: this.NOTE_G5, bass: 0 },

      // Bar 2: F - Warm and playful
      { mel: this.NOTE_F5, bass: this.NOTE_F3 },
      { mel: 0,            bass: 0 },
      { mel: this.NOTE_A5, bass: 0 },
      { mel: this.NOTE_F5, bass: this.NOTE_C4 },
      { mel: this.NOTE_E5, bass: 0 },
      { mel: this.NOTE_D5, bass: 0 },
      { mel: this.NOTE_C5, bass: this.NOTE_F3 },
      { mel: 0,            bass: 0 },

      // Bar 3: G - Happy skip
      { mel: this.NOTE_D5, bass: this.NOTE_G3 },
      { mel: 0,            bass: 0 },
      { mel: this.NOTE_F5, bass: 0 },
      { mel: this.NOTE_E5, bass: this.NOTE_D4 },
      { mel: this.NOTE_D5, bass: 0 },
      { mel: this.NOTE_B4, bass: 0 },
      { mel: this.NOTE_G4, bass: this.NOTE_G3 },
      { mel: this.NOTE_B4, bass: 0 },

      // Bar 4: C - Cheerful resolution
      { mel: this.NOTE_C5, bass: this.NOTE_C3 },
      { mel: 0,            bass: 0 },
      { mel: this.NOTE_E5, bass: 0 },
      { mel: this.NOTE_G5, bass: this.NOTE_G3 },
      { mel: this.NOTE_C6, bass: 0 },
      { mel: 0,            bass: 0 },
      { mel: this.NOTE_C5, bass: this.NOTE_C3 },
      { mel: 0,            bass: 0 },
    ];
  }

  // Play a soft bell/marimba note
  private playBGMNote(freq: number, time: number, isBass: boolean = false) {
    const ctx = this.getContext();
    if (!ctx || !this.bgmGainNode) return;

    try {
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();

      if (isBass) {
        // Soft warm triangle bass
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, time);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(450, time);

        noteGain.gain.setValueAtTime(0.35, time);
        noteGain.gain.exponentialRampToValueAtTime(0.001, time + 0.32);

        osc.connect(filter);
        filter.connect(noteGain);
      } else {
        // Cheerful marimba / music-box sound
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);

        // Add warm harmonics with a gentle lowpass
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1900, time);

        noteGain.gain.setValueAtTime(0.4, time);
        noteGain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

        osc.connect(filter);
        filter.connect(noteGain);
      }

      noteGain.connect(this.bgmGainNode);
      osc.start(time);
      osc.stop(time + (isBass ? 0.35 : 0.25));
    } catch {
      // Ignore
    }
  }

  private scheduleBGM() {
    const ctx = this.getContext();
    if (!ctx || !this.bgmPlaying) return;

    const pattern = this.getMelodyPattern();
    const stepDuration = 60 / 108 / 2; // ~0.277 sec per 8th note

    // Schedule ahead 150ms
    while (this.nextNoteTime < ctx.currentTime + 0.18) {
      const step = pattern[this.currentStep];
      if (step) {
        if (step.mel > 0) {
          this.playBGMNote(step.mel, this.nextNoteTime, false);
        }
        if (step.bass > 0) {
          this.playBGMNote(step.bass, this.nextNoteTime, true);
        }
      }

      this.nextNoteTime += stepDuration;
      this.currentStep = (this.currentStep + 1) % pattern.length;
    }
  }

  public startBGM() {
    if (this.bgmPlaying) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      if (!this.bgmGainNode) {
        this.bgmGainNode = ctx.createGain();
        this.bgmGainNode.gain.setValueAtTime(this.bgmVolume, ctx.currentTime);
        this.bgmGainNode.connect(ctx.destination);
      } else {
        this.bgmGainNode.gain.setValueAtTime(this.bgmVolume, ctx.currentTime);
      }

      this.bgmPlaying = true;
      this.currentStep = 0;
      this.nextNoteTime = ctx.currentTime + 0.05;

      if (this.bgmTimer) {
        clearInterval(this.bgmTimer);
      }
      this.bgmTimer = window.setInterval(() => this.scheduleBGM(), 40);
    } catch {
      // Ignore audio error
    }
  }

  public stopBGM() {
    this.bgmPlaying = false;
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
    if (this.bgmGainNode && this.ctx) {
      try {
        this.bgmGainNode.gain.setValueAtTime(0, this.ctx.currentTime);
      } catch {
        // Ignore
      }
    }
  }

  public toggleBGM(): boolean {
    if (this.bgmPlaying) {
      this.stopBGM();
      return false;
    } else {
      this.startBGM();
      return true;
    }
  }

  public isBGMActive(): boolean {
    return this.bgmPlaying;
  }

  public setBGMVolume(volume: number) {
    this.bgmVolume = Math.max(0, Math.min(1, volume));
    if (this.bgmGainNode && this.ctx) {
      try {
        this.bgmGainNode.gain.setValueAtTime(this.bgmVolume, this.ctx.currentTime);
      } catch {
        // Ignore
      }
    }
  }
}

export const sound = new SoundEffectsManager();

