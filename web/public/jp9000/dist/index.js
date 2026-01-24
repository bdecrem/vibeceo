/**
 * JP9000 Modular Synthesizer
 *
 * A text-controlled modular synthesizer for Jambot.
 * Uses JB202 DSP components as building blocks.
 *
 * Features:
 * - Modular architecture with patchable modules
 * - Classic oscillators (saw, square, triangle)
 * - Karplus-Strong physical modeling strings
 * - Resonant filters (12dB biquad, 24dB lowpass)
 * - ADSR envelopes for modulation
 * - VCA and mixer for signal routing
 * - Drive/saturation effects
 */

// Core
export { Module } from './module.js';
export { Rack } from './rack.js';

// Modules
export * from './modules/index.js';

// Re-export useful utilities from JB202
export { noteToFreq, midiToFreq, noteToMidi } from '../../jb202/dist/dsp/utils/note.js';
