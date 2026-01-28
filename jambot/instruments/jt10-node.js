/**
 * JT10Node - Lead/Bass Synth (101-style)
 *
 * Monosynth with CUSTOM DSP components:
 *   - PolyBLEP saw and pulse oscillators
 *   - Sub-oscillator (square, 1-2 octaves down)
 *   - 4-pole Moog ladder filter
 *   - ADSR envelopes
 *   - LFO with multiple destinations
 *
 * Produces identical output in Web Audio (browser) and WAV rendering (Node.js).
 */

import { InstrumentNode } from '../core/node.js';
import { OfflineAudioContext } from 'node-web-audio-api';

// Load params definition
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const JT10_PARAMS = require('../params/jt10-params.json');

// Voice (monophonic)
const VOICES = ['lead'];

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
  const range = paramDef.max - paramDef.min;
  return (value - paramDef.min) / range;
}

/**
 * Create an empty pattern
 */
function createEmptyPattern(steps = 16) {
  return Array(steps).fill(null).map(() => ({
    note: 'C3',
    gate: false,
    accent: false,
    slide: false,
  }));
}

export class JT10Node extends InstrumentNode {
  constructor(config = {}) {
    super('jt10', config);

    this._voices = VOICES;
    this._pattern = createEmptyPattern();
    this._registerParams();
  }

  /**
   * Register all parameters from the JSON definition
   */
  _registerParams() {
    const leadDef = JT10_PARAMS.lead;
    if (!leadDef) return;

    for (const [paramName, paramDef] of Object.entries(leadDef)) {
      const path = `lead.${paramName}`;
      this.registerParam(path, {
        ...paramDef,
        voice: 'lead',
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
    const normalizedPath = path.startsWith('lead.') ? path : `lead.${path}`;
    return this._params[normalizedPath];
  }

  /**
   * Set a parameter value
   */
  setParam(path, value) {
    const normalizedPath = path.startsWith('lead.') ? path : `lead.${path}`;

    if (normalizedPath === 'lead.mute' || path === 'mute') {
      if (value) {
        this._params['lead.level'] = 0;
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
    const normalizedPath = path.startsWith('lead.') ? path : `lead.${path}`;
    return this._params[normalizedPath];
  }

  /**
   * Get all params for lead voice in engine units
   */
  getEngineParams() {
    const result = {};
    const leadDef = JT10_PARAMS.lead;

    if (!leadDef) return result;

    for (const paramName of Object.keys(leadDef)) {
      const path = `lead.${paramName}`;
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
    const levelEngine = this._params['lead.level'] ?? 0.8;
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
   * Get pattern length in bars
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
   * Serialize JT10 state (sparse format)
   * - Pattern: only store steps with gate=true
   * - Params: only store values that differ from defaults
   * @returns {Object}
   */
  serialize() {
    // Sparse pattern: only store active steps
    const sparsePattern = [];
    this._pattern.forEach((step, i) => {
      if (step.gate) {
        const s = { i, n: step.note };
        if (step.accent) s.a = true;
        if (step.slide) s.s = true;
        sparsePattern.push(s);
      }
    });

    // Sparse params: only store non-default values
    const sparseParams = {};
    const leadDef = JT10_PARAMS.lead;
    for (const [path, value] of Object.entries(this._params)) {
      const paramName = path.replace('lead.', '');
      const paramDef = leadDef?.[paramName];
      if (paramDef) {
        const defaultEngine = toEngine(paramDef.default, paramDef);
        if (typeof value === 'string' ? value !== paramDef.default : Math.abs(value - defaultEngine) > 0.001) {
          sparseParams[path] = value;
        }
      }
    }

    return {
      id: this.id,
      pattern: sparsePattern.length > 0 ? sparsePattern : undefined,
      patternLength: this._pattern.length,
      params: Object.keys(sparseParams).length > 0 ? sparseParams : undefined,
    };
  }

  /**
   * Deserialize JT10 state
   * Handles both sparse and legacy full formats
   * @param {Object} data
   */
  deserialize(data) {
    if (data.pattern) {
      const length = data.patternLength || 16;
      // Check if sparse format (array of {i, n, ...}) or legacy full format
      const isSparse = Array.isArray(data.pattern) && data.pattern[0]?.i !== undefined;

      if (isSparse) {
        // Expand sparse pattern to full
        this._pattern = createEmptyPattern(length);
        for (const step of data.pattern) {
          if (step.i < length) {
            this._pattern[step.i] = {
              note: step.n,
              gate: true,
              accent: step.a || false,
              slide: step.s || false,
            };
          }
        }
      } else {
        // Legacy full format
        this._pattern = JSON.parse(JSON.stringify(data.pattern));
      }
    }

    if (data.params) {
      Object.assign(this._params, data.params);
    }
  }

  /**
   * Render the pattern to an audio buffer
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

    // Dynamic import of the engine
    const { JT10Engine } = await import('../../web/public/jt10/dist/machines/jt10/engine.js');

    // Create engine with fresh context
    const context = new OfflineAudioContext(2, sampleRate, sampleRate);
    const engine = new JT10Engine({ context });

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
