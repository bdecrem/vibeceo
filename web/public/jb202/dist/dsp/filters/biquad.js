/**
 * JB202 Biquad Filter
 *
 * Direct Form II Transposed biquad filter implementation.
 * Compute coefficients for various filter types (lowpass, highpass, bandpass).
 *
 * This is the building block for multi-pole filters.
 */

import { clamp } from '../utils/math.js';

export class BiquadFilter {
  constructor(sampleRate = 44100) {
    this.sampleRate = sampleRate;

    // Filter coefficients
    this.b0 = 1;
    this.b1 = 0;
    this.b2 = 0;
    this.a1 = 0;
    this.a2 = 0;

    // Filter state (Direct Form II Transposed)
    this.z1 = 0;
    this.z2 = 0;

    // Default to wide-open lowpass
    this.setLowpass(20000, 0.707);
  }

  // Reset filter state (call when starting new note)
  reset() {
    this.z1 = 0;
    this.z2 = 0;
  }

  // Set lowpass coefficients
  // cutoff: frequency in Hz
  // q: resonance (0.5 = gentle, 20+ = screaming)
  setLowpass(cutoff, q = 0.707) {
    const freq = clamp(cutoff, 20, this.sampleRate * 0.49);
    const Q = clamp(q, 0.1, 30);

    const w0 = (2 * Math.PI * freq) / this.sampleRate;
    const cosW0 = Math.cos(w0);
    const sinW0 = Math.sin(w0);
    const alpha = sinW0 / (2 * Q);

    const a0 = 1 + alpha;

    this.b0 = ((1 - cosW0) / 2) / a0;
    this.b1 = (1 - cosW0) / a0;
    this.b2 = ((1 - cosW0) / 2) / a0;
    this.a1 = (-2 * cosW0) / a0;
    this.a2 = (1 - alpha) / a0;
  }

  // Set highpass coefficients
  setHighpass(cutoff, q = 0.707) {
    const freq = clamp(cutoff, 20, this.sampleRate * 0.49);
    const Q = clamp(q, 0.1, 30);

    const w0 = (2 * Math.PI * freq) / this.sampleRate;
    const cosW0 = Math.cos(w0);
    const sinW0 = Math.sin(w0);
    const alpha = sinW0 / (2 * Q);

    const a0 = 1 + alpha;

    this.b0 = ((1 + cosW0) / 2) / a0;
    this.b1 = (-(1 + cosW0)) / a0;
    this.b2 = ((1 + cosW0) / 2) / a0;
    this.a1 = (-2 * cosW0) / a0;
    this.a2 = (1 - alpha) / a0;
  }

  // Set bandpass coefficients (constant skirt gain)
  setBandpass(cutoff, q = 1) {
    const freq = clamp(cutoff, 20, this.sampleRate * 0.49);
    const Q = clamp(q, 0.1, 30);

    const w0 = (2 * Math.PI * freq) / this.sampleRate;
    const cosW0 = Math.cos(w0);
    const sinW0 = Math.sin(w0);
    const alpha = sinW0 / (2 * Q);

    const a0 = 1 + alpha;

    this.b0 = (sinW0 / 2) / a0;
    this.b1 = 0;
    this.b2 = (-sinW0 / 2) / a0;
    this.a1 = (-2 * cosW0) / a0;
    this.a2 = (1 - alpha) / a0;
  }

  // Process a single sample
  processSample(input) {
    const output = this.b0 * input + this.z1;
    this.z1 = this.b1 * input - this.a1 * output + this.z2;
    this.z2 = this.b2 * input - this.a2 * output;
    return output;
  }

  // Process a buffer of samples in-place
  process(buffer, offset = 0, count = buffer.length - offset) {
    for (let i = 0; i < count; i++) {
      buffer[offset + i] = this.processSample(buffer[offset + i]);
    }
  }

  // Process buffer and write to separate output
  processTo(input, output, offset = 0, count = input.length - offset) {
    for (let i = 0; i < count; i++) {
      output[offset + i] = this.processSample(input[offset + i]);
    }
  }
}
