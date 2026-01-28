/**
 * JT90Node - Drum Machine (909-style)
 *
 * Multi-voice drum machine with CUSTOM DSP components:
 *   - Kick: Triangle-to-sine with pitch envelope
 *   - Snare: Tuned oscillators + filtered noise
 *   - Clap: Multiple noise bursts
 *   - Hi-hats: 6 metallic oscillators + noise
 *   - Toms: Sine-like with pitch envelope
 *   - Cymbals: 8 metallic oscillators + noise
 *
 * Produces identical output in Web Audio (browser) and WAV rendering (Node.js).
 */

import { InstrumentNode } from '../core/node.js';
import { OfflineAudioContext } from 'node-web-audio-api';

// Load params definition
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const JT90_PARAMS = require('../params/jt90-params.json');

// All drum voices (user-facing names)
const VOICES = ['kick', 'snare', 'clap', 'rimshot', 'lowtom', 'midtom', 'hitom', 'ch', 'oh', 'crash', 'ride'];

// Map from user-facing voice names to engine voice names
const VOICE_TO_ENGINE = {
  kick: 'kick',
  snare: 'snare',
  clap: 'clap',
  rimshot: 'rimshot',
  lowtom: 'ltom',
  midtom: 'mtom',
  hitom: 'htom',
  ch: 'ch',
  oh: 'oh',
  crash: 'crash',
  ride: 'ride',
};

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
  if (paramDef.unit === 'cents') {
    // Normalize cents to 0-1 range
    const range = paramDef.max - paramDef.min;
    return (value - paramDef.min) / range;
  }
  const range = paramDef.max - paramDef.min;
  return (value - paramDef.min) / range;
}

/**
 * Create an empty multi-track pattern
 */
function createEmptyPattern(steps = 16) {
  const pattern = {};
  for (const voice of VOICES) {
    pattern[voice] = Array(steps).fill(null).map(() => ({
      velocity: 0,
      accent: false,
    }));
  }
  return pattern;
}

export class JT90Node extends InstrumentNode {
  constructor(config = {}) {
    super('jt90', config);

    this._voices = VOICES;
    this._pattern = createEmptyPattern();
    this._swing = 0;
    this._accentLevel = 1.0;
    this._registerParams();
  }

  /**
   * Register all parameters from the JSON definition
   */
  _registerParams() {
    for (const voice of VOICES) {
      const voiceDef = JT90_PARAMS[voice];
      if (!voiceDef) continue;

      for (const [paramName, paramDef] of Object.entries(voiceDef)) {
        const path = `${voice}.${paramName}`;
        this.registerParam(path, {
          ...paramDef,
          voice,
          param: paramName,
        });

        if (paramDef.default !== undefined) {
          this._params[path] = toEngine(paramDef.default, paramDef);
        }
      }
    }
  }

  /**
   * Get a parameter value
   */
  getParam(path) {
    return this._params[path];
  }

  /**
   * Set a parameter value
   */
  setParam(path, value) {
    // Handle mute for any voice
    if (path.endsWith('.mute')) {
      const voice = path.split('.')[0];
      if (value) {
        this._params[`${voice}.level`] = 0;
      }
      return true;
    }

    this._params[path] = value;
    return true;
  }

  /**
   * Get engine param
   */
  getEngineParam(path) {
    return this._params[path];
  }

  /**
   * Get all params for a voice in engine units
   */
  getVoiceParams(voiceId) {
    const result = {};
    const voiceDef = JT90_PARAMS[voiceId];

    if (!voiceDef) return result;

    for (const paramName of Object.keys(voiceDef)) {
      const path = `${voiceId}.${paramName}`;
      const value = this._params[path];

      if (value !== undefined) {
        result[paramName] = value;
      }
    }

    return result;
  }

  /**
   * Get all voice params for all voices
   */
  getAllVoiceParams() {
    const result = {};
    for (const voice of VOICES) {
      result[voice] = this.getVoiceParams(voice);
    }
    return result;
  }

  /**
   * Get node output level (master)
   */
  getOutputGain() {
    return 1.0;
  }

  /**
   * Get swing amount
   */
  getSwing() {
    return this._swing;
  }

  /**
   * Set swing amount
   */
  setSwing(swing) {
    this._swing = Math.max(0, Math.min(1, swing));
  }

  /**
   * Get accent level
   */
  getAccentLevel() {
    return this._accentLevel;
  }

  /**
   * Set accent level
   */
  setAccentLevel(level) {
    this._accentLevel = Math.max(0, Math.min(1, level));
  }

  /**
   * Get the current pattern (all tracks)
   */
  getPattern() {
    return this._pattern;
  }

  /**
   * Get pattern for a specific track
   */
  getTrackPattern(voiceId) {
    return this._pattern[voiceId] || [];
  }

  /**
   * Set the full pattern
   */
  setPattern(pattern) {
    this._pattern = pattern;
  }

  /**
   * Set pattern for a specific track
   */
  setTrackPattern(voiceId, trackPattern) {
    if (VOICES.includes(voiceId)) {
      this._pattern[voiceId] = trackPattern;
    }
  }

  /**
   * Set a step for a specific track
   */
  setTrackStep(voiceId, stepIndex, stepData) {
    if (VOICES.includes(voiceId) && this._pattern[voiceId]) {
      this._pattern[voiceId][stepIndex] = {
        ...this._pattern[voiceId][stepIndex],
        ...stepData,
      };
    }
  }

  /**
   * Get pattern length in steps
   */
  getPatternLength() {
    const firstTrack = this._pattern[VOICES[0]];
    return firstTrack ? firstTrack.length : 16;
  }

  /**
   * Get pattern length in bars
   */
  getPatternBars() {
    return this.getPatternLength() / 16;
  }

  /**
   * Resize pattern
   */
  resizePattern(steps) {
    for (const voice of VOICES) {
      const current = this._pattern[voice] || [];
      if (steps === current.length) continue;

      if (steps < current.length) {
        this._pattern[voice] = current.slice(0, steps);
      } else {
        const empty = Array(steps - current.length).fill(null).map(() => ({
          velocity: 0,
          accent: false,
        }));
        this._pattern[voice] = [...current, ...empty];
      }
    }
  }

  /**
   * Serialize JT90 state (sparse format)
   * - Patterns: only store steps with velocity > 0
   * - Params: only store values that differ from defaults
   * @returns {Object}
   */
  serialize() {
    // Sparse pattern: only store active steps
    const sparsePattern = {};
    for (const [voice, steps] of Object.entries(this._pattern)) {
      const activeSteps = [];
      steps.forEach((step, i) => {
        if (step.velocity > 0) {
          activeSteps.push({ i, v: step.velocity, a: step.accent || undefined });
        }
      });
      if (activeSteps.length > 0) {
        sparsePattern[voice] = activeSteps;
      }
    }

    // Sparse params: only store non-default values
    const sparseParams = {};
    for (const [path, value] of Object.entries(this._params)) {
      const [voice, paramName] = path.split('.');
      const paramDef = JT90_PARAMS[voice]?.[paramName];
      if (paramDef) {
        const defaultEngine = toEngine(paramDef.default, paramDef);
        if (Math.abs(value - defaultEngine) > 0.001) {
          sparseParams[path] = value;
        }
      }
    }

    return {
      id: this.id,
      pattern: Object.keys(sparsePattern).length > 0 ? sparsePattern : undefined,
      patternLength: this._pattern[VOICES[0]]?.length || 16,
      params: Object.keys(sparseParams).length > 0 ? sparseParams : undefined,
      swing: this._swing !== 0 ? this._swing : undefined,
      accentLevel: this._accentLevel !== 1.0 ? this._accentLevel : undefined,
    };
  }

  /**
   * Deserialize JT90 state
   * Handles both sparse and legacy full formats
   * @param {Object} data
   */
  deserialize(data) {
    if (data.pattern) {
      const length = data.patternLength || 16;
      // Check if sparse format (array of {i, v, a}) or legacy full format
      const firstVoice = Object.values(data.pattern)[0];
      const isSparse = Array.isArray(firstVoice) && firstVoice[0]?.i !== undefined;

      if (isSparse) {
        // Expand sparse pattern to full
        this._pattern = createEmptyPattern(length);
        for (const [voice, steps] of Object.entries(data.pattern)) {
          if (this._pattern[voice]) {
            for (const step of steps) {
              if (step.i < length) {
                this._pattern[voice][step.i] = {
                  velocity: step.v,
                  accent: step.a || false,
                };
              }
            }
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
    if (data.swing !== undefined) this._swing = data.swing;
    if (data.accentLevel !== undefined) this._accentLevel = data.accentLevel;
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

    // Check if any track has active steps
    const hasActiveSteps = VOICES.some(voice =>
      pattern[voice]?.some(s => s.velocity > 0)
    );

    if (!hasActiveSteps) {
      return null;
    }

    // Dynamic import of the engine
    const { JT90Engine } = await import('../../web/public/jt90/dist/machines/jt90/engine.js');

    // Create engine with fresh context
    const context = new OfflineAudioContext(2, sampleRate, sampleRate);
    const engine = new JT90Engine({ context });

    // Apply voice params (convert voice names to engine names)
    const voiceParams = params || this.getAllVoiceParams();
    Object.entries(voiceParams).forEach(([voiceId, voiceParamSet]) => {
      const engineVoice = VOICE_TO_ENGINE[voiceId] || voiceId;
      Object.entries(voiceParamSet).forEach(([paramName, value]) => {
        engine.setVoiceParameter(engineVoice, paramName, value);
      });
    });

    // Convert pattern voice names to engine names
    const enginePattern = {};
    Object.entries(pattern).forEach(([voiceId, trackPattern]) => {
      const engineVoice = VOICE_TO_ENGINE[voiceId] || voiceId;
      enginePattern[engineVoice] = trackPattern;
    });

    // Set pattern
    engine.setPattern(enginePattern);

    // Set swing
    engine.setSwing(this._swing);

    // Render
    const buffer = await engine.renderPattern({
      bars,
      stepDuration,
      sampleRate,
    });

    return buffer;
  }
}
