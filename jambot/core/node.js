/**
 * Jambot Node Interface
 *
 * Base interface for all components in the system:
 * - Instruments (drums, bass, lead, sampler)
 * - Effects (reverb, EQ, filter, sidechain)
 * - Mixer sections
 *
 * All nodes expose parameters through the same interface,
 * enabling generic tools and automation.
 */

/**
 * Base Node class
 * Implements parameter access for any component
 */
export class Node {
  /**
   * @param {string} id - Unique identifier for this node
   * @param {Object} config - Configuration options
   */
  constructor(id, config = {}) {
    this.id = id;
    this.config = config;

    // Internal parameter storage
    // Structure: { 'voice.param': value } or { 'param': value }
    this._params = {};

    // Parameter descriptors (metadata about each parameter)
    // Structure: { 'voice.param': { min, max, default, unit, ... } }
    this._descriptors = {};
  }

  /**
   * Get a parameter value
   * @param {string} path - Parameter path (e.g., 'kick.decay' or 'cutoff')
   * @returns {*} Parameter value
   */
  getParam(path) {
    return this._params[path];
  }

  /**
   * Set a parameter value
   * @param {string} path - Parameter path
   * @param {*} value - Value to set
   * @returns {boolean} True if successful
   */
  setParam(path, value) {
    const descriptor = this._descriptors[path];

    // Validate against descriptor if present
    if (descriptor) {
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
   * Get all parameter descriptors
   * @returns {Object} { 'path': { min, max, default, unit }, ... }
   */
  getParameterDescriptors() {
    return { ...this._descriptors };
  }

  /**
   * Register a parameter descriptor
   * @param {string} path - Parameter path
   * @param {Object} descriptor - { min, max, default, unit, description }
   */
  registerParam(path, descriptor) {
    this._descriptors[path] = descriptor;

    // Set default value if not already set
    if (this._params[path] === undefined && descriptor.default !== undefined) {
      this._params[path] = descriptor.default;
    }
  }

  /**
   * Register multiple parameters at once
   * @param {Object} descriptors - { 'path': descriptor, ... }
   */
  registerParams(descriptors) {
    for (const [path, descriptor] of Object.entries(descriptors)) {
      this.registerParam(path, descriptor);
    }
  }

  /**
   * Serialize node state
   * @returns {Object}
   */
  serialize() {
    return {
      id: this.id,
      params: { ...this._params },
    };
  }

  /**
   * Deserialize node state
   * @param {Object} data
   */
  deserialize(data) {
    if (data.params) {
      this._params = { ...data.params };
    }
  }
}

/**
 * InstrumentNode - extends Node for instruments
 * Adds pattern storage and voice/trigger capabilities
 */
export class InstrumentNode extends Node {
  constructor(id, config = {}) {
    super(id, config);

    // Pattern storage
    this._pattern = null;

    // Voice list (for multi-voice instruments like drums)
    this._voices = [];
  }

  /**
   * Get list of voices (e.g., ['kick', 'snare', 'ch', ...])
   * @returns {string[]}
   */
  getVoices() {
    return [...this._voices];
  }

  /**
   * Check if a voice exists
   * @param {string} voiceId
   * @returns {boolean}
   */
  hasVoice(voiceId) {
    return this._voices.includes(voiceId);
  }

  /**
   * Get the current pattern
   * @returns {*} Pattern data (format depends on instrument)
   */
  getPattern() {
    return this._pattern;
  }

  /**
   * Set the pattern
   * @param {*} pattern - Pattern data
   */
  setPattern(pattern) {
    this._pattern = pattern;
  }

  /**
   * Trigger a voice at a specific time
   * Override in subclasses to actually play sound
   * @param {string} voice - Voice ID
   * @param {number} time - Audio context time
   * @param {number} velocity - 0-1 velocity
   * @param {Object} options - Additional options (accent, slide, etc.)
   */
  trigger(voice, time, velocity, options = {}) {
    // Override in subclass
    throw new Error('InstrumentNode.trigger() must be implemented by subclass');
  }

  /**
   * Serialize instrument state including pattern
   * @returns {Object}
   */
  serialize() {
    return {
      ...super.serialize(),
      pattern: this._pattern,
    };
  }

  /**
   * Deserialize instrument state
   * @param {Object} data
   */
  deserialize(data) {
    super.deserialize(data);
    if (data.pattern !== undefined) {
      this._pattern = data.pattern;
    }
  }
}

/**
 * EffectNode - extends Node for effects
 * Adds audio processing capabilities
 */
export class EffectNode extends Node {
  constructor(id, config = {}) {
    super(id, config);

    // Web Audio nodes (set during audio context creation)
    this._inputNode = null;
    this._outputNode = null;
  }

  /**
   * Connect effect to audio graph
   * Override in subclasses
   * @param {AudioNode} input - Input audio node
   * @param {AudioNode} output - Output audio node
   */
  connect(input, output) {
    this._inputNode = input;
    this._outputNode = output;
    // Override to actually wire up the effect
  }

  /**
   * Disconnect from audio graph
   */
  disconnect() {
    this._inputNode = null;
    this._outputNode = null;
  }

  /**
   * Process audio (for offline rendering)
   * Override in subclasses that need custom processing
   * @param {Float32Array} inputBuffer
   * @param {Float32Array} outputBuffer
   */
  process(inputBuffer, outputBuffer) {
    // Default: pass-through
    outputBuffer.set(inputBuffer);
  }
}

/**
 * MixerNode - extends Node for mixer sections
 * Handles tracks, sends, and master
 */
export class MixerNode extends Node {
  constructor(id, config = {}) {
    super(id, config);

    // Track state
    this._tracks = new Map();
    this._sends = new Map();
    this._master = {
      volume: 0.8,
      inserts: [],
    };
  }

  /**
   * Get a parameter, handling nested mixer paths
   * @param {string} path - e.g., 'tracks.drums.volume', 'sends.reverb1.decay', 'master.volume'
   * @returns {*}
   */
  getParam(path) {
    const parts = path.split('.');

    if (parts[0] === 'tracks' && parts.length >= 3) {
      const track = this._tracks.get(parts[1]);
      return track?.[parts[2]];
    }

    if (parts[0] === 'sends' && parts.length >= 3) {
      const send = this._sends.get(parts[1]);
      return send?.params?.[parts[2]];
    }

    if (parts[0] === 'master') {
      return this._master[parts[1]];
    }

    return super.getParam(path);
  }

  /**
   * Set a parameter, handling nested mixer paths
   * @param {string} path
   * @param {*} value
   * @returns {boolean}
   */
  setParam(path, value) {
    const parts = path.split('.');

    if (parts[0] === 'tracks' && parts.length >= 3) {
      let track = this._tracks.get(parts[1]);
      if (!track) {
        track = { volume: 0, mute: false, inserts: [], sends: {} };
        this._tracks.set(parts[1], track);
      }
      track[parts[2]] = value;
      return true;
    }

    if (parts[0] === 'sends' && parts.length >= 3) {
      let send = this._sends.get(parts[1]);
      if (!send) {
        send = { effect: 'reverb', params: {} };
        this._sends.set(parts[1], send);
      }
      send.params[parts[2]] = value;
      return true;
    }

    if (parts[0] === 'master') {
      this._master[parts[1]] = value;
      return true;
    }

    return super.setParam(path, value);
  }

  /**
   * Serialize mixer state
   * @returns {Object}
   */
  serialize() {
    return {
      ...super.serialize(),
      tracks: Object.fromEntries(this._tracks),
      sends: Object.fromEntries(this._sends),
      master: { ...this._master },
    };
  }

  /**
   * Deserialize mixer state
   * @param {Object} data
   */
  deserialize(data) {
    super.deserialize(data);
    if (data.tracks) {
      this._tracks = new Map(Object.entries(data.tracks));
    }
    if (data.sends) {
      this._sends = new Map(Object.entries(data.sends));
    }
    if (data.master) {
      this._master = { ...data.master };
    }
  }
}
