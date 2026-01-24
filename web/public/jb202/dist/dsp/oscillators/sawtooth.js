/**
 * JB202 Sawtooth Oscillator
 *
 * Band-limited sawtooth using PolyBLEP anti-aliasing.
 * PolyBLEP smooths discontinuities to reduce aliasing without FFT overhead.
 */

import { Oscillator } from './base.js';

export class SawtoothOscillator extends Oscillator {
  constructor(sampleRate = 44100) {
    super(sampleRate);
  }

  // PolyBLEP correction for discontinuities
  // t: distance from discontinuity in phase [0-1] units
  // dt: phase increment (frequency / sampleRate)
  _polyBlep(t, dt) {
    if (t < dt) {
      // Just after discontinuity
      t = t / dt;
      return t + t - t * t - 1;
    } else if (t > 1 - dt) {
      // Just before discontinuity
      t = (t - 1) / dt;
      return t * t + t + t + 1;
    }
    return 0;
  }

  _generateSample() {
    // Naive sawtooth: ramps from -1 to +1 over one cycle
    let sample = 2 * this.phase - 1;

    // Apply PolyBLEP to smooth the discontinuity at phase wrap
    sample -= this._polyBlep(this.phase, this.phaseIncrement);

    return sample;
  }
}

// Factory function for convenience
export function createSawtooth(sampleRate = 44100) {
  return new SawtoothOscillator(sampleRate);
}
