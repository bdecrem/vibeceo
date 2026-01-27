/**
 * JT90 Rimshot Voice
 *
 * 909-style rimshot with:
 * - Short click transient
 * - Filtered noise burst
 * - Very short decay
 */

import { clamp, fastTanh } from '../../../../../jb202/dist/dsp/utils/math.js';
import { Noise } from './noise.js';

export class RimshotVoice {
  constructor(sampleRate = 44100) {
    this.sampleRate = sampleRate;

    // Parameters
    this.tune = 0;
    this.decay = 0.3;
    this.level = 1.0;

    // Oscillator (high-frequency click)
    this.phase = 0;
    this.frequency = 1200;

    // Noise
    this.noise = new Noise(44444);
    this.bpFilter = 0;

    // Envelope
    this.envelope = 0;

    // State
    this.active = false;
    this.sampleCount = 0;
  }

  trigger(velocity = 1.0) {
    this.phase = 0;
    this.sampleCount = 0;
    this.active = true;

    this.envelope = velocity * this.level;

    // Tune frequency
    const tuneMultiplier = Math.pow(2, this.tune / 1200);
    this.frequency = 1200 * tuneMultiplier;

    // Reset
    this.noise.reset();
    this.bpFilter = 0;
  }

  processSample() {
    if (!this.active) return 0;

    this.sampleCount++;
    const time = this.sampleCount / this.sampleRate;

    // High-frequency click oscillator (very short)
    let click = 0;
    if (time < 0.002) {  // First 2ms
      this.phase += this.frequency / this.sampleRate;
      if (this.phase >= 1) this.phase -= 1;

      // Triangle wave for click
      click = this.phase < 0.5 ? (this.phase * 4 - 1) : (3 - this.phase * 4);
      click *= Math.exp(-time * 1000);  // Very fast decay
    }

    // Filtered noise
    const noiseSample = this.noise.nextSample();
    const cutoff = 0.3;
    this.bpFilter += cutoff * (noiseSample - this.bpFilter);

    // Amplitude envelope (very short)
    const decayTime = 0.01 + this.decay * 0.04;  // 10-50ms
    const decayRate = 1 - Math.exp(-4.6 / (decayTime * this.sampleRate));
    this.envelope *= (1 - decayRate);

    let sample = (click * 0.6 + this.bpFilter * 0.4) * this.envelope;

    // Saturation
    sample = fastTanh(sample * 2) / fastTanh(2);

    // Deactivate
    if (this.envelope < 0.0001) {
      this.active = false;
    }

    return sample;
  }

  setParameter(id, value) {
    switch (id) {
      case 'tune':
        this.tune = clamp(value, -1200, 1200);
        break;
      case 'decay':
        this.decay = clamp(value, 0, 1);
        break;
      case 'level':
        this.level = clamp(value, 0, 1);
        break;
    }
  }

  isActive() {
    return this.active;
  }
}

export default RimshotVoice;
