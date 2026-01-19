/**
 * LeadNode - Stub for SH-101 lead synth
 *
 * TODO: Full implementation pending - this is a stub for the modular architecture.
 * Currently, lead is handled directly in jambot.js session state.
 */

import { InstrumentNode } from '../core/node.js';

export class LeadNode extends InstrumentNode {
  constructor(config = {}) {
    super('lead', config);
    this._voices = ['lead'];
    this._pattern = [];
    this._arp = { mode: 'off', octaves: 1, hold: false };
  }

  getArp() { return this._arp; }
  setArp(v) { this._arp = v; }
}
