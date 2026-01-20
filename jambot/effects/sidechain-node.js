/**
 * SidechainNode - Ducker/compressor for sidechain effects
 *
 * Parameters:
 * - trigger: The voice that triggers ducking (e.g., 'kick')
 * - amount (0-1): How much to duck (1 = full duck)
 * - attack (ms): How fast to duck
 * - release (ms): How fast to recover
 * - hold (ms): How long to hold at full duck
 */

import { EffectNode } from '../core/node.js';

export class SidechainNode extends EffectNode {
  constructor(id = 'sidechain', config = {}) {
    super(id, config);

    // Register sidechain parameters
    this.registerParams({
      trigger: { unit: 'choice', options: ['kick', 'snare', 'clap', 'ch', 'oh'], default: 'kick', description: 'Triggering voice' },
      amount: { min: 0, max: 1, default: 0.5, unit: '0-1', description: 'Duck amount (0=none, 1=full)' },
      attack: { min: 0.1, max: 50, default: 5, unit: 'ms', description: 'Attack time' },
      release: { min: 10, max: 500, default: 100, unit: 'ms', description: 'Release time' },
      hold: { min: 0, max: 100, default: 20, unit: 'ms', description: 'Hold at full duck' },
    });

    // Apply config params
    if (config.trigger) this.setParam('trigger', config.trigger);
    if (config.amount !== undefined) this.setParam('amount', config.amount);
    if (config.attack !== undefined) this.setParam('attack', config.attack);
    if (config.release !== undefined) this.setParam('release', config.release);
    if (config.hold !== undefined) this.setParam('hold', config.hold);
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
