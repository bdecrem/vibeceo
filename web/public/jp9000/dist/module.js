/**
 * JP9000 Module Base Class
 *
 * All modules in the JP9000 modular synth extend this class.
 * Provides standardized inputs, outputs, parameters, and processing.
 */

/**
 * Base Module class
 * Every module has:
 * - id: unique identifier
 * - type: module type (e.g., 'osc-saw', 'filter-lp24')
 * - inputs: named input ports { name: { type: 'audio'|'cv', buffer: Float32Array } }
 * - outputs: named output ports { name: { type: 'audio'|'cv', buffer: Float32Array } }
 * - params: tweakable parameters { name: { value, min, max, default, unit } }
 */
export class Module {
  constructor(id, sampleRate = 44100) {
    this.id = id;
    this.sampleRate = sampleRate;
    this.type = 'module';

    // Define in subclass
    this.inputs = {};   // { name: { type: 'audio'|'cv', buffer: null } }
    this.outputs = {};  // { name: { type: 'audio'|'cv', buffer: null } }
    this.params = {};   // { name: { value, min, max, default, unit } }
  }

  /**
   * Define an input port
   * @param {string} name - Input name
   * @param {string} type - 'audio' or 'cv'
   */
  defineInput(name, type = 'audio') {
    this.inputs[name] = { type, buffer: null };
  }

  /**
   * Define an output port
   * @param {string} name - Output name
   * @param {string} type - 'audio' or 'cv'
   */
  defineOutput(name, type = 'audio') {
    this.outputs[name] = { type, buffer: null };
  }

  /**
   * Define a parameter
   * @param {string} name - Parameter name
   * @param {Object} opts - { value, min, max, default, unit }
   */
  defineParam(name, opts) {
    this.params[name] = {
      value: opts.default ?? opts.value ?? 0,
      min: opts.min ?? 0,
      max: opts.max ?? 100,
      default: opts.default ?? 0,
      unit: opts.unit ?? '',
    };
  }

  /**
   * Set a parameter value
   * @param {string} name - Parameter name
   * @param {number} value - New value
   */
  setParam(name, value) {
    if (this.params[name]) {
      const p = this.params[name];
      p.value = Math.max(p.min, Math.min(p.max, value));
      this._onParamChange(name, p.value);
    }
  }

  /**
   * Get a parameter value
   * @param {string} name - Parameter name
   * @returns {number}
   */
  getParam(name) {
    return this.params[name]?.value;
  }

  /**
   * Called when a parameter changes (override in subclass)
   * @param {string} name - Parameter name
   * @param {number} value - New value
   */
  _onParamChange(name, value) {
    // Override in subclass for real-time parameter updates
  }

  /**
   * Process one buffer of samples
   * Called by the Rack during render. Override in subclass.
   * @param {number} bufferSize - Number of samples to process
   */
  process(bufferSize) {
    // Override in subclass
  }

  /**
   * Reset module state (e.g., for new note)
   */
  reset() {
    // Override in subclass
  }

  /**
   * Trigger the module (for sound sources)
   * @param {number} velocity - Trigger velocity 0-1
   */
  trigger(velocity = 1) {
    // Override in subclass
  }

  /**
   * Release the module (for envelopes)
   */
  release() {
    // Override in subclass
  }

  /**
   * Check if module is still producing output
   * @returns {boolean}
   */
  isActive() {
    return true;
  }

  /**
   * Serialize module state to JSON
   * @returns {Object}
   */
  toJSON() {
    const params = {};
    for (const [name, p] of Object.entries(this.params)) {
      params[name] = p.value;
    }
    return {
      id: this.id,
      type: this.type,
      params,
    };
  }

  /**
   * Load state from JSON
   * @param {Object} json
   */
  fromJSON(json) {
    if (json.params) {
      for (const [name, value] of Object.entries(json.params)) {
        this.setParam(name, value);
      }
    }
  }
}
