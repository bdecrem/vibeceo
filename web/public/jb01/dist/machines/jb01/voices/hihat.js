/**
 * JB01 HiHat Voice
 *
 * Metallic hi-hat synthesis using 6 square wave oscillators:
 * - type: 'closed' or 'open'
 * - decay: tail length
 * - tone: brightness
 * - level: output level
 */
import { Voice } from '../../../core/voice.js';

// Inharmonic frequencies for metallic character
const HIHAT_FREQUENCIES = [
  205.3,
  304.4,
  369.6,
  522.7,
  800.0,
  1204.4
];

export class HiHatVoice extends Voice {
  constructor(id, context, noiseBuffer, type = 'closed') {
    super(id, context);
    this.type = type;
    this.noiseBuffer = noiseBuffer;
    this.tune = 0;
    this.decay = type === 'closed' ? 0.08 : 0.4;
    this.tone = 0.5;
    this.level = 1;

    // For choke tracking (open hat can be choked by closed)
    this.activeGain = null;
  }

  trigger(time, velocity) {
    const level = Math.max(0, Math.min(1, velocity * this.level));
    const tuneMultiplier = Math.pow(2, this.tune / 1200);

    // Master output chain
    const masterGain = this.context.createGain();
    masterGain.gain.value = level * 0.5;

    // Store for choke
    if (this.type === 'open') {
      this.activeGain = masterGain;
    }

    // Bandpass filter for metallic character
    const bandpass = this.context.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 8000 + this.tone * 4000;
    bandpass.Q.value = 1.5;

    // Highpass to remove low rumble
    const highpass = this.context.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = this.type === 'closed' ? 7000 : 5000;

    // Create 6 square wave oscillators
    const oscillatorGain = this.context.createGain();
    oscillatorGain.gain.value = 0.15;

    HIHAT_FREQUENCIES.forEach((freq, i) => {
      const osc = this.context.createOscillator();
      osc.type = 'square';
      osc.frequency.value = freq * tuneMultiplier;

      const oscEnv = this.context.createGain();
      const oscDecay = this.decay * (1 - i * 0.05);
      oscEnv.gain.setValueAtTime(1, time);
      oscEnv.gain.exponentialRampToValueAtTime(0.001, time + oscDecay);

      osc.connect(oscEnv);
      oscEnv.connect(oscillatorGain);

      osc.start(time);
      osc.stop(time + this.decay + 0.1);
    });

    // Noise component for shimmer
    const noiseSource = this.context.createBufferSource();
    noiseSource.buffer = this.noiseBuffer;

    const noiseGain = this.context.createGain();
    noiseGain.gain.setValueAtTime(0.3, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + this.decay * 0.5);

    // Connect graph
    noiseSource.connect(noiseGain);
    oscillatorGain.connect(bandpass);
    noiseGain.connect(bandpass);
    bandpass.connect(highpass);
    highpass.connect(masterGain);
    masterGain.connect(this.output);

    noiseSource.start(time);
    noiseSource.stop(time + this.decay + 0.1);
  }

  /**
   * Choke this voice (used when closed hat cuts open hat)
   */
  choke() {
    if (this.activeGain && this.type === 'open') {
      const now = this.context.currentTime;
      this.activeGain.gain.cancelScheduledValues(now);
      this.activeGain.gain.setValueAtTime(this.activeGain.gain.value, now);
      this.activeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
      this.activeGain = null;
    }
  }

  setParameter(id, value) {
    switch (id) {
      case 'tune':
        this.tune = value;
        break;
      case 'decay':
        this.decay = Math.max(0.02, Math.min(2, value));
        break;
      case 'tone':
        this.tone = Math.max(0, Math.min(1, value));
        break;
      case 'level':
        this.level = Math.max(0, Math.min(1, value));
        break;
      default:
        super.setParameter(id, value);
    }
  }

  get parameterDescriptors() {
    return [
      {
        id: 'tune',
        label: 'Tune',
        range: { min: -1200, max: 1200, step: 10, unit: 'cents' },
        defaultValue: 0,
      },
      {
        id: 'decay',
        label: 'Decay',
        range: { min: 0.02, max: 2, step: 0.01, unit: 's' },
        defaultValue: this.type === 'closed' ? 0.08 : 0.4,
      },
      {
        id: 'tone',
        label: 'Tone',
        range: { min: 0, max: 1, step: 0.01 },
        defaultValue: 0.5,
      },
      {
        id: 'level',
        label: 'Level',
        range: { min: 0, max: 1, step: 0.01 },
        defaultValue: 1,
      },
      ...super.parameterDescriptors,
    ];
  }
}
