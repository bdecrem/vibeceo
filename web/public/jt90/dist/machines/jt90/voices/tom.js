/**
 * JT90 Tom Voice
 *
 * 909-style tom:
 * - Sine/triangle hybrid oscillator (grit from triangle harmonics)
 * - Fast pitch envelope drop in ~15ms (the "thwack")
 * - HP-filtered noise click at attack for definition
 * - Soft clipping for harder 909 character
 * - Three tunings: low (80Hz), mid (120Hz), high (160Hz)
 */

import { clamp, fastTanh } from '../../../../../jb202/dist/dsp/utils/math.js';
import { Noise } from '../../../../../jb202/dist/dsp/generators/index.js';

// Base frequencies for low, mid, high toms
const TOM_FREQUENCIES = {
  low: 80,
  mid: 120,
  high: 160
};

export class TomVoice {
  constructor(sampleRate = 44100, type = 'low') {
    this.sampleRate = sampleRate;
    this.type = type;

    // Parameters
    this.tune = 0;
    this.decay = 0.5;
    this.level = 1.0;

    // Oscillator
    this.phase = 0;
    this.frequency = TOM_FREQUENCIES[type] || 100;
    this.targetFrequency = this.frequency;

    // Envelopes
    this.envelope = 0;

    // Noise for click transient
    this.noise = new Noise(54321 + (type === 'low' ? 0 : type === 'mid' ? 111 : 222));
    this.clickEnvelope = 0;
    this.noiseHP = 0;  // Highpass state

    // State
    this.active = false;
    this.sampleCount = 0;
  }

  trigger(velocity = 1.0) {
    this.phase = 0;
    this.sampleCount = 0;
    this.active = true;

    this.envelope = velocity * this.level;
    this.clickEnvelope = velocity * this.level;

    // Set frequencies based on tune
    const tuneMultiplier = Math.pow(2, this.tune / 1200);
    const baseFreq = TOM_FREQUENCIES[this.type] || 100;
    this.targetFrequency = baseFreq * tuneMultiplier;
    // Start at 2.5x target — fast drop gives the "knock"
    this.frequency = this.targetFrequency * 2.5;

    // Reset noise
    this.noise.reset();
    this.noiseHP = 0;
  }

  processSample() {
    if (!this.active) return 0;

    this.sampleCount++;

    // --- Pitch envelope: fast drop in ~15ms ---
    const pitchDecayTime = 0.015;
    const pitchDecay = 1 - Math.exp(-4.6 / (pitchDecayTime * this.sampleRate));
    this.frequency += (this.targetFrequency - this.frequency) * pitchDecay;

    // --- Oscillator: sine/triangle hybrid ---
    this.phase += this.frequency / this.sampleRate;
    if (this.phase >= 1) this.phase -= 1;

    // Triangle wave
    const tri = this.phase < 0.5
      ? this.phase * 4 - 1
      : 3 - this.phase * 4;
    // Sine approximation (shaped triangle)
    const sine = fastTanh(tri * 1.2) / fastTanh(1.2);
    // Mix: mostly sine, ~20% raw triangle for harmonic grit
    let sample = sine * 0.8 + tri * 0.2;

    // --- Amplitude envelope ---
    const decayTime = 0.15 + this.decay * 0.55;  // 150-700ms
    const ampDecay = 1 - Math.exp(-4.6 / (decayTime * this.sampleRate));
    this.envelope *= (1 - ampDecay);

    sample *= this.envelope;

    // --- Noise click transient (HP filtered) ---
    const clickDecayTime = 0.008;  // 8ms burst
    const clickDecay = 1 - Math.exp(-4.6 / (clickDecayTime * this.sampleRate));
    this.clickEnvelope *= (1 - clickDecay);

    let noiseSample = this.noise.nextSample();

    // Highpass at ~500Hz to keep click out of the low-end body
    const hpCut = 500 / this.sampleRate;
    this.noiseHP += hpCut * (noiseSample - this.noiseHP);
    noiseSample = noiseSample - this.noiseHP;

    sample += noiseSample * this.clickEnvelope * 0.35;

    // --- Saturation (harder 909 character) ---
    sample = fastTanh(sample * 2.0) / fastTanh(2.0);

    // Deactivate
    if (this.envelope < 0.0001 && this.clickEnvelope < 0.0001) {
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
