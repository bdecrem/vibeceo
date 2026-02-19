/**
 * JT90 Rimshot Voice
 *
 * 909-style rimshot — the ONLY 909 voice that uses bridged-T resonators
 * (commonly misattributed to the kick drum).
 *
 * Three inharmonic resonators at 220, 500, 1000 Hz excited by impulse:
 * - Metallic bell-like timbre from inharmonic frequency ratios (1:2.27:4.55)
 * - High Q (15-25) produces characteristic ringing
 * - Diode clipper adds odd harmonics and saturation
 * - VCA with 20-80ms decay
 * - Highpass at ~300 Hz for brightness
 */

import { clamp, fastTanh } from '../../../../../jb202/dist/dsp/utils/math.js';

export class RimshotVoice {
  constructor(sampleRate = 44100) {
    this.sampleRate = sampleRate;

    // Parameters
    this.tune = 0;      // Cents offset
    this.decay = 0.3;   // 0-1 → 20-80ms
    this.level = 1.0;

    // Three resonator base frequencies (inharmonic — metallic character)
    this.baseFreqs = [220, 500, 1000];
    // Q factors (higher = longer ring, narrower band)
    this.qFactors = [20, 15, 25];

    // Per-resonator recursive oscillator state
    this.resCoeff1 = [0, 0, 0];  // 2*r*cos(w)
    this.resCoeff2 = [0, 0, 0];  // r^2
    this.resPrev1 = [0, 0, 0];   // y[n-1]
    this.resPrev2 = [0, 0, 0];   // y[n-2]

    // Highpass at ~300 Hz
    this.hpState = 0;
    this._hpCoeff = 2 * Math.PI * 300 / sampleRate;

    // VCA envelope
    this.envelope = 0;
    this._decayRate = 0;

    // State
    this.active = false;
    this.velocity = 1.0;
  }

  trigger(velocity = 1.0) {
    this.active = true;
    this.velocity = velocity * this.level;
    this.envelope = 1.0;
    this.hpState = 0;

    const tuneRatio = Math.pow(2, this.tune / 1200);

    // Initialize each damped sine resonator
    for (let i = 0; i < 3; i++) {
      const f = this.baseFreqs[i] * tuneRatio;
      const Q = this.qFactors[i];
      const w = 2 * Math.PI * f / this.sampleRate;
      const r = Math.exp(-Math.PI * f / (Q * this.sampleRate));

      this.resCoeff1[i] = 2 * r * Math.cos(w);
      this.resCoeff2[i] = r * r;

      // Seed with first sample of impulse response
      this.resPrev1[i] = Math.sin(w);
      this.resPrev2[i] = 0;
    }

    // VCA decay (20-80ms)
    const decayTime = 0.02 + this.decay * 0.06;
    this._decayRate = Math.exp(-1 / (decayTime * this.sampleRate));
  }

  processSample() {
    if (!this.active) return 0;

    // Sum three ringing resonators (no Math.sin/exp — pure multiply-add)
    let sample = 0;
    for (let i = 0; i < 3; i++) {
      sample += this.resPrev1[i];
      const y = this.resCoeff1[i] * this.resPrev1[i] - this.resCoeff2[i] * this.resPrev2[i];
      this.resPrev2[i] = this.resPrev1[i];
      this.resPrev1[i] = y;
    }

    // Diode clipper (odd harmonics + saturation)
    sample = fastTanh(sample * 2) / fastTanh(2);

    // VCA decay envelope (precomputed rate)
    this.envelope *= this._decayRate;
    sample *= this.envelope * this.velocity;

    // Highpass ~300 Hz (remove low-end bleed from 220Hz resonator)
    this.hpState += this._hpCoeff * (sample - this.hpState);
    sample -= this.hpState;

    // Deactivate when quiet
    if (this.envelope < 0.001) {
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
