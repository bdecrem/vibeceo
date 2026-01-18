/**
 * Jambot Session Manager
 *
 * Wraps the ParamSystem and provides the unified session interface.
 * All parameter access goes through session.get() and session.set().
 */

import { ParamSystem } from './params.js';
import { DrumsNode } from '../instruments/drums-node.js';
import { BassNode } from '../instruments/bass-node.js';
import { LeadNode } from '../instruments/lead-node.js';
import { SamplerNode } from '../instruments/sampler-node.js';
import { TR909_KITS } from '../../web/public/909/dist/machines/tr909/presets.js';

// Default kit to load on session creation
const DEFAULT_DRUM_KIT = 'bart-deep';

/**
 * Create a new session with ParamSystem integration
 * @param {Object} config - { bpm, swing, ... }
 * @returns {Object} Session object
 */
export function createSession(config = {}) {
  const bpm = config.bpm || 128;

  // Create param system
  const params = new ParamSystem();

  // Create instrument nodes
  const drumsNode = new DrumsNode({ kit: DEFAULT_DRUM_KIT });
  const bassNode = new BassNode();
  const leadNode = new LeadNode();
  const samplerNode = new SamplerNode();

  // Load default kit params into drums node
  const kit = TR909_KITS.find(k => k.id === DEFAULT_DRUM_KIT);
  if (kit?.voiceParams) {
    for (const [voice, voiceParams] of Object.entries(kit.voiceParams)) {
      for (const [param, value] of Object.entries(voiceParams)) {
        drumsNode.setParam(`${voice}.${param}`, value);
      }
    }
  }

  // Register all instruments
  params.register('drums', drumsNode);
  params.register('bass', bassNode);
  params.register('lead', leadNode);
  params.register('sampler', samplerNode);

  // Create session object with convenience methods
  const session = {
    // Core state
    bpm,
    swing: config.swing || 0,
    bars: config.bars || 2,

    // ParamSystem instance
    params,

    // Direct node references (for compatibility during migration)
    _nodes: {
      drums: drumsNode,
      bass: bassNode,
      lead: leadNode,
      sampler: samplerNode,
    },

    // === UNIFIED PARAMETER ACCESS ===

    /**
     * Get any parameter by path
     * @param {string} path - e.g., 'drums.kick.decay', 'bass.cutoff', 'mixer.reverb.decay'
     * @returns {*}
     */
    get(path) {
      return params.get(path);
    },

    /**
     * Set any parameter by path
     * @param {string} path
     * @param {*} value
     * @returns {boolean}
     */
    set(path, value) {
      return params.set(path, value);
    },

    /**
     * Get parameter descriptors for a node
     * @param {string} nodeId
     * @returns {Object}
     */
    describe(nodeId) {
      return params.describe(nodeId);
    },

    /**
     * List all registered nodes
     * @returns {string[]}
     */
    listNodes() {
      return params.listNodes();
    },

    /**
     * Automate any parameter
     * @param {string} path
     * @param {Array} values
     */
    automate(path, values) {
      return params.automate(path, values);
    },

    /**
     * Get automation values
     * @param {string} path
     * @returns {Array|undefined}
     */
    getAutomation(path) {
      return params.getAutomation(path);
    },

    /**
     * Clear automation
     * @param {string} [path] - If omitted, clears all
     */
    clearAutomation(path) {
      params.clearAutomation(path);
    },

    // === BACKWARD COMPATIBILITY LAYER ===
    // These properties maintain compatibility with existing code
    // while the migration to the new system progresses

    // Drums (R9D9)
    get drumKit() { return drumsNode.getParam('kit'); },
    set drumKit(v) { drumsNode.setParam('kit', v); },

    get drumPattern() { return drumsNode.getPattern(); },
    set drumPattern(v) { drumsNode.setPattern(v); },

    get drumParams() {
      // Return a proxy that maps to the node
      return new Proxy({}, {
        get: (_, voice) => {
          const result = {};
          const descriptors = drumsNode.getParameterDescriptors();
          for (const path of Object.keys(descriptors)) {
            if (path.startsWith(`${voice}.`)) {
              const param = path.slice(voice.length + 1);
              result[param] = drumsNode.getParam(path);
            }
          }
          return result;
        },
        set: (_, voice, params) => {
          for (const [param, value] of Object.entries(params)) {
            drumsNode.setParam(`${voice}.${param}`, value);
          }
          return true;
        },
      });
    },
    set drumParams(v) {
      for (const [voice, params] of Object.entries(v)) {
        for (const [param, value] of Object.entries(params)) {
          drumsNode.setParam(`${voice}.${param}`, value);
        }
      }
    },

    get drumFlam() { return drumsNode.getParam('flam'); },
    set drumFlam(v) { drumsNode.setParam('flam', v); },

    get drumPatternLength() { return drumsNode.getParam('patternLength'); },
    set drumPatternLength(v) { drumsNode.setParam('patternLength', v); },

    get drumScale() { return drumsNode.getParam('scale'); },
    set drumScale(v) { drumsNode.setParam('scale', v); },

    get drumGlobalAccent() { return drumsNode.getParam('globalAccent') / 100; },
    set drumGlobalAccent(v) { drumsNode.setParam('globalAccent', v * 100); },

    get drumVoiceEngines() { return drumsNode._voiceEngines; },
    set drumVoiceEngines(v) { drumsNode._voiceEngines = v; },

    get drumUseSample() { return drumsNode._useSample; },
    set drumUseSample(v) { drumsNode._useSample = v; },

    get drumAutomation() {
      // Convert from ParamSystem to old format
      const result = {};
      for (const path of params.listAutomation()) {
        if (path.startsWith('drums.')) {
          const [_, voice, param] = path.split('.');
          if (!result[voice]) result[voice] = {};
          result[voice][param] = params.getAutomation(path);
        }
      }
      return result;
    },
    set drumAutomation(v) {
      // Convert from old format to ParamSystem
      for (const [voice, voiceAuto] of Object.entries(v)) {
        for (const [param, values] of Object.entries(voiceAuto)) {
          params.automate(`drums.${voice}.${param}`, values);
        }
      }
    },

    // Bass (R3D3)
    get bassPattern() { return bassNode.getPattern(); },
    set bassPattern(v) { bassNode.setPattern(v); },

    get bassParams() {
      const result = {};
      for (const [path, desc] of Object.entries(bassNode.getParameterDescriptors())) {
        const param = path.replace('bass.', '');
        result[param] = bassNode.getParam(param);
      }
      return result;
    },
    set bassParams(v) {
      for (const [param, value] of Object.entries(v)) {
        bassNode.setParam(param, value);
      }
    },

    // Lead (R1D1)
    get leadPreset() { return leadNode.getParam('preset'); },
    set leadPreset(v) { leadNode.setParam('preset', v); },

    get leadPattern() { return leadNode.getPattern(); },
    set leadPattern(v) { leadNode.setPattern(v); },

    get leadParams() {
      const result = {};
      for (const [path, desc] of Object.entries(leadNode.getParameterDescriptors())) {
        if (!path.startsWith('arp.')) {
          const param = path.replace('lead.', '');
          result[param] = leadNode.getParam(param);
        }
      }
      return result;
    },
    set leadParams(v) {
      for (const [param, value] of Object.entries(v)) {
        leadNode.setParam(param, value);
      }
    },

    get leadArp() { return leadNode.getArp(); },
    set leadArp(v) { leadNode.setArp(v); },

    // Sampler (R9DS)
    get samplerKit() { return samplerNode.getKit(); },
    set samplerKit(v) { samplerNode.setKit(v); },

    get samplerPattern() { return samplerNode.getPattern(); },
    set samplerPattern(v) { samplerNode.setPattern(v); },

    get samplerParams() {
      return new Proxy({}, {
        get: (_, slot) => {
          const result = {};
          const slotParams = ['level', 'tune', 'attack', 'decay', 'filter', 'pan'];
          for (const param of slotParams) {
            result[param] = samplerNode.getParam(`${slot}.${param}`);
          }
          return result;
        },
        set: (_, slot, params) => {
          for (const [param, value] of Object.entries(params)) {
            samplerNode.setParam(`${slot}.${param}`, value);
          }
          return true;
        },
      });
    },
    set samplerParams(v) {
      for (const [slot, params] of Object.entries(v)) {
        for (const [param, value] of Object.entries(params)) {
          samplerNode.setParam(`${slot}.${param}`, value);
        }
      }
    },

    // Mixer (placeholder - will be populated in Phase 5)
    mixer: {
      sends: {},
      voiceRouting: {},
      channelInserts: {},
      masterInserts: [],
      masterVolume: 0.8,
    },

    // Song mode (keep as-is for now)
    patterns: {
      drums: {},
      bass: {},
      lead: {},
      sampler: {},
    },
    currentPattern: {
      drums: 'A',
      bass: 'A',
      lead: 'A',
      sampler: 'A',
    },
    arrangement: [],
  };

  return session;
}

/**
 * Serialize session to JSON-safe object
 * @param {Object} session
 * @returns {Object}
 */
export function serializeSession(session) {
  return {
    bpm: session.bpm,
    swing: session.swing,
    bars: session.bars,
    params: session.params.serialize(),
    mixer: session.mixer,
    patterns: session.patterns,
    currentPattern: session.currentPattern,
    arrangement: session.arrangement,
  };
}

/**
 * Deserialize session from saved state
 * @param {Object} data
 * @returns {Object}
 */
export function deserializeSession(data) {
  const session = createSession({
    bpm: data.bpm,
    swing: data.swing,
    bars: data.bars,
  });

  if (data.params) {
    session.params.deserialize(data.params);
  }

  if (data.mixer) session.mixer = data.mixer;
  if (data.patterns) session.patterns = data.patterns;
  if (data.currentPattern) session.currentPattern = data.currentPattern;
  if (data.arrangement) session.arrangement = data.arrangement;

  return session;
}
