/**
 * JB01 Perc Voice
 *
 * General percussion voice (conga/bongo style):
 * - tune: pitch
 * - decay: length
 * - level: output level
 */
import { Voice } from '../../../core/voice.js';

export class PercVoice extends Voice {
  constructor(id, context) {
    super(id, context);
    this.tune = 0;      // cents
    this.decay = 0.3;   // 0-1
    this.level = 1;     // 0-1
  }

  trigger(time, velocity) {
    const level = Math.max(0, Math.min(1, velocity * this.level));
    const baseFreq = 250 * Math.pow(2, this.tune / 1200);

    // Main tone oscillator
    const osc = this.context.createOscillator();
    osc.type = 'sine';

    // Pitch sweep down
    osc.frequency.setValueAtTime(baseFreq * 1.3, time);
    osc.frequency.exponentialRampToValueAtTime(baseFreq, time + 0.02);

    // Amplitude envelope
    const oscGain = this.context.createGain();
    const decayTime = 0.1 + this.decay * 0.4;
    oscGain.gain.setValueAtTime(level * 0.8, time);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + decayTime);

    // Click transient
    const clickOsc = this.context.createOscillator();
    clickOsc.type = 'sine';
    clickOsc.frequency.value = baseFreq * 3;

    const clickGain = this.context.createGain();
    clickGain.gain.setValueAtTime(level * 0.3, time);
    clickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.01);

    // Connect
    osc.connect(oscGain);
    oscGain.connect(this.output);
    osc.start(time);
    osc.stop(time + decayTime + 0.1);

    clickOsc.connect(clickGain);
    clickGain.connect(this.output);
    clickOsc.start(time);
    clickOsc.stop(time + 0.02);
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
        defaultValue: 0.3,
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
