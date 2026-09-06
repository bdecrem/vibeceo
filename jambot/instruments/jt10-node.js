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

import { InstrumentNode, coerceChoice } from '../core/node.js';
import { OfflineAudioContext } from 'node-web-audio-api';
import { toEngine, JT10_PARAMS } from '../params/converters.js';

// Voice (monophonic)
const VOICES = ['lead'];

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

// Producer-facing aliases → canonical param names. The generic `tweak` tool
// takes any path the agent invents; before this, an unknown name such as
// 'lead.filterCutoff' was stored under a key no engine reads and
// reported success — the classic "I changed the filter and nothing happened".
const PARAM_ALIASES = {"filterCutoff": "cutoff", "filterResonance": "resonance", "filterEnvAmount": "envMod", "envAmount": "envMod", "ampAttack": "attack", "ampDecay": "decay", "ampSustain": "sustain", "ampRelease": "release"};
function normalizePath(path) {
  let p = path.startsWith('lead.') ? path.slice(5) : path;
  p = PARAM_ALIASES[p] || p;
  return `lead.${p}`;
}

/** Mute pseudo-param: true/1/'true'/'on' mute, anything else unmutes. */
function muteFlag(value) {
  if (typeof value === 'string') return !['false', '0', 'off', 'no', ''].includes(value.toLowerCase());
  return !!value;
}

export class JT10Node extends InstrumentNode {
  constructor(config = {}) {
    super(config.id || 'jt10', config);

    this._voices = VOICES;
    this._pattern = createEmptyPattern();
    this._registerParams();
  }

  /**
   * Register all parameters from the JSON definition
   */
  _registerParams() {
    // Register node-level output (handled by base class in dB)
    this.registerParam('level', { min: -60, max: 6, default: 0, unit: 'dB', hint: 'node output level' });

    const leadDef = JT10_PARAMS.lead;
    if (!leadDef) return;

    for (const [paramName, paramDef] of Object.entries(leadDef)) {
      // Skip 'level' — handled as node-level param by base class
      if (paramName === 'level') continue;

      const path = `lead.${paramName}`;
      this.registerParam(path, {
        ...paramDef,
        voice: 'lead',
        param: paramName,
      });

      if (paramDef.default === null) {
        this._params[path] = null;  // null = engine uses fallback (e.g., filter ADSR follows amp)
      } else if (paramDef.default !== undefined) {
        // Choice params pass through (no min/max for toEngine)
        this._params[path] = paramDef.unit === 'choice'
          ? paramDef.default
          : toEngine(paramDef.default, paramDef);
      }
    }
  }

  /**
   * Get a single parameter descriptor, normalizing shorthand paths
   * e.g., 'cutoff' → looks up 'lead.cutoff'
   */
  getDescriptor(path) {
    if (path === 'level') return super.getDescriptor(path);
    const normalizedPath = normalizePath(path);
    return this._descriptors[normalizedPath] || super.getDescriptor(path);
  }

  /**
   * Get a parameter value
   */
  getParam(path) {
    if (path === 'level') return super.getParam(path);
    const normalizedPath = normalizePath(path);
    return this._params[normalizedPath];
  }

  /**
   * Set a parameter value
   */
  setParam(path, value) {
    if (path === 'level') return super.setParam(path, value);

    const normalizedPath = normalizePath(path);

    // Mute → -60 dB; unmute restores the pre-mute level (a falsy value used to
    // be accepted and leave the instrument muted).
    if (normalizedPath === 'lead.mute' || path === 'mute') {
      if (muteFlag(value)) {
        if (this.getLevel() > -60) this._preMuteLevel = this.getLevel();
        this.setLevel(-60);
      } else {
        this.setLevel(this._preMuteLevel ?? 0);
        this._preMuteLevel = undefined;
      }
      return true;
    }

    if (!this._descriptors[normalizedPath]) {
      console.warn(`${this.id}: unknown parameter "${path}" (valid: ${Object.keys(this._descriptors).map(k => k.split('.').pop()).join(', ')})`);
      return false;
    }
    const descriptor = this._descriptors[normalizedPath];
    if (descriptor.unit === 'choice') {
      const v = coerceChoice(descriptor, value);
      if (v === undefined) {
        console.warn(`${this.id}: "${path}" must be one of ${(descriptor.options || []).join('|')}, got ${JSON.stringify(value)}`);
        return false;
      }
      value = v;
    }
    this._params[normalizedPath] = value;
    return true;
  }

  /**
   * Get engine param
   */
  getEngineParam(path) {
    const normalizedPath = normalizePath(path);
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
        if (paramDef.default === null) {
          // Null-default params: store if value is not null
          if (value !== null) sparseParams[path] = value;
        } else {
          const defaultEngine = toEngine(paramDef.default, paramDef);
          if (typeof value === 'string' ? value !== paramDef.default : Math.abs(value - defaultEngine) > 0.001) {
            sparseParams[path] = value;
          }
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
    } else if (data.patternLength) {
      // All-rest pattern: serialize() omits the (empty) sparse array but keeps
      // the length — a 4-bar rest pattern used to come back as 16 steps.
      this._pattern = createEmptyPattern(data.patternLength);
    }

    if (data.params) {
      // Same choice coercion as the base class: saved state may predate choice
      // validation (lfoWaveform stored as 0 silently killed the LFO).
      const params = { ...data.params };
      for (const [path, d] of Object.entries(this._descriptors)) {
        if (d?.unit !== 'choice' || !(path in params)) continue;
        const v = coerceChoice(d, params[path]);
        params[path] = v === undefined ? d.default : v;
      }
      Object.assign(this._params, params);
    }
  }

  /**
   * Get automation data for rendering (populated by render.js)
   * Returns automation in producer units with node-relative paths
   */
  _getAutomationForRender() {
    return this._renderAutomation || null;
  }

  /**
   * Render the pattern to an audio buffer
   */
  async renderPattern(options) {
    const {
      bars,
      stepDuration,
      swing = 0,
      sampleRate = 44100,
      pattern = this._pattern,
      params = null,
      automation = null,
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

    // Convert automation from producer units to engine units (same block as
    // jt30 — jt10 used to drop the lane on the floor while `automate`
    // reported success). Paths: 'lead.cutoff', 'cutoff' or an alias.
    const rawAutomation = automation || this._getAutomationForRender();
    let engineAutomation = undefined;
    if (rawAutomation && Object.keys(rawAutomation).length > 0) {
      engineAutomation = {};
      for (const [path, values] of Object.entries(rawAutomation)) {
        const paramName = normalizePath(path).slice(5);
        const paramDef = JT10_PARAMS.lead?.[paramName];
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
      swing,
      sampleRate,
      automation: engineAutomation,
    });

    return buffer;
  }
}
