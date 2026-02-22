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

// Helper to ensure mixer state exists
function ensureMixerState(session) {
  if (!session.mixer) {
    session.mixer = { masterVolume: 0.8, effectChains: {} };
  }
}

const mixerTools = {
  /**
   * Add channel insert (EQ, filter, etc.) - replaces existing insert of same type
   * Routes through effectChains for actual DSP processing at render time.
   */
  add_channel_insert: async (input, session, context) => {
    const { channel, effect, preset, params: userParams } = input;

    const NodeClass = EFFECT_NODE_CLASSES[effect];
    if (!NodeClass) {
      return `Error: Unknown effect type "${effect}". Valid types: ${Object.keys(EFFECT_NODE_CLASSES).join(', ')}`;
    }

    ensureMixerState(session);
    if (!session.mixer.effectChains) session.mixer.effectChains = {};
    if (!session.mixer.effectChains[channel]) session.mixer.effectChains[channel] = [];

    const chain = session.mixer.effectChains[channel];

    // Remove existing effect of same type (replace, don't duplicate)
    const existing = chain.filter(e => e.type === effect);
    for (const e of existing) {
      session.params.unregister(`fx.${channel}.${e.id}`);
    }
    const updatedChain = chain.filter(e => e.type !== effect);
    session.mixer.effectChains[channel] = updatedChain;

    // Create new effect node
    const effectCount = updatedChain.filter(e => e.type === effect).length;
    const effectId = `${effect}${effectCount + 1}`;
    const node = new NodeClass(effectId);

    // Apply preset first, then user params on top
    if (preset && typeof node.loadPreset === 'function') {
      node.loadPreset(preset);
    }
    if (userParams) {
      for (const [key, value] of Object.entries(userParams)) {
        if (value !== undefined) node.setParam(key, value);
      }
    }

    node.validateInterface();

    const paramPath = `fx.${channel}.${effectId}`;
    session.params.register(paramPath, node);

    updatedChain.push({
      id: effectId,
      type: effect,
      params: node.getParams(),
      _node: node,
    });

    return `Added ${effect}${preset ? ` (${preset})` : ''} insert to ${channel} (addressable as ${paramPath})`;
  },

  /**
   * Remove channel insert
   */
  remove_channel_insert: async (input, session, context) => {
    const { channel, effect } = input;

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
   * Note: ducker DSP is not yet implemented — this stores the config for future processing.
   */
  add_sidechain: async (input, session, context) => {
    const { target, trigger, amount } = input;

    ensureMixerState(session);
    if (!session.mixer.effectChains) session.mixer.effectChains = {};
    if (!session.mixer.effectChains[target]) session.mixer.effectChains[target] = [];

    session.mixer.effectChains[target].push({
      id: `ducker${session.mixer.effectChains[target].filter(e => e.type === 'ducker').length + 1}`,
      type: 'ducker',
      params: {
        trigger,
        amount: amount ?? 0.5
      }
    });

    return `Added sidechain: ${target} ducks when ${trigger} plays (${((amount ?? 0.5) * 100).toFixed(0)}% reduction)`;
  },

  /**
   * Add effect to master bus
   * Routes through effectChains['master'] for actual DSP processing at render time.
   */
  add_master_insert: async (input, session, context) => {
    const { effect, preset, params: userParams } = input;

    const NodeClass = EFFECT_NODE_CLASSES[effect];
    if (!NodeClass) {
      return `Error: Unknown effect type "${effect}". Valid types: ${Object.keys(EFFECT_NODE_CLASSES).join(', ')}`;
    }

    ensureMixerState(session);
    if (!session.mixer.effectChains) session.mixer.effectChains = {};
    if (!session.mixer.effectChains.master) session.mixer.effectChains.master = [];

    const chain = session.mixer.effectChains.master;
    const effectCount = chain.filter(e => e.type === effect).length;
    const effectId = `${effect}${effectCount + 1}`;

    const node = new NodeClass(effectId);
    if (preset && typeof node.loadPreset === 'function') {
      node.loadPreset(preset);
    }
    if (userParams) {
      for (const [key, value] of Object.entries(userParams)) {
        if (value !== undefined) node.setParam(key, value);
      }
    }

    node.validateInterface();

    const paramPath = `fx.master.${effectId}`;
    session.params.register(paramPath, node);

    chain.push({
      id: effectId,
      type: effect,
      params: node.getParams(),
      _node: node,
    });

    return `Added ${effect}${preset ? ` (${preset})` : ''} to master bus (addressable as ${paramPath})`;
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
    const sampler = session.get('sampler.level') ?? 0;

    const formatLevel = (dB) => {
      if (dB === 0) return '0dB';
      return dB > 0 ? `+${dB}dB` : `${dB}dB`;
    };

    lines.push('OUTPUT LEVELS:');
    lines.push(`  drums: ${formatLevel(drums)}  bass: ${formatLevel(bass)}  lead: ${formatLevel(lead)}  sampler: ${formatLevel(sampler)}`);
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
          const params = Object.entries(e.params || {})
            .filter(([k]) => k !== 'mode')
            .slice(0, 2)
            .map(([k, v]) => `${k}=${v}`)
            .join(', ');
          return `${e.id}: ${e.type}${e.params?.mode ? `(${e.params.mode})` : ''}${params ? ` [${params}]` : ''}`;
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
    const { target, effect, after, ...params } = input;

    if (!target || !effect) {
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

    // Instantiate the effect node and apply user params
    const node = new NodeClass(effectId);
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

    const newEffect = {
      id: effectId,
      type: effect,
      params: node.getParams(),
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
    const { target, effect } = input;

    if (!target) {
      return 'Error: remove_effect requires target parameter';
    }

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
        const mode = e.params?.mode ? `(${e.params.mode})` : '';
        const params = Object.entries(e.params || {})
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
    const { target, effect, ...params } = input;

    if (!target || !effect) {
      return 'Error: tweak_effect requires target and effect parameters';
    }

    if (!session.mixer?.effectChains?.[target]) {
      return `No effect chain on ${target}`;
    }

    const chain = session.mixer.effectChains[target];
    const effectObj = chain.find(e => e.type === effect || e.id === effect);

    if (!effectObj) {
      return `No ${effect} found on ${target}`;
    }

    // Update params via node if available, keep effectObj.params in sync
    const tweaked = [];
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        if (effectObj._node) {
          effectObj._node.setParam(key, value);
        }
        effectObj.params[key] = value;
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
