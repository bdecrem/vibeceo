/**
 * ReverbNode - Plate reverb effect
 *
 * Parameters:
 * - decay (0.5-10s): Tail length
 * - damping (0-1): High-frequency rolloff
 * - predelay (0-100ms): Gap before reverb
 * - modulation (0-1): Pitch wobble for shimmer
 * - lowcut (20-500Hz): Remove mud
 * - highcut (2000-20000Hz): Tame harshness
 * - width (0-1): Stereo spread
 * - mix (0-1): Wet/dry balance
 */

import { EffectNode } from '../core/node.js';

export class ReverbNode extends EffectNode {
  constructor(id = 'reverb', config = {}) {
    super(id, config);

    // Register all reverb parameters
    this.registerParams({
      decay: { min: 0.5, max: 10, default: 2, unit: 'seconds', description: 'Tail length' },
      damping: { min: 0, max: 1, default: 0.5, unit: '0-1', description: 'High-frequency rolloff (0=bright, 1=dark)' },
      predelay: { min: 0, max: 100, default: 10, unit: 'ms', description: 'Gap before reverb' },
      modulation: { min: 0, max: 1, default: 0.2, unit: '0-1', description: 'Pitch wobble for shimmer' },
      lowcut: { min: 20, max: 500, default: 100, unit: 'Hz', description: 'Remove mud' },
      highcut: { min: 2000, max: 20000, default: 8000, unit: 'Hz', description: 'Tame harshness' },
      width: { min: 0, max: 1, default: 1, unit: '0-1', description: 'Stereo spread' },
      mix: { min: 0, max: 1, default: 0.3, unit: '0-1', description: 'Wet/dry balance' },
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
}
