/**
 * SamplerNode - Wrapper for 10-slot sample player
 *
 * Each slot (s1-s10) can hold a sample with its own params.
 * Pattern is per-slot step sequences.
 */

import { InstrumentNode } from '../core/node.js';
import { R9DS_PARAMS, toEngine, fromEngine } from '../params/converters.js';
import { SampleVoice } from '../sample-voice.js';
import { OfflineAudioContext } from 'node-web-audio-api';

// All sampler slots
const SLOTS = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10'];

export class SamplerNode extends InstrumentNode {
  /**
   * @param {Object} config - Configuration
   * @param {Object} config.kit - Loaded kit with sample buffers
   */
  constructor(config = {}) {
    super('sampler', config);

    this._voices = SLOTS;

    // Kit contains sample buffers
    this._kit = config.kit || null;

    // Node output level in dB (-6dB default for proper gain staging)
    this._level = -6;

    // Pattern: { s1: [{step, vel}, ...], s2: [...], ... }
    this._pattern = {};
    for (const slot of SLOTS) {
      this._pattern[slot] = [];
    }

    // Register all parameters for all slots
    this._registerParams();
  }

  /**
   * Register parameters for all slots
   */
  _registerParams() {
    // Node-level output gain
    this.registerParam('level', { min: -60, max: 6, default: -6, unit: 'dB', hint: 'node output level' });

    const slotDef = R9DS_PARAMS.slot;
    if (!slotDef) return;

    for (const slot of SLOTS) {
      for (const [paramName, paramDef] of Object.entries(slotDef)) {
        const path = `${slot}.${paramName}`;
        this.registerParam(path, {
          ...paramDef,
          voice: slot,
          param: paramName,
        });
      }
    }
  }

  /**
   * Get a parameter value in producer-friendly units
   * @param {string} path - e.g., 's1.level' or 'kit'
   * @returns {*}
   */
  getParam(path) {
    if (path === 'level') return this._level;
    if (path === 'kit') {
      return this._kit?.id || null;
    }

    return this._params[path];
  }

  /**
   * Set a parameter value (accepts producer-friendly units)
   * @param {string} path - e.g., 's1.level' or 'kit'
   * @param {*} value
   * @returns {boolean}
   */
  setParam(path, value) {
    if (path === 'level') {
      this._level = Math.max(-60, Math.min(6, value));
      return true;
    }
    if (path === 'kit') {
      // Kit loading handled externally
      return true;
    }

    // Handle mute
    if (path.endsWith('.mute')) {
      const slot = path.split('.')[0];
      if (value) {
        this._params[`${slot}.level`] = -60;
      }
      return true;
    }

    const descriptor = this._descriptors[path];
    if (descriptor) {
      // Clamp numeric values
      if (descriptor.min !== undefined && value < descriptor.min) {
        value = descriptor.min;
      }
      if (descriptor.max !== undefined && value > descriptor.max) {
        value = descriptor.max;
      }
    }

    this._params[path] = value;
    return true;
  }

  /**
   * Get a parameter value converted to engine units
   * @param {string} path
   * @returns {number}
   */
  getEngineParam(path) {
    const value = this._params[path];
    const descriptor = this._descriptors[path];

    if (!descriptor) return value;

    return toEngine(value, descriptor);
  }

  /**
   * Get all params for a slot in engine units
   * @param {string} slot
   * @returns {Object}
   */
  getSlotEngineParams(slot) {
    const result = {};
    const slotDef = R9DS_PARAMS.slot;

    for (const [paramName, paramDef] of Object.entries(slotDef)) {
      const path = `${slot}.${paramName}`;
      const value = this._params[path];

      if (value !== undefined) {
        result[paramName] = toEngine(value, paramDef);
      }
    }

    return result;
  }

  /**
   * Get node output level as linear gain multiplier
   * Used by render loop to apply node-level gain
   * @returns {number} Linear gain (1.0 = unity, 2.0 = +6dB)
   */
  getOutputGain() {
    return Math.pow(10, this._level / 20);
  }

  /**
   * Set the kit (with loaded sample buffers)
   * @param {Object} kit - { id, name, slots: [{ id, name, buffer }, ...] }
   */
  setKit(kit) {
    this._kit = kit;
  }

  /**
   * Get the current kit
   * @returns {Object|null}
   */
  getKit() {
    return this._kit;
  }

  /**
   * Trigger a sample slot
   * @param {string} slot - Slot ID (s1-s10)
   * @param {number} time - Audio context time
   * @param {number} velocity - 0-1 velocity
   * @param {Object} options - Additional options
   */
  trigger(slot, time, velocity, options = {}) {
    if (!this._kit) {
      console.warn('SamplerNode: No kit loaded');
      return;
    }

    // Find the slot in the kit
    const slotIndex = parseInt(slot.slice(1)) - 1;
    const kitSlot = this._kit.slots?.[slotIndex];

    if (!kitSlot?.buffer) {
      console.warn(`SamplerNode: No sample in ${slot}`);
      return;
    }

    // Get params for this slot
    const params = this.getSlotEngineParams(slot);

    // Trigger would be handled by render loop with actual audio context
    // This is just the interface definition
  }

  /**
   * Get pattern for a slot
   * @param {string} [slot] - If provided, get specific slot pattern
   * @returns {Object|Array}
   */
  getPattern(slot) {
    if (slot) {
      return this._pattern[slot] || [];
    }
    return this._pattern;
  }

  /**
   * Set pattern
   * @param {Object|Array} pattern - Full pattern object or single slot pattern
   * @param {string} [slot] - If provided, set specific slot pattern
   */
  setPattern(pattern, slot) {
    if (slot) {
      this._pattern[slot] = pattern;
    } else {
      this._pattern = pattern;
    }
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
    const hasHits = SLOTS.some(slot =>
      pattern[slot]?.some(step => step?.velocity > 0)
    );
    if (!hasHits || !this._kit) {
      return null;
    }

    // Create offline context
    const stepsPerBar = 16;
    const totalSteps = stepsPerBar * bars;
    const duration = totalSteps * stepDuration + 2; // Extra for release tails

    const context = new OfflineAudioContext(2, Math.ceil(duration * sampleRate), sampleRate);

    // Create master gain
    const masterGain = context.createGain();
    masterGain.gain.value = this.getOutputGain();
    masterGain.connect(context.destination);

    // Create sample voices for each slot
    const voices = new Map();
    for (const slot of SLOTS) {
      const slotIndex = parseInt(slot.slice(1)) - 1;
      const kitSlot = this._kit.slots?.[slotIndex];

      if (kitSlot?.buffer) {
        const voice = new SampleVoice(slot, context);
        try {
          // Decode the buffer (it's raw WAV bytes, need to convert to AudioBuffer)
          const arrayBuffer = kitSlot.buffer.buffer.slice(
            kitSlot.buffer.byteOffset,
            kitSlot.buffer.byteOffset + kitSlot.buffer.byteLength
          );
          const audioBuffer = await context.decodeAudioData(arrayBuffer);
          voice.setBuffer(audioBuffer);
          voice.setMeta(kitSlot.name, kitSlot.short);

          // Apply params - use override if provided, otherwise node's internal params
          const slotParams = params?.[slot] || this.getSlotEngineParams(slot);
          Object.entries(slotParams).forEach(([key, value]) => {
            voice.setParameter(key, value);
          });

          voice.connect(masterGain);
          voices.set(slot, voice);
        } catch (e) {
          console.warn(`Could not decode sample for ${slot}:`, e.message);
        }
      }
    }

    // Schedule all notes
    const swingAmount = swing;
    const maxSwingDelay = stepDuration * 0.5;

    for (let i = 0; i < totalSteps; i++) {
      const step = i % 16;
      let time = i * stepDuration;

      // Apply swing to off-beats
      if (step % 2 === 1) {
        time += swingAmount * maxSwingDelay;
      }

      for (const [slot, voice] of voices) {
        const stepData = pattern[slot]?.[step];
        if (stepData?.velocity > 0) {
          voice.trigger(time, stepData.velocity);
        }
      }
    }

    // Render
    const buffer = await context.startRendering();
    return buffer;
  }

  /**
   * Serialize full sampler state
   * @returns {Object}
   */
  serialize() {
    return {
      id: this.id,
      kitId: this._kit?.id || null,
      level: this._level,
      pattern: this._pattern,
      params: { ...this._params },
    };
  }

  /**
   * Deserialize sampler state
   * @param {Object} data
   */
  deserialize(data) {
    // Note: kit must be reloaded separately (contains audio buffers)
    if (data.level !== undefined) this._level = data.level;
    if (data.pattern) this._pattern = data.pattern;
    if (data.params) this._params = { ...data.params };
  }
}
