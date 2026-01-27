/**
 * JT90 Kick Voice
 *
 * 909-style kick drum with:
 * - Triangle oscillator shaped to sine-like via soft saturation
 * - Pitch envelope (sweep from high to base frequency)
 * - Amplitude envelope
 * - Click transient
 *
 * All processing is pure JS - identical output on web and Node.js.
 */

import { clamp, fastTanh } from '../../../../../jb202/dist/dsp/utils/math.js';
import { Noise } from '../../../../../jb202/dist/dsp/generators/index.js';

/**
 * Simple sine approximation using triangle + saturation
 * More efficient than Math.sin() for real-time
 */
function triangleToSine(phase) {
  // Triangle wave: -1 to 1 over phase 0 to 1
  const tri = phase < 0.5 ? (phase * 4 - 1) : (3 - phase * 4);
  // Soft clip to approximate sine
  return fastTanh(tri * 1.2) / fastTanh(1.2);
}

export class KickVoice {
  constructor(sampleRate = 44100) {
    this.sampleRate = sampleRate;

    // Parameters (0-1 scale unless noted)
    this.tune = 0;        // Cents offset (-1200 to +1200)
    this.decay = 0.5;     // Decay time (0-1)
    this.attack = 0.5;    // Click/attack amount (0-1)
    this.sweep = 0.5;     // Pitch envelope depth (0-1)
    this.level = 1.0;     // Output level (0-1)

    // State
    this.phase = 0;
    this.frequency = 55;
    this.targetFrequency = 55;
    this.envelope = 0;
    this.pitchEnvelope = 0;
    this.active = false;
    this.sampleCount = 0;

    // Click state
    this.clickPhase = 0;
    this.clickEnvelope = 0;

    // Noise for click
    this.noise = new Noise(54321);
    this.noiseFilter = 0;
  }

  /**
   * Trigger the kick drum
   */
  trigger(velocity = 1.0) {
    this.phase = 0;
    this.clickPhase = 0;
    this.sampleCount = 0;
    this.active = true;

    // Reset envelopes to peak
    this.envelope = velocity * this.level;
    this.clickEnvelope = velocity * this.level * this.attack;
    this.pitchEnvelope = 1.0;

    // Calculate frequencies
    const tuneMultiplier = Math.pow(2, this.tune / 1200);
    this.targetFrequency = 55 * tuneMultiplier;  // Base at A1 (55Hz)
    this.frequency = this.targetFrequency * (1 + this.sweep * 2);  // Start higher

    // Reset noise
    this.noise.reset();
    this.noiseFilter = 0;
  }

  /**
   * Generate one audio sample
   */
  processSample() {
    if (!this.active) return 0;

    this.sampleCount++;

    // Pitch envelope (exponential decay)
    const sweepTime = 0.03 + (1 - this.attack) * 0.07;  // 30-100ms
    const pitchDecay = 1 - Math.exp(-4.6 / (sweepTime * this.sampleRate));
    this.pitchEnvelope *= (1 - pitchDecay);
    this.frequency = this.targetFrequency + (this.frequency - this.targetFrequency) * (1 - pitchDecay);

    // Main body: triangle-to-sine oscillator
    const phaseIncrement = this.frequency / this.sampleRate;
    this.phase += phaseIncrement;
    if (this.phase >= 1) this.phase -= 1;

    let sample = triangleToSine(this.phase);

    // Amplitude envelope (exponential decay)
    const decayTime = 0.15 + this.decay * 0.85;  // 150ms - 1s
    const ampDecay = 1 - Math.exp(-4.6 / (decayTime * this.sampleRate));
    this.envelope *= (1 - ampDecay);

    sample *= this.envelope;

    // Click transient (short impulse + filtered noise)
    if (this.attack > 0.1 && this.sampleCount < this.sampleRate * 0.01) {
      // Short pulse
      const clickTime = this.sampleCount / this.sampleRate;
      const clickDecay = Math.exp(-clickTime * 500);
      let click = (this.sampleCount < 8 ? 1 : 0) * clickDecay;

      // Add filtered noise burst
      const noiseSample = this.noise.nextSample();
      this.noiseFilter += 0.3 * (noiseSample - this.noiseFilter);
      click += this.noiseFilter * Math.exp(-clickTime * 300) * 0.5;

      sample += click * this.clickEnvelope;
    }

    // Soft saturation for warmth
    sample = fastTanh(sample * 1.5) / fastTanh(1.5);

    // Deactivate when envelope is very low
    if (this.envelope < 0.0001 && this.sampleCount > this.sampleRate * 0.1) {
      this.active = false;
    }

    return sample;
  }

  /**
   * Set parameter
   */
  setParameter(id, value) {
    switch (id) {
      case 'tune':
        this.tune = clamp(value, -1200, 1200);
        break;
      case 'decay':
        this.decay = clamp(value, 0, 1);
        break;
      case 'attack':
        this.attack = clamp(value, 0, 1);
        break;
      case 'sweep':
        this.sweep = clamp(value, 0, 1);
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

export default KickVoice;
