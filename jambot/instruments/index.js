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

// Droid Quartet (legacy engine wrappers)
export { TR909Node } from './tr909-node.js';
export { TB303Node } from './tb303-node.js';
export { SH101Node } from './sh101-node.js';
export { SamplerNode } from './sampler-node.js';
