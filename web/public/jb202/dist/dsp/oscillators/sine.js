/**
 * JB202 Sine Oscillator
 *
 * Pure sine wave - the simplest waveform with no harmonics.
 * Useful for sub-bass, clean tones, and FM synthesis.
 */

import { Oscillator } from './base.js';
import { TWO_PI } from '../utils/math.js';

export class SineOscillator extends Oscillator {
  constructor(sampleRate = 44100) {
    super(sampleRate);
  }

  _generateSample() {
    return Math.sin(this.phase * TWO_PI);
  }
}

// Factory function
export function createSine(sampleRate = 44100) {
  return new SineOscillator(sampleRate);
}
