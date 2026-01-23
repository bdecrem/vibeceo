/**
 * TR909Node - Wrapper for TR-909 drum machine
 *
 * 11-voice drum machine with pattern storage.
 * Exposes parameters through the unified parameter system.
 */

import { InstrumentNode } from '../core/node.js';
import { R9D9_PARAMS, toEngine, fromEngine, convertTweaks, getParamDef } from '../params/converters.js';
import { OfflineAudioContext } from 'node-web-audio-api';

// Voice IDs (matches TR909Engine)
const VOICES = ['kick', 'snare', 'clap', 'ch', 'oh', 'ltom', 'mtom', 'htom', 'rimshot', 'crash', 'ride'];

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

export class TR909Node extends InstrumentNode {
  constructor(config = {}) {
    super('drums', config);

    this._voices = VOICES;

    // Initialize pattern
    this._pattern = createEmptyPattern();

    // Per-step automation { voice: { param: [step values] } }
    this._automation = {};

    // Groove settings
    this._patternLength = 16;
    this._scale = '16th'; // '16th', '8th-triplet', '16th-triplet', '32nd'
    this._flam = 0;       // 0-1
    this._globalAccent = 1; // 0-1

    // Kit and engine settings
    this._kit = config.kit || 'default';
    this._voiceEngines = {}; // Per-voice engine selection
    this._useSample = {};    // Sample mode for hats/cymbals

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

    for (const voice of VOICES) {
      const voiceDef = R9D9_PARAMS[voice];
      if (!voiceDef) continue;

      for (const [paramName, paramDef] of Object.entries(voiceDef)) {
        const path = `${voice}.${paramName}`;
        this.registerParam(path, {
          ...paramDef,
          voice,
          param: paramName,
        });

        // Initialize with default value in engine units
        if (paramDef.default !== undefined) {
          this._params[path] = toEngine(paramDef.default, paramDef);
        }
      }
    }
  }

  /**
   * Get a parameter value in ENGINE UNITS
   * @param {string} path - e.g., 'kick.decay'
   * @returns {number}
   */
  getParam(path) {
    if (path === 'level') return this._level;
    return this._params[path];
  }

  /**
   * Set a parameter value (stores ENGINE UNITS)
   * @param {string} path - e.g., 'kick.decay'
   * @param {*} value - Value in engine units (0-1 for most params)
   * @returns {boolean}
   */
  setParam(path, value) {
    if (path === 'level') {
      this._level = Math.max(-60, Math.min(6, value));
      return true;
    }

    // Handle mute
    const parts = path.split('.');
    if (parts.length === 2 && parts[1] === 'mute') {
      if (value) {
        this._params[`${parts[0]}.level`] = 0;
      }
      return true;
    }

    this._params[path] = value;
    return true;
  }

  /**
   * Get a parameter value in engine units
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
    const voiceDef = R9D9_PARAMS[voice];

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
   * @returns {number} Linear gain (1.0 = unity, 2.0 = +6dB)
   */
  getOutputGain() {
    return Math.pow(10, this._level / 20);
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
   * Get automation data
   * @returns {Object}
   */
  getAutomation() {
    return this._automation;
  }

  /**
   * Set automation data
   * @param {Object} automation
   */
  setAutomation(automation) {
    this._automation = automation;
  }

  /**
   * Get groove settings
   * @returns {Object}
   */
  getGroove() {
    return {
      patternLength: this._patternLength,
      scale: this._scale,
      flam: this._flam,
      globalAccent: this._globalAccent,
    };
  }

  /**
   * Set groove settings
   * @param {Object} groove
   */
  setGroove(groove) {
    if (groove.patternLength !== undefined) this._patternLength = groove.patternLength;
    if (groove.scale !== undefined) this._scale = groove.scale;
    if (groove.flam !== undefined) this._flam = groove.flam;
    if (groove.globalAccent !== undefined) this._globalAccent = groove.globalAccent;
  }

  /**
   * Get pattern length in steps
   * @returns {number}
   */
  getPatternLength() {
    return this._patternLength;
  }

  /**
   * Set pattern length
   * @param {number} length
   */
  setPatternLength(length) {
    this._patternLength = length;
  }

  /**
   * Render the pattern to an audio buffer
   * @param {Object} options - Render options
   * @param {number} options.bars - Number of bars to render
   * @param {number} options.stepDuration - Duration of one step in seconds
   * @param {number} options.swing - Swing amount (0-1)
   * @param {number} options.sampleRate - Sample rate (default 44100)
   * @param {Object} [options.pattern] - Optional pattern override
   * @param {Object} [options.params] - Optional params override
   * @param {Object} [options.automation] - Optional automation override
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
      automation = this._automation,
    } = options;

    // Check if pattern has any hits
    const hasHits = VOICES.some(voice =>
      pattern[voice]?.some(step => step?.velocity > 0)
    );
    if (!hasHits) {
      return null;
    }

    // Dynamic import to avoid circular dependencies
    const { TR909Engine } = await import('../../web/public/909/dist/machines/tr909/engine-v3.js');
    const { TR909_KITS } = await import('../../web/public/909/dist/machines/tr909/presets.js');

    // Create offline context
    const stepsPerBar = 16;
    const totalSteps = stepsPerBar * bars;

    // Apply drum scale multipliers
    const scaleMultipliers = {
      '16th': 1,
      '8th-triplet': 4/3,
      '16th-triplet': 2/3,
      '32nd': 0.5,
    };
    const scaledStepDuration = stepDuration * (scaleMultipliers[this._scale] || 1);
    const duration = totalSteps * scaledStepDuration + 2; // Extra for release tails

    const context = new OfflineAudioContext(2, Math.ceil(duration * sampleRate), sampleRate);

    // Create engine
    const drums = new TR909Engine({ context });

    // Setup master gain
    const masterGain = context.createGain();
    masterGain.gain.value = this.getOutputGain();
    drums.connectOutput(masterGain);
    masterGain.connect(context.destination);

    // Load kit
    const kitData = TR909_KITS.find(k => k.id === this._kit) || TR909_KITS[0];
    if (kitData.engine && drums.setEngine) {
      drums.currentEngine = null;
      drums.setEngine(kitData.engine);
    }

    // Reset all voice params to defaults first
    if (drums.getVoiceParameterDescriptors) {
      const descriptors = drums.getVoiceParameterDescriptors();
      Object.entries(descriptors).forEach(([voiceId, voiceParams]) => {
        voiceParams.forEach((param) => {
          try {
            drums.setVoiceParam(voiceId, param.id, param.defaultValue);
          } catch (e) {
            // Ignore
          }
        });
      });
    }

    // Apply voice params
    for (const voice of VOICES) {
      const voiceParams = params?.[voice] || this.getVoiceEngineParams(voice);
      if (voiceParams && Object.keys(voiceParams).length > 0) {
        // Values already in engine units
        Object.entries(voiceParams).forEach(([paramId, value]) => {
          try {
            drums.setVoiceParam(voice, paramId, value);
          } catch (e) {
            // Ignore
          }
        });
      }
    }

    // Apply per-voice engine selection
    if (this._voiceEngines && drums.setVoiceEngine) {
      Object.entries(this._voiceEngines).forEach(([voiceId, engine]) => {
        try {
          drums.setVoiceEngine(voiceId, engine);
        } catch (e) {
          // Ignore
        }
      });
    }

    // Apply sample mode for hats/cymbals
    if (this._useSample) {
      const sampleCapable = ['ch', 'oh', 'crash', 'ride'];
      sampleCapable.forEach(voiceId => {
        if (this._useSample[voiceId] !== undefined) {
          const voice = drums.voices.get(voiceId);
          if (voice && voice.setUseSample) {
            voice.setUseSample(this._useSample[voiceId]);
          }
        }
      });
    }

    // Apply flam
    if (this._flam > 0 && drums.setFlam) {
      drums.setFlam(this._flam);
    }

    // Schedule all notes
    const swingAmount = swing;
    const maxSwingDelay = scaledStepDuration * 0.5;

    for (let i = 0; i < totalSteps; i++) {
      const step = i % this._patternLength;
      let time = i * scaledStepDuration;

      // Apply swing to off-beats
      if (step % 2 === 1) {
        time += swingAmount * maxSwingDelay;
      }

      for (const voice of VOICES) {
        const stepData = pattern[voice]?.[step];
        if (stepData?.velocity > 0) {
          const voiceObj = drums.voices.get(voice);
          if (voiceObj) {
            // Apply automation for this step
            const voiceAutomation = automation?.[voice];
            if (voiceAutomation) {
              for (const [paramId, stepValues] of Object.entries(voiceAutomation)) {
                const autoValue = stepValues[step];
                if (autoValue !== null && autoValue !== undefined) {
                  const def = getParamDef('r9d9', voice, paramId);
                  const engineValue = def ? toEngine(autoValue, def) : autoValue;
                  voiceObj[paramId] = engineValue;
                }
              }
            }
            voiceObj.trigger(time, stepData.velocity);
          }
        }
      }
    }

    // Render
    const buffer = await context.startRendering();
    return buffer;
  }

  /**
   * Serialize full TR909 state
   * @returns {Object}
   */
  serialize() {
    return {
      id: this.id,
      kit: this._kit,
      pattern: JSON.parse(JSON.stringify(this._pattern)),
      params: { ...this._params },
      automation: JSON.parse(JSON.stringify(this._automation)),
      level: this._level,
      patternLength: this._patternLength,
      scale: this._scale,
      flam: this._flam,
      globalAccent: this._globalAccent,
      voiceEngines: { ...this._voiceEngines },
      useSample: { ...this._useSample },
    };
  }

  /**
   * Deserialize TR909 state
   * @param {Object} data
   */
  deserialize(data) {
    if (data.kit) this._kit = data.kit;
    if (data.pattern) this._pattern = JSON.parse(JSON.stringify(data.pattern));
    if (data.params) this._params = { ...data.params };
    if (data.automation) this._automation = JSON.parse(JSON.stringify(data.automation));
    if (data.level !== undefined) this._level = data.level;
    if (data.patternLength !== undefined) this._patternLength = data.patternLength;
    if (data.scale !== undefined) this._scale = data.scale;
    if (data.flam !== undefined) this._flam = data.flam;
    if (data.globalAccent !== undefined) this._globalAccent = data.globalAccent;
    if (data.voiceEngines) this._voiceEngines = { ...data.voiceEngines };
    if (data.useSample) this._useSample = { ...data.useSample };
  }
}

export { VOICES };
