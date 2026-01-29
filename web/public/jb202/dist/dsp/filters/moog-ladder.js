/**
 * MoogLadderFilter — 4-pole transistor ladder filter (24dB/oct)
 *
 * Pure JavaScript implementation based on the classic Moog VCF topology.
 * No external dependencies — this IS the algorithm.
 *
 * Reference: MusicDSP Moog ladder filter implementations
 * Character: Warm, thick, smooth self-oscillation (Sub37-style)
 */

import { clamp } from '../utils/math.js';

export class MoogLadderFilter {
  constructor(sampleRate = 44100) {
    this.sampleRate = sampleRate;

    // 4 one-pole stage states
    this.y1 = 0;
    this.y2 = 0;
    this.y3 = 0;
    this.y4 = 0;

    // Previous values for trapezoidal integration
    this.oldx = 0;
    this.oldy1 = 0;
    this.oldy2 = 0;
    this.oldy3 = 0;

    // Coefficients (computed from cutoff/resonance)
    this.p = 0;  // pole coefficient
    this.k = 0;  // derived coefficient
    this.r = 0;  // resonance feedback amount

    // Current settings
    this._cutoff = 16000;
    this._resonance = 0;  // 0-100 scale
    this._gainCompensation = 1.0;

    this._updateCoefficients();
  }

  /**
   * Reset filter state (call when starting new note)
   */
  reset() {
    this.y1 = 0;
    this.y2 = 0;
    this.y3 = 0;
    this.y4 = 0;
    this.oldx = 0;
    this.oldy1 = 0;
    this.oldy2 = 0;
    this.oldy3 = 0;
  }

  /**
   * Set cutoff frequency in Hz
   */
  setCutoff(freq) {
    this._cutoff = clamp(freq, 20, 16000);
    this._updateCoefficients();
  }

  /**
   * Set resonance (0-100 scale, like hardware knob)
   */
  setResonance(res) {
    this._resonance = clamp(res, 0, 100);
    this._updateCoefficients();
  }

  /**
   * Set both parameters at once (more efficient)
   */
  setParameters(cutoff, resonance) {
    this._cutoff = clamp(cutoff, 20, 16000);
    this._resonance = clamp(resonance, 0, 100);
    this._updateCoefficients();
  }

  /**
   * Get current cutoff
   */
  getCutoff() {
    return this._cutoff;
  }

  /**
   * Get current resonance
   */
  getResonance() {
    return this._resonance;
  }

  /**
   * Update filter coefficients from cutoff and resonance
   *
   * Based on the Stilson/Smith Moog ladder topology:
   * - fc: normalized cutoff (0-1 relative to Nyquist)
   * - p: pole coefficient derived from cutoff
   * - k: derived from p for the feedback path
   * - r: resonance amount (tuned for warm, musical response)
   */
  _updateCoefficients() {
    // Normalize cutoff to 0-1 range (relative to Nyquist)
    const fc = this._cutoff / (this.sampleRate * 0.5);
    const fcClamped = clamp(fc, 0, 0.99);

    // Compute pole coefficient using tan approximation
    // This gives better frequency tracking than linear
    const f = fcClamped * 1.16;  // Frequency warping factor
    this.p = f * (1.0 - 0.25 * f);  // Pole position

    // Derived coefficient for feedback path
    this.k = this.p * 2.0 - 1.0;

    // Resonance curve: 303-style - never self-oscillates, goes into overdrive instead
    // Real 303 is 18dB/oct with mismatched caps that prevent true oscillation
    // Gentler curve (x^0.5) with lower max (1.3) to stay below self-oscillation
    const resNorm = this._resonance / 100;
    const resCurved = Math.pow(resNorm, 0.5);  // Square root - very gentle
    this.r = resCurved * 1.8;  // Max 1.8

    // 303-style resonance compensation: bass loss increases with resonance
    // This prevents the "thin then painful" character
    this._gainCompensation = 1.0 / (1.0 + resCurved * 0.5);
  }

  /**
   * Process a single sample through the ladder filter
   *
   * Algorithm:
   * 1. Subtract resonance-scaled output from input (global feedback)
   * 2. Run through 4 cascaded one-pole lowpass stages
   * 3. Soft-clip throughout for warm, self-limiting character
   */
  processSample(input) {
    // Global feedback: subtract resonance-scaled output from input
    // This is what creates the resonance peak
    let x = input - this.r * this.y4;

    // Soft-clip the feedback signal - tames harsh peaks
    // Fast tanh approximation: x*(27+x²)/(27+9x²) for |x|<3
    x = this._softClip(x);

    // 4 cascaded one-pole stages (trapezoidal integration)
    // Each stage: y[n] = x*p + x[n-1]*p - k*y[n-1]
    // The trapezoidal form (using oldx/oldy) improves stability
    this.y1 = x * this.p + this.oldx * this.p - this.k * this.y1;
    this.y2 = this.y1 * this.p + this.oldy1 * this.p - this.k * this.y2;
    this.y3 = this.y2 * this.p + this.oldy2 * this.p - this.k * this.y3;
    this.y4 = this.y3 * this.p + this.oldy3 * this.p - this.k * this.y4;

    // Soft-clip after each stage pair for analog warmth
    this.y2 = this._softClip(this.y2);
    this.y4 = this._softClip(this.y4);

    // Store current values for next sample (trapezoidal integration)
    this.oldx = x;
    this.oldy1 = this.y1;
    this.oldy2 = this.y2;
    this.oldy3 = this.y3;

    return this.y4 * this._gainCompensation;
  }

  /**
   * Soft-clip using fast tanh approximation
   * Warm, smooth saturation that tames peaks without harshness
   */
  _softClip(x) {
    // Fast tanh: accurate to ~0.1% for |x| < 3, clamps beyond
    if (x < -3) return -1;
    if (x > 3) return 1;
    const x2 = x * x;
    return x * (27 + x2) / (27 + 9 * x2);
  }

  /**
   * Process a buffer of samples in-place
   */
  process(buffer, offset = 0, count = buffer.length - offset) {
    for (let i = 0; i < count; i++) {
      buffer[offset + i] = this.processSample(buffer[offset + i]);
    }
  }

  /**
   * Process with per-sample cutoff modulation (for envelopes)
   * cutoffMod: Float32Array of cutoff frequencies per sample
   */
  processWithMod(buffer, cutoffMod, offset = 0, count = buffer.length - offset) {
    for (let i = 0; i < count; i++) {
      // Update cutoff from modulation (only if changed significantly)
      const cutoff = clamp(cutoffMod[offset + i], 20, 16000);
      if (Math.abs(cutoff - this._cutoff) > 1) {
        this._cutoff = cutoff;
        this._updateCoefficients();
      }

      buffer[offset + i] = this.processSample(buffer[offset + i]);
    }
  }
}

/**
 * Factory function
 */
export function createMoogLadder(sampleRate = 44100) {
  return new MoogLadderFilter(sampleRate);
}
