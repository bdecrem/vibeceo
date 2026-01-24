/**
 * JP9000 Triangle Oscillator Module
 *
 * Wraps JB202 TriangleOscillator as a modular module.
 */

import { Module } from '../module.js';
import { TriangleOscillator } from '../../../jb202/dist/dsp/oscillators/index.js';

export class OscTriangleModule extends Module {
  constructor(id, sampleRate = 44100) {
    super(id, sampleRate);
    this.type = 'osc-triangle';

    this.osc = new TriangleOscillator(sampleRate);

    // Inputs
    this.defineInput('pitch', 'cv');
    this.defineInput('fm', 'audio');

    // Outputs
    this.defineOutput('audio', 'audio');

    // Parameters
    this.defineParam('frequency', { default: 110, min: 20, max: 8000, unit: 'Hz' });
    this.defineParam('octave', { default: 0, min: -24, max: 24, unit: 'semi' });
    this.defineParam('detune', { default: 0, min: -100, max: 100, unit: 'cents' });
  }

  reset() {
    this.osc.reset();
  }

  trigger(velocity = 1) {
    this.osc.reset();
  }

  process(bufferSize) {
    const pitchCV = this.inputs.pitch.buffer;
    const fmIn = this.inputs.fm.buffer;
    const output = new Float32Array(bufferSize);

    const baseFreq = this.params.frequency.value;
    const octaveMult = Math.pow(2, this.params.octave.value / 12);
    const detuneMult = Math.pow(2, this.params.detune.value / 1200);

    for (let i = 0; i < bufferSize; i++) {
      let freq = baseFreq * octaveMult * detuneMult;

      if (pitchCV) freq += pitchCV[i];
      if (fmIn) freq += fmIn[i] * 100;

      freq = Math.max(20, Math.min(freq, this.sampleRate / 2));
      this.osc.setFrequency(freq);

      output[i] = this.osc._generateSample();
      this.osc._advancePhase();
    }

    this.outputs.audio.buffer = output;
  }
}
