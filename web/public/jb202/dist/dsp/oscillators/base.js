/**
 * JB202 Oscillator Base Class
 * Abstract base for all oscillator types
 *
 * Oscillators are stateful - they track phase for continuous waveform generation.
 * Call process() to generate samples, reset() to restart phase.
 */

import { TWO_PI } from '../utils/math.js';

export class Oscillator {
  constructor(sampleRate = 44100) {
    this.sampleRate = sampleRate;
    this.phase = 0;           // Current phase [0, 1)
    this.frequency = 440;     // Current frequency in Hz
    this.phaseIncrement = 0;  // Phase increment per sample
    this._updatePhaseIncrement();
  }

  // Set frequency and update phase increment
  setFrequency(freq) {
    this.frequency = freq;
    this._updatePhaseIncrement();
  }

  // Update phase increment based on current frequency
  _updatePhaseIncrement() {
    this.phaseIncrement = this.frequency / this.sampleRate;
  }

  // Reset phase to starting position
  reset(startPhase = 0) {
    this.phase = startPhase;
  }

  // Generate a single sample (override in subclass)
  _generateSample() {
    return 0;
  }

  // Advance phase by one sample
  _advancePhase() {
    this.phase += this.phaseIncrement;
    if (this.phase >= 1) {
      this.phase -= 1;
    }
  }

  // Process a buffer of samples
  // output: Float32Array to write to
  // offset: starting index in output
  // count: number of samples to generate
  process(output, offset = 0, count = output.length - offset) {
    for (let i = 0; i < count; i++) {
      output[offset + i] = this._generateSample();
      this._advancePhase();
    }
  }

  // Generate and return a new buffer
  generate(count) {
    const output = new Float32Array(count);
    this.process(output, 0, count);
    return output;
  }

  // Get current phase in radians (for compatibility)
  getPhaseRadians() {
    return this.phase * TWO_PI;
  }
}
