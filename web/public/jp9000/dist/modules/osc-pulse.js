/**
 * JP9000 Pulse Oscillator Module
 *
 * Wraps JB202 PulseOscillator as a modular module.
 * Variable pulse width enables PWM (Pulse Width Modulation) synthesis.
 */

import { Module } from '../module.js';
import { PulseOscillator } from '../../../jb202/dist/dsp/oscillators/index.js';

export class OscPulseModule extends Module {
  constructor(id, sampleRate = 44100) {
    super(id, sampleRate);
    this.type = 'osc-pulse';

    this.osc = new PulseOscillator(sampleRate);

    // Inputs
    this.defineInput('pitch', 'cv');    // Pitch CV (Hz offset)
    this.defineInput('fm', 'audio');    // Audio-rate FM
    this.defineInput('pwm', 'cv');      // Pulse width modulation CV

    // Outputs
    this.defineOutput('audio', 'audio');

    // Parameters
    this.defineParam('frequency', { default: 110, min: 20, max: 8000, unit: 'Hz' });
    this.defineParam('octave', { default: 0, min: -24, max: 24, unit: 'semi' });
    this.defineParam('detune', { default: 0, min: -100, max: 100, unit: 'cents' });
    this.defineParam('pulseWidth', { default: 50, min: 5, max: 95, unit: '%' });
  }

  _onParamChange(name, value) {
    if (name === 'frequency' || name === 'octave' || name === 'detune') {
      this._updateFrequency();
    } else if (name === 'pulseWidth') {
      this.osc.setPulseWidth(value / 100);
    }
  }

  _updateFrequency() {
    let freq = this.params.frequency.value;
    freq *= Math.pow(2, this.params.octave.value / 12);
    freq *= Math.pow(2, this.params.detune.value / 1200);
    this.osc.setFrequency(freq);
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

      // Add pitch CV
      if (pitchCV) {
        freq += pitchCV[i];
      }

      // Add FM
      if (fmIn) {
        freq += fmIn[i] * 100;  // FM depth
      }

      freq = Math.max(20, Math.min(freq, this.sampleRate / 2));
      this.osc.setFrequency(freq);

      // Apply PWM modulation
      let pw = basePW;
      if (pwmIn) {
        pw += pwmIn[i] * 0.4;  // ±40% modulation range
        pw = Math.max(0.05, Math.min(0.95, pw));
      }
      this.osc.setPulseWidth(pw);

      output[i] = this.osc._generateSample();
      this.osc._advancePhase();
    }

    this.outputs.audio.buffer = output;
  }
}

// Factory function
export function createOscPulse(id, sampleRate = 44100) {
  return new OscPulseModule(id, sampleRate);
}
