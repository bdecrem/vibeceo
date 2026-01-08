/**
 * Effect Base Class
 *
 * All mixer effects extend this class.
 * Provides consistent input/output routing and parameter interface.
 */

export class Effect {
  constructor(context) {
    this.context = context;
    this._input = context.createGain();
    this._output = context.createGain();
    this._bypass = false;
    this._bypassGain = context.createGain();

    // Default: signal flows through (subclass wires actual effect)
    this._bypassGain.gain.value = 0;
  }

  /**
   * Input node - connect source here
   */
  get input() {
    return this._input;
  }

  /**
   * Output node - connect to destination
   */
  get output() {
    return this._output;
  }

  /**
   * Bypass the effect (dry signal only)
   */
  get bypass() {
    return this._bypass;
  }

  set bypass(value) {
    this._bypass = value;
    // Subclasses implement actual bypass logic
  }

  /**
   * Set a parameter by name
   * @param {string} name - Parameter name
   * @param {number|string} value - Parameter value
   */
  setParameter(name, value) {
    // Override in subclass
    console.warn(`setParameter not implemented for ${name}`);
  }

  /**
   * Get all current parameters
   * @returns {Object} Parameter values
   */
  getParameters() {
    // Override in subclass
    return {};
  }

  /**
   * Load a preset by ID
   * @param {string} presetId - Preset identifier
   */
  setPreset(presetId) {
    const preset = this.constructor.PRESETS?.[presetId];
    if (!preset) {
      console.warn(`Unknown preset: ${presetId}`);
      return;
    }
    Object.entries(preset).forEach(([key, value]) => {
      this.setParameter(key, value);
    });
  }

  /**
   * Get available preset names
   * @returns {string[]} Preset IDs
   */
  static getPresets() {
    return Object.keys(this.PRESETS || {});
  }

  /**
   * Clean up audio nodes
   */
  dispose() {
    this._input.disconnect();
    this._output.disconnect();
    this._bypassGain.disconnect();
  }
}

export default Effect;
