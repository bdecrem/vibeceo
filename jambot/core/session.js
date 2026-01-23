/**
 * Jambot Session Manager
 *
 * Wraps the ParamSystem and provides the unified session interface.
 * All parameter access goes through session.get() and session.set().
 *
 * INSTRUMENTS:
 *   - jb01 (drum machine) — aliases: 'drums'
 *   - jb200 (bass/synth) — aliases: 'bass', 'lead', 'synth'
 *   - sampler (sample player)
 *
 * These are the ONLY real instruments. The aliases are just pointers.
 * Future: 909, 303, 101 will be added as separate instruments when modernized.
 */

import { ParamSystem } from './params.js';
import { Clock } from './clock.js';
import { SamplerNode } from '../instruments/sampler-node.js';
import { JB200Node } from '../instruments/jb200-node.js';
import { JB01Node } from '../instruments/jb01-node.js';
import { TR909Node } from '../instruments/tr909-node.js';
import { TB303Node } from '../instruments/tb303-node.js';
import { SH101Node } from '../instruments/sh101-node.js';

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

  // Create the canonical instruments (6 total)
  const jb01Node = new JB01Node();
  const jb200Node = new JB200Node();
  const samplerNode = new SamplerNode();
  const tr909Node = new TR909Node();
  const tb303Node = new TB303Node();
  const sh101Node = new SH101Node();

  // Register instruments with their canonical names
  params.register('jb01', jb01Node);
  params.register('jb200', jb200Node);
  params.register('sampler', samplerNode);
  params.register('r9d9', tr909Node);
  params.register('r3d3', tb303Node);
  params.register('r1d1', sh101Node);

  // Register ALIASES (pointers to the same nodes)
  params.register('drums', jb01Node);      // drums → jb01
  params.register('bass', jb200Node);      // bass → jb200
  params.register('lead', jb200Node);      // lead → jb200
  params.register('synth', jb200Node);     // synth → jb200

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
    jb200Level: config.jb200Level ?? 0,
    samplerLevel: config.samplerLevel ?? 0,
    r9d9Level: config.r9d9Level ?? 0,
    r3d3Level: config.r3d3Level ?? 0,
    r1d1Level: config.r1d1Level ?? 0,

    // ParamSystem instance
    params,

    // Direct node references
    _nodes: {
      jb01: jb01Node,
      jb200: jb200Node,
      sampler: samplerNode,
      r9d9: tr909Node,
      r3d3: tb303Node,
      r1d1: sh101Node,
      // Aliases point to same nodes
      drums: jb01Node,
      bass: jb200Node,
      lead: jb200Node,
      synth: jb200Node,
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
    // bass/lead/synth/jb200 share the same pattern (they're the same node)

    get drumPattern() { return jb01Node.getPattern(); },
    set drumPattern(v) { jb01Node.setPattern(v); },

    get jb01Pattern() { return jb01Node.getPattern(); },
    set jb01Pattern(v) { jb01Node.setPattern(v); },

    get bassPattern() { return jb200Node.getPattern(); },
    set bassPattern(v) { jb200Node.setPattern(v); },

    get leadPattern() { return jb200Node.getPattern(); },
    set leadPattern(v) { jb200Node.setPattern(v); },

    get jb200Pattern() { return jb200Node.getPattern(); },
    set jb200Pattern(v) { jb200Node.setPattern(v); },

    get samplerKit() { return samplerNode.getKit(); },
    set samplerKit(v) { samplerNode.setKit(v); },

    get samplerPattern() { return samplerNode.getPattern(); },
    set samplerPattern(v) { samplerNode.setPattern(v); },

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
        get: (_, param) => jb200Node.getParam(`bass.${param}`),
        set: (_, param, value) => {
          jb200Node.setParam(`bass.${param}`, value);
          return true;
        },
        ownKeys: () => {
          return Object.keys(jb200Node.getParameterDescriptors())
            .map(path => path.replace('bass.', ''));
        },
        getOwnPropertyDescriptor: (_, prop) => {
          const path = `bass.${prop}`;
          if (jb200Node.getParameterDescriptors()[path] !== undefined) {
            return { enumerable: true, configurable: true, writable: true };
          }
          if (jb200Node.getParam(path) !== undefined) {
            return { enumerable: true, configurable: true, writable: true };
          }
          return undefined;
        },
        has: (_, prop) => {
          const path = `bass.${prop}`;
          return jb200Node.getParameterDescriptors()[path] !== undefined ||
                 jb200Node.getParam(path) !== undefined;
        },
      });
    },
    set bassParams(v) {
      for (const [param, value] of Object.entries(v)) {
        jb200Node.setParam(`bass.${param}`, value);
      }
    },

    get leadParams() { return this.bassParams; },
    set leadParams(v) { this.bassParams = v; },

    get jb200Params() { return this.bassParams; },
    set jb200Params(v) { this.bassParams = v; },

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

    // Mixer (placeholder)
    mixer: {
      sends: {},
      voiceRouting: {},
      channelInserts: {},
      masterInserts: [],
      masterVolume: 0.8,
      // Effect chains for flexible routing (delay, reverb, etc.)
      // Structure: { 'target': [{ id, type, params }, ...] }
      // Targets: 'jb01.ch', 'jb01.kick', 'jb200', 'master'
      effectChains: {},
    },

    // Song mode - patterns stored by canonical instrument ID only
    patterns: {
      jb01: {},
      jb200: {},
      sampler: {},
      r9d9: {},
      r3d3: {},
      r1d1: {},
    },
    currentPattern: {
      jb01: 'A',
      jb200: 'A',
      sampler: 'A',
      r9d9: 'A',
      r3d3: 'A',
      r1d1: 'A',
    },
    arrangement: [],

    // === HELPER METHODS FOR GENERIC RENDERING ===

    /**
     * Get all canonical instrument IDs with their nodes
     * @returns {Array<{id: string, node: InstrumentNode}>}
     */
    getCanonicalInstruments() {
      return ['jb01', 'jb200', 'sampler', 'r9d9', 'r3d3', 'r1d1']
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
    jb200Level: session.jb200Level,
    samplerLevel: session.samplerLevel,
    r9d9Level: session.r9d9Level,
    r3d3Level: session.r3d3Level,
    r1d1Level: session.r1d1Level,
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
    jb200Level: data.jb200Level ?? data.bassLevel,
    samplerLevel: data.samplerLevel,
    r9d9Level: data.r9d9Level,
    r3d3Level: data.r3d3Level,
    r1d1Level: data.r1d1Level,
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
