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

  // Soft clip curve (arctan-like)
  _softClip(x, k) {
    return ((Math.PI + k) * x) / (Math.PI + k * Math.abs(x));
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
