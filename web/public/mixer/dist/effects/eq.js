/**
 * EQ Effect
 *
 * 4-band parametric EQ using native BiquadFilterNodes.
 * Chain: Highpass -> Low Shelf -> Peaking Mid -> High Shelf
 *
 * Usage:
 *   const eq = new EQ(audioContext);
 *   eq.setPreset('acidBass');
 *   // or
 *   eq.setParameter('midGain', 3);
 *   eq.setParameter('midFreq', 800);
 *
 *   source.connect(eq.input);
 *   eq.output.connect(destination);
 */

import { Effect } from './base.js';

export class EQ extends Effect {
  static PRESETS = {
    acidBass: {
      highpass: 60,
      lowGain: 0,
      lowFreq: 100,
      midGain: 3,
      midFreq: 800,
      midQ: 1.5,
      highGain: -2,
      highFreq: 6000,
    },
    crispHats: {
      highpass: 200,
      lowGain: -6,
      lowFreq: 100,
      midGain: 0,
      midFreq: 1000,
      midQ: 1,
      highGain: 2,
      highFreq: 5000,
    },
    warmPad: {
      highpass: 40,
      lowGain: 2,
      lowFreq: 200,
      midGain: 0,
      midFreq: 1000,
      midQ: 1,
      highGain: -3,
      highFreq: 8000,
    },
    master: {
      highpass: 30,
      lowGain: 0,
      lowFreq: 100,
      midGain: 0,
      midFreq: 1000,
      midQ: 1,
      highGain: 1,
      highFreq: 12000,
    },
    // Flat - no processing
    flat: {
      highpass: 20,
      lowGain: 0,
      lowFreq: 100,
      midGain: 0,
      midFreq: 1000,
      midQ: 1,
      highGain: 0,
      highFreq: 8000,
    },
  };

  constructor(context) {
    super(context);

    // Create filter chain
    this._highpass = context.createBiquadFilter();
    this._highpass.type = 'highpass';
    this._highpass.frequency.value = 30;
    this._highpass.Q.value = 0.707; // Butterworth

    this._lowShelf = context.createBiquadFilter();
    this._lowShelf.type = 'lowshelf';
    this._lowShelf.frequency.value = 100;
    this._lowShelf.gain.value = 0;

    this._peaking = context.createBiquadFilter();
    this._peaking.type = 'peaking';
    this._peaking.frequency.value = 1000;
    this._peaking.Q.value = 1;
    this._peaking.gain.value = 0;

    this._highShelf = context.createBiquadFilter();
    this._highShelf.type = 'highshelf';
    this._highShelf.frequency.value = 8000;
    this._highShelf.gain.value = 0;

    // Wire chain: input -> HP -> LS -> Peak -> HS -> output
    this._input.connect(this._highpass);
    this._highpass.connect(this._lowShelf);
    this._lowShelf.connect(this._peaking);
    this._peaking.connect(this._highShelf);
    this._highShelf.connect(this._output);
  }

  /**
   * Set parameter
   */
  setParameter(name, value) {
    switch (name) {
      // Highpass
      case 'highpass':
        this._highpass.frequency.value = Math.max(20, Math.min(500, value));
        break;

      // Low shelf
      case 'lowGain':
        this._lowShelf.gain.value = Math.max(-12, Math.min(12, value));
        break;
      case 'lowFreq':
        this._lowShelf.frequency.value = Math.max(60, Math.min(300, value));
        break;

      // Peaking mid
      case 'midGain':
        this._peaking.gain.value = Math.max(-12, Math.min(12, value));
        break;
      case 'midFreq':
        this._peaking.frequency.value = Math.max(200, Math.min(5000, value));
        break;
      case 'midQ':
        this._peaking.Q.value = Math.max(0.5, Math.min(4, value));
        break;

      // High shelf
      case 'highGain':
        this._highShelf.gain.value = Math.max(-12, Math.min(12, value));
        break;
      case 'highFreq':
        this._highShelf.frequency.value = Math.max(2000, Math.min(12000, value));
        break;

      default:
        console.warn(`EQ: unknown parameter ${name}`);
    }
  }

  /**
   * Get all parameters
   */
  getParameters() {
    return {
      highpass: this._highpass.frequency.value,
      lowGain: this._lowShelf.gain.value,
      lowFreq: this._lowShelf.frequency.value,
      midGain: this._peaking.gain.value,
      midFreq: this._peaking.frequency.value,
      midQ: this._peaking.Q.value,
      highGain: this._highShelf.gain.value,
      highFreq: this._highShelf.frequency.value,
    };
  }

  /**
   * Set bypass
   */
  set bypass(value) {
    this._bypass = value;
    if (value) {
      // Disconnect filter chain, connect input directly to output
      this._input.disconnect();
      this._input.connect(this._output);
    } else {
      // Reconnect filter chain
      this._input.disconnect();
      this._input.connect(this._highpass);
    }
  }

  /**
   * Clean up
   */
  dispose() {
    this._highpass.disconnect();
    this._lowShelf.disconnect();
    this._peaking.disconnect();
    this._highShelf.disconnect();
    super.dispose();
  }
}

export default EQ;
