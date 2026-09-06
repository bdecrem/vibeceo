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

/** Union of the JB01 and JT90 voice names — every voice that can trigger a duck. */
export const TRIGGER_VOICES = ['kick', 'snare', 'clap', 'rimshot', 'lowtom', 'midtom', 'hitom', 'ch', 'oh', 'crash', 'ride', 'cymbal'];

export class SidechainNode extends EffectNode {
  constructor(id = 'sidechain', config = {}) {
    super(id, config);

    // Register sidechain parameters
    this.registerParams({
      // Any voice a drum instrument (JB01 or JT90) can play. The old five
      // (kick/snare/clap/ch/oh) silently refused rimshot, toms, crash, ride.
      trigger: { unit: 'choice', options: TRIGGER_VOICES, default: 'kick', description: 'Triggering drum voice' },
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

}
