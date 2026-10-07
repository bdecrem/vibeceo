/**
 * JB202 Drive/Saturation Effect
 *
 * Soft-clipping waveshaper with multiple saturation curves.
 * Adds warmth and harmonics to the signal.
 *
 * Includes 2x oversampling option for anti-aliasing.
 */

import { clamp, fastTanh } from '../utils/math.js';
import { BiquadFilter } from '../filters/biquad.js';

// Saturation curve types
export const DriveType = {
  SOFT: 'soft',       // Gentle, musical saturation
  HARD: 'hard',       // More aggressive clipping
  TUBE: 'tube',       // Asymmetric tube-style
  FOLDBACK: 'foldback' // Wavefolding
};

export class Drive {
  constructor(sampleRate = 44100) {
    this.sampleRate = sampleRate;
    this.amount = 0;      // 0-100 scale
    this.type = DriveType.SOFT;
    this.mix = 100;       // Wet/dry mix (0-100)
    // Which soft-clip law `amount` drives (see _saturate). 1 = the original
    // curve, a gain stage first and a clipper second; 2 = pre-gain into tanh
    // with makeup, so the knob changes timbre at roughly constant loudness.
    // Jambot sessions carry the law (session.driveLaw): saved tracks keep 1,
    // new ones get 2. The standalone synth pages stay on 1.
    this.law = 1;

    // Oversampling filters (for anti-aliasing)
    this._upsampleFilter = new BiquadFilter(sampleRate * 2);
    this._downsampleFilter = new BiquadFilter(sampleRate * 2);
    this._upsampleFilter.setLowpass(sampleRate * 0.45, 0.707);
    this._downsampleFilter.setLowpass(sampleRate * 0.45, 0.707);

    this._oversample = false; // Enable for cleaner sound
  }

  // Set drive amount (0-100)
  setAmount(amount) {
    this.amount = clamp(amount, 0, 100);
  }

  // Set drive type
  setType(type) {
    this.type = type;
  }

  // Set the soft-clip law (1 legacy, 2 gain-compensated); other values → 1
  setLaw(law) {
    this.law = law === 2 ? 2 : 1;
  }

  // Set wet/dry mix
  setMix(mix) {
    this.mix = clamp(mix, 0, 100);
  }

  // Enable/disable oversampling
  setOversample(enabled) {
    this._oversample = enabled;
    if (enabled) {
      this._upsampleFilter.reset();
      this._downsampleFilter.reset();
    }
  }

  // Reset state
  reset() {
    this._upsampleFilter.reset();
    this._downsampleFilter.reset();
  }

  // Soft clip curve (arctan-like). LAW 1. Note the small-signal gain of
  // (π + k) / π: with k = amount / 2 that is ×2.6 at amount 10, ×5 at 25,
  // ×11 at 62 and ×17 at 100, into a ceiling of (π + k) / k. On a synth line
  // sitting around 0.3 that is +6 dB RMS at 10, +9 dB at 25, +11 dB at 62 —
  // the knob is mostly a volume control, which is why every patch "proven"
  // under this law carries its drive value as part of its gain staging.
  _softClip(x, k) {
    return ((Math.PI + k) * x) / (Math.PI + k * Math.abs(x));
  }

  // LAW 2 (2026-10-06): pre-gain g = 1 + 9·a² into tanh, √g makeup.
  // amount 25 → g 1.6 (warm), 50 → 3.3 (driven), 75 → 6, 100 → 10 (fuzz).
  // Measured on a 0.3 saw: RMS stays within +4 dB of clean across the whole
  // knob (legacy: +12 dB); on a 0.8 saw within −4 dB; on a plucked 303 line
  // within 5 dB (legacy: 8 dB, plus 10 dB on every accent at drive 0). Peaks never rise above
  // tanh(g·x)/√g, so a driven part cannot run away in the mix.
  _softClipV2(x) {
    const a = this.amount / 100;
    const g = 1 + 9 * a * a;
    return fastTanh(g * x) / Math.sqrt(g);
  }

  // Hard clip curve
  _hardClip(x, threshold) {
    return clamp(x, -threshold, threshold) / threshold;
  }

  // Tube-style asymmetric saturation
  _tubeClip(x, k) {
    if (x >= 0) {
      // Positive: soft saturation
      return fastTanh(x * (1 + k * 0.5));
    } else {
      // Negative: harder clip for asymmetry
      return fastTanh(x * (1 + k));
    }
  }

  // Wavefolding
  _foldback(x, threshold) {
    while (Math.abs(x) > threshold) {
      if (x > threshold) {
        x = 2 * threshold - x;
      } else if (x < -threshold) {
        x = -2 * threshold - x;
      }
    }
    return x / threshold;
  }

  // Apply saturation curve to a sample
  _saturate(x) {
    if (this.amount <= 0) return x;
    if (this.law === 2 && this.type === DriveType.SOFT) return this._softClipV2(x);

    const k = this.amount * 0.5; // Scale amount for curves

    switch (this.type) {
      case DriveType.SOFT:
        return this._softClip(x, k);

      case DriveType.HARD:
        const threshold = 1 / (1 + k * 0.1);
        return this._hardClip(x, threshold);

      case DriveType.TUBE:
        return this._tubeClip(x, k * 0.02);

      case DriveType.FOLDBACK:
        const foldThreshold = 1 / (1 + k * 0.05);
        return this._foldback(x, foldThreshold);

      default:
        return this._softClip(x, k);
    }
  }

  // Process a single sample
  processSample(input) {
    if (this.amount <= 0.01) return input;

    const wet = this._saturate(input);
    const mixAmount = this.mix / 100;

    return input * (1 - mixAmount) + wet * mixAmount;
  }

  // Process a single sample with 2x oversampling
  processSampleOversampled(input) {
    if (this.amount <= 0.01) return input;

    // Upsample: insert zero between samples, then filter
    const up1 = this._upsampleFilter.processSample(input * 2);
    const up2 = this._upsampleFilter.processSample(0);

    // Process at 2x rate
    const sat1 = this._saturate(up1);
    const sat2 = this._saturate(up2);

    // Downsample: filter then decimate
    this._downsampleFilter.processSample(sat1);
    const output = this._downsampleFilter.processSample(sat2);

    const mixAmount = this.mix / 100;
    return input * (1 - mixAmount) + output * mixAmount;
  }

  // Process a buffer in-place
  process(buffer, offset = 0, count = buffer.length - offset) {
    if (this.amount <= 0.01) return;

    if (this._oversample) {
      for (let i = 0; i < count; i++) {
        buffer[offset + i] = this.processSampleOversampled(buffer[offset + i]);
      }
    } else {
      for (let i = 0; i < count; i++) {
        buffer[offset + i] = this.processSample(buffer[offset + i]);
      }
    }
  }
}

// Factory function
export function createDrive(sampleRate = 44100) {
  return new Drive(sampleRate);
}
