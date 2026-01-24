/**
 * JP9000 VCA Module
 *
 * Voltage-Controlled Amplifier - multiplies audio by CV.
 * Essential for connecting envelopes to audio paths.
 */

import { Module } from '../module.js';

export class VCAModule extends Module {
  constructor(id, sampleRate = 44100) {
    super(id, sampleRate);
    this.type = 'vca';

    // Inputs
    this.defineInput('audio', 'audio');
    this.defineInput('cv', 'cv');

    // Outputs
    this.defineOutput('audio', 'audio');

    // Parameters
    this.defineParam('gain', { default: 1, min: 0, max: 2, unit: '' });
  }

  process(bufferSize) {
    const audioIn = this.inputs.audio.buffer;
    const cvIn = this.inputs.cv.buffer;
    const output = new Float32Array(bufferSize);

    const gain = this.params.gain.value;

    for (let i = 0; i < bufferSize; i++) {
      const audio = audioIn ? audioIn[i] : 0;
      const cv = cvIn ? cvIn[i] : 1;
      output[i] = audio * cv * gain;
    }

    this.outputs.audio.buffer = output;
  }
}
