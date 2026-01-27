/**
 * JP9000 LFO Module
 *
 * Wraps JB202 LFO as a modular module with CV output.
 * Can modulate filter cutoff, oscillator pitch, VCA level, etc.
 */

import { Module } from '../module.js';
import { LFO } from '../../../jb202/dist/dsp/modulators/index.js';

export class LFOModule extends Module {
  constructor(id, sampleRate = 44100) {
    super(id, sampleRate);
    this.type = 'lfo';

    this.lfo = new LFO(sampleRate);

    // Inputs
    this.defineInput('sync', 'cv');     // Sync/reset trigger
    this.defineInput('rateCV', 'cv');   // Rate modulation

    // Outputs
    this.defineOutput('cv', 'cv');      // Main LFO output (-1 to +1)
    this.defineOutput('uni', 'cv');     // Unipolar output (0 to +1)

    // Parameters
    this.defineParam('rate', { default: 5, min: 0.1, max: 30, unit: 'Hz' });
    this.defineParam('waveform', { default: 0, min: 0, max: 5, unit: 'choice' });
    this.defineParam('depth', { default: 100, min: 0, max: 100, unit: '%' });

    // Waveform lookup
    this._waveforms = ['triangle', 'square', 'sine', 'sh', 'ramp', 'rampDown'];

    // Apply defaults
    this.lfo.setFrequency(this.params.rate.value);
    this.lfo.setWaveform(this._waveforms[0]);
  }

  _onParamChange(name, value) {
    switch (name) {
      case 'rate':
        this.lfo.setFrequency(value);
        break;
      case 'waveform':
        const waveformIndex = Math.floor(value) % this._waveforms.length;
        this.lfo.setWaveform(this._waveforms[waveformIndex]);
        break;
    }
  }

  reset() {
    this.lfo.reset();
  }

  trigger(velocity = 1) {
    // Optionally sync on trigger
    this.lfo.sync();
  }

  process(bufferSize) {
    const syncIn = this.inputs.sync.buffer;
    const rateCV = this.inputs.rateCV.buffer;

    const cvOut = new Float32Array(bufferSize);
    const uniOut = new Float32Array(bufferSize);

    const baseRate = this.params.rate.value;
    const depth = this.params.depth.value / 100;

    let prevSync = 0;

    for (let i = 0; i < bufferSize; i++) {
      // Handle sync input (trigger on rising edge)
      if (syncIn) {
        const syncVal = syncIn[i];
        if (syncVal > 0.5 && prevSync <= 0.5) {
          this.lfo.sync();
        }
        prevSync = syncVal;
      }

      // Handle rate modulation
      if (rateCV) {
        const rateMod = rateCV[i] * 10;  // ±10 Hz modulation range
        this.lfo.setFrequency(Math.max(0.01, baseRate + rateMod));
      }

      // Generate LFO sample
      const sample = this.lfo.processSample();

      // Apply depth and output
      cvOut[i] = sample * depth;
      uniOut[i] = (sample * depth + 1) * 0.5;  // Convert to 0-1 range
    }

    this.outputs.cv.buffer = cvOut;
    this.outputs.uni.buffer = uniOut;
  }

  /**
   * Get waveform name by index
   */
  getWaveformName(index) {
    return this._waveforms[index] || 'triangle';
  }

  /**
   * Get all waveform names
   */
  getWaveforms() {
    return [...this._waveforms];
  }
}

// Factory function
export function createLFO(id, sampleRate = 44100) {
  return new LFOModule(id, sampleRate);
}
