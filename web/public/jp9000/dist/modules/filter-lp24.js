/**
 * JP9000 24dB Lowpass Filter Module
 *
 * Wraps JB202 Lowpass24Filter as a modular module.
 * Classic 4-pole resonant lowpass.
 */

import { Module } from '../module.js';
import { Lowpass24Filter } from '../../../jb202/dist/dsp/filters/index.js';

export class FilterLP24Module extends Module {
  constructor(id, sampleRate = 44100) {
    super(id, sampleRate);
    this.type = 'filter-lp24';

    this.filter = new Lowpass24Filter(sampleRate);

    // Inputs
    this.defineInput('audio', 'audio');
    this.defineInput('cutoffCV', 'cv');  // Cutoff modulation (Hz offset)

    // Outputs
    this.defineOutput('audio', 'audio');

    // Parameters
    this.defineParam('cutoff', { default: 2000, min: 20, max: 16000, unit: 'Hz' });
    this.defineParam('resonance', { default: 0, min: 0, max: 100, unit: '' });
    this.defineParam('envAmount', { default: 0, min: -100, max: 100, unit: '%' });
  }

  _onParamChange(name, value) {
    if (name === 'cutoff') {
      this.filter.setCutoff(value);
    } else if (name === 'resonance') {
      this.filter.setResonance(value);
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
    const envAmount = this.params.envAmount.value / 100;

    if (cutoffCV) {
      // Per-sample cutoff modulation
      const cutoffMod = new Float32Array(bufferSize);
      for (let i = 0; i < bufferSize; i++) {
        // CV is 0-1 from envelope, scale to Hz range
        const modHz = cutoffCV[i] * envAmount * 8000;
        cutoffMod[i] = Math.max(20, Math.min(16000, baseCutoff + modHz));
      }
      output.set(audioIn);
      this.filter.processWithMod(output, cutoffMod);
    } else {
      output.set(audioIn);
      this.filter.process(output);
    }

    this.outputs.audio.buffer = output;
  }
}
