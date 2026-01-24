/**
 * JB202 24dB/octave Lowpass Filter
 *
 * Two cascaded 12dB biquad stages for steep rolloff.
 * Classic synth-style 4-pole lowpass character.
 *
 * Q is split between stages to avoid excessive resonance buildup.
 */

import { BiquadFilter } from './biquad.js';
import { clamp, expCurve } from '../utils/math.js';

export class Lowpass24Filter {
  constructor(sampleRate = 44100) {
    this.sampleRate = sampleRate;

    // Two cascaded biquad stages
    this.stage1 = new BiquadFilter(sampleRate);
    this.stage2 = new BiquadFilter(sampleRate);

    // Current settings
    this._cutoff = 16000;
    this._resonance = 0; // 0-100 scale

    this._updateCoefficients();
  }

  // Reset filter state
  reset() {
    this.stage1.reset();
    this.stage2.reset();
  }

  // Set cutoff frequency in Hz
  setCutoff(freq) {
    this._cutoff = clamp(freq, 20, 16000);
    this._updateCoefficients();
  }

  // Set resonance (0-100 scale, like hardware knob)
  setResonance(res) {
    this._resonance = clamp(res, 0, 100);
    this._updateCoefficients();
  }

  // Set both at once (more efficient)
  setParameters(cutoff, resonance) {
    this._cutoff = clamp(cutoff, 20, 16000);
    this._resonance = clamp(resonance, 0, 100);
    this._updateCoefficients();
  }

  // Get current cutoff
  getCutoff() {
    return this._cutoff;
  }

  // Get current resonance
  getResonance() {
    return this._resonance;
  }

  // Update biquad coefficients
  _updateCoefficients() {
    // Convert 0-100 resonance to Q value
    // 0 = gentle (Q 0.5), 100 = screaming (Q 20)
    const q = 0.5 + (this._resonance / 100) * 19.5;

    // Split Q between stages to avoid excessive peaking
    // Stage 1 gets more resonance for character
    const q1 = q * 0.7;
    const q2 = q * 0.5;

    this.stage1.setLowpass(this._cutoff, q1);
    this.stage2.setLowpass(this._cutoff, q2);
  }

  // Process a single sample
  processSample(input) {
    return this.stage2.processSample(this.stage1.processSample(input));
  }

  // Process a buffer in-place
  process(buffer, offset = 0, count = buffer.length - offset) {
    this.stage1.process(buffer, offset, count);
    this.stage2.process(buffer, offset, count);
  }

  // Process with per-sample cutoff modulation (for envelopes)
  // cutoffMod: Float32Array of cutoff frequencies per sample
  processWithMod(buffer, cutoffMod, offset = 0, count = buffer.length - offset) {
    for (let i = 0; i < count; i++) {
      // Update cutoff from modulation
      const cutoff = clamp(cutoffMod[offset + i], 20, 16000);
      if (Math.abs(cutoff - this._cutoff) > 1) {
        this._cutoff = cutoff;
        this._updateCoefficients();
      }

      buffer[offset + i] = this.processSample(buffer[offset + i]);
    }
  }
}

// Factory function
export function createLowpass24(sampleRate = 44100) {
  return new Lowpass24Filter(sampleRate);
}

// Utility: convert 0-1 normalized value to Hz (log scale)
// Matches JB200's filter scaling
export function normalizedToHz(value) {
  return 20 * Math.pow(800, value);
}

// Utility: convert Hz to 0-1 normalized
export function hzToNormalized(hz) {
  return Math.log(hz / 20) / Math.log(800);
}
