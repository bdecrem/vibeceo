/**
 * JB202 Triangle Oscillator
 *
 * Triangle wave - continuous waveform with slope changes.
 * Less aliasing than saw/square due to smoother transitions.
 * Can be derived from integrated square or computed directly.
 */

import { Oscillator } from './base.js';

export class TriangleOscillator extends Oscillator {
  constructor(sampleRate = 44100) {
    super(sampleRate);
  }

  _generateSample() {
    // Triangle: ramps up 0->0.5, ramps down 0.5->1
    // Maps phase [0,1] to output [-1,1]
    const phase = this.phase;

    if (phase < 0.25) {
      // 0 to 0.25: rise from 0 to 1
      return phase * 4;
    } else if (phase < 0.75) {
      // 0.25 to 0.75: fall from 1 to -1
      return 2 - phase * 4;
    } else {
      // 0.75 to 1: rise from -1 to 0
      return phase * 4 - 4;
    }
  }
}

// Factory function
export function createTriangle(sampleRate = 44100) {
  return new TriangleOscillator(sampleRate);
}
