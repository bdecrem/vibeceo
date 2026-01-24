/**
 * JB202 Square Oscillator
 *
 * Band-limited square wave using PolyBLEP anti-aliasing.
 * Two discontinuities per cycle (rising and falling edge).
 */

import { Oscillator } from './base.js';

export class SquareOscillator extends Oscillator {
  constructor(sampleRate = 44100, pulseWidth = 0.5) {
    super(sampleRate);
    this.pulseWidth = pulseWidth; // 0.5 = 50% duty cycle (true square)
  }

  // Set pulse width (0-1, default 0.5 for square)
  setPulseWidth(pw) {
    this.pulseWidth = Math.max(0.01, Math.min(0.99, pw));
  }

  // PolyBLEP correction
  _polyBlep(t, dt) {
    if (t < dt) {
      t = t / dt;
      return t + t - t * t - 1;
    } else if (t > 1 - dt) {
      t = (t - 1) / dt;
      return t * t + t + t + 1;
    }
    return 0;
  }

  _generateSample() {
    // Naive square: +1 for first half, -1 for second half
    let sample = this.phase < this.pulseWidth ? 1 : -1;

    // Apply PolyBLEP at both transitions
    // Rising edge at phase = 0
    sample += this._polyBlep(this.phase, this.phaseIncrement);

    // Falling edge at phase = pulseWidth
    sample -= this._polyBlep(
      (this.phase - this.pulseWidth + 1) % 1,
      this.phaseIncrement
    );

    return sample;
  }
}

// Factory function
export function createSquare(sampleRate = 44100, pulseWidth = 0.5) {
  return new SquareOscillator(sampleRate, pulseWidth);
}
