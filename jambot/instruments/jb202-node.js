/**
 * JB202Node - Modular Bass Synth
 *
 * 2-oscillator bass synth with CUSTOM DSP components:
 *   - PolyBLEP band-limited oscillators
 *   - 24dB/oct cascaded biquad lowpass filter
 *   - Exponential ADSR envelopes
 *   - Soft-clip drive saturation
 *
 * Produces identical output in Web Audio (browser) and WAV rendering (Node.js).
 * Uses the unified parameter system from params/converters.js.
 * Supports variable pattern lengths (default 16 steps = 1 bar).
 */

import { InstrumentNode } from '../core/node.js';
import { JB202_PARAMS, toEngine, fromEngine } from '../params/converters.js';
import { JB202Engine } from '../../web/public/jb202/dist/machines/jb202/engine.js';
import { OfflineAudioContext } from 'node-web-audio-api';

// Voice (monophonic)
const VOICES = ['bass'];

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

export class JB202Node extends InstrumentNode {
  constructor(config = {}) {
    super('jb202', config);

    this._voices = VOICES;

    // Initialize pattern
    this._pattern = createEmptyPattern();

    // Register all parameters from jb202-params.json
    this._registerParams();
  }

  /**
   * Register all parameters from the JSON definition
   * Stores values in ENGINE UNITS (0-1) internally for compatibility with render loop
   * Node-level 'level' param is stored in dB and handled by base InstrumentNode
   */
  _registerParams() {
    // Register node-level output (handled by base class in dB)
    this.registerParam('level', { min: -60, max: 6, default: 0, unit: 'dB', hint: 'node output level' });

    const bassDef = JB202_PARAMS.bass;
    if (!bassDef) return;

    for (const [paramName, paramDef] of Object.entries(bassDef)) {
      // Skip 'level' — handled as node-level param by base class
      if (paramName === 'level') continue;

      const path = `bass.${paramName}`;
      this.registerParam(path, {
        ...paramDef,
        voice: 'bass',
        param: paramName,
      });

      // Convert default value from producer units to engine units
      // This matches jambot.js's inline createSession which stores engine units
      if (paramDef.default !== undefined) {
        this._params[path] = toEngine(paramDef.default, paramDef);
      }
    }
  }

  /**
   * Get a single parameter descriptor, normalizing shorthand paths
   * e.g., 'filterCutoff' → looks up 'bass.filterCutoff'
   */
  getDescriptor(path) {
    if (path === 'level') return super.getDescriptor(path);
    const normalizedPath = path.startsWith('bass.') ? path : `bass.${path}`;
    return this._descriptors[normalizedPath] || super.getDescriptor(path);
  }

  /**
   * Get a parameter value in producer-friendly units
   * @param {string} path - e.g., 'bass.filterCutoff' or 'filterCutoff' (shorthand)
   * @returns {*}
   */
  getParam(path) {
    // Node-level output handled by base class
    if (path === 'level') {
      return super.getParam(path);
    }
    // Normalize path - add 'bass.' prefix if missing
    const normalizedPath = path.startsWith('bass.') ? path : `bass.${path}`;
    return this._params[normalizedPath];
  }

  /**
   * Set a parameter value (stores ENGINE UNITS, 0-1 normalized)
   * Tools convert from producer units before calling this.
   * @param {string} path - e.g., 'bass.filterCutoff' or 'filterCutoff'
   * @param {*} value - Value in engine units (0-1 for most params)
   * @returns {boolean}
   */
  setParam(path, value) {
    // Node-level output handled by base class
    if (path === 'level') {
      return super.setParam(path, value);
    }

    // Normalize path
    const normalizedPath = path.startsWith('bass.') ? path : `bass.${path}`;

    // Handle mute — set node level to minimum dB
    if (normalizedPath === 'bass.mute' || path === 'mute') {
      if (value) {
        this.setLevel(-60);
      }
      return true;
    }

    // Store engine value directly - no clamping needed
    // The descriptors have producer-friendly ranges (Hz, dB, etc.)
    // but we store engine units (0-1), so clamping against those ranges would be wrong.
    // Tools are responsible for validation before conversion.
    this._params[normalizedPath] = value;
    return true;
  }

  /**
   * Get a parameter value in engine units (0-1)
   * Used by render loop. Values are already stored in engine units.
   * @param {string} path
   * @returns {number}
   */
  getEngineParam(path) {
    const normalizedPath = path.startsWith('bass.') ? path : `bass.${path}`;
    return this._params[normalizedPath];
  }

  /**
   * Get all params for bass voice in engine units
   * Values are already stored in engine units (0-1), so we return them directly.
   * @returns {Object}
   */
  getEngineParams() {
    const result = {};
    const bassDef = JB202_PARAMS.bass;

    if (!bassDef) return result;

    for (const paramName of Object.keys(bassDef)) {
      const path = `bass.${paramName}`;
      const value = this._params[path];

      if (value !== undefined) {
        // Values already in engine units - return directly
        result[paramName] = value;
      }
    }

    return result;
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
   * @param {Array} pattern - Pattern array (any length, 16 steps = 1 bar)
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
   * Get pattern length in bars (16 steps = 1 bar)
   * @returns {number}
   */
  getPatternBars() {
    return this._pattern.length / 16;
  }

  /**
   * Resize pattern to new length (preserves existing steps, fills new steps with empty)
   * @param {number} steps - New pattern length in steps
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
   * Serialize full JB202 state
   * @returns {Object}
   */
  serialize() {
    return {
      id: this.id,
      pattern: JSON.parse(JSON.stringify(this._pattern)),
      params: { ...this._params },
    };
  }

  /**
   * Deserialize JB202 state
   * @param {Object} data
   */
  deserialize(data) {
    if (data.pattern) this._pattern = JSON.parse(JSON.stringify(data.pattern));
    if (data.params) this._params = { ...data.params };
  }

  /**
   * Render the pattern to an audio buffer using custom DSP
   * @param {Object} options - Render options
   * @param {number} options.bars - Number of bars to render (pattern loops to fill)
   * @param {number} options.stepDuration - Duration of one step in seconds
   * @param {number} options.sampleRate - Sample rate (default 44100)
   * @param {Array} [options.pattern] - Optional pattern override (uses node's pattern if not provided)
   * @param {Object} [options.params] - Optional params override (uses node's params if not provided)
   * @returns {Promise<AudioBuffer>}
   */
  async renderPattern(options) {
    const {
      bars,
      stepDuration,
      sampleRate = 44100,
      pattern = this._pattern,
      params = null,
      automation = null,
    } = options;

    // Skip if no active notes
    if (!pattern?.some(s => s.gate)) {
      return null;
    }

    // Create engine with fresh context
    const context = new OfflineAudioContext(2, sampleRate, sampleRate);
    const engine = new JB202Engine({ context });

    // Apply node's registered params (converted from jb202-params.json defaults)
    // If explicit params override provided, use those instead
    const engineParams = params || this.getEngineParams();
    Object.entries(engineParams).forEach(([key, value]) => {
      engine.setParameter(key, value);
    });

    // Set pattern on engine
    engine.setPattern(pattern);

    // Convert automation from producer units to engine units
    // Automation uses node-relative paths: 'bass.filterCutoff' or 'filterCutoff'
    // Use node's own automation if no explicit automation passed
    const rawAutomation = automation || this._getAutomationForRender();
    let engineAutomation = undefined;
    if (rawAutomation && Object.keys(rawAutomation).length > 0) {
      engineAutomation = {};
      for (const [path, values] of Object.entries(rawAutomation)) {
        // Normalize path — strip 'bass.' prefix if present
        const paramName = path.startsWith('bass.') ? path.slice(5) : path;
        const paramDef = JB202_PARAMS.bass?.[paramName];
        if (paramDef && Array.isArray(values)) {
          engineAutomation[paramName] = values.map(v =>
            v !== null && v !== undefined ? toEngine(v, paramDef) : null
          );
        }
      }
    }

    // Render
    const buffer = await engine.renderPattern({
      bars,
      stepDuration,
      sampleRate,
      automation: engineAutomation,
    });

    return buffer;
  }

  /**
   * Get automation data for rendering (from ParamSystem via session)
   * Returns automation in producer units with node-relative paths
   * @returns {Object|null}
   */
  _getAutomationForRender() {
    // This is populated by render.js before calling renderPattern
    return this._renderAutomation || null;
  }
}
