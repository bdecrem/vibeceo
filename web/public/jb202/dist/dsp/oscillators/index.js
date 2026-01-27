/**
 * JB202 Oscillators - Index
 *
 * Modular oscillator components with band-limited waveforms.
 * All oscillators share the same interface for plug-and-play use.
 */

export { Oscillator } from './base.js';
export { SawtoothOscillator, createSawtooth } from './sawtooth.js';
export { SquareOscillator, createSquare } from './square.js';
export { TriangleOscillator, createTriangle } from './triangle.js';
export { PulseOscillator, createPulse } from './pulse.js';

// Import classes for factory
import { SawtoothOscillator } from './sawtooth.js';
import { SquareOscillator } from './square.js';
import { TriangleOscillator } from './triangle.js';
import { PulseOscillator } from './pulse.js';

// Waveform type constants
export const WAVEFORMS = {
  SAWTOOTH: 'sawtooth',
  SQUARE: 'square',
  TRIANGLE: 'triangle',
  PULSE: 'pulse'
};

// Factory: create oscillator by type name
export function createOscillatorSync(type, sampleRate = 44100) {
  switch (type) {
    case 'sawtooth':
    case 'saw':
      return new SawtoothOscillator(sampleRate);
    case 'square':
      return new SquareOscillator(sampleRate);
    case 'pulse':
    case 'pwm':
      return new PulseOscillator(sampleRate);
    case 'triangle':
    case 'tri':
      return new TriangleOscillator(sampleRate);
    default:
      throw new Error(`Unknown oscillator type: ${type}`);
  }
}

// Alias for convenience
export const createOscillator = createOscillatorSync;
