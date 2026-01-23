/**
 * TB303Node - Wrapper for TB-303 bass synthesizer
 *
 * Monophonic acid bass synth with sequencer.
 * Exposes parameters through the unified parameter system.
 */

import { InstrumentNode } from '../core/node.js';
import { R3D3_PARAMS, toEngine, fromEngine } from '../params/converters.js';
import { OfflineAudioContext } from 'node-web-audio-api';

// Voice (monophonic)
const VOICES = ['bass'];

/**
 * Create an empty 16-step pattern
 * @param {number} steps - Number of steps (default 16 = 1 bar)
 */
function createEmptyPattern(steps = 16) {
  return Array(steps).fill(null).map(() => ({
    note: 'C2',
    gate: false,
    accent: false,
    slide: false,
  }));
}

export class TB303Node extends InstrumentNode {
  constructor(config = {}) {
    super('bass', config);

    this._voices = VOICES;

    // Initialize pattern
    this._pattern = createEmptyPattern();

    // Waveform
    this._waveform = 'sawtooth';

    // Node output level in dB (-60 to +6, 0 = unity)
    this._level = 0;

    // Register all parameters
    this._registerParams();
  }

  /**
   * Register all parameters from the JSON definition
   * Stores values in ENGINE UNITS (0-1) internally
   */
  _registerParams() {
    // Node-level output gain
    this.registerParam('level', { min: -60, max: 6, default: 0, unit: 'dB', hint: 'node output level' });

    const bassDef = R3D3_PARAMS.bass;
    if (!bassDef) return;

    for (const [paramName, paramDef] of Object.entries(bassDef)) {
      const path = `bass.${paramName}`;
      this.registerParam(path, {
        ...paramDef,
        voice: 'bass',
        param: paramName,
      });

      // Initialize with default value in engine units
      if (paramDef.default !== undefined) {
        this._params[path] = toEngine(paramDef.default, paramDef);
      }
    }
  }

  /**
   * Get a parameter value
   * @param {string} path - e.g., 'bass.cutoff' or 'cutoff'
   * @returns {*}
   */
  getParam(path) {
    if (path === 'level') return this._level;
    if (path === 'waveform') return this._waveform;

    // Normalize path
    const normalizedPath = path.startsWith('bass.') ? path : `bass.${path}`;
    return this._params[normalizedPath];
  }

  /**
   * Set a parameter value (stores ENGINE UNITS)
   * @param {string} path - e.g., 'bass.cutoff' or 'cutoff'
   * @param {*} value
   * @returns {boolean}
   */
  setParam(path, value) {
    if (path === 'level') {
      this._level = Math.max(-60, Math.min(6, value));
      return true;
    }
    if (path === 'waveform') {
      this._waveform = value;
      return true;
    }

    // Normalize path
    const normalizedPath = path.startsWith('bass.') ? path : `bass.${path}`;

    // Handle mute
    if (normalizedPath === 'bass.mute' || path === 'mute') {
      if (value) {
        this._params['bass.level'] = 0;
      }
      return true;
    }

    this._params[normalizedPath] = value;
    return true;
  }

  /**
   * Get a parameter value in engine units
   * @param {string} path
   * @returns {number}
   */
  getEngineParam(path) {
    const normalizedPath = path.startsWith('bass.') ? path : `bass.${path}`;
    return this._params[normalizedPath];
  }

  /**
   * Get all params for bass voice in engine units
   * @returns {Object}
   */
  getEngineParams() {
    const result = {};
    const bassDef = R3D3_PARAMS.bass;

    if (!bassDef) return result;

    for (const paramName of Object.keys(bassDef)) {
      const path = `bass.${paramName}`;
      const value = this._params[path];

      if (value !== undefined) {
        result[paramName] = value;
      }
    }

    return result;
  }

  /**
   * Get node output level as linear gain multiplier
   * @returns {number}
   */
  getOutputGain() {
    return Math.pow(10, this._level / 20);
  }

  /**
   * Get waveform
   * @returns {string}
   */
  getWaveform() {
    return this._waveform;
  }

  /**
   * Set waveform
   * @param {string} waveform
   */
  setWaveform(waveform) {
    this._waveform = waveform;
  }

  /**
   * Get the current pattern
   * @returns {Array}
   */
  getPattern() {
    return this._pattern;
  }

  /**
   * Set the pattern
   * @param {Array} pattern
   */
  setPattern(pattern) {
    this._pattern = pattern;
  }

  /**
   * Get pattern length in steps
   * @returns {number}
   */
  getPatternLength() {
    return this._pattern.length;
  }

  /**
   * Render the pattern to an audio buffer
   * @param {Object} options - Render options
   * @param {number} options.bars - Number of bars to render
   * @param {number} options.stepDuration - Duration of one step in seconds
   * @param {number} options.swing - Swing amount (0-1)
   * @param {number} options.sampleRate - Sample rate (default 44100)
   * @param {Array} [options.pattern] - Optional pattern override
   * @param {Object} [options.params] - Optional params override
   * @returns {Promise<AudioBuffer>}
   */
  async renderPattern(options) {
    const {
      bars,
      stepDuration,
      swing = 0,
      sampleRate = 44100,
      pattern = this._pattern,
      params = null,
    } = options;

    // Check if pattern has any active notes
    if (!pattern?.some(s => s.gate)) {
      return null;
    }

    // Dynamic import to avoid circular dependencies
    const TB303Mod = await import('../../web/public/303/dist/machines/tb303/engine.js');
    const TB303Engine = TB303Mod.TB303Engine || TB303Mod.default;

    // Create offline context
    const stepsPerBar = 16;
    const totalSteps = stepsPerBar * bars;
    const duration = totalSteps * stepDuration + 2; // Extra for release tails

    const context = new OfflineAudioContext(2, Math.ceil(duration * sampleRate), sampleRate);

    // Create engine
    const bass = new TB303Engine({ context, engine: 'E1' });

    // Setup master gain
    const masterGain = context.createGain();
    masterGain.gain.value = this.getOutputGain();
    bass.connectOutput(masterGain);
    masterGain.connect(context.destination);

    // Apply waveform
    if (this._waveform) {
      bass.setWaveform(this._waveform);
    }

    // Apply params - use override if provided, otherwise node's internal params
    const engineParams = params || this.getEngineParams();
    Object.entries(engineParams).forEach(([key, value]) => {
      if (key !== 'waveform') {
        bass.setParameter(key, value);
      }
    });

    // Set pattern on engine
    bass.setPattern(pattern);

    // Helper to convert note name to frequency
    const noteToFreq = (note) => {
      const noteMap = { 'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11 };
      const match = note.match(/^([A-G])([#b]?)(\d+)$/);
      if (!match) return 440;
      let n = noteMap[match[1]];
      if (match[2] === '#') n += 1;
      if (match[2] === 'b') n -= 1;
      const octave = parseInt(match[3]);
      const midi = n + (octave + 1) * 12;
      return 440 * Math.pow(2, (midi - 69) / 12);
    };

    // Get the bass voice
    const bassVoice = bass.voices.get('bass');

    // Schedule all notes
    const swingAmount = swing;
    const maxSwingDelay = stepDuration * 0.5;

    for (let i = 0; i < totalSteps; i++) {
      const step = i % pattern.length;
      let time = i * stepDuration;

      // Apply swing to off-beats
      if (step % 2 === 1) {
        time += swingAmount * maxSwingDelay;
      }

      const stepData = pattern[step];
      if (stepData?.gate && bassVoice) {
        const freq = noteToFreq(stepData.note);
        const nextStep = pattern[(step + 1) % pattern.length];
        const shouldSlide = stepData.slide && nextStep?.gate;
        const nextFreq = shouldSlide ? noteToFreq(nextStep.note) : null;
        bassVoice.trigger(time, 0.8, freq, stepData.accent, shouldSlide, nextFreq);
      }
    }

    // Render
    const buffer = await context.startRendering();
    return buffer;
  }

  /**
   * Serialize full TB303 state
   * @returns {Object}
   */
  serialize() {
    return {
      id: this.id,
      waveform: this._waveform,
      pattern: JSON.parse(JSON.stringify(this._pattern)),
      params: { ...this._params },
      level: this._level,
    };
  }

  /**
   * Deserialize TB303 state
   * @param {Object} data
   */
  deserialize(data) {
    if (data.waveform) this._waveform = data.waveform;
    if (data.pattern) this._pattern = JSON.parse(JSON.stringify(data.pattern));
    if (data.params) this._params = { ...data.params };
    if (data.level !== undefined) this._level = data.level;
  }
}

export { VOICES };
