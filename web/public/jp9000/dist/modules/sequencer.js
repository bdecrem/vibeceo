/**
 * JP9000 Sequencer Module
 *
 * A patchable step sequencer that outputs gate and pitch CV.
 * This is the "brain" of a modular patch - it triggers other modules.
 *
 * Outputs:
 * - gate: Trigger pulse (0 or 1) for each step
 * - pitch: Frequency CV in Hz for each step
 * - accent: Accent CV (0-1) for dynamics
 *
 * The sequencer advances automatically during render based on step duration.
 */

import { Module } from '../module.js';
import { noteToFreq } from '../../../jb202/dist/dsp/utils/note.js';

export class SequencerModule extends Module {
  constructor(id, sampleRate = 44100) {
    super(id, sampleRate);
    this.type = 'sequencer';

    // No inputs (it's a source)
    // Outputs
    this.defineOutput('gate', 'cv');
    this.defineOutput('pitch', 'cv');
    this.defineOutput('accent', 'cv');

    // Parameters
    this.defineParam('steps', { default: 16, min: 1, max: 64, unit: 'steps' });
    this.defineParam('currentStep', { default: 0, min: 0, max: 63, unit: '' });

    // Internal pattern storage
    // Each step: { note: 'C2', gate: true, accent: false, velocity: 1 }
    this._pattern = this._createEmptyPattern(16);

    // Timing state
    this._sampleCounter = 0;
    this._samplesPerStep = 0;
    this._stepTriggered = false;
  }

  /**
   * Create an empty pattern
   * @param {number} steps
   * @returns {Array}
   */
  _createEmptyPattern(steps) {
    return Array(steps).fill(null).map(() => ({
      note: 'C2',
      gate: false,
      accent: false,
      velocity: 1,
    }));
  }

  /**
   * Set the pattern
   * @param {Array} pattern - Array of step objects
   */
  setPattern(pattern) {
    this._pattern = pattern;
    this.setParam('steps', pattern.length);
  }

  /**
   * Get the pattern
   * @returns {Array}
   */
  getPattern() {
    return this._pattern;
  }

  /**
   * Set a single step
   * @param {number} step - Step index
   * @param {Object} data - { note, gate, accent, velocity }
   */
  setStep(step, data) {
    if (step >= 0 && step < this._pattern.length) {
      this._pattern[step] = { ...this._pattern[step], ...data };
    }
  }

  /**
   * Set the step duration (called by the rack/renderer)
   * @param {number} samplesPerStep
   */
  setStepDuration(samplesPerStep) {
    this._samplesPerStep = samplesPerStep;
  }

  /**
   * Advance to next step
   */
  advanceStep() {
    const steps = this.params.steps.value;
    const current = this.params.currentStep.value;
    this.params.currentStep.value = (current + 1) % steps;
    this._stepTriggered = false;
  }

  /**
   * Reset to step 0
   */
  reset() {
    this.params.currentStep.value = 0;
    this._sampleCounter = 0;
    this._stepTriggered = false;
  }

  /**
   * Process - outputs CV for current step
   * @param {number} bufferSize
   */
  process(bufferSize) {
    const gateOut = new Float32Array(bufferSize);
    const pitchOut = new Float32Array(bufferSize);
    const accentOut = new Float32Array(bufferSize);

    const stepData = this._pattern[this.params.currentStep.value];
    const gate = stepData?.gate ? 1 : 0;
    const freq = stepData?.note ? noteToFreq(stepData.note) : 110;
    const accent = stepData?.accent ? 1 : 0;

    // Fill output buffers
    for (let i = 0; i < bufferSize; i++) {
      // Gate envelope: quick attack, hold for most of step
      // Could be more sophisticated (gate length param) but keeping simple
      gateOut[i] = gate;
      pitchOut[i] = freq;
      accentOut[i] = accent * (stepData?.velocity || 1);
    }

    this.outputs.gate.buffer = gateOut;
    this.outputs.pitch.buffer = pitchOut;
    this.outputs.accent.buffer = accentOut;
  }

  /**
   * Serialize
   */
  toJSON() {
    const base = super.toJSON();
    return {
      ...base,
      pattern: JSON.parse(JSON.stringify(this._pattern)),
    };
  }

  /**
   * Deserialize
   */
  fromJSON(json) {
    super.fromJSON(json);
    if (json.pattern) {
      this._pattern = JSON.parse(JSON.stringify(json.pattern));
    }
  }
}
