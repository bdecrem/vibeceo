/**
 * JP9000 Mixer Module
 *
 * Mixes up to 4 audio inputs with individual gain control.
 */

import { Module } from '../module.js';

export class MixerModule extends Module {
  constructor(id, sampleRate = 44100) {
    super(id, sampleRate);
    this.type = 'mixer';

    // Inputs (4 channels)
    this.defineInput('in1', 'audio');
    this.defineInput('in2', 'audio');
    this.defineInput('in3', 'audio');
    this.defineInput('in4', 'audio');

    // Outputs
    this.defineOutput('audio', 'audio');

    // Parameters
    this.defineParam('gain1', { default: 1, min: 0, max: 2, unit: '' });
    this.defineParam('gain2', { default: 1, min: 0, max: 2, unit: '' });
    this.defineParam('gain3', { default: 1, min: 0, max: 2, unit: '' });
    this.defineParam('gain4', { default: 1, min: 0, max: 2, unit: '' });
    this.defineParam('master', { default: 1, min: 0, max: 2, unit: '' });
  }

  process(bufferSize) {
    const in1 = this.inputs.in1.buffer;
    const in2 = this.inputs.in2.buffer;
    const in3 = this.inputs.in3.buffer;
    const in4 = this.inputs.in4.buffer;

    const g1 = this.params.gain1.value;
    const g2 = this.params.gain2.value;
    const g3 = this.params.gain3.value;
    const g4 = this.params.gain4.value;
    const master = this.params.master.value;

    const output = new Float32Array(bufferSize);

    for (let i = 0; i < bufferSize; i++) {
      let sum = 0;
      if (in1) sum += in1[i] * g1;
      if (in2) sum += in2[i] * g2;
      if (in3) sum += in3[i] * g3;
      if (in4) sum += in4[i] * g4;
      output[i] = sum * master;
    }

    this.outputs.audio.buffer = output;
  }
}
