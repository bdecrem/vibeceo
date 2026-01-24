/**
 * JP9000 ADSR Envelope Module
 *
 * Wraps JB202 ADSREnvelope as a modular module.
 * Generates control voltage for modulating other modules.
 */

import { Module } from '../module.js';
import { ADSREnvelope } from '../../../jb202/dist/dsp/envelopes/index.js';

export class EnvADSRModule extends Module {
  constructor(id, sampleRate = 44100) {
    super(id, sampleRate);
    this.type = 'env-adsr';

    this.env = new ADSREnvelope(sampleRate);

    // Inputs
    this.defineInput('gate', 'cv');  // Gate input (trigger when > 0.5)

    // Outputs
    this.defineOutput('cv', 'cv');   // Envelope output (0-1)

    // Parameters (0-100 knob values)
    this.defineParam('attack', { default: 0, min: 0, max: 100, unit: '' });
    this.defineParam('decay', { default: 40, min: 0, max: 100, unit: '' });
    this.defineParam('sustain', { default: 50, min: 0, max: 100, unit: '' });
    this.defineParam('release', { default: 30, min: 0, max: 100, unit: '' });

    // Track gate state for edge detection
    this._gateHigh = false;

    this._updateEnvelope();
  }

  _onParamChange(name, value) {
    this._updateEnvelope();
  }

  _updateEnvelope() {
    this.env.setParameters(
      this.params.attack.value,
      this.params.decay.value,
      this.params.sustain.value,
      this.params.release.value
    );
  }

  reset() {
    this.env.reset();
    this._gateHigh = false;
  }

  trigger(velocity = 1) {
    this.env.trigger(velocity);
    this._gateHigh = true;
  }

  release() {
    this.env.gateOff();
    this._gateHigh = false;
  }

  isActive() {
    return this.env.isActive();
  }

  process(bufferSize) {
    const gateIn = this.inputs.gate.buffer;
    const output = new Float32Array(bufferSize);

    for (let i = 0; i < bufferSize; i++) {
      // Check gate input for triggers
      if (gateIn) {
        const gate = gateIn[i] > 0.5;
        if (gate && !this._gateHigh) {
          this.env.trigger(1);
          this._gateHigh = true;
        } else if (!gate && this._gateHigh) {
          this.env.gateOff();
          this._gateHigh = false;
        }
      }

      output[i] = this.env.processSample();
    }

    this.outputs.cv.buffer = output;
  }
}
