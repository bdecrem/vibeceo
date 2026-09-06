/**
 * Jambot Session Manager
 *
 * Wraps the ParamSystem and provides the unified session interface.
 * All parameter access goes through session.get() and session.set().
 *
 * INSTRUMENTS:
 *   - jb01 (drum machine) — aliases: 'drums'
 *   - jb202 (bass synth) — aliases: 'bass', 'lead', 'synth'
 *   - jbs (sample player, formerly 'sampler')
 *   - jp9000 (modular synth) — managed separately via tools
 *
 * These are the canonical instruments. The aliases are just pointers.
 */

import { ParamSystem } from './params.js';
import { Clock } from './clock.js';
import { RoutingManager } from './routing.js';
import { JBSNode } from '../instruments/jbs-node.js';
import { JB202Node } from '../instruments/jb202-node.js';
import { JB01Node } from '../instruments/jb01-node.js';
import { JT10Node } from '../instruments/jt10-node.js';
import { JT30Node } from '../instruments/jt30-node.js';
import { JT90Node } from '../instruments/jt90-node.js';
import { JP9000Node } from '../instruments/jp9000-node.js';
import { DelayNode } from '../effects/delay-node.js';
import { EQNode } from '../effects/eq-node.js';
import { FilterNode } from '../effects/filter-node.js';
import { SidechainNode } from '../effects/sidechain-node.js';
import { ReverbNode } from '../effects/reverb-node.js';

// Map effect type string to node class (shared with mixer-tools.js)
const EFFECT_NODE_CLASSES = {
  delay: DelayNode,
  eq: EQNode,
  filter: FilterNode,
  sidechain: SidechainNode,
  reverb: ReverbNode,
};

/**
 * Serialize effect chains, stripping _node references
 * @param {Object} effectChains
 * @returns {Object}
 */
function serializeEffectChains(effectChains) {
  if (!effectChains) return {};
  const result = {};
  for (const [target, chain] of Object.entries(effectChains)) {
    result[target] = chain.map(e => ({
      id: e.id,
      type: e.type,
      // The node holds the live values; the static `params` object is whatever
      // add_effect received (often {}). Saving the static one reset every
      // delay/reverb to defaults on reload.
      params: e._node && typeof e._node.getParams === 'function' ? { ...e._node.getParams() } : { ...e.params },
    }));
  }
  return result;
}

/**
 * Reconstruct effect nodes from serialized chain data and register in ParamSystem
 * @param {Object} effectChains - Serialized effect chains
 * @param {ParamSystem} params - ParamSystem to register nodes in
 * @returns {Object} Effect chains with _node references restored
 */
function reconstructEffectNodes(effectChains, params) {
  if (!effectChains) return {};
  const result = {};
  for (const [target, chain] of Object.entries(effectChains)) {
    result[target] = chain.map(e => {
      const NodeClass = EFFECT_NODE_CLASSES[e.type];
      if (!NodeClass) {
        // Unknown type — keep data but no node
        return { id: e.id, type: e.type, params: { ...e.params } };
      }
      const node = new NodeClass(e.id);
      for (const [key, value] of Object.entries(e.params || {})) {
        node.setParam(key, value);
      }
      params.register(`fx.${target}.${e.id}`, node);
      return { id: e.id, type: e.type, params: { ...e.params }, _node: node };
    });
  }
  return result;
}


// Enumerability traps for the flat single-voice param proxies (jt10/jt30):
// keys are the node's descriptor paths with the voice prefix stripped, so
// JSON.stringify(session.jt30Params) captures every param in engine units.
// Without these, save_pattern stored {} for JT10/JT30/JT90 and song-mode
// renders silently ignored every tweak.
function flatParamTraps(node, prefix) {
  const keys = () => Object.keys(node.getParameterDescriptors())
    .filter(k => k.startsWith(prefix))
    .map(k => k.slice(prefix.length));
  return {
    ownKeys: () => keys(),
    getOwnPropertyDescriptor: (_, prop) => keys().includes(prop)
      ? { enumerable: true, configurable: true, writable: true }
      : undefined,
  };
}


/**
 * Instrument type registry — one entry per synth that can be instantiated.
 * `kind` decides the pattern/params shape the tools use:
 *   drums   → pattern { voice: [steps] }, params { voice: { param } }
 *   mono    → pattern [steps], params { param } (flat, under `prefix`)
 *   modular / sampler → single-instance only (their tools reach the node
 *   directly); listed here so listInstruments() is complete.
 */
export const INSTRUMENT_TYPES = {
  jb01:   { Node: JB01Node,   kind: 'drums' },
  jt90:   { Node: JT90Node,   kind: 'drums' },
  jb202:  { Node: JB202Node,  kind: 'mono', prefix: 'bass.' },
  jt30:   { Node: JT30Node,   kind: 'mono', prefix: 'bass.' },
  jt10:   { Node: JT10Node,   kind: 'mono', prefix: 'lead.' },
  jp9000: { Node: JP9000Node, kind: 'modular', single: true },
  jbs:    { Node: JBSNode,    kind: 'sampler', single: true },
};

const RESERVED_IDS = new Set(['fx', 'master', 'drums', 'bass', 'lead', 'synth', 'sampler', 'jb200']);
const ID_RE = /^[a-z][a-z0-9_-]{0,23}$/;

/** Per-voice params proxy: params.kick.decay (engine units). */
function voiceParamsProxy(node) {
  const voices = node._voices;
  return new Proxy({}, {
    get: (_, voice) => {
      if (typeof voice !== 'string') return undefined;
      return new Proxy({}, {
        get: (__, param) => typeof param === 'string' ? node.getParam(`${voice}.${param}`) : undefined,
        set: (__, param, value) => { node.setParam(`${voice}.${param}`, value); return true; },
        ...flatParamTraps(node, `${voice}.`),
      });
    },
    set: (_, voice, params) => {
      for (const [param, value] of Object.entries(params)) node.setParam(`${voice}.${param}`, value);
      return true;
    },
    ownKeys: () => voices,
    getOwnPropertyDescriptor: (_, voice) => voices.includes(voice)
      ? { enumerable: true, configurable: true, writable: true }
      : undefined,
  });
}

/** Flat params proxy: params.filterCutoff (engine units) under a voice prefix. */
function flatParamsProxy(node, prefix) {
  return new Proxy({}, {
    get: (_, param) => typeof param === 'string' ? node.getParam(`${prefix}${param}`) : undefined,
    set: (_, param, value) => { node.setParam(`${prefix}${param}`, value); return true; },
    ...flatParamTraps(node, prefix),
  });
}

function assignParams(node, kind, prefix, v) {
  if (!v) return;
  if (kind === 'drums') {
    for (const [voice, params] of Object.entries(v)) {
      for (const [param, value] of Object.entries(params || {})) node.setParam(`${voice}.${param}`, value);
    }
  } else {
    for (const [param, value] of Object.entries(v)) node.setParam(`${prefix}${param}`, value);
  }
}

/** Unregister every effect node whose key starts with `prefix` ('fx.' or 'fx.<id>.'). */
function unregisterEffectNodes(params, prefix) {
  for (const key of params.listNodes()) {
    if (key.startsWith(prefix)) params.unregister(key);
  }
}

/**
 * Put an instrument node back in the state a brand-new session gives it,
 * keeping the SAME object (the session's getters, _nodes, ParamSystem and
 * any tool holding a reference all point at it). Defaults come from a fresh
 * instance of the same class, so this never duplicates per-node default
 * logic (engine-unit conversion, null "follow amp" envelopes, cents, …).
 * The JB-S kit is a sample bank, not song content — it stays loaded.
 */
function resetNodeToDefaults(node, sampleRate) {
  const fresh = new node.constructor({ id: node.id, sampleRate });
  node._params = { ...fresh._params };
  node.setPattern(fresh.getPattern());
  node.setLevel(0);   // createSession() starts every node at 0 dB (config.<id>Level ?? 0)
  if (typeof node.setSwing === 'function') node.setSwing(fresh.getSwing());
  if (typeof node.setAccentLevel === 'function') node.setAccentLevel(fresh.getAccentLevel());
  if (fresh.rack) {                       // jp9000: empty rack, nothing triggers
    node.rack = fresh.rack;
    node._triggerModules = [];
  }
  delete node._renderAutomation;
}

/**
 * Start over IN PLACE: every instrument back to factory pattern/params,
 * added instances removed, saved patterns / arrangement / automation /
 * effect chains / routing cleared, transport back to 2 bars and no swing.
 * The session object keeps its identity — the web Studio holds a ref to it
 * and tools mutate it in place, so create_session must not swap objects.
 *
 * @param {Object} session
 * @param {Object} [opts] - { bpm = 128, swing = 0 }
 * @returns {Object} the same session
 */
export function resetSession(session, opts = {}) {
  const sampleRate = session.clock?.sampleRate || 44100;

  // Added instances (id !== type) go away entirely — patterns, fx, arrangement slots.
  for (const inst of [...session.instruments]) {
    if (inst.id !== inst.type) session.removeInstrument(inst.id);
  }

  // Effects: every fx.* registration plus the chains that reference them.
  unregisterEffectNodes(session.params, 'fx.');
  session.mixer = { channelInserts: {}, masterInserts: [], masterVolume: 0.8, effectChains: {} };

  // Automation lanes (all instruments).
  session.params.clearAutomation();

  // The canonical instruments, same node objects, factory state.
  for (const { id } of session.instruments) {
    const node = session._nodes[id];
    if (node) resetNodeToDefaults(node, sampleRate);
  }

  // Song mode.
  session.patterns = Object.fromEntries(session.instruments.map(i => [i.id, {}]));
  session.currentPattern = Object.fromEntries(session.instruments.map(i => [i.id, 'A']));
  session.arrangement = [];

  // Tracks / sends / master inserts — a fresh session has no RoutingManager.
  session.routing = undefined;

  // Transport.
  session.bpm = opts.bpm ?? 128;
  session.swing = opts.swing ?? 0;
  session.bars = 2;
  return session;
}

/**
 * Accessor for one instrument instance — what every tool works through.
 * `pattern` / `params` get and set exactly like the legacy session.jb202Pattern
 * / session.jb202Params proxies did, but for any instance id.
 */
function instrumentAccessor(id, type, node) {
  const def = INSTRUMENT_TYPES[type];
  const kind = def?.kind || 'mono';
  const prefix = def?.prefix || '';
  return {
    id, type, kind, node,
    get pattern() { return node.getPattern(); },
    set pattern(v) { node.setPattern(v); },
    get params() { return kind === 'drums' ? voiceParamsProxy(node) : flatParamsProxy(node, prefix); },
    set params(v) { assignParams(node, kind, prefix, v); },
  };
}

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
  const jbsNode = new JBSNode();
  const jt10Node = new JT10Node();
  const jt30Node = new JT30Node();
  const jt90Node = new JT90Node();
  const jp9000Node = new JP9000Node({ sampleRate: config.sampleRate || 44100 });

  // Set initial levels from config (nodes own all state)
  jb01Node.setLevel(config.jb01Level ?? 0);
  jb202Node.setLevel(config.jb202Level ?? 0);
  jbsNode.setLevel(config.jbsLevel ?? config.samplerLevel ?? 0);
  jt10Node.setLevel(config.jt10Level ?? 0);
  jt30Node.setLevel(config.jt30Level ?? 0);
  jt90Node.setLevel(config.jt90Level ?? 0);
  jp9000Node.setLevel(config.jp9000Level ?? 0);

  // Register instruments with their canonical names
  params.register('jb01', jb01Node);
  params.register('jb202', jb202Node);
  params.register('jbs', jbsNode);
  params.register('sampler', jbsNode);  // legacy alias
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

    // Producer-facing swing is 0-100 (%); the clock stores 0-1. set_swing,
    // tweak('swing'), status and the UI all speak percent — without this
    // conversion any amount >= 1 clamped to full shuffle inside the clock.
    get swing() { return Math.round(clock.swing * 100); },
    set swing(v) { clock.swing = (Number(v) || 0) / 100; },

    // Bars for render length
    bars: config.bars || 2,

    // ParamSystem instance
    params,

    // Direct node references
    _nodes: {
      jb01: jb01Node,
      jb202: jb202Node,
      jbs: jbsNode,
      sampler: jbsNode,  // legacy alias
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

    // === INSTRUMENT INSTANCES ===
    // Every instrument that renders. The canonical seven have id === type;
    // addInstrument() adds more of any non-single type ('jb202-2', 'bass2').
    instruments: [
      { id: 'jb01', type: 'jb01' }, { id: 'jb202', type: 'jb202' }, { id: 'jbs', type: 'jbs' },
      { id: 'jt10', type: 'jt10' }, { id: 'jt30', type: 'jt30' }, { id: 'jt90', type: 'jt90' },
      { id: 'jp9000', type: 'jp9000' },
    ],

    listInstruments() {
      return this.instruments.map(i => ({ ...i }));
    },

    instrumentType(id) {
      return this.instruments.find(i => i.id === id)?.type;
    },

    /** Accessor ({ id, type, kind, node, pattern, params }) or null. */
    instrument(id) {
      const entry = this.instruments.find(i => i.id === id);
      if (!entry) return null;
      return instrumentAccessor(entry.id, entry.type, this._nodes[entry.id]);
    },

    /** Public node lookup (tools must not touch _nodes). */
    getNode(id) {
      return this._nodes[id] || null;
    },

    /**
     * Add another instance of an instrument type.
     * @param {string} type - 'jb202', 'jt90', ...
     * @param {string} [id] - defaults to '<type>-2', '<type>-3', ...
     * @returns {Object} accessor, or { error }
     */
    addInstrument(type, id) {
      const def = INSTRUMENT_TYPES[type];
      if (!def) return { error: `Unknown instrument type "${type}". Types: ${Object.keys(INSTRUMENT_TYPES).join(', ')}` };
      if (def.single) return { error: `${type} supports a single instance` };
      if (!id) {
        let n = 2;
        while (this._nodes[`${type}-${n}`]) n++;
        id = `${type}-${n}`;
      }
      if (!ID_RE.test(id)) return { error: `Invalid id "${id}" (lowercase letters, digits, - or _, max 24 chars)` };
      if (RESERVED_IDS.has(id) || this._nodes[id] || params.nodes.has(id)) return { error: `Id "${id}" is already in use` };
      const node = new def.Node({ id, sampleRate: config.sampleRate || 44100 });
      node.setLevel(0);
      params.register(id, node);
      this._nodes[id] = node;
      this.instruments.push({ id, type });
      if (!this.patterns[id]) this.patterns[id] = {};
      if (!this.currentPattern[id]) this.currentPattern[id] = 'A';
      return instrumentAccessor(id, type, node);
    },

    /** Remove an added instance (the canonical seven can't be removed). */
    removeInstrument(id) {
      const entry = this.instruments.find(i => i.id === id);
      if (!entry) return { error: `No instrument "${id}"` };
      if (entry.id === entry.type) return { error: `${id} is built in; clear its pattern instead` };
      params.unregister(id);
      delete this._nodes[id];
      this.instruments = this.instruments.filter(i => i.id !== id);
      delete this.patterns[id];
      delete this.currentPattern[id];
      // Effect nodes on this instance ('fx.<id>.delay1', 'fx.<id>.<voice>.eq1')
      // were registered by add_effect; drop them with their chains, otherwise
      // list_params/tweak keep "working" on effects that no longer render.
      unregisterEffectNodes(params, `fx.${id}.`);
      for (const key of Object.keys(this.mixer?.effectChains || {})) {
        if (key === id || key.startsWith(id + '.')) delete this.mixer.effectChains[key];
      }
      for (const section of this.arrangement || []) {
        if (section.patterns) delete section.patterns[id];
      }
      this.routing?.tracks?.delete?.(id);
      return { ok: true };
    },

    /** Start over in place (see resetSession). */
    reset(opts) {
      return resetSession(this, opts);
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
     * Get a single parameter descriptor by full path
     * @param {string} path - e.g., 'jb202.filterCutoff', 'jb01.kick.decay'
     * @returns {Object|null}
     */
    getDescriptor(path) {
      return params.getDescriptor(path);
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

    get jbsKit() { return jbsNode.getKit(); },
    set jbsKit(v) { jbsNode.setKit(v); },

    get jbsPattern() { return jbsNode.getPattern(); },
    set jbsPattern(v) { jbsNode.setPattern(v); },

    // Legacy aliases (deprecated — use jbs* instead)
    get samplerKit() { return jbsNode.getKit(); },
    set samplerKit(v) { jbsNode.setKit(v); },
    get samplerPattern() { return jbsNode.getPattern(); },
    set samplerPattern(v) { jbsNode.setPattern(v); },

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

    get drumParams() { return voiceParamsProxy(jb01Node); },
    set drumParams(v) {
      for (const [voice, params] of Object.entries(v)) {
        for (const [param, value] of Object.entries(params)) {
          jb01Node.setParam(`${voice}.${param}`, value);
        }
      }
    },

    get jb01Params() { return this.drumParams; },
    set jb01Params(v) { this.drumParams = v; },

    get bassParams() { return flatParamsProxy(jb202Node, 'bass.'); },
    set bassParams(v) {
      for (const [param, value] of Object.entries(v)) {
        jb202Node.setParam(`bass.${param}`, value);
      }
    },

    get leadParams() { return this.bassParams; },
    set leadParams(v) { this.bassParams = v; },

    get jb202Params() { return this.bassParams; },
    set jb202Params(v) { this.bassParams = v; },

    get jbsParams() {
      return new Proxy({}, {
        get: (_, slot) => {
          const result = {};
          const slotParams = ['level', 'tune', 'attack', 'decay', 'filter', 'pan'];
          for (const param of slotParams) {
            result[param] = jbsNode.getParam(`${slot}.${param}`);
          }
          return result;
        },
        set: (_, slot, params) => {
          for (const [param, value] of Object.entries(params)) {
            jbsNode.setParam(`${slot}.${param}`, value);
          }
          return true;
        },
      });
    },
    set jbsParams(v) {
      for (const [slot, params] of Object.entries(v)) {
        for (const [param, value] of Object.entries(params)) {
          jbsNode.setParam(`${slot}.${param}`, value);
        }
      }
    },

    // Legacy alias (deprecated — use jbsParams instead)
    get samplerParams() { return this.jbsParams; },
    set samplerParams(v) { this.jbsParams = v; },

    // JT10 params (lead synth - single voice 'lead')
    get jt10Params() { return flatParamsProxy(jt10Node, 'lead.'); },
    set jt10Params(v) {
      for (const [param, value] of Object.entries(v)) {
        jt10Node.setParam(`lead.${param}`, value);
      }
    },

    // JT30 params (acid bass - single voice 'bass')
    get jt30Params() { return flatParamsProxy(jt30Node, 'bass.'); },
    set jt30Params(v) {
      for (const [param, value] of Object.entries(v)) {
        jt30Node.setParam(`bass.${param}`, value);
      }
    },

    // JT90 params (drum machine - multi-voice)
    get jt90Params() { return voiceParamsProxy(jt90Node); },
    set jt90Params(v) {
      for (const [voice, params] of Object.entries(v)) {
        for (const [param, value] of Object.entries(params)) {
          jt90Node.setParam(`${voice}.${param}`, value);
        }
      }
    },

    // JT90 swing and accent level
    get jt90Swing() { return jt90Node.getSwing(); },
    set jt90Swing(v) { jt90Node.setSwing(v); },
    get jt90AccentLevel() { return jt90Node.getAccentLevel(); },
    set jt90AccentLevel(v) { jt90Node.setAccentLevel(v); },

    // Mixer state
    mixer: {
      channelInserts: {},
      masterInserts: [],
      masterVolume: 0.8,
      // Effect chains: { 'target': [{ id, type, params, _node }, ...] }
      // Targets: 'jb01.ch', 'jb01.kick', 'jb202', 'master'
      // Each effect is addressable via ParamSystem: fx.{target}.{effectId}
      effectChains: {},
    },

    // Song mode - patterns stored by canonical instrument ID only
    patterns: {
      jb01: {},
      jb202: {},
      jp9000: {},
      jbs: {},
      jt10: {},
      jt30: {},
      jt90: {},
    },
    currentPattern: {
      jb01: 'A',
      jb202: 'A',
      jp9000: 'A',
      jbs: 'A',
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
      return ['jb01', 'jb202', 'jbs', 'jt10', 'jt30', 'jt90']
        .map(id => ({ id, node: this._nodes[id] }))
        .filter(({ node }) => node);
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
  // Serialize mixer with effect chains stripped of _node references
  const mixerData = {
    ...session.mixer,
    effectChains: serializeEffectChains(session.mixer.effectChains),
  };

  return {
    clock: session.clock.serialize(),
    bars: session.bars,
    jb01Level: session._nodes.jb01.getLevel(),
    jb202Level: session._nodes.jb202.getLevel(),
    jbsLevel: session._nodes.jbs.getLevel(),
    jt10Level: session._nodes.jt10.getLevel(),
    jt30Level: session._nodes.jt30.getLevel(),
    jt90Level: session._nodes.jt90.getLevel(),
    jp9000Level: session._nodes.jp9000.getLevel(),
    params: session.params.serialize(),
    mixer: mixerData,
    routing: session.routing ? session.routing.serialize() : undefined,
    patterns: session.patterns,
    currentPattern: session.currentPattern,
    arrangement: session.arrangement,
    instruments: session.instruments.map(({ id, type }) => ({ id, type, level: session._nodes[id]?.getLevel?.() ?? 0 })),
  };
}

/** Recreate added instances (id !== type) and restore every instance level. */
function restoreInstances(session, data) {
  for (const inst of data.instruments || []) {
    if (!inst || inst.id === inst.type) continue;
    if (!session._nodes[inst.id]) {
      const r = session.addInstrument(inst.type, inst.id);
      if (r?.error) { console.warn('[session] could not restore instrument', inst.id, r.error); continue; }
    }
    session._nodes[inst.id]?.setLevel?.(inst.level ?? 0);
  }
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
    jbsLevel: data.jbsLevel ?? data.samplerLevel,
    jt10Level: data.jt10Level,
    jt30Level: data.jt30Level,
    jt90Level: data.jt90Level,
    jp9000Level: data.jp9000Level,
  });

  restoreInstances(session, data);

  if (data.params) {
    session.params.deserialize(data.params);
  }

  if (data.mixer) {
    session.mixer = {
      ...data.mixer,
      effectChains: reconstructEffectNodes(data.mixer.effectChains, session.params),
    };
  }
  if (data.routing) {
    if (!session.routing) session.routing = new RoutingManager();
    session.routing.deserialize(data.routing);
    session.routing.attachParams?.(session.params);
    // Register the send effect nodes as `send.<id>` right away so
    // tweak({ path: 'send.<id>.<param>' }) works on a freshly loaded track
    // (idempotent; the routing/mixer tools attach again on their own).
    session.routing.attachParams(session.params);
  }
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
  existingSession._nodes.jb01.setLevel(data.jb01Level ?? data.drumLevel ?? 0);
  existingSession._nodes.jb202.setLevel(data.jb202Level ?? data.bassLevel ?? 0);
  existingSession._nodes.jbs.setLevel(data.jbsLevel ?? data.samplerLevel ?? 0);
  existingSession._nodes.jt10.setLevel(data.jt10Level ?? 0);
  existingSession._nodes.jt30.setLevel(data.jt30Level ?? 0);
  existingSession._nodes.jt90.setLevel(data.jt90Level ?? 0);
  existingSession._nodes.jp9000.setLevel(data.jp9000Level ?? 0);

  // Drop instances the saved state doesn't have, recreate the ones it does
  for (const inst of [...existingSession.instruments]) {
    if (inst.id !== inst.type && !(data.instruments || []).some(i => i.id === inst.id)) existingSession.removeInstrument(inst.id);
  }
  restoreInstances(existingSession, data);

  // Deserialize params into existing nodes
  if (data.params) {
    existingSession.params.deserialize(data.params);
  }

  // Update mixer (reconstruct effect nodes), patterns, etc. The previous
  // state's effect nodes are unregistered first so they don't linger as
  // ghosts (or trip the re-register warning) next to the reconstructed ones.
  if (data.mixer) {
    unregisterEffectNodes(existingSession.params, 'fx.');
    existingSession.mixer = {
      ...data.mixer,
      effectChains: reconstructEffectNodes(data.mixer.effectChains, existingSession.params),
    };
  }
  if (data.routing) {
    if (!existingSession.routing) existingSession.routing = new RoutingManager();
    existingSession.routing.deserialize(data.routing);
    existingSession.routing.attachParams?.(existingSession.params);
    existingSession.routing.attachParams(existingSession.params);
  }
  if (data.patterns) existingSession.patterns = data.patterns;
  if (data.currentPattern) existingSession.currentPattern = data.currentPattern;
  if (data.arrangement) existingSession.arrangement = data.arrangement;
}
