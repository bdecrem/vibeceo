/**
 * JP9000 Square Oscillator Module
 *
 * Wraps JB202 SquareOscillator as a modular module.
 */

import { Module } from '../module.js';
import { SquareOscillator } from '../../../jb202/dist/dsp/oscillators/index.js';

export class OscSquareModule extends Module {
  constructor(id, sampleRate = 44100) {
    super(id, sampleRate);
    this.type = 'osc-square';

    this.osc = new SquareOscillator(sampleRate);

    // Inputs
    this.defineInput('pitch', 'cv');
    this.defineInput('fm', 'audio');
    this.defineInput('pwm', 'cv');  // Pulse width modulation

    // Outputs
    this.defineOutput('audio', 'audio');

    // Parameters
    this.defineParam('frequency', { default: 110, min: 20, max: 8000, unit: 'Hz' });
    this.defineParam('octave', { default: 0, min: -24, max: 24, unit: 'semi' });
    this.defineParam('detune', { default: 0, min: -100, max: 100, unit: 'cents' });
    this.defineParam('pulseWidth', { default: 50, min: 5, max: 95, unit: '%' });
  }

  _onParamChange(name, value) {
    if (name === 'pulseWidth' && this.osc.setPulseWidth) {
      this.osc.setPulseWidth(value / 100);
    }
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
    const pwmIn = this.inputs.pwm.buffer;
    const output = new Float32Array(bufferSize);

    const baseFreq = this.params.frequency.value;
    const octaveMult = Math.pow(2, this.params.octave.value / 12);
    const detuneMult = Math.pow(2, this.params.detune.value / 1200);
    const basePW = this.params.pulseWidth.value / 100;

    for (let i = 0; i < bufferSize; i++) {
      let freq = baseFreq * octaveMult * detuneMult;

      if (pitchCV) freq += pitchCV[i];
      if (fmIn) freq += fmIn[i] * 100;

      freq = Math.max(20, Math.min(freq, this.sampleRate / 2));
      this.osc.setFrequency(freq);

      // PWM modulation
      if (pwmIn && this.osc.setPulseWidth) {
        const pw = Math.max(0.05, Math.min(0.95, basePW + pwmIn[i] * 0.4));
        this.osc.setPulseWidth(pw);
      }

      output[i] = this.osc._generateSample();
      this.osc._advancePhase();
    }

    this.outputs.audio.buffer = output;
  }
}
