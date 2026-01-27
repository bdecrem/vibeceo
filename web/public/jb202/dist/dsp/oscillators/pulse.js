/**
 * JB202 Pulse Oscillator
 *
 * Band-limited pulse wave with variable width using PolyBLEP anti-aliasing.
 * Width of 0.5 = square wave, other values create asymmetric pulses.
 *
 * PWM (Pulse Width Modulation) creates rich, evolving timbres when
 * the width is modulated by an LFO or envelope.
 */

import { Oscillator } from './base.js';
import { clamp } from '../utils/math.js';

export class PulseOscillator extends Oscillator {
  constructor(sampleRate = 44100) {
    super(sampleRate);
    this.pulseWidth = 0.5;  // 0.5 = square wave
  }

  /**
   * Set pulse width
   * @param {number} width - Pulse width (0.05 to 0.95, 0.5 = square)
   */
  setPulseWidth(width) {
    this.pulseWidth = clamp(width, 0.05, 0.95);
  }

  /**
   * Get current pulse width
   * @returns {number}
   */
  getPulseWidth() {
    return this.pulseWidth;
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
    const dt = this.phaseIncrement;

    // Naive pulse: high when phase < width, low otherwise
    let sample = this.phase < this.pulseWidth ? 1 : -1;

    // Apply PolyBLEP at rising edge (phase = 0)
    sample += this._polyBlep(this.phase, dt);

    // Apply PolyBLEP at falling edge (phase = pulseWidth)
    // Wrap the phase difference to handle edge case
    const fallEdge = (this.phase - this.pulseWidth + 1) % 1;
    sample -= this._polyBlep(fallEdge, dt);

    return sample;
  }
}

// Factory function for convenience
export function createPulse(sampleRate = 44100) {
  return new PulseOscillator(sampleRate);
}
