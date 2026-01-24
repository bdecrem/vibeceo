/**
 * JP9000 Modules Index
 *
 * Exports all module classes and provides a factory function.
 */

// Sound sources
export { OscSawModule } from './osc-saw.js';
export { OscSquareModule } from './osc-square.js';
export { OscTriangleModule } from './osc-triangle.js';
export { StringModule, createString } from './string.js';

// Filters
export { FilterLP24Module } from './filter-lp24.js';
export { FilterBiquadModule } from './filter-biquad.js';

// Modulation
export { EnvADSRModule } from './env-adsr.js';
export { SequencerModule } from './sequencer.js';

// Utilities
export { VCAModule } from './vca.js';
export { MixerModule } from './mixer.js';

// Effects
export { DriveModule } from './drive.js';

// Import all for factory
import { OscSawModule } from './osc-saw.js';
import { OscSquareModule } from './osc-square.js';
import { OscTriangleModule } from './osc-triangle.js';
import { StringModule } from './string.js';
import { FilterLP24Module } from './filter-lp24.js';
import { FilterBiquadModule } from './filter-biquad.js';
import { EnvADSRModule } from './env-adsr.js';
import { SequencerModule } from './sequencer.js';
import { VCAModule } from './vca.js';
import { MixerModule } from './mixer.js';
import { DriveModule } from './drive.js';

/**
 * Module registry
 */
const MODULE_REGISTRY = {
  // Sound sources
  'osc-saw': OscSawModule,
  'osc-square': OscSquareModule,
  'osc-triangle': OscTriangleModule,
  'string': StringModule,

  // Filters
  'filter-lp24': FilterLP24Module,
  'filter-biquad': FilterBiquadModule,

  // Modulation
  'env-adsr': EnvADSRModule,
  'sequencer': SequencerModule,

  // Utilities
  'vca': VCAModule,
  'mixer': MixerModule,

  // Effects
  'drive': DriveModule,
};

/**
 * Get list of available module types
 * @returns {string[]}
 */
export function getModuleTypes() {
  return Object.keys(MODULE_REGISTRY);
}

/**
 * Get module class by type
 * @param {string} type
 * @returns {typeof Module|undefined}
 */
export function getModuleClass(type) {
  return MODULE_REGISTRY[type];
}

/**
 * Create a module instance
 * @param {string} type - Module type (e.g., 'osc-saw', 'filter-lp24')
 * @param {string} id - Module ID
 * @param {number} sampleRate - Sample rate
 * @returns {Module}
 */
export function createModule(type, id, sampleRate = 44100) {
  const ModuleClass = MODULE_REGISTRY[type];
  if (!ModuleClass) {
    throw new Error(`Unknown module type: ${type}. Available: ${Object.keys(MODULE_REGISTRY).join(', ')}`);
  }
  return new ModuleClass(id, sampleRate);
}

/**
 * Module type categories for UI organization
 */
export const MODULE_CATEGORIES = {
  'Sound Sources': ['osc-saw', 'osc-square', 'osc-triangle', 'string'],
  'Filters': ['filter-lp24', 'filter-biquad'],
  'Modulation': ['env-adsr', 'sequencer'],
  'Utilities': ['vca', 'mixer'],
  'Effects': ['drive'],
};

/**
 * Human-readable module names
 */
export const MODULE_NAMES = {
  'osc-saw': 'Sawtooth Oscillator',
  'osc-square': 'Square Oscillator',
  'osc-triangle': 'Triangle Oscillator',
  'string': 'String (Karplus-Strong)',
  'filter-lp24': '24dB Lowpass Filter',
  'filter-biquad': 'Biquad Filter',
  'env-adsr': 'ADSR Envelope',
  'sequencer': 'Step Sequencer',
  'vca': 'VCA',
  'mixer': '4-Channel Mixer',
  'drive': 'Drive / Saturation',
};
