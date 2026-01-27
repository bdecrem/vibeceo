/**
 * Jambot Instruments Module
 *
 * Exports all instrument node wrappers.
 * Each node implements the modular instrument interface:
 * - getPattern() / setPattern()
 * - getOutputGain()
 * - renderPattern(options) -> Promise<AudioBuffer>
 */

// JB Series (new synths)
export { JB01Node } from './jb01-node.js';
export { JB200Node } from './jb200-node.js';

// JT Series (modular DSP instruments - same output in browser and Node.js)
export { JT30Node } from './jt30-node.js';  // Acid Bass (303-style)
export { JT10Node } from './jt10-node.js';  // Lead/Bass (101-style)
export { JT90Node } from './jt90-node.js';  // Drum Machine (909-style)

// JP9000 Modular Synth
export { JP9000Node, JP9000_PRESETS } from './jp9000-node.js';

// Droid Quartet (legacy engine wrappers)
export { TR909Node } from './tr909-node.js';
export { TB303Node } from './tb303-node.js';
export { SH101Node } from './sh101-node.js';
export { SamplerNode } from './sampler-node.js';
