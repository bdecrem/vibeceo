/**
 * JB01Node - Reference Drum Machine
 *
 * 8-voice drum machine with pattern storage.
 * Exposes parameters through the unified parameter system.
 * Supports variable pattern lengths (default 16 steps = 1 bar).
 */

import { InstrumentNode } from '../core/node.js';
import { JB01_PARAMS, toEngine, fromEngine } from '../params/converters.js';
import { JB01Engine } from '../../web/public/jb01/dist/machines/jb01/engine.js';
import { OfflineAudioContext } from 'node-web-audio-api';

// Voice IDs
const VOICES = ['kick', 'snare', 'clap', 'ch', 'oh', 'perc', 'tom', 'cymbal'];

/**
 * Create an empty pattern for one voice
 * @param {number} steps - Number of steps (default 16 = 1 bar)
 */
function createEmptyVoicePattern(steps = 16) {
  return Array(steps).fill(null).map(() => ({
    velocity: 0,
    accent: false,
  }));
}

/**
 * Create an empty pattern for all voices
 * @param {number} steps - Number of steps (default 16 = 1 bar)
 */
function createEmptyPattern(steps = 16) {
  const pattern = {};
  for (const voice of VOICES) {
    pattern[voice] = createEmptyVoicePattern(steps);
  }
  return pattern;
}

export class JB01Node extends InstrumentNode {
  constructor(config = {}) {
    super('jb01', config);

    this._voices = VOICES;

    // Initialize pattern
    this._pattern = createEmptyPattern();

    // Register all parameters from jb01-params.json
    this._registerParams();
  }

  /**
   * Register all parameters from the JSON definition
   * Stores values in ENGINE UNITS (0-1) internally
   */
  _registerParams() {
    for (const voice of VOICES) {
      const voiceDef = JB01_PARAMS[voice];
      if (!voiceDef) continue;

      for (const [paramName, paramDef] of Object.entries(voiceDef)) {
        const path = `${voice}.${paramName}`;
        this.registerParam(path, {
          ...paramDef,
          voice,
          param: paramName,
        });

        // Convert default value from producer units to engine units
        if (paramDef.default !== undefined) {
          this._params[path] = toEngine(paramDef.default, paramDef);
        }
      }
    }
  }

  /**
   * Get a parameter value in ENGINE UNITS (0-1 for most params)
   * Note: Tools should use fromEngine() to convert to producer-friendly units
   * @param {string} path - e.g., 'kick.decay'
   * @returns {number}
   */
  getParam(path) {
    return this._params[path];
  }

  /**
   * Set a parameter value (stores ENGINE UNITS, 0-1 normalized)
   * Tools convert from producer units before calling this.
   * @param {string} path - e.g., 'kick.decay'
   * @param {*} value - Value in engine units (0-1 for most params)
   * @returns {boolean}
   */
  setParam(path, value) {
    // Handle mute (sets level to minimum engine value)
    const parts = path.split('.');
    if (parts.length === 2 && parts[1] === 'mute') {
      if (value) {
        this._params[`${parts[0]}.level`] = 0;
      }
      return true;
    }

    // Validate: warn if value appears to be in producer units instead of engine units
    if (typeof value === 'number' && parts.length === 2) {
      const [voice, paramName] = parts;
      const paramDef = JB01_PARAMS[voice]?.[paramName];
      if (paramDef) {
        if (paramDef.unit === '0-100' && value > 1.5) {
          console.warn(`JB01Node.setParam: ${path}=${value} appears to be producer units (0-100), expected engine units (0-1). Converting automatically.`);
          value = toEngine(value, paramDef);
        } else if (paramDef.unit === 'dB' && value < -1.5 && value >= -60) {
          console.warn(`JB01Node.setParam: ${path}=${value} appears to be dB, expected engine units (0-1). Converting automatically.`);
          value = toEngine(value, paramDef);
        }
      }
    }

    this._params[path] = value;
    return true;
  }

  /**
   * Get a parameter value in engine units (0-1)
   * Used by render loop.
   * @param {string} path
   * @returns {number}
   */
  getEngineParam(path) {
    return this._params[path];
  }

  /**
   * Get all params for a voice in engine units
   * @param {string} voice
   * @returns {Object}
   */
  getVoiceEngineParams(voice) {
    const result = {};
    const voiceDef = JB01_PARAMS[voice];

    if (!voiceDef) return result;

    for (const paramName of Object.keys(voiceDef)) {
      const path = `${voice}.${paramName}`;
      const value = this._params[path];

      if (value !== undefined) {
        result[paramName] = value;
      }
    }

    return result;
  }

  /**
   * Get node output level as linear gain multiplier
   * Returns 1.0 (unity) - individual voice levels are handled separately
   * @returns {number}
   */
  getOutputGain() {
    return 1.0;
  }

  /**
   * Get the current pattern
   * @returns {Object}
   */
  getPattern() {
    return this._pattern;
  }

  /**
   * Set the pattern
   * @param {Object} pattern - { kick: [...], snare: [...], ... }
   */
  setPattern(pattern) {
    this._pattern = pattern;
  }

  /**
   * Set a single voice pattern
   * @param {string} voice
   * @param {Array} pattern
   */
  setVoicePattern(voice, pattern) {
    if (VOICES.includes(voice)) {
      this._pattern[voice] = pattern;
    }
  }

  /**
   * Get a single voice pattern
   * @param {string} voice
   * @returns {Array}
   */
  getVoicePattern(voice) {
    return this._pattern[voice] || createEmptyVoicePattern();
  }

  /**
   * Get pattern length in steps (uses kick pattern as reference)
   * @returns {number}
   */
  getPatternLength() {
    return this._pattern.kick?.length || 16;
  }

  /**
   * Get pattern length in bars (16 steps = 1 bar)
   * @returns {number}
   */
  getPatternBars() {
    return this.getPatternLength() / 16;
  }

  /**
   * Resize pattern to new length (preserves existing steps, fills new steps with empty)
   * @param {number} steps - New pattern length in steps
   */
  resizePattern(steps) {
    const currentLength = this.getPatternLength();
    if (steps === currentLength) return;

    for (const voice of VOICES) {
      const current = this._pattern[voice] || [];
      if (steps < current.length) {
        this._pattern[voice] = current.slice(0, steps);
      } else {
        const empty = createEmptyVoicePattern(steps - current.length);
        this._pattern[voice] = [...current, ...empty];
      }
    }
  }

  /**
   * Render the pattern to an audio buffer
   * @param {Object} options - Render options
   * @param {number} options.bars - Number of bars to render (pattern loops to fill)
   * @param {number} options.stepDuration - Duration of one step in seconds
   * @param {number} options.swing - Swing amount (0-1)
   * @param {number} options.sampleRate - Sample rate (default 44100)
   * @param {Object} [options.pattern] - Optional pattern override (uses node's pattern if not provided)
   * @param {Object} [options.params] - Optional voice params override (uses node's params if not provided)
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

    // Check if pattern has any hits
    const hasHits = VOICES.some(voice =>
      pattern[voice]?.some(step => step?.velocity > 0)
    );
    if (!hasHits) {
      return null;
    }

    // Create engine with fresh context
    const context = new OfflineAudioContext(2, sampleRate, sampleRate);
    const engine = new JB01Engine({ context });

    // Apply voice params - use override if provided, otherwise node's internal params
    for (const voice of VOICES) {
      const voiceParams = params?.[voice] || this.getVoiceEngineParams(voice);
      for (const [paramId, value] of Object.entries(voiceParams)) {
        try {
          engine.setVoiceParam(voice, paramId, value);
        } catch (e) {
          // Ignore invalid params
        }
      }
    }

    // Render pattern
    const buffer = await engine.renderPattern(pattern, {
      bars,
      stepDuration,
      swing,
      sampleRate,
    });

    return buffer;
  }

  /**
   * Render each voice to a separate buffer (for per-voice effects)
   * Used by render.js when voice-level effect chains are present.
   *
   * @param {Object} options - Same as renderPattern options
   * @returns {Promise<Object>} Map of voice -> AudioBuffer
   */
  async renderVoices(options) {
    const {
      bars,
      stepDuration,
      swing = 0,
      sampleRate = 44100,
      pattern = this._pattern,
      params = null,
    } = options;

    const voiceBuffers = {};

    for (const voice of VOICES) {
      // Check if this voice has any hits
      const voicePattern = pattern[voice];
      const hasHits = voicePattern?.some(step => step?.velocity > 0);
      if (!hasHits) continue;

      // Create a pattern with only this voice
      const soloPattern = {};
      for (const v of VOICES) {
        if (v === voice) {
          soloPattern[v] = voicePattern;
        } else {
          soloPattern[v] = createEmptyVoicePattern(voicePattern.length);
        }
      }

      // Create engine with fresh context for this voice
      const context = new OfflineAudioContext(2, sampleRate, sampleRate);
      const engine = new JB01Engine({ context });

      // Apply voice params
      const voiceParams = params?.[voice] || this.getVoiceEngineParams(voice);
      for (const [paramId, value] of Object.entries(voiceParams)) {
        try {
          engine.setVoiceParam(voice, paramId, value);
        } catch (e) {
          // Ignore invalid params
        }
      }

      // Render just this voice
      const buffer = await engine.renderPattern(soloPattern, {
        bars,
        stepDuration,
        swing,
        sampleRate,
      });

      if (buffer) {
        voiceBuffers[voice] = buffer;
      }
    }

    return voiceBuffers;
  }

  /**
   * Serialize full JB01 state
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
   * Deserialize JB01 state
   * Handles migration from legacy formats where producer values might have been stored
   * @param {Object} data
   */
  deserialize(data) {
    if (data.pattern) this._pattern = JSON.parse(JSON.stringify(data.pattern));
    if (data.params) {
      // Validate and convert params - handle legacy data with producer values
      const migratedParams = {};
      for (const [path, value] of Object.entries(data.params)) {
        const [voice, paramName] = path.split('.');
        const paramDef = JB01_PARAMS[voice]?.[paramName];

        if (paramDef && typeof value === 'number') {
          // Check if value is outside engine range (0-1) for non-semitone params
          // This indicates legacy producer-unit data that needs conversion
          if (paramDef.unit === '0-100' && value > 1.5) {
            // Legacy producer value (e.g., 55 instead of 0.55)
            migratedParams[path] = toEngine(value, paramDef);
          } else if (paramDef.unit === 'dB' && value < -1.5) {
            // Legacy dB value (e.g., -6 instead of engine value)
            migratedParams[path] = toEngine(value, paramDef);
          } else {
            // Already in engine units
            migratedParams[path] = value;
          }
        } else {
          migratedParams[path] = value;
        }
      }
      this._params = migratedParams;
    }
  }
}

export { VOICES };
