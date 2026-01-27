/**
 * JB202 LFO (Low Frequency Oscillator)
 *
 * Deterministic LFO with multiple waveforms for modulation.
 * Uses seeded PRNG for sample-and-hold to ensure reproducible output.
 *
 * Waveforms:
 * - triangle: Smooth bipolar sweep
 * - square: Hard switching
 * - sine: Smooth sine wave
 * - sh: Sample & hold (random steps)
 * - ramp: Sawtooth up
 * - rampDown: Sawtooth down
 */

import { clamp } from '../utils/math.js';
import { Noise } from '../generators/index.js';

export class LFO {
  constructor(sampleRate = 44100) {
    this.sampleRate = sampleRate;

    // State
    this.phase = 0;
    this.frequency = 5;       // Hz
    this.waveform = 'triangle';

    // Sample & hold state
    this.shValue = 0;
    this.shPrevPhase = 0;
    this.noise = new Noise(77777);

    // Sync state
    this.synced = false;
    this.syncPhase = 0;
  }

  /**
   * Set LFO rate from normalized 0-1 value
   * Maps to 0.1-30 Hz (exponential)
   */
  setRate(normalized) {
    this.frequency = 0.1 * Math.pow(300, clamp(normalized, 0, 1));
  }

  /**
   * Set LFO rate directly in Hz
   */
  setFrequency(hz) {
    this.frequency = clamp(hz, 0.01, 100);
  }

  /**
   * Set waveform type
   * @param {string} waveform - 'triangle', 'square', 'sine', 'sh', 'ramp', 'rampDown'
   */
  setWaveform(waveform) {
    this.waveform = waveform;
  }

  /**
   * Reset LFO to initial state
   * @param {number} [seed] - Optional new seed for S&H PRNG
   */
  reset(seed) {
    this.phase = 0;
    this.shPrevPhase = 0;
    if (seed !== undefined) {
      this.noise.setSeed(seed);
    } else {
      this.noise.reset();
    }
    this.shValue = this.noise.nextSample();
  }

  /**
   * Sync LFO to a trigger (restart phase)
   */
  sync() {
    this.phase = 0;
  }

  /**
   * Generate one LFO sample
   * @returns {number} LFO value (-1 to +1)
   */
  processSample() {
    const phaseIncrement = this.frequency / this.sampleRate;

    // Advance phase
    this.phase += phaseIncrement;
    if (this.phase >= 1) {
      this.phase -= 1;
    }

    let value;

    switch (this.waveform) {
      case 'triangle':
        // Triangle: 0→0.25 = 0→1, 0.25→0.75 = 1→-1, 0.75→1 = -1→0
        if (this.phase < 0.25) {
          value = this.phase * 4;
        } else if (this.phase < 0.75) {
          value = 1 - (this.phase - 0.25) * 4;
        } else {
          value = -1 + (this.phase - 0.75) * 4;
        }
        break;

      case 'square':
        value = this.phase < 0.5 ? 1 : -1;
        break;

      case 'sine':
        value = Math.sin(this.phase * Math.PI * 2);
        break;

      case 'sh':
        // Sample & hold: update value once per cycle (at phase wrap)
        if (this.phase < this.shPrevPhase) {
          // Phase wrapped - get new random value
          this.shValue = this.noise.nextSample();
        }
        this.shPrevPhase = this.phase;
        value = this.shValue;
        break;

      case 'ramp':
        // Sawtooth up: 0 to 1 mapped to -1 to +1
        value = this.phase * 2 - 1;
        break;

      case 'rampDown':
        // Sawtooth down: 1 to 0 mapped to +1 to -1
        value = 1 - this.phase * 2;
        break;

      default:
        value = 0;
    }

    return value;
  }

  /**
   * Fill a buffer with LFO values
   * @param {Float32Array} output - Output buffer
   * @param {number} [offset=0] - Start offset
   * @param {number} [count] - Number of samples
   */
  process(output, offset = 0, count = output.length - offset) {
    for (let i = 0; i < count; i++) {
      output[offset + i] = this.processSample();
    }
  }

  /**
   * Get current LFO value without advancing
   */
  getValue() {
    // Temporarily store phase, get value, restore
    const savedPhase = this.phase;
    const savedShPrev = this.shPrevPhase;
    const value = this.processSample();
    this.phase = savedPhase;
    this.shPrevPhase = savedShPrev;
    return value;
  }
}

// Factory function
export function createLFO(sampleRate = 44100) {
  return new LFO(sampleRate);
}
