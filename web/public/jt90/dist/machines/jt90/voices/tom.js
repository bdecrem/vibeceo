/**
 * JT90 Tom Voice
 *
 * 909-style tom with:
 * - Sine-like oscillator with pitch envelope
 * - Three tunings: low, mid, high
 */

import { clamp, fastTanh } from '../../../../../jb202/dist/dsp/utils/math.js';

function triangleToSine(phase) {
  const tri = phase < 0.5 ? (phase * 4 - 1) : (3 - phase * 4);
  return fastTanh(tri * 1.2) / fastTanh(1.2);
}

// Base frequencies for low, mid, high toms
const TOM_FREQUENCIES = {
  low: 80,
  mid: 120,
  high: 160
};

export class TomVoice {
  constructor(sampleRate = 44100, type = 'low') {
    this.sampleRate = sampleRate;
    this.type = type;  // 'low', 'mid', 'high'

    // Parameters
    this.tune = 0;
    this.decay = 0.5;
    this.level = 1.0;

    // Oscillator
    this.phase = 0;
    this.frequency = TOM_FREQUENCIES[type] || 100;
    this.targetFrequency = this.frequency;

    // Envelope
    this.envelope = 0;
    this.pitchEnvelope = 0;

    // State
    this.active = false;
    this.sampleCount = 0;
  }

  trigger(velocity = 1.0) {
    this.phase = 0;
    this.sampleCount = 0;
    this.active = true;

    this.envelope = velocity * this.level;
    this.pitchEnvelope = 1.0;

    // Set frequencies based on tune
    const tuneMultiplier = Math.pow(2, this.tune / 1200);
    const baseFreq = TOM_FREQUENCIES[this.type] || 100;
    this.targetFrequency = baseFreq * tuneMultiplier;
    this.frequency = this.targetFrequency * 1.5;  // Start slightly higher
  }

  processSample() {
    if (!this.active) return 0;

    this.sampleCount++;

    // Pitch envelope (fast decay to target)
    const pitchDecay = 1 - Math.exp(-4.6 / (0.05 * this.sampleRate));
    this.frequency = this.targetFrequency + (this.frequency - this.targetFrequency) * (1 - pitchDecay);

    // Oscillator
    this.phase += this.frequency / this.sampleRate;
    if (this.phase >= 1) this.phase -= 1;

    let sample = triangleToSine(this.phase);

    // Amplitude envelope
    const decayTime = 0.15 + this.decay * 0.55;  // 150-700ms
    const ampDecay = 1 - Math.exp(-4.6 / (decayTime * this.sampleRate));
    this.envelope *= (1 - ampDecay);

    sample *= this.envelope;

    // Soft saturation
    sample = fastTanh(sample * 1.3) / fastTanh(1.3);

    // Deactivate
    if (this.envelope < 0.0001) {
      this.active = false;
    }

    return sample;
  }

  setParameter(id, value) {
    switch (id) {
      case 'tune':
        this.tune = clamp(value, -1200, 1200);
        break;
      case 'decay':
        this.decay = clamp(value, 0, 1);
        break;
      case 'level':
        this.level = clamp(value, 0, 1);
        break;
    }
  }

  isActive() {
    return this.active;
  }
}

export default TomVoice;
