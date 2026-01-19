/**
 * BassNode - Stub for TB-303 acid bass
 *
 * TODO: Full implementation pending - this is a stub for the modular architecture.
 * Currently, bass is handled directly in jambot.js session state.
 */

import { InstrumentNode } from '../core/node.js';

export class BassNode extends InstrumentNode {
  constructor(config = {}) {
    super('bass', config);
    this._voices = ['bass'];
    this._pattern = [];
  }

  getArp() { return null; }
  setArp(v) { }
}
