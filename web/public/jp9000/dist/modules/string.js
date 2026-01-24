/**
 * JP9000 String Module (Karplus-Strong)
 *
 * Physical modeling string synthesis.
 * Creates plucked string, bell, and marimba sounds.
 *
 * The killer module of the JP9000.
 */

import { Module } from '../module.js';
import { noteToFreq } from '../../../jb202/dist/dsp/utils/note.js';

export class StringModule extends Module {
  constructor(id, sampleRate = 44100) {
    super(id, sampleRate);
    this.type = 'string';

    // Karplus-Strong state
    this.delayLine = null;
    this.delayLength = 0;
    this.writeIndex = 0;
    this.prevSample = 0;

    // Inputs
    this.defineInput('pitch', 'cv');  // Pitch CV

    // Outputs
    this.defineOutput('audio', 'audio');

    // Parameters
    this.defineParam('frequency', { default: 110, min: 20, max: 2000, unit: 'Hz' });
    this.defineParam('decay', { default: 70, min: 0, max: 100, unit: '' });
    this.defineParam('brightness', { default: 50, min: 0, max: 100, unit: '' });
    this.defineParam('pluckPosition', { default: 50, min: 0, max: 100, unit: '%' });

    this._initDelayLine();
  }

  _initDelayLine() {
    const freq = Math.max(20, this.params.frequency.value);
    this.delayLength = Math.round(this.sampleRate / freq);
    this.delayLine = new Float32Array(this.delayLength);
    this.writeIndex = 0;
    this.prevSample = 0;
  }

  _onParamChange(name, value) {
    if (name === 'frequency') {
      this._initDelayLine();
    }
  }

  reset() {
    if (this.delayLine) {
      this.delayLine.fill(0);
    }
    this.prevSample = 0;
    this.writeIndex = 0;
  }

  /**
   * Trigger a pluck
   * @param {number} velocity - Pluck strength 0-1
   */
  trigger(velocity = 1) {
    // Reinitialize delay line at current frequency
    this._initDelayLine();

    // Fill with filtered noise burst (the excitation)
    // Use deterministic seeded random for reproducibility
    let seed = 12345;
    const brightness = this.params.brightness.value / 100;
    const pluckPos = this.params.pluckPosition.value / 100;

    // Create noise burst
    for (let i = 0; i < this.delayLength; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      this.delayLine[i] = ((seed / 0x7fffffff) * 2 - 1) * velocity;
    }

    // Apply pluck position filter (comb filter notch)
    // Simulates where on the string you pluck
    if (pluckPos > 0.01 && pluckPos < 0.99) {
      const combDelay = Math.round(this.delayLength * pluckPos);
      for (let i = combDelay; i < this.delayLength; i++) {
        this.delayLine[i] -= this.delayLine[i - combDelay] * 0.5;
      }
    }

    // Apply initial brightness filter (simple lowpass)
    if (brightness < 0.99) {
      let prev = 0;
      const coeff = brightness;
      for (let i = 0; i < this.delayLength; i++) {
        this.delayLine[i] = prev * (1 - coeff) + this.delayLine[i] * coeff;
        prev = this.delayLine[i];
      }
    }

    this.writeIndex = 0;
    this.prevSample = 0;
  }

  /**
   * Set frequency by note name
   * @param {string} noteName - e.g., 'E2', 'A3'
   */
  setNote(noteName) {
    const freq = noteToFreq(noteName);
    this.setParam('frequency', freq);
  }

  isActive() {
    if (!this.delayLine) return false;

    // Check if still ringing
    let energy = 0;
    for (let i = 0; i < this.delayLength; i++) {
      energy += Math.abs(this.delayLine[i]);
    }
    return energy > 0.0001;
  }

  process(bufferSize) {
    const output = new Float32Array(bufferSize);

    if (!this.delayLine || this.delayLength === 0) {
      this.outputs.audio.buffer = output;
      return;
    }

    // Karplus-Strong parameters
    const decay = this.params.decay.value;
    const brightness = this.params.brightness.value;

    // Feedback coefficient (controls decay time)
    // 0 = very short, 100 = nearly infinite
    const feedback = 0.9 + (decay / 100) * 0.099;

    // Damping coefficient (controls brightness decay)
    // Higher damping = faster high frequency loss
    const damping = 1 - (brightness / 100);

    for (let i = 0; i < bufferSize; i++) {
      // Read current sample from delay line
      const sample = this.delayLine[this.writeIndex];

      // Simple lowpass filter (average with previous)
      const filtered = sample * (1 - damping) + this.prevSample * damping;
      this.prevSample = filtered;

      // Write filtered sample back with feedback
      this.delayLine[this.writeIndex] = filtered * feedback;

      // Advance write position (circular buffer)
      this.writeIndex = (this.writeIndex + 1) % this.delayLength;

      // Output the sample
      output[i] = sample;
    }

    this.outputs.audio.buffer = output;
  }
}

/**
 * Convenience function to create and pluck a string
 * @param {number} sampleRate
 * @param {string} noteName - e.g., 'E2'
 * @param {Object} opts - { decay, brightness, pluckPosition }
 * @returns {StringModule}
 */
export function createString(sampleRate, noteName, opts = {}) {
  const module = new StringModule('string', sampleRate);

  if (noteName) {
    module.setNote(noteName);
  }

  if (opts.decay !== undefined) module.setParam('decay', opts.decay);
  if (opts.brightness !== undefined) module.setParam('brightness', opts.brightness);
  if (opts.pluckPosition !== undefined) module.setParam('pluckPosition', opts.pluckPosition);

  return module;
}
