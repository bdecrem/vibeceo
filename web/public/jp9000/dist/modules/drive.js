/**
 * JP9000 Drive Module
 *
 * Wraps JB202 Drive effect as a modular module.
 * Adds saturation and warmth.
 */

import { Module } from '../module.js';
import { Drive, DriveType } from '../../../jb202/dist/dsp/effects/index.js';

export class DriveModule extends Module {
  constructor(id, sampleRate = 44100) {
    super(id, sampleRate);
    this.type = 'drive';

    this.drive = new Drive(sampleRate);

    // Inputs
    this.defineInput('audio', 'audio');

    // Outputs
    this.defineOutput('audio', 'audio');

    // Parameters
    this.defineParam('amount', { default: 0, min: 0, max: 100, unit: '' });
    this.defineParam('type', { default: 0, min: 0, max: 3, unit: '' }); // 0=soft, 1=hard, 2=tube, 3=foldback
    this.defineParam('mix', { default: 100, min: 0, max: 100, unit: '%' });

    this._updateDrive();
  }

  _onParamChange(name, value) {
    this._updateDrive();
  }

  _updateDrive() {
    this.drive.setAmount(this.params.amount.value);
    this.drive.setMix(this.params.mix.value);

    const types = [DriveType.SOFT, DriveType.HARD, DriveType.TUBE, DriveType.FOLDBACK];
    const typeIndex = Math.round(this.params.type.value);
    this.drive.setType(types[typeIndex] || DriveType.SOFT);
  }

  reset() {
    this.drive.reset();
  }

  process(bufferSize) {
    const audioIn = this.inputs.audio.buffer;
    const output = new Float32Array(bufferSize);

    if (!audioIn) {
      this.outputs.audio.buffer = output;
      return;
    }

    output.set(audioIn);
    this.drive.process(output);

    this.outputs.audio.buffer = output;
  }
}
