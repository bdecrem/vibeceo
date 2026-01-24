/**
 * JP9000Node - Modular Synthesizer
 *
 * Jambot instrument node for the JP9000 modular synth.
 * Provides a text-controllable modular synthesizer with:
 * - Patchable modules (oscillators, filters, envelopes, etc.)
 * - Karplus-Strong physical modeling strings
 * - Pattern-based sequencing
 */

import { InstrumentNode } from '../core/node.js';
import { Rack } from '../../web/public/jp9000/dist/rack.js';
import { noteToFreq } from '../../web/public/jp9000/dist/index.js';
import { getModuleTypes, MODULE_NAMES } from '../../web/public/jp9000/dist/modules/index.js';

/**
 * Create an empty pattern for JP9000
 * @param {number} steps - Number of steps (default 16 = 1 bar)
 */
function createEmptyPattern(steps = 16) {
  return Array(steps).fill(null).map(() => ({
    note: null,
    gate: false,
    velocity: 1,
  }));
}

export class JP9000Node extends InstrumentNode {
  constructor(config = {}) {
    super('jp9000', config);

    this._voices = ['modular'];

    // Initialize the modular rack
    this.rack = new Rack(config.sampleRate || 44100);

    // Initialize pattern
    this._pattern = createEmptyPattern();

    // Track which modules to trigger on pattern steps
    this._triggerModules = [];

    // Register basic params for the node itself
    this._registerParams();
  }

  /**
   * Register node-level parameters
   */
  _registerParams() {
    this.registerParam('modular.level', {
      min: -60,
      max: 6,
      default: 0,
      unit: 'dB',
    });
    this._params['modular.level'] = 0.5; // Engine units (0.5 = 0dB)
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MODULE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Add a module to the rack
   * @param {string} type - Module type (e.g., 'osc-saw', 'filter-lp24', 'string')
   * @param {string} [id] - Optional custom ID
   * @returns {string} Module ID
   */
  addModule(type, id = null) {
    return this.rack.addModule(type, id);
  }

  /**
   * Remove a module from the rack
   * @param {string} id - Module ID
   */
  removeModule(id) {
    this.rack.removeModule(id);
    // Remove from trigger list if present
    this._triggerModules = this._triggerModules.filter(m => m !== id);
  }

  /**
   * Get a module by ID
   * @param {string} id - Module ID
   * @returns {Module|undefined}
   */
  getModule(id) {
    return this.rack.getModule(id);
  }

  /**
   * Get all module IDs
   * @returns {string[]}
   */
  getModuleIds() {
    return Array.from(this.rack.modules.keys());
  }

  /**
   * Get available module types
   * @returns {string[]}
   */
  getModuleTypes() {
    return getModuleTypes();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PATCHING
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Connect two module ports
   * @param {string} from - Source (e.g., 'osc1.audio')
   * @param {string} to - Destination (e.g., 'filter1.audio')
   */
  connect(from, to) {
    this.rack.connect(from, to);
  }

  /**
   * Disconnect two module ports
   * @param {string} from - Source
   * @param {string} to - Destination
   */
  disconnect(from, to) {
    this.rack.disconnect(from, to);
  }

  /**
   * Set the output module
   * @param {string} moduleId - Module ID
   * @param {string} [outputName='audio'] - Output port name
   */
  setOutput(moduleId, outputName = 'audio') {
    this.rack.setOutput(moduleId, outputName);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PARAMETERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Set a parameter on a module
   * @param {string} path - Path like 'filter1.cutoff' or 'osc1.frequency'
   * @param {number} value - Parameter value
   */
  setModuleParam(moduleId, param, value) {
    this.rack.setParam(moduleId, param, value);
  }

  /**
   * Get a parameter from a module
   * @param {string} moduleId - Module ID
   * @param {string} param - Parameter name
   * @returns {number|undefined}
   */
  getModuleParam(moduleId, param) {
    return this.rack.getParam(moduleId, param);
  }

  /**
   * Override setParam to handle both node and module params
   * @param {string} path - e.g., 'modular.level' or 'osc1.frequency'
   * @param {*} value
   */
  setParam(path, value) {
    if (path.startsWith('modular.')) {
      // Node-level param
      return super.setParam(path, value);
    }

    // Module param: path is 'moduleId.param'
    const [moduleId, param] = path.split('.');
    if (moduleId && param) {
      this.rack.setParam(moduleId, param, value);
      return true;
    }

    return super.setParam(path, value);
  }

  /**
   * Override getParam
   * @param {string} path
   */
  getParam(path) {
    if (path.startsWith('modular.')) {
      return super.getParam(path);
    }

    const [moduleId, param] = path.split('.');
    if (moduleId && param) {
      return this.rack.getParam(moduleId, param);
    }

    return super.getParam(path);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TRIGGERING
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Set which modules should be triggered by pattern steps
   * @param {string[]} moduleIds - Array of module IDs to trigger
   */
  setTriggerModules(moduleIds) {
    this._triggerModules = moduleIds;
  }

  /**
   * Trigger specified modules
   * @param {number} velocity - Trigger velocity 0-1
   */
  triggerModules(velocity = 1) {
    for (const moduleId of this._triggerModules) {
      this.rack.triggerModule(moduleId, velocity);
    }
  }

  /**
   * Release specified modules
   */
  releaseModules() {
    for (const moduleId of this._triggerModules) {
      this.rack.releaseModule(moduleId);
    }
  }

  /**
   * Pluck a string module at a specific note
   * @param {string} moduleId - String module ID
   * @param {string} note - Note name (e.g., 'E2')
   * @param {number} velocity - Pluck velocity 0-1
   */
  pluck(moduleId, note, velocity = 1) {
    const module = this.rack.getModule(moduleId);
    if (module && module.type === 'string') {
      const freq = noteToFreq(note);
      module.setParam('frequency', freq);
      module.trigger(velocity);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PATTERN
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get the current pattern
   * @returns {Array}
   */
  getPattern() {
    return this._pattern;
  }

  /**
   * Set the pattern
   * @param {Array} pattern - Pattern array
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

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERING
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get node output level as linear gain multiplier
   * @returns {number}
   */
  getOutputGain() {
    const levelEngine = this._params['modular.level'] ?? 0.5;
    const maxLinear = Math.pow(10, 6 / 20); // 2.0 for +6dB max
    return levelEngine * maxLinear;
  }

  /**
   * Render the pattern to an audio buffer
   * @param {Object} options - Render options
   * @param {number} options.bars - Number of bars to render
   * @param {number} options.stepDuration - Duration of one step in seconds
   * @param {number} options.sampleRate - Sample rate (default 44100)
   * @returns {Promise<Float32Array>}
   */
  async renderPattern(options) {
    const {
      bars,
      stepDuration,
      sampleRate = 44100,
    } = options;

    const pattern = this._pattern;

    // Skip if no active notes
    if (!pattern?.some(s => s.gate)) {
      return null;
    }

    // Calculate total samples
    const stepsPerBar = 16;
    const totalSteps = bars * stepsPerBar;
    const samplesPerStep = Math.round(stepDuration * sampleRate);
    const totalSamples = totalSteps * samplesPerStep;

    // Create output buffer (stereo)
    const outputL = new Float32Array(totalSamples);
    const outputR = new Float32Array(totalSamples);

    // Reset all modules
    this.rack.resetAll();

    // Process step by step
    for (let step = 0; step < totalSteps; step++) {
      const patternStep = step % pattern.length;
      const stepData = pattern[patternStep];
      const stepStart = step * samplesPerStep;

      // Handle triggers
      if (stepData && stepData.gate) {
        // Set frequency for oscillators and strings
        if (stepData.note) {
          const freq = noteToFreq(stepData.note);

          // Set frequency on trigger modules
          for (const moduleId of this._triggerModules) {
            const module = this.rack.getModule(moduleId);
            if (module) {
              if (module.params.frequency) {
                module.setParam('frequency', freq);
              }
              module.trigger(stepData.velocity || 1);
            }
          }

          // Also trigger envelopes
          for (const module of this.rack.modules.values()) {
            if (module.type === 'env-adsr') {
              module.trigger(stepData.velocity || 1);
            }
          }
        }
      } else if (!stepData?.gate) {
        // Release envelopes on non-gate steps
        for (const module of this.rack.modules.values()) {
          if (module.type === 'env-adsr') {
            module.release();
          }
        }
      }

      // Render this step
      const stepBuffer = this.rack.render(samplesPerStep);

      // Copy to output (mono to stereo)
      for (let i = 0; i < samplesPerStep; i++) {
        outputL[stepStart + i] = stepBuffer[i];
        outputR[stepStart + i] = stepBuffer[i];
      }
    }

    // Return as AudioBuffer-like object
    return {
      numberOfChannels: 2,
      length: totalSamples,
      sampleRate,
      getChannelData: (channel) => channel === 0 ? outputL : outputR,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SERIALIZATION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Serialize full JP9000 state
   * @returns {Object}
   */
  serialize() {
    return {
      id: this.id,
      pattern: JSON.parse(JSON.stringify(this._pattern)),
      params: { ...this._params },
      rack: this.rack.toJSON(),
      triggerModules: [...this._triggerModules],
    };
  }

  /**
   * Deserialize JP9000 state
   * @param {Object} data
   */
  deserialize(data) {
    if (data.pattern) this._pattern = JSON.parse(JSON.stringify(data.pattern));
    if (data.params) this._params = { ...data.params };
    if (data.rack) this.rack = Rack.fromJSON(data.rack);
    if (data.triggerModules) this._triggerModules = [...data.triggerModules];
  }

  /**
   * Get a human-readable description of the synth
   * @returns {string}
   */
  describe() {
    return this.rack.describe();
  }
}

/**
 * Create preset patches
 */
export const JP9000_PRESETS = {
  /**
   * Basic subtractive synth: osc -> filter -> vca
   */
  basic: (node) => {
    const osc = node.addModule('osc-saw', 'osc1');
    const filter = node.addModule('filter-lp24', 'filter1');
    const env = node.addModule('env-adsr', 'env1');
    const vca = node.addModule('vca', 'vca1');

    node.connect('osc1.audio', 'filter1.audio');
    node.connect('env1.cv', 'filter1.cutoffCV');
    node.connect('filter1.audio', 'vca1.audio');
    node.connect('env1.cv', 'vca1.cv');
    node.setOutput('vca1');

    node.setModuleParam('filter1', 'cutoff', 800);
    node.setModuleParam('filter1', 'resonance', 40);
    node.setModuleParam('filter1', 'envAmount', 50);
    node.setModuleParam('env1', 'attack', 0);
    node.setModuleParam('env1', 'decay', 40);
    node.setModuleParam('env1', 'sustain', 30);
    node.setModuleParam('env1', 'release', 20);

    node.setTriggerModules(['osc1']);
  },

  /**
   * Plucked string: string -> filter -> drive
   */
  pluck: (node) => {
    const str = node.addModule('string', 'string1');
    const filter = node.addModule('filter-lp24', 'filter1');
    const drive = node.addModule('drive', 'drive1');

    node.connect('string1.audio', 'filter1.audio');
    node.connect('filter1.audio', 'drive1.audio');
    node.setOutput('drive1');

    node.setModuleParam('string1', 'decay', 70);
    node.setModuleParam('string1', 'brightness', 60);
    node.setModuleParam('filter1', 'cutoff', 4000);
    node.setModuleParam('filter1', 'resonance', 20);
    node.setModuleParam('drive1', 'amount', 20);
    node.setModuleParam('drive1', 'type', 2); // tube

    node.setTriggerModules(['string1']);
  },

  /**
   * Dual oscillator bass
   */
  dualBass: (node) => {
    const osc1 = node.addModule('osc-saw', 'osc1');
    const osc2 = node.addModule('osc-square', 'osc2');
    const mixer = node.addModule('mixer', 'mixer1');
    const filter = node.addModule('filter-lp24', 'filter1');
    const env = node.addModule('env-adsr', 'env1');
    const vca = node.addModule('vca', 'vca1');
    const drive = node.addModule('drive', 'drive1');

    node.connect('osc1.audio', 'mixer1.in1');
    node.connect('osc2.audio', 'mixer1.in2');
    node.connect('mixer1.audio', 'filter1.audio');
    node.connect('env1.cv', 'filter1.cutoffCV');
    node.connect('filter1.audio', 'vca1.audio');
    node.connect('env1.cv', 'vca1.cv');
    node.connect('vca1.audio', 'drive1.audio');
    node.setOutput('drive1');

    node.setModuleParam('osc2', 'octave', -12);
    node.setModuleParam('mixer1', 'gain1', 0.7);
    node.setModuleParam('mixer1', 'gain2', 0.5);
    node.setModuleParam('filter1', 'cutoff', 600);
    node.setModuleParam('filter1', 'resonance', 50);
    node.setModuleParam('filter1', 'envAmount', 60);
    node.setModuleParam('env1', 'attack', 0);
    node.setModuleParam('env1', 'decay', 30);
    node.setModuleParam('env1', 'sustain', 20);
    node.setModuleParam('env1', 'release', 15);
    node.setModuleParam('drive1', 'amount', 30);

    node.setTriggerModules(['osc1', 'osc2']);
  },
};
