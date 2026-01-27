/**
 * JT30Node - Acid Bass Synth (303-style)
 *
 * Monosynth with CUSTOM DSP components:
 *   - PolyBLEP band-limited oscillators (saw/square)
 *   - 4-pole Moog ladder filter
 *   - ADSR envelopes with accent modulation
 *   - Soft-clip drive saturation
 *
 * Produces identical output in Web Audio (browser) and WAV rendering (Node.js).
 */

import { InstrumentNode } from '../core/node.js';
import { OfflineAudioContext } from 'node-web-audio-api';

// Load params definition
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const JT30_PARAMS = require('../params/jt30-params.json');

// Voice (monophonic)
const VOICES = ['bass'];

/**
 * Convert producer units to engine units (0-1)
 */
function toEngine(value, paramDef) {
  if (paramDef.unit === 'choice') {
    return value;
  }
  if (paramDef.unit === '0-100') {
    return value / 100;
  }
  // For Hz, cents, etc., normalize to 0-1
  const range = paramDef.max - paramDef.min;
  return (value - paramDef.min) / range;
}

/**
 * Create an empty pattern
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

export class JT30Node extends InstrumentNode {
  constructor(config = {}) {
    super('jt30', config);

    this._voices = VOICES;
    this._pattern = createEmptyPattern();
    this._registerParams();
  }

  /**
   * Register all parameters from the JSON definition
   */
  _registerParams() {
    const bassDef = JT30_PARAMS.bass;
    if (!bassDef) return;

    for (const [paramName, paramDef] of Object.entries(bassDef)) {
      const path = `bass.${paramName}`;
      this.registerParam(path, {
        ...paramDef,
        voice: 'bass',
        param: paramName,
      });

      if (paramDef.default !== undefined) {
        this._params[path] = toEngine(paramDef.default, paramDef);
      }
    }
  }

  /**
   * Get a parameter value
   */
  getParam(path) {
    const normalizedPath = path.startsWith('bass.') ? path : `bass.${path}`;
    return this._params[normalizedPath];
  }

  /**
   * Set a parameter value (stores ENGINE UNITS, 0-1 normalized)
   */
  setParam(path, value) {
    const normalizedPath = path.startsWith('bass.') ? path : `bass.${path}`;

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
   * Get engine param
   */
  getEngineParam(path) {
    const normalizedPath = path.startsWith('bass.') ? path : `bass.${path}`;
    return this._params[normalizedPath];
  }

  /**
   * Get all params for bass voice in engine units
   */
  getEngineParams() {
    const result = {};
    const bassDef = JT30_PARAMS.bass;

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
   * Get node output level
   */
  getOutputGain() {
    const levelEngine = this._params['bass.level'] ?? 1.0;
    return levelEngine;
  }

  /**
   * Get the current pattern
   */
  getPattern() {
    return this._pattern;
  }

  /**
   * Set the pattern
   */
  setPattern(pattern) {
    this._pattern = pattern;
  }

  /**
   * Get pattern length in steps
   */
  getPatternLength() {
    return this._pattern.length;
  }

  /**
   * Get pattern length in bars (16 steps = 1 bar)
   */
  getPatternBars() {
    return this._pattern.length / 16;
  }

  /**
   * Resize pattern
   */
  resizePattern(steps) {
    const current = this._pattern;
    if (steps === current.length) return;

    if (steps < current.length) {
      this._pattern = current.slice(0, steps);
    } else {
      const empty = createEmptyPattern(steps - current.length);
      this._pattern = [...current, ...empty];
    }
  }

  /**
   * Serialize full state
   */
  serialize() {
    return {
      id: this.id,
      pattern: JSON.parse(JSON.stringify(this._pattern)),
      params: { ...this._params },
    };
  }

  /**
   * Deserialize state
   */
  deserialize(data) {
    if (data.pattern) this._pattern = JSON.parse(JSON.stringify(data.pattern));
    if (data.params) this._params = { ...data.params };
  }

  /**
   * Render the pattern to an audio buffer using custom DSP
   */
  async renderPattern(options) {
    const {
      bars,
      stepDuration,
      sampleRate = 44100,
      pattern = this._pattern,
      params = null,
    } = options;

    // Skip if no active notes
    if (!pattern?.some(s => s.gate)) {
      return null;
    }

    // Dynamic import of the engine (uses web public path)
    const { JT30Engine } = await import('../../web/public/jt30/dist/machines/jt30/engine.js');

    // Create engine with fresh context
    const context = new OfflineAudioContext(2, sampleRate, sampleRate);
    const engine = new JT30Engine({ context });

    // Apply params
    const engineParams = params || this.getEngineParams();
    Object.entries(engineParams).forEach(([key, value]) => {
      engine.setParameter(key, value);
    });

    // Set pattern on engine
    engine.setPattern(pattern);

    // Render
    const buffer = await engine.renderPattern({
      bars,
      stepDuration,
      sampleRate,
    });

    return buffer;
  }
}
