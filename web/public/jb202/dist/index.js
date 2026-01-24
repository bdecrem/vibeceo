/**
 * JB202 Synth Library
 *
 * A modular bass monosynth with deterministic, cross-platform DSP components.
 * All synthesis is computed in JavaScript for identical output in:
 * - Web Audio (browser real-time playback)
 * - Offline rendering (Node.js/Jambot WAV export)
 *
 * API compatible with JB200 for drop-in replacement.
 *
 * @example
 * // Import the engine
 * import { JB202Engine } from './jb202/dist/index.js';
 *
 * // Create engine
 * const synth = new JB202Engine({ sampleRate: 44100, bpm: 120 });
 *
 * // Set parameters
 * synth.setParameter('filterCutoff', 0.5);
 * synth.setParameter('drive', 0.3);
 *
 * // Set pattern
 * synth.setPattern([
 *   { note: 'C2', gate: true, accent: true, slide: false },
 *   { note: 'C2', gate: false, accent: false, slide: false },
 *   // ...
 * ]);
 *
 * // Render to buffer (offline)
 * const buffer = await synth.renderPattern({ bars: 4 });
 *
 * // Or use real-time playback (Web Audio)
 * synth.context = new AudioContext();
 * synth.startSequencer();
 */

// Main engine
export { JB202Engine, default } from './machines/jb202/engine.js';
export { JB202Sequencer, noteToMidi, midiToNote, midiToFreq } from './machines/jb202/sequencer.js';

// DSP components (for building custom synths)
export * from './dsp/index.js';
