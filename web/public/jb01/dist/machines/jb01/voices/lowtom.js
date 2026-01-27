/**
 * JB01 Low Tom Voice
 *
 * Lower-pitched tom (909-style):
 * - tune: pitch
 * - decay: length
 * - level: output level
 */
import { Voice } from '../../../core/voice.js';

// Frequency ratios for richer tone
const FREQ_RATIOS = [1, 1.5, 2.77];
const OSC_GAINS = [1.0, 0.5, 0.25];

export class LowTomVoice extends Voice {
  constructor(id, context) {
    super(id, context);
    this.tune = 0;      // cents
    this.decay = 0.5;   // 0-1
    this.level = 1;     // 0-1
  }

  trigger(time, velocity) {
    const level = Math.max(0, Math.min(1, velocity * this.level));
    // Low tom: 100Hz base (lower than hi tom)
    const baseFreq = 100 * Math.pow(2, this.tune / 1200);

    // Pitch envelope parameters - longer for low tom
    const pitchMod = 0.7;
    const pitchEnvTime = 0.06;

    const masterGain = this.context.createGain();
    masterGain.gain.value = level * 0.75;
    masterGain.connect(this.output);

    // Create three oscillators at frequency ratios
    FREQ_RATIOS.forEach((ratio, i) => {
      const osc = this.context.createOscillator();
      osc.type = 'sine';

      const targetFreq = baseFreq * ratio;
      const startFreq = targetFreq * (1 + pitchMod);

      // Pitch envelope
      osc.frequency.setValueAtTime(startFreq, time);
      osc.frequency.exponentialRampToValueAtTime(targetFreq, time + pitchEnvTime);

      // Soft saturation
      const waveshaper = this.context.createWaveShaper();
      waveshaper.curve = this.createSoftClipCurve();
      waveshaper.oversample = '2x';

      // Individual gain - longer decay for low tom
      const oscGain = this.context.createGain();
      oscGain.gain.setValueAtTime(OSC_GAINS[i], time);
      const decayTime = (0.25 + this.decay * 0.9) * (1 - i * 0.12);
      oscGain.gain.exponentialRampToValueAtTime(0.001, time + decayTime);

      osc.connect(waveshaper);
      waveshaper.connect(oscGain);
      oscGain.connect(masterGain);

      osc.start(time);
      osc.stop(time + decayTime + 0.2);
    });

    // Click transient - lower frequency for low tom
    const clickOsc = this.context.createOscillator();
    clickOsc.type = 'sine';
    clickOsc.frequency.value = baseFreq * 3;

    const clickGain = this.context.createGain();
    clickGain.gain.setValueAtTime(0.12, time);
    clickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.015);

    clickOsc.connect(clickGain);
    clickGain.connect(masterGain);
    clickOsc.start(time);
    clickOsc.stop(time + 0.025);
  }

  createSoftClipCurve() {
    const samples = 256;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = Math.tanh(x * 1.5);
    }
    return curve;
  }

  setParameter(id, value) {
    switch (id) {
      case 'tune':
        this.tune = value;
        break;
      case 'decay':
        this.decay = Math.max(0, Math.min(1, value));
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
