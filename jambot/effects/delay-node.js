/**
 * DelayNode - Analog and Ping Pong delay effect
 *
 * Parameters:
 * - mode (analog/pingpong): Delay type
 * - time (1-2000ms): Delay time
 * - sync (off/8th/dotted8th/triplet8th/16th/quarter): Tempo sync
 * - feedback (0-100): Feedback amount
 * - mix (0-100): Wet/dry balance
 * - lowcut (20-500Hz): Remove mud from feedback
 * - highcut (1000-20000Hz): Tame harshness
 * - saturation (0-100): Analog warmth (analog mode)
 * - spread (0-100): Stereo width (pingpong mode)
 */

import { EffectNode } from '../core/node.js';

export class DelayNode extends EffectNode {
  constructor(id = 'delay', config = {}) {
    super(id, config);

    // Register all delay parameters
    this.registerParams({
      mode: { min: 0, max: 1, default: 0, unit: 'choice', choices: ['analog', 'pingpong'], description: 'Delay type (0=analog, 1=pingpong)' },
      time: { min: 1, max: 2000, default: 375, unit: 'ms', description: 'Delay time' },
      sync: { min: 0, max: 5, default: 0, unit: 'choice', choices: ['off', '8th', 'dotted8th', 'triplet8th', '16th', 'quarter'], description: 'Tempo sync mode' },
      feedback: { min: 0, max: 100, default: 50, unit: '0-100', description: 'Feedback amount' },
      mix: { min: 0, max: 100, default: 30, unit: '0-100', description: 'Wet/dry balance' },
      lowcut: { min: 20, max: 500, default: 80, unit: 'Hz', description: 'Remove mud from feedback' },
      highcut: { min: 1000, max: 20000, default: 8000, unit: 'Hz', description: 'Tame harshness' },
      saturation: { min: 0, max: 100, default: 20, unit: '0-100', description: 'Analog warmth (analog mode only)' },
      spread: { min: 0, max: 100, default: 100, unit: '0-100', description: 'Stereo width (pingpong mode only)' },
    });
  }

  /**
   * Get all params as an object for render
   * @returns {Object}
   */
  getParams() {
    const result = {};
    for (const path of Object.keys(this._descriptors)) {
      result[path] = this._params[path];
    }
    return result;
  }

  /**
   * Calculate delay time in ms based on sync mode and BPM
   * @param {number} bpm - Tempo in BPM
   * @returns {number} Delay time in ms
   */
  getSyncedTime(bpm) {
    const syncMode = this._params.sync ?? 0;
    const manualTime = this._params.time ?? 375;

    if (syncMode === 0) {
      // Off - use manual time
      return manualTime;
    }

    // Calculate beat duration in ms
    const beatMs = (60 / bpm) * 1000;

    switch (syncMode) {
      case 1: // 8th note
        return beatMs / 2;
      case 2: // Dotted 8th
        return (beatMs / 2) * 1.5;
      case 3: // Triplet 8th
        return beatMs / 3;
      case 4: // 16th note
        return beatMs / 4;
      case 5: // Quarter note
        return beatMs;
      default:
        return manualTime;
    }
  }

  /**
   * Get mode as string
   * @returns {string} 'analog' or 'pingpong'
   */
  getMode() {
    return this._params.mode === 1 ? 'pingpong' : 'analog';
  }
}

// Preset delay settings
export const DELAY_PRESETS = {
  // Classic analog tape delay
  tape: {
    mode: 0, // analog
    time: 375,
    feedback: 45,
    mix: 30,
    lowcut: 100,
    highcut: 6000,
    saturation: 40,
  },
  // Dub style - long feedback with filtering
  dub: {
    mode: 0, // analog
    time: 500,
    feedback: 70,
    mix: 35,
    lowcut: 150,
    highcut: 4000,
    saturation: 30,
  },
  // Slapback - short single repeat
  slapback: {
    mode: 0, // analog
    time: 120,
    feedback: 10,
    mix: 40,
    lowcut: 80,
    highcut: 10000,
    saturation: 15,
  },
  // Ping pong - classic stereo bounce
  pingpong: {
    mode: 1, // pingpong
    time: 375,
    feedback: 50,
    mix: 30,
    lowcut: 80,
    highcut: 8000,
    spread: 100,
  },
  // Wide ping pong with longer tail
  widePong: {
    mode: 1, // pingpong
    time: 500,
    feedback: 60,
    mix: 25,
    lowcut: 100,
    highcut: 6000,
    spread: 100,
  },
  // Subtle stereo widener
  stereoWidth: {
    mode: 1, // pingpong
    time: 30,
    feedback: 20,
    mix: 20,
    lowcut: 200,
    highcut: 12000,
    spread: 80,
  },
};
