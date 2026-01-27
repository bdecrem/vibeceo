/**
 * JT90 Cymbal Voice
 *
 * 909-style cymbal (crash/ride) with:
 * - Multiple metallic oscillators
 * - High-passed noise
 * - Long decay
 */

import { clamp, fastTanh } from '../../../../jb202/dist/dsp/utils/math.js';
import { Noise } from './noise.js';

// Cymbal frequencies - higher and more complex than hi-hat
const CYMBAL_FREQUENCIES = {
  crash: [295, 410, 532, 674, 821, 996, 1178, 1367],
  ride: [319, 456, 581, 728, 863, 1023, 1192, 1411]
};

export class CymbalVoice {
  constructor(sampleRate = 44100, type = 'crash') {
    this.sampleRate = sampleRate;
    this.type = type;  // 'crash' or 'ride'

    // Parameters
    this.tune = 0;
    this.decay = type === 'crash' ? 0.7 : 0.5;
    this.tone = 0.5;
    this.level = 1.0;

    // Oscillator phases
    this.phases = new Array(8).fill(0);
    this.frequencies = [...(CYMBAL_FREQUENCIES[type] || CYMBAL_FREQUENCIES.crash)];

    // Noise
    this.noise = new Noise(77777);
    this.hpFilter = 0;
    this.lpFilter = 0;

    // Envelope
    this.envelope = 0;

    // State
    this.active = false;
    this.sampleCount = 0;
  }

  trigger(velocity = 1.0) {
    this.phases = new Array(8).fill(0);
    this.sampleCount = 0;
    this.active = true;

    this.envelope = velocity * this.level;

    // Update frequencies based on tune
    const tuneMultiplier = Math.pow(2, this.tune / 1200);
    const baseFreqs = CYMBAL_FREQUENCIES[this.type] || CYMBAL_FREQUENCIES.crash;
    this.frequencies = baseFreqs.map(f => f * tuneMultiplier);

    // Reset noise
    this.noise.reset();
    this.hpFilter = 0;
    this.lpFilter = 0;
  }

  processSample() {
    if (!this.active) return 0;

    this.sampleCount++;

    // Generate metallic oscillators
    let metallic = 0;
    for (let i = 0; i < 8; i++) {
      this.phases[i] += this.frequencies[i] / this.sampleRate;
      if (this.phases[i] >= 1) this.phases[i] -= 1;

      // Pulse wave for richer harmonics
      const duty = 0.3 + (i % 3) * 0.1;
      const pulse = this.phases[i] < duty ? 1 : -1;
      metallic += pulse / 8;
    }

    // Generate noise
    let noiseSample = this.noise.nextSample();

    // High-pass filter
    const hpCutoff = 0.2;
    this.hpFilter += hpCutoff * (noiseSample - this.hpFilter);
    noiseSample = noiseSample - this.hpFilter;

    // Low-pass based on tone
    const lpCutoff = 0.1 + this.tone * 0.2;
    this.lpFilter += lpCutoff * (noiseSample - this.lpFilter);
    noiseSample = this.lpFilter;

    // Mix metallic and noise
    const metallicMix = 0.4 + this.tone * 0.3;
    const noiseMix = 0.6 - this.tone * 0.3;
    let sample = metallic * metallicMix + noiseSample * noiseMix;

    // Envelope - long decay for cymbals
    const decayTime = this.type === 'crash'
      ? 0.5 + this.decay * 2.5    // 500ms - 3s for crash
      : 0.3 + this.decay * 1.2;   // 300ms - 1.5s for ride

    const decayRate = 1 - Math.exp(-4.6 / (decayTime * this.sampleRate));
    this.envelope *= (1 - decayRate);

    sample *= this.envelope;

    // Soft saturation
    sample = fastTanh(sample * 1.5) / fastTanh(1.5);

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
      case 'tone':
        this.tone = clamp(value, 0, 1);
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

export default CymbalVoice;
