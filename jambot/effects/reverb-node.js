/**
 * ReverbNode - Freeverb-style algorithmic reverb
 *
 * Parameters:
 * - decay (0.1-10s): Reverb tail length
 * - damping (0-100): High-frequency rolloff in feedback (0=bright, 100=dark)
 * - predelay (0-100ms): Gap before reverb onset
 * - mix (0-100): Wet/dry balance
 * - width (0-100): Stereo spread
 * - lowcut (20-500Hz): Remove mud from wet signal
 * - highcut (1000-20000Hz): Tame harshness
 * - size (0-100): Room size — scales comb filter lengths
 */

import { EffectNode } from '../core/node.js';

export class ReverbNode extends EffectNode {
  constructor(id = 'reverb', config = {}) {
    super(id, config);

    this.registerParams({
      decay:    { min: 0.1, max: 10, default: 2.0, unit: 'seconds', description: 'Reverb tail length' },
      damping:  { min: 0, max: 100, default: 50, unit: '0-100', description: 'High-frequency rolloff (0=bright, 100=dark)' },
      predelay: { min: 0, max: 100, default: 10, unit: 'ms', description: 'Gap before reverb onset' },
      mix:      { min: 0, max: 100, default: 30, unit: '0-100', description: 'Wet/dry balance' },
      width:    { min: 0, max: 100, default: 100, unit: '0-100', description: 'Stereo spread' },
      lowcut:   { min: 20, max: 500, default: 80, unit: 'Hz', description: 'Remove mud from wet signal' },
      highcut:  { min: 1000, max: 20000, default: 10000, unit: 'Hz', description: 'Tame harshness' },
      size:     { min: 0, max: 100, default: 50, unit: '0-100', description: 'Room size' },
    });
  }
}

export const REVERB_PRESETS = {
  plate:     { decay: 1.5, damping: 40, predelay: 10, mix: 30, width: 100, size: 40 },
  room:      { decay: 0.8, damping: 60, predelay: 5,  mix: 25, width: 80,  size: 30 },
  hall:      { decay: 3.0, damping: 50, predelay: 20, mix: 35, width: 100, size: 70 },
  chamber:   { decay: 1.2, damping: 45, predelay: 8,  mix: 25, width: 90,  size: 35 },
  cathedral: { decay: 5.0, damping: 55, predelay: 30, mix: 40, width: 100, size: 90 },
  ambient:   { decay: 8.0, damping: 65, predelay: 40, mix: 45, width: 100, size: 80 },
};
