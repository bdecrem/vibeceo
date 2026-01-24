/**
 * JB202 ADSR Envelope Generator
 *
 * Classic Attack-Decay-Sustain-Release envelope with:
 * - Linear attack
 * - Exponential decay and release
 * - Configurable curves
 *
 * Generates sample-accurate envelope values for modulation.
 */

import { clamp, quadraticCurve } from '../utils/math.js';

// Envelope stages
export const Stage = {
  IDLE: 0,
  ATTACK: 1,
  DECAY: 2,
  SUSTAIN: 3,
  RELEASE: 4
};

export class ADSREnvelope {
  constructor(sampleRate = 44100) {
    this.sampleRate = sampleRate;

    // ADSR parameters (in seconds)
    this.attack = 0.002;   // 2ms minimum
    this.decay = 0.1;
    this.sustain = 0.5;    // 0-1 level
    this.release = 0.1;

    // State
    this.stage = Stage.IDLE;
    this.value = 0;
    this.targetValue = 0;
    this.releaseStart = 0; // Value when release began

    // Per-sample increments (calculated from times)
    this._attackRate = 0;
    this._decayRate = 0;
    this._releaseRate = 0;

    this._updateRates();
  }

  // Set attack time (0-100 knob value -> 2ms to 2s)
  setAttack(value) {
    this.attack = this._knobToTime(value);
    this._updateRates();
  }

  // Set decay time
  setDecay(value) {
    this.decay = this._knobToTime(value);
    this._updateRates();
  }

  // Set sustain level (0-100 -> 0-1)
  setSustain(value) {
    this.sustain = clamp(value / 100, 0, 1);
  }

  // Set release time
  setRelease(value) {
    this.release = this._knobToTime(value);
    this._updateRates();
  }

  // Set all parameters at once
  setParameters(attack, decay, sustain, release) {
    this.attack = this._knobToTime(attack);
    this.decay = this._knobToTime(decay);
    this.sustain = clamp(sustain / 100, 0, 1);
    this.release = this._knobToTime(release);
    this._updateRates();
  }

  // Convert 0-100 knob to time in seconds (quadratic curve)
  // 0 = 2ms, 100 = 2 seconds
  _knobToTime(value) {
    const normalized = clamp(value / 100, 0, 1);
    return 0.002 + normalized * normalized * 1.998;
  }

  // Update per-sample rates
  _updateRates() {
    // Attack: linear ramp from 0 to 1
    const attackSamples = Math.max(1, this.attack * this.sampleRate);
    this._attackRate = 1 / attackSamples;

    // Decay: exponential from 1 to sustain
    // Use time constant approach for natural decay
    const decaySamples = Math.max(1, this.decay * this.sampleRate);
    this._decayRate = 1 - Math.exp(-4.6 / decaySamples); // -60dB in decay time

    // Release: exponential from current to 0
    const releaseSamples = Math.max(1, this.release * this.sampleRate);
    this._releaseRate = 1 - Math.exp(-4.6 / releaseSamples);
  }

  // Trigger envelope (gate on)
  trigger(velocity = 1) {
    this.stage = Stage.ATTACK;
    this.targetValue = velocity;
    // Don't reset value - allows retriggering mid-envelope
  }

  // Release envelope (gate off)
  gateOff() {
    if (this.stage !== Stage.IDLE) {
      this.stage = Stage.RELEASE;
      this.releaseStart = this.value;
    }
  }

  // Force reset to idle
  reset() {
    this.stage = Stage.IDLE;
    this.value = 0;
    this.releaseStart = 0;
  }

  // Process a single sample, return envelope value
  processSample() {
    switch (this.stage) {
      case Stage.ATTACK:
        this.value += this._attackRate * this.targetValue;
        if (this.value >= this.targetValue) {
          this.value = this.targetValue;
          this.stage = Stage.DECAY;
        }
        break;

      case Stage.DECAY:
        const decayTarget = this.sustain * this.targetValue;
        this.value += (decayTarget - this.value) * this._decayRate;
        // Check if we're close enough to sustain level
        if (Math.abs(this.value - decayTarget) < 0.0001) {
          this.value = decayTarget;
          this.stage = Stage.SUSTAIN;
        }
        break;

      case Stage.SUSTAIN:
        // Hold at sustain level until gate off
        this.value = this.sustain * this.targetValue;
        break;

      case Stage.RELEASE:
        this.value += (0 - this.value) * this._releaseRate;
        if (this.value < 0.0001) {
          this.value = 0;
          this.stage = Stage.IDLE;
        }
        break;

      case Stage.IDLE:
      default:
        this.value = 0;
        break;
    }

    return this.value;
  }

  // Generate envelope for a complete note
  // duration: gate time in seconds
  // Returns Float32Array with envelope values
  generate(duration, releaseDuration = null) {
    const gateSamples = Math.ceil(duration * this.sampleRate);
    const releaseTime = releaseDuration !== null ? releaseDuration : this.release;
    const releaseSamples = Math.ceil(releaseTime * this.sampleRate * 1.5); // Extra for tail
    const totalSamples = gateSamples + releaseSamples;

    const output = new Float32Array(totalSamples);

    this.reset();
    this.trigger(1);

    // Gate on phase
    for (let i = 0; i < gateSamples; i++) {
      output[i] = this.processSample();
    }

    // Gate off / release phase
    this.gateOff();
    for (let i = gateSamples; i < totalSamples; i++) {
      output[i] = this.processSample();
    }

    return output;
  }

  // Process a buffer of samples
  process(output, offset = 0, count = output.length - offset) {
    for (let i = 0; i < count; i++) {
      output[offset + i] = this.processSample();
    }
  }

  // Check if envelope is active
  isActive() {
    return this.stage !== Stage.IDLE;
  }

  // Get current stage
  getStage() {
    return this.stage;
  }

  // Get current value
  getValue() {
    return this.value;
  }
}

// Factory function
export function createADSR(sampleRate = 44100) {
  return new ADSREnvelope(sampleRate);
}
