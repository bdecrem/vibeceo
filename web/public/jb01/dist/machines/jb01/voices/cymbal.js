/**
 * JB01 Cymbal Voice
 *
 * Metallic cymbal synthesis:
 * - tune: pitch
 * - decay: length
 * - level: output level
 */
import { Voice } from '../../../core/voice.js';

// Inharmonic frequencies for metallic character
const CYMBAL_FREQUENCIES = [
  245.0,
  367.5,
  489.0,
  612.5,
  857.5,
  1225.0
];

export class CymbalVoice extends Voice {
  constructor(id, context, noiseBuffer) {
    super(id, context);
    this.noiseBuffer = noiseBuffer;
    this.tune = 0;      // cents
    this.decay = 1.5;   // 0-4 seconds
    this.level = 1;     // 0-1
  }

  trigger(time, velocity) {
    const level = Math.max(0, Math.min(1, velocity * this.level));
    const tuneMultiplier = Math.pow(2, this.tune / 1200);

    // Master output chain
    const masterGain = this.context.createGain();
    masterGain.gain.value = level * 0.4;

    // Bandpass for cymbal character
    const bandpass = this.context.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 6000;
    bandpass.Q.value = 0.8;

    // Highpass to remove low rumble
    const highpass = this.context.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 3000;

    // Create 6 square wave oscillators
    const oscillatorGain = this.context.createGain();
    oscillatorGain.gain.value = 0.12;

    CYMBAL_FREQUENCIES.forEach((freq, i) => {
      const osc = this.context.createOscillator();
      osc.type = 'square';
      osc.frequency.value = freq * tuneMultiplier;

      const oscEnv = this.context.createGain();
      const oscDecay = this.decay * (1 - i * 0.08);
      oscEnv.gain.setValueAtTime(1, time);
      oscEnv.gain.exponentialRampToValueAtTime(0.001, time + oscDecay);

      osc.connect(oscEnv);
      oscEnv.connect(oscillatorGain);

      osc.start(time);
      osc.stop(time + this.decay + 0.2);
    });

    // Noise component for shimmer
    const noiseSource = this.context.createBufferSource();
    noiseSource.buffer = this.noiseBuffer;

    const noiseGain = this.context.createGain();
    noiseGain.gain.setValueAtTime(0.4, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + this.decay * 0.7);

    // Connect graph
    noiseSource.connect(noiseGain);
    oscillatorGain.connect(bandpass);
    noiseGain.connect(bandpass);
    bandpass.connect(highpass);
    highpass.connect(masterGain);
    masterGain.connect(this.output);

    noiseSource.start(time);
    noiseSource.stop(time + this.decay + 0.2);
  }

  setParameter(id, value) {
    switch (id) {
      case 'tune':
        this.tune = value;
        break;
      case 'decay':
        this.decay = Math.max(0.3, Math.min(4, value));
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
        range: { min: 0.3, max: 4, step: 0.05, unit: 's' },
        defaultValue: 1.5,
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
