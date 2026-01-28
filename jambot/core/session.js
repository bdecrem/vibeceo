/**
 * Jambot Session Manager
 *
 * Wraps the ParamSystem and provides the unified session interface.
 * All parameter access goes through session.get() and session.set().
 *
 * INSTRUMENTS:
 *   - jb01 (drum machine) — aliases: 'drums'
 *   - jb202 (bass synth) — aliases: 'bass', 'lead', 'synth'
 *   - sampler (sample player)
 *   - jp9000 (modular synth) — managed separately via tools
 *
 * These are the canonical instruments. The aliases are just pointers.
 */

import { ParamSystem } from './params.js';
import { Clock } from './clock.js';
import { SamplerNode } from '../instruments/sampler-node.js';
import { JB202Node } from '../instruments/jb202-node.js';
import { JB01Node } from '../instruments/jb01-node.js';
import { JT10Node } from '../instruments/jt10-node.js';
import { JT30Node } from '../instruments/jt30-node.js';
import { JT90Node } from '../instruments/jt90-node.js';
import { JP9000Node } from '../instruments/jp9000-node.js';

/**
 * Create a new session with ParamSystem integration
 * @param {Object} config - { bpm, swing, ... }
 * @returns {Object} Session object
 */
export function createSession(config = {}) {
  // Create master clock - single source of truth for timing
  const clock = new Clock({
    bpm: config.bpm || 128,
    swing: config.swing || 0,
    sampleRate: config.sampleRate || 44100,
  });

  // Create param system
  const params = new ParamSystem();

  // Create the canonical instruments
  const jb01Node = new JB01Node();
  const jb202Node = new JB202Node();
  const samplerNode = new SamplerNode();
  const jt10Node = new JT10Node();
  const jt30Node = new JT30Node();
  const jt90Node = new JT90Node();
  const jp9000Node = new JP9000Node({ sampleRate: config.sampleRate || 44100 });

  // Register instruments with their canonical names
  params.register('jb01', jb01Node);
  params.register('jb202', jb202Node);
  params.register('sampler', samplerNode);
  params.register('jt10', jt10Node);
  params.register('jt30', jt30Node);
  params.register('jt90', jt90Node);
  params.register('jp9000', jp9000Node);

  // Register ALIASES (pointers to the same nodes)
  params.register('drums', jb01Node);      // drums → jb01
  params.register('bass', jb202Node);      // bass → jb202
  params.register('lead', jb202Node);      // lead → jb202
  params.register('synth', jb202Node);     // synth → jb202

  // Create session object with convenience methods
  const session = {
    // Master clock - all timing derives from here
    clock,

    // BPM and swing proxy to clock (producer-facing interface)
    get bpm() { return clock.bpm; },
    set bpm(v) { clock.bpm = v; },

    get swing() { return clock.swing; },
    set swing(v) { clock.swing = v; },

    // Bars for render length
    bars: config.bars || 2,

    // Instrument output levels in dB (-60 to +6, 0 = unity)
    jb01Level: config.jb01Level ?? 0,
    jb202Level: config.jb202Level ?? 0,
    samplerLevel: config.samplerLevel ?? 0,
    jt10Level: config.jt10Level ?? 0,
    jt30Level: config.jt30Level ?? 0,
    jt90Level: config.jt90Level ?? 0,
    jp9000Level: config.jp9000Level ?? 0,

    // ParamSystem instance
    params,

    // Direct node references
    _nodes: {
      jb01: jb01Node,
      jb202: jb202Node,
      sampler: samplerNode,
      jt10: jt10Node,
      jt30: jt30Node,
      jt90: jt90Node,
      jp9000: jp9000Node,
      // Aliases point to same nodes
      drums: jb01Node,
      bass: jb202Node,
      lead: jb202Node,
      synth: jb202Node,
    },

    // === UNIFIED PARAMETER ACCESS ===

    /**
     * Get any parameter by path
     * @param {string} path - e.g., 'drums.kick.decay', 'bass.filterCutoff'
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

    // === PATTERN ACCESS ===
    // drums/jb01 share the same pattern (they're the same node)
    // bass/lead/synth/jb202 share the same pattern (they're the same node)

    get drumPattern() { return jb01Node.getPattern(); },
    set drumPattern(v) { jb01Node.setPattern(v); },

    get jb01Pattern() { return jb01Node.getPattern(); },
    set jb01Pattern(v) { jb01Node.setPattern(v); },

    get bassPattern() { return jb202Node.getPattern(); },
    set bassPattern(v) { jb202Node.setPattern(v); },

    get leadPattern() { return jb202Node.getPattern(); },
    set leadPattern(v) { jb202Node.setPattern(v); },

    get jb202Pattern() { return jb202Node.getPattern(); },
    set jb202Pattern(v) { jb202Node.setPattern(v); },

    get samplerKit() { return samplerNode.getKit(); },
    set samplerKit(v) { samplerNode.setKit(v); },

    get samplerPattern() { return samplerNode.getPattern(); },
    set samplerPattern(v) { samplerNode.setPattern(v); },

    // JT10 (lead synth)
    get jt10Pattern() { return jt10Node.getPattern(); },
    set jt10Pattern(v) { jt10Node.setPattern(v); },

    // JT30 (acid bass)
    get jt30Pattern() { return jt30Node.getPattern(); },
    set jt30Pattern(v) { jt30Node.setPattern(v); },

    // JT90 (drum machine)
    get jt90Pattern() { return jt90Node.getPattern(); },
    set jt90Pattern(v) { jt90Node.setPattern(v); },

    // JP9000 (modular synth)
    get jp9000Pattern() { return jp9000Node.getPattern(); },
    set jp9000Pattern(v) { jp9000Node.setPattern(v); },

    // === PARAM ACCESS (proxies to nodes) ===

    get drumParams() {
      const voices = jb01Node._voices;
      return new Proxy({}, {
        get: (_, voice) => {
          if (typeof voice !== 'string') return undefined;
          const voiceDescriptors = jb01Node._descriptors;
          return new Proxy({}, {
            get: (__, param) => jb01Node.getParam(`${voice}.${param}`),
            set: (__, param, value) => {
              jb01Node.setParam(`${voice}.${param}`, value);
              return true;
            },
            ownKeys: () => {
              return Object.keys(voiceDescriptors)
                .filter(path => path.startsWith(`${voice}.`))
                .map(path => path.slice(voice.length + 1));
            },
            getOwnPropertyDescriptor: (__, prop) => {
              const path = `${voice}.${prop}`;
              if (voiceDescriptors[path] !== undefined || jb01Node.getParam(path) !== undefined) {
                return { enumerable: true, configurable: true, writable: true };
              }
              return undefined;
            },
          });
        },
        set: (_, voice, params) => {
          for (const [param, value] of Object.entries(params)) {
            jb01Node.setParam(`${voice}.${param}`, value);
          }
          return true;
        },
        ownKeys: () => voices,
        getOwnPropertyDescriptor: (_, voice) => {
          if (voices.includes(voice)) {
            return { enumerable: true, configurable: true, writable: true };
          }
          return undefined;
        },
      });
    },
    set drumParams(v) {
      for (const [voice, params] of Object.entries(v)) {
        for (const [param, value] of Object.entries(params)) {
          jb01Node.setParam(`${voice}.${param}`, value);
        }
      }
    },

    get jb01Params() { return this.drumParams; },
    set jb01Params(v) { this.drumParams = v; },

    get bassParams() {
      return new Proxy({}, {
        get: (_, param) => jb202Node.getParam(`bass.${param}`),
        set: (_, param, value) => {
          jb202Node.setParam(`bass.${param}`, value);
          return true;
        },
        ownKeys: () => {
          return Object.keys(jb202Node.getParameterDescriptors())
            .map(path => path.replace('bass.', ''));
        },
        getOwnPropertyDescriptor: (_, prop) => {
          const path = `bass.${prop}`;
          if (jb202Node.getParameterDescriptors()[path] !== undefined) {
            return { enumerable: true, configurable: true, writable: true };
          }
          if (jb202Node.getParam(path) !== undefined) {
            return { enumerable: true, configurable: true, writable: true };
          }
          return undefined;
        },
        has: (_, prop) => {
          const path = `bass.${prop}`;
          return jb202Node.getParameterDescriptors()[path] !== undefined ||
                 jb202Node.getParam(path) !== undefined;
        },
      });
    },
    set bassParams(v) {
      for (const [param, value] of Object.entries(v)) {
        jb202Node.setParam(`bass.${param}`, value);
      }
    },

    get leadParams() { return this.bassParams; },
    set leadParams(v) { this.bassParams = v; },

    get jb202Params() { return this.bassParams; },
    set jb202Params(v) { this.bassParams = v; },

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

    // JT10 params (lead synth - single voice 'lead')
    get jt10Params() {
      return new Proxy({}, {
        get: (_, param) => jt10Node.getParam(`lead.${param}`),
        set: (_, param, value) => {
          jt10Node.setParam(`lead.${param}`, value);
          return true;
        },
      });
    },
    set jt10Params(v) {
      for (const [param, value] of Object.entries(v)) {
        jt10Node.setParam(`lead.${param}`, value);
      }
    },

    // JT30 params (acid bass - single voice 'bass')
    get jt30Params() {
      return new Proxy({}, {
        get: (_, param) => jt30Node.getParam(`bass.${param}`),
        set: (_, param, value) => {
          jt30Node.setParam(`bass.${param}`, value);
          return true;
        },
      });
    },
    set jt30Params(v) {
      for (const [param, value] of Object.entries(v)) {
        jt30Node.setParam(`bass.${param}`, value);
      }
    },

    // JT90 params (drum machine - multi-voice)
    get jt90Params() {
      const voices = jt90Node._voices;
      return new Proxy({}, {
        get: (_, voice) => {
          if (typeof voice !== 'string') return undefined;
          return new Proxy({}, {
            get: (__, param) => jt90Node.getParam(`${voice}.${param}`),
            set: (__, param, value) => {
              jt90Node.setParam(`${voice}.${param}`, value);
              return true;
            },
          });
        },
        set: (_, voice, params) => {
          for (const [param, value] of Object.entries(params)) {
            jt90Node.setParam(`${voice}.${param}`, value);
          }
          return true;
        },
        ownKeys: () => voices,
        getOwnPropertyDescriptor: (_, voice) => {
          if (voices.includes(voice)) {
            return { enumerable: true, configurable: true, writable: true };
          }
          return undefined;
        },
      });
    },
    set jt90Params(v) {
      for (const [voice, params] of Object.entries(v)) {
        for (const [param, value] of Object.entries(params)) {
          jt90Node.setParam(`${voice}.${param}`, value);
        }
      }
    },

    // Mixer (placeholder)
    mixer: {
      sends: {},
      voiceRouting: {},
      channelInserts: {},
      masterInserts: [],
      masterVolume: 0.8,
      // Effect chains for flexible routing (delay, reverb, etc.)
      // Structure: { 'target': [{ id, type, params }, ...] }
      // Targets: 'jb01.ch', 'jb01.kick', 'jb202', 'master'
      effectChains: {},
    },

    // Song mode - patterns stored by canonical instrument ID only
    patterns: {
      jb01: {},
      jb202: {},
      jp9000: {},
      sampler: {},
      jt10: {},
      jt30: {},
      jt90: {},
    },
    currentPattern: {
      jb01: 'A',
      jb202: 'A',
      jp9000: 'A',
      sampler: 'A',
      jt10: 'A',
      jt30: 'A',
      jt90: 'A',
    },
    arrangement: [],

    // === HELPER METHODS FOR GENERIC RENDERING ===

    /**
     * Get all canonical instrument IDs with their nodes
     * @returns {Array<{id: string, node: InstrumentNode}>}
     */
    getCanonicalInstruments() {
      return ['jb01', 'jb202', 'sampler', 'jt10', 'jt30', 'jt90']
        .map(id => ({ id, node: this._nodes[id] }))
        .filter(({ node }) => node);
    },

    /**
     * Get the output level for an instrument in dB
     * @param {string} id - Canonical instrument ID
     * @returns {number} Level in dB
     */
    getInstrumentLevel(id) {
      const key = `${id}Level`;
      return this[key] ?? 0;
    },
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
    clock: session.clock.serialize(),
    bars: session.bars,
    jb01Level: session.jb01Level,
    jb202Level: session.jb202Level,
    samplerLevel: session.samplerLevel,
    jt10Level: session.jt10Level,
    jt30Level: session.jt30Level,
    jt90Level: session.jt90Level,
    jp9000Level: session.jp9000Level,
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
  const clockData = data.clock || { bpm: data.bpm, swing: data.swing };

  const session = createSession({
    bpm: clockData.bpm,
    swing: clockData.swing,
    bars: data.bars,
    jb01Level: data.jb01Level ?? data.drumLevel,
    jb202Level: data.jb202Level ?? data.bassLevel,
    samplerLevel: data.samplerLevel,
    jt10Level: data.jt10Level,
    jt30Level: data.jt30Level,
    jt90Level: data.jt90Level,
    jp9000Level: data.jp9000Level,
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

/**
 * Restore session state IN-PLACE (updates existing session object)
 * Used when loading a project during an active agent loop to ensure
 * the running code sees the updated state.
 * @param {Object} existingSession - The session object to update
 * @param {Object} data - Serialized session data
 */
export function restoreSessionInPlace(existingSession, data) {
  const clockData = data.clock || { bpm: data.bpm, swing: data.swing };

  // Update clock
  existingSession.clock.bpm = clockData.bpm || 128;
  existingSession.clock.swing = clockData.swing || 0;

  // Update session properties
  existingSession.bars = data.bars || 2;
  existingSession.jb01Level = data.jb01Level ?? data.drumLevel ?? 0;
  existingSession.jb202Level = data.jb202Level ?? data.bassLevel ?? 0;
  existingSession.samplerLevel = data.samplerLevel ?? 0;
  existingSession.jt10Level = data.jt10Level ?? 0;
  existingSession.jt30Level = data.jt30Level ?? 0;
  existingSession.jt90Level = data.jt90Level ?? 0;
  existingSession.jp9000Level = data.jp9000Level ?? 0;

  // Deserialize params into existing nodes
  if (data.params) {
    existingSession.params.deserialize(data.params);
  }

  // Update mixer, patterns, etc.
  if (data.mixer) existingSession.mixer = data.mixer;
  if (data.patterns) existingSession.patterns = data.patterns;
  if (data.currentPattern) existingSession.currentPattern = data.currentPattern;
  if (data.arrangement) existingSession.arrangement = data.arrangement;
}
