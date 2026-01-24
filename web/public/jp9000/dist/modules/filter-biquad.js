/**
 * JP9000 Biquad Filter Module
 *
 * Wraps JB202 BiquadFilter as a modular module.
 * Configurable as lowpass, highpass, or bandpass.
 */

import { Module } from '../module.js';
import { BiquadFilter } from '../../../jb202/dist/dsp/filters/index.js';

export class FilterBiquadModule extends Module {
  constructor(id, sampleRate = 44100) {
    super(id, sampleRate);
    this.type = 'filter-biquad';

    this.filter = new BiquadFilter(sampleRate);

    // Inputs
    this.defineInput('audio', 'audio');
    this.defineInput('cutoffCV', 'cv');

    // Outputs
    this.defineOutput('audio', 'audio');

    // Parameters
    this.defineParam('type', { default: 0, min: 0, max: 2, unit: '' }); // 0=LP, 1=HP, 2=BP
    this.defineParam('cutoff', { default: 2000, min: 20, max: 16000, unit: 'Hz' });
    this.defineParam('q', { default: 0.707, min: 0.1, max: 30, unit: '' });

    this._updateFilter();
  }

  _onParamChange(name, value) {
    this._updateFilter();
  }

  _updateFilter() {
    const cutoff = this.params.cutoff.value;
    const q = this.params.q.value;
    const type = Math.round(this.params.type.value);

    switch (type) {
      case 0:
        this.filter.setLowpass(cutoff, q);
        break;
      case 1:
        this.filter.setHighpass(cutoff, q);
        break;
      case 2:
        this.filter.setBandpass(cutoff, q);
        break;
    }
  }

  reset() {
    this.filter.reset();
  }

  process(bufferSize) {
    const audioIn = this.inputs.audio.buffer;
    const cutoffCV = this.inputs.cutoffCV.buffer;
    const output = new Float32Array(bufferSize);

    if (!audioIn) {
      this.outputs.audio.buffer = output;
      return;
    }

    const baseCutoff = this.params.cutoff.value;
    const q = this.params.q.value;
    const type = Math.round(this.params.type.value);

    for (let i = 0; i < bufferSize; i++) {
      // Apply cutoff CV if present
      if (cutoffCV) {
        const modCutoff = Math.max(20, Math.min(16000, baseCutoff + cutoffCV[i] * 4000));
        switch (type) {
          case 0: this.filter.setLowpass(modCutoff, q); break;
          case 1: this.filter.setHighpass(modCutoff, q); break;
          case 2: this.filter.setBandpass(modCutoff, q); break;
        }
      }
      output[i] = this.filter.processSample(audioIn[i]);
    }

    this.outputs.audio.buffer = output;
  }
}
