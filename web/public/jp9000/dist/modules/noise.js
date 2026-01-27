/**
 * JP9000 Noise Module
 *
 * Wraps JB202 Noise generator as a modular sound source.
 * Outputs white noise with optional filtering.
 */

import { Module } from '../module.js';
import { Noise } from '../../../jb202/dist/dsp/generators/index.js';
import { clamp } from '../../../jb202/dist/dsp/utils/math.js';

export class NoiseModule extends Module {
  constructor(id, sampleRate = 44100) {
    super(id, sampleRate);
    this.type = 'noise';

    this.noise = new Noise(12345);

    // No audio inputs - noise is a source

    // Outputs
    this.defineOutput('audio', 'audio');   // Raw white noise
    this.defineOutput('filtered', 'audio'); // Filtered noise

    // Parameters
    this.defineParam('level', { default: 100, min: 0, max: 100, unit: '%' });
    this.defineParam('color', { default: 50, min: 0, max: 100, unit: '%' });  // 0=dark/filtered, 100=bright/white
    this.defineParam('seed', { default: 12345, min: 0, max: 99999, unit: '' });

    // Filter state for colored noise
    this._filterState = 0;
  }

  _onParamChange(name, value) {
    if (name === 'seed') {
      this.noise.setSeed(Math.floor(value));
    }
  }

  reset() {
    this.noise.reset();
    this._filterState = 0;
  }

  trigger(velocity = 1) {
    // Optionally reseed on trigger for variation
    // this.noise.reset();
  }

  process(bufferSize) {
    const audioOut = new Float32Array(bufferSize);
    const filteredOut = new Float32Array(bufferSize);

    const level = this.params.level.value / 100;
    const color = this.params.color.value / 100;

    // Color controls filter cutoff: 0 = very dark, 1 = white
    const filterCoeff = 0.05 + color * 0.95;  // 0.05 to 1.0

    for (let i = 0; i < bufferSize; i++) {
      const sample = this.noise.nextSample();

      // Raw white noise output
      audioOut[i] = sample * level;

      // Filtered (colored) noise - single-pole lowpass
      this._filterState += filterCoeff * (sample - this._filterState);
      filteredOut[i] = this._filterState * level;
    }

    this.outputs.audio.buffer = audioOut;
    this.outputs.filtered.buffer = filteredOut;
  }

  isActive() {
    return true;  // Noise is always "active" when connected
  }
}

// Factory function
export function createNoise(id, sampleRate = 44100) {
  return new NoiseModule(id, sampleRate);
}
