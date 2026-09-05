/**
 * Mixer Tools
 *
 * Tools for DAW-like mixing: effect chains, channel inserts, sidechain,
 * master inserts, and mixer display.
 */

import { registerTools } from './index.js';
import { DelayNode } from '../effects/delay-node.js';
import { EQNode } from '../effects/eq-node.js';
import { FilterNode } from '../effects/filter-node.js';
import { SidechainNode } from '../effects/sidechain-node.js';
import { ReverbNode } from '../effects/reverb-node.js';

// Map effect type string to node class
const EFFECT_NODE_CLASSES = {
  delay: DelayNode,
  eq: EQNode,
  filter: FilterNode,
  sidechain: SidechainNode,
  reverb: ReverbNode,
};

// Canonical instrument ids the render loop actually consults (render.js:268).
const CANONICAL_IDS = ['jb01', 'jb200', 'jb202', 'jp9000', 'jbs', 'jt10', 'jt30', 'jt90'];

// Helper to ensure mixer state exists
function ensureMixerState(session) {
  if (!session.mixer) {
    session.mixer = { masterVolume: 0.8, effectChains: {} };
  }
}

/**
 * Normalize an effect target to the canonical instrument id the renderer keys
 * on, so add_effect on an alias ('bass', 'drums', 'lead') actually renders.
 * Effect chains used to be keyed by the raw target string while render.js only
 * looks up canonical ids — 'bass' reported success but never processed.
 *
 * - 'master' and unknown targets pass through unchanged.
 * - A voice suffix is preserved: 'bass.ch' → 'jb202.ch'.
 * - Already-canonical ids ('jb202', 'jt90') pass through unchanged.
 *
 * @param {Object} session
 * @param {string} target
 * @returns {string} canonical target key
 */
function canonicalTargetId(session, target) {
  if (!target || target === 'master') return target;
  const nodes = session?.params?.nodes;
  if (!nodes) return target;

  const dot = target.indexOf('.');
  const head = dot === -1 ? target : target.slice(0, dot);
  const tail = dot === -1 ? '' : target.slice(dot); // includes leading '.'

  if (CANONICAL_IDS.includes(head)) return target;
  if (session?.instrument?.(head)) return target;   // added instance, e.g. 'jb202-2'

  const node = nodes.get(head);
  if (!node) return target; // unknown alias — leave as-is

  for (const id of CANONICAL_IDS) {
    if (nodes.get(id) === node) return id + tail;
  }
  return target;
}

const mixerTools = {
  /**
   * Add channel insert (EQ, filter, etc.) - replaces existing insert of same type
   * Routes through effectChains for actual DSP processing at render time.
   */
  add_channel_insert: async (input, session, context) => {
    let { channel, effect, preset, params: userParams } = input;
    // 'ducker' is the sidechain node under a friendlier name (the schema still
    // advertises it); accept it rather than erroring.
    if (effect === 'ducker') effect = 'sidechain';

    if (!channel || !effect) {
      return 'Error: add_channel_insert requires channel and effect parameters';
    }

    // Channel-insert semantics: replace an existing insert of the same type
    // (don't stack duplicates). Then delegate to the single add_effect path so
    // there is exactly one way to append an effect to a chain.
    if (session.mixer?.effectChains) {
      const key = canonicalTargetId(session, channel);
      if (session.mixer.effectChains[key]?.some(e => e.type === effect)) {
        await mixerTools.remove_channel_insert({ channel, effect }, session, context);
      }
    }

    return mixerTools.add_effect(
      { target: channel, effect, preset, ...(userParams || {}) },
      session,
      context
    );
  },

  /**
   * Remove channel insert
   */
  remove_channel_insert: async (input, session, context) => {
    const { effect } = input;
    const channel = canonicalTargetId(session, input.channel);

    if (!session.mixer?.effectChains?.[channel]) {
      return `No inserts on ${channel}`;
    }

    const chain = session.mixer.effectChains[channel];

    if (effect === 'all' || !effect) {
      for (const e of chain) {
        session.params.unregister(`fx.${channel}.${e.id}`);
      }
      const count = chain.length;
      delete session.mixer.effectChains[channel];
      return `Removed all ${count} insert(s) from ${channel}`;
    } else {
      const toRemove = chain.filter(e => e.type === effect || e.id === effect);
      if (toRemove.length === 0) {
        return `No ${effect} insert found on ${channel}`;
      }
      for (const e of toRemove) {
        session.params.unregister(`fx.${channel}.${e.id}`);
      }
      session.mixer.effectChains[channel] = chain.filter(e => e.type !== effect && e.id !== effect);
      if (session.mixer.effectChains[channel].length === 0) {
        delete session.mixer.effectChains[channel];
      }
      return `Removed ${effect} insert from ${channel}`;
    }
  },

  /**
   * Add sidechain ducking (bass ducks on kick, etc.)
   * Creates a proper SidechainNode and registers in ParamSystem.
   */
  add_sidechain: async (input, session, context) => {
    const { trigger, amount, attack, release, hold } = input;
    // Key the chain on the canonical id the renderer consults, not the raw alias.
    const target = canonicalTargetId(session, input.target);

    ensureMixerState(session);
    if (!session.mixer.effectChains) session.mixer.effectChains = {};
    if (!session.mixer.effectChains[target]) session.mixer.effectChains[target] = [];

    const chain = session.mixer.effectChains[target];
    const effectCount = chain.filter(e => e.type === 'sidechain').length;
    const effectId = `sidechain${effectCount + 1}`;

    const node = new SidechainNode(effectId);
    if (trigger) node.setParam('trigger', trigger);
    if (amount !== undefined) node.setParam('amount', amount);
    if (attack !== undefined) node.setParam('attack', attack);
    if (release !== undefined) node.setParam('release', release);
    if (hold !== undefined) node.setParam('hold', hold);

    node.validateInterface();

    const paramPath = `fx.${target}.${effectId}`;
    session.params.register(paramPath, node);

    chain.push({
      id: effectId,
      type: 'sidechain',
      _node: node,
    });

    const duckAmount = node.getParams().amount ?? 0.5;
    return `Added sidechain: ${target} ducks when ${trigger || 'kick'} plays (${(duckAmount * 100).toFixed(0)}% reduction, addressable as ${paramPath})`;
  },

  /**
   * Add effect to master bus
   * Routes through effectChains['master'] for actual DSP processing at render time.
   */
  add_master_insert: async (input, session, context) => {
    let { effect, preset, params: userParams } = input;
    if (effect === 'ducker') effect = 'sidechain';

    if (!effect) {
      return 'Error: add_master_insert requires an effect parameter';
    }

    // Thin wrapper over the single add_effect path (target = master bus).
    return mixerTools.add_effect(
      { target: 'master', effect, preset, ...(userParams || {}) },
      session,
      context
    );
  },

  /**
   * Display current mixer configuration
   */
  show_mixer: async (input, session, context) => {
    const lines = ['MIXER CONFIGURATION:', ''];

    // Node output levels
    const drums = session.get('drums.level') ?? 0;
    const bass = session.get('bass.level') ?? 0;
    const lead = session.get('lead.level') ?? 0;
    const jbs = session.get('jbs.level') ?? 0;

    const formatLevel = (dB) => {
      if (dB === 0) return '0dB';
      return dB > 0 ? `+${dB}dB` : `${dB}dB`;
    };

    lines.push('OUTPUT LEVELS:');
    lines.push(`  drums: ${formatLevel(drums)}  bass: ${formatLevel(bass)}  lead: ${formatLevel(lead)}  jbs: ${formatLevel(jbs)}`);
    lines.push('');

    // Check if mixer has any other config
    const hasConfig = session.mixer && (
      Object.keys(session.mixer.effectChains || {}).length > 0
    );

    if (!hasConfig) {
      lines.push('Use tweak({ path: "drums.level", value: -3 }) to adjust levels.');
      lines.push('Use add_channel_insert, add_effect, or add_sidechain for more routing.');
      return lines.join('\n');
    }

    // Effect chains
    const effectChains = Object.entries(session.mixer.effectChains || {});
    if (effectChains.length > 0) {
      lines.push('EFFECT CHAINS:');
      effectChains.forEach(([target, chain]) => {
        const chainStr = chain.map(e => {
          // Read live params from the node — the single source of truth.
          const p = e._node ? e._node.getParams() : {};
          const params = Object.entries(p)
            .filter(([k]) => k !== 'mode')
            .slice(0, 2)
            .map(([k, v]) => `${k}=${v}`)
            .join(', ');
          return `${e.id}: ${e.type}${p.mode ? `(${p.mode})` : ''}${params ? ` [${params}]` : ''}`;
        }).join(' → ');
        lines.push(`  ${target}: ${chainStr}`);
      });
      lines.push('');
    }

    return lines.join('\n');
  },

  // === EFFECT CHAIN TOOLS ===

  /**
   * Add effect to a target (voice, instrument, or master)
   * @param {Object} input - { target, effect, after?, mode?, ...params }
   */
  add_effect: async (input, session, context) => {
    const { effect, after, preset, target: _target, ...params } = input;
    // Key the chain on the canonical instrument id the renderer consults —
    // aliases ('bass', 'drums', 'lead') previously stored a chain that never
    // rendered. 'master' and unknown targets pass through unchanged.
    const target = canonicalTargetId(session, input.target);

    if (!input.target || !effect) {
      return 'Error: add_effect requires target and effect parameters';
    }

    // Validate effect type
    const NodeClass = EFFECT_NODE_CLASSES[effect];
    if (!NodeClass) {
      const validEffects = Object.keys(EFFECT_NODE_CLASSES);
      return `Error: Unknown effect type "${effect}". Valid types: ${validEffects.join(', ')}`;
    }

    ensureMixerState(session);
    if (!session.mixer.effectChains) session.mixer.effectChains = {};
    if (!session.mixer.effectChains[target]) session.mixer.effectChains[target] = [];

    const chain = session.mixer.effectChains[target];

    // Generate unique ID
    const effectCount = chain.filter(e => e.type === effect).length;
    const effectId = `${effect}${effectCount + 1}`;

    // Instantiate the effect node, apply preset first then explicit params on top
    const node = new NodeClass(effectId);
    if (preset && typeof node.loadPreset === 'function') {
      node.loadPreset(preset);
    }
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        node.setParam(key, value);
      }
    }

    // Validate interface at registration time
    node.validateInterface();

    // Register in ParamSystem: fx.{target}.{effectId}
    const paramPath = `fx.${target}.${effectId}`;
    session.params.register(paramPath, node);

    // Store ONLY {id, type, _node} — the node is the single source of truth.
    // A `params` snapshot here would drift from the live node (show_* read the
    // snapshot, render reads the node) on any generic-path write.
    const newEffect = {
      id: effectId,
      type: effect,
      _node: node,
    };

    // Handle positioning
    if (after) {
      const afterIndex = chain.findIndex(e => e.type === after || e.id === after);
      if (afterIndex === -1) {
        session.params.unregister(paramPath);
        return `Error: Cannot find "${after}" in ${target} chain to insert after`;
      }
      chain.splice(afterIndex + 1, 0, newEffect);
    } else {
      chain.push(newEffect);
    }

    // Build confirmation message
    const paramStr = Object.entries(params)
      .filter(([k, v]) => v !== undefined)
      .map(([k, v]) => `${k}=${v}`)
      .join(', ');

    const positionStr = after ? ` after ${after}` : '';
    return `Added ${effect}${params.mode ? ` (${params.mode})` : ''} to ${target}${positionStr}${paramStr ? ` [${paramStr}]` : ''} (addressable as ${paramPath})`;
  },

  /**
   * Remove effect from a target
   * @param {Object} input - { target, effect }
   */
  remove_effect: async (input, session, context) => {
    const { effect } = input;
    if (!input.target) {
      return 'Error: remove_effect requires target parameter';
    }
    const target = canonicalTargetId(session, input.target);

    if (!session.mixer?.effectChains?.[target]) {
      return `No effect chain on ${target}`;
    }

    const chain = session.mixer.effectChains[target];

    if (!effect || effect === 'all') {
      // Unregister all from ParamSystem
      for (const e of chain) {
        session.params.unregister(`fx.${target}.${e.id}`);
      }
      const count = chain.length;
      delete session.mixer.effectChains[target];
      return `Removed all ${count} effect(s) from ${target}`;
    }

    // Find effects to remove (by type or ID)
    const toRemove = chain.filter(e => e.type === effect || e.id === effect);
    session.mixer.effectChains[target] = chain.filter(e => e.type !== effect && e.id !== effect);

    if (toRemove.length === 0) {
      return `No ${effect} found on ${target}`;
    }

    // Unregister removed effects from ParamSystem
    for (const e of toRemove) {
      session.params.unregister(`fx.${target}.${e.id}`);
    }

    // Clean up empty chains
    if (session.mixer.effectChains[target].length === 0) {
      delete session.mixer.effectChains[target];
    }

    return `Removed ${effect} from ${target}`;
  },

  /**
   * Display all effect chains
   */
  show_effects: async (input, session, context) => {
    const chains = session.mixer?.effectChains || {};
    const entries = Object.entries(chains);

    if (entries.length === 0) {
      return 'No effect chains configured. Use add_effect to add effects to targets.';
    }

    const lines = ['EFFECT CHAINS:', ''];

    entries.forEach(([target, chain]) => {
      const chainStr = chain.map(e => {
        // Read live params from the node — the single source of truth.
        const p = e._node ? e._node.getParams() : {};
        const mode = p.mode ? `(${p.mode})` : '';
        const params = Object.entries(p)
          .filter(([k]) => k !== 'mode')
          .map(([k, v]) => `${k}=${typeof v === 'number' ? v.toFixed(0) : v}`)
          .join(', ');
        return `${e.type}${mode}${params ? ` [${params}]` : ''}`;
      }).join(' → ');

      lines.push(`${target}:`);
      lines.push(`  ${chainStr}`);
    });

    return lines.join('\n');
  },

  /**
   * Tweak parameters on an existing effect
   * @param {Object} input - { target, effect, ...params }
   */
  tweak_effect: async (input, session, context) => {
    const { effect, target: _target, ...params } = input;

    if (!input.target || !effect) {
      return 'Error: tweak_effect requires target and effect parameters';
    }
    const target = canonicalTargetId(session, input.target);

    if (!session.mixer?.effectChains?.[target]) {
      return `No effect chain on ${target}`;
    }

    const chain = session.mixer.effectChains[target];
    const effectObj = chain.find(e => e.type === effect || e.id === effect);

    if (!effectObj) {
      return `No ${effect} found on ${target}`;
    }

    // Write through to the node — the single source of truth. Values are stored
    // in producer units, exactly as the generic tweak path does for effect nodes
    // (EffectNode.producerUnitStorage), so both paths agree at render.
    const tweaked = [];
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        if (effectObj._node) {
          effectObj._node.setParam(key, value);
        }
        tweaked.push(`${key}=${value}`);
      }
    }

    if (tweaked.length === 0) {
      return `No parameters to tweak on ${effect}`;
    }

    return `Tweaked ${effect} on ${target}: ${tweaked.join(', ')}`;
  },
};

registerTools(mixerTools);
