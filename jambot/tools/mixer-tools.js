/**
 * Mixer Tools
 *
 * Tools for DAW-like mixing: effect chains, channel inserts, sidechain,
 * master inserts, and mixer display.
 *
 * Effect chains live in session.mixer.effectChains keyed by exactly the
 * targets the renderer consults: an instrument id ('jt90', 'jb202-2'),
 * '<drumId>.<voice>' for a real voice of a drum machine, or 'master'. Every
 * effect node is also registered in the ParamSystem as fx.<target>.<effectId>.
 */

import { registerTools } from './index.js';
import { DelayNode } from '../effects/delay-node.js';
import { EQNode } from '../effects/eq-node.js';
import { FilterNode } from '../effects/filter-node.js';
import { SidechainNode } from '../effects/sidechain-node.js';
import { ReverbNode } from '../effects/reverb-node.js';
import { checkEffectParams, applyEffectParams } from '../core/routing.js';

// Map effect type string to node class
const EFFECT_NODE_CLASSES = {
  delay: DelayNode,
  eq: EQNode,
  filter: FilterNode,
  sidechain: SidechainNode,
  reverb: ReverbNode,
};

// Canonical instrument ids, for sessions built without the instance layer.
const CANONICAL_IDS = ['jb01', 'jb200', 'jb202', 'jp9000', 'jbs', 'jt10', 'jt30', 'jt90'];

// Helper to ensure mixer state exists
function ensureMixerState(session) {
  if (!session.mixer) {
    session.mixer = { masterVolume: 0.8, effectChains: {} };
  }
  if (!session.mixer.effectChains) session.mixer.effectChains = {};
}

function instrumentIds(session) {
  if (typeof session.listInstruments === 'function') return session.listInstruments().map(i => i.id);
  return CANONICAL_IDS.filter(id => nodeOf(session, id));
}

function nodeOf(session, id) {
  return (typeof session.getNode === 'function' ? session.getNode(id) : null) || session.params?.nodes?.get(id) || null;
}

/** Instrument id a name refers to — itself, or the instrument an alias ('bass', 'drums') points at. */
function canonicalInstrumentId(session, name) {
  if (!name) return null;
  const ids = instrumentIds(session);
  if (ids.includes(name)) return name;
  const node = nodeOf(session, name) || session.params?.nodes?.get(name) || null;
  if (!node) return null;
  return ids.find(id => nodeOf(session, id) === node) || null;
}

/** Drum instruments (jb01, jt90 and added instances) — the only per-voice targets the renderer supports. */
function drumInstruments(session) {
  return instrumentIds(session).map(id => {
    const node = nodeOf(session, id);
    const acc = typeof session.instrument === 'function' ? session.instrument(id) : null;
    const isDrums = acc ? acc.kind === 'drums' : (id === 'jb01' || id === 'jt90');
    return isDrums && node && typeof node.renderVoices === 'function' && typeof node.hasVoice === 'function'
      ? { id, node }
      : null;
  }).filter(Boolean);
}

function voiceHasHits(pattern, voice) {
  const steps = pattern?.[voice];
  return Array.isArray(steps) && steps.some(s => (typeof s === 'object' && s !== null) ? s.velocity > 0 : !!s);
}

/**
 * Resolve an effect target to the chain key the renderer reads.
 *   'master'                  → 'master'
 *   'jt90', 'jb202-2', 'bass' → the instrument id (aliases → canonical)
 *   'jt90.kick'               → a real voice of a drum instrument
 *   'kick'                    → '<drum>.kick' for the drum instrument currently playing it
 * Anything else is refused. Chains used to be stored under whatever string
 * came in ('ch', 'jt90.hat', 'jb202.bass'); the renderer never read them, so
 * the tool reported success and nothing changed.
 * @returns {{ key: string } | { error: string }}
 */
function resolveEffectTarget(session, target) {
  if (!target || typeof target !== 'string') return { error: 'Error: target required' };
  if (target === 'master') return { key: 'master' };

  const dot = target.indexOf('.');
  const head = dot === -1 ? target : target.slice(0, dot);
  const voice = dot === -1 ? null : target.slice(dot + 1);
  const drums = drumInstruments(session);

  const inst = canonicalInstrumentId(session, head);
  if (inst) {
    if (!voice) return { key: inst };
    const drum = drums.find(d => d.id === inst);
    if (!drum) return { error: `Error: "${inst}" has no per-voice targets — use target "${inst}"` };
    if (!drum.node.hasVoice(voice)) {
      return { error: `Error: ${inst} has no voice "${voice}". Voices: ${drum.node.getVoices().join(', ')}` };
    }
    return { key: `${inst}.${voice}` };
  }

  if (!voice) {
    // Bare voice name ('kick', 'ch'): the drum instrument whose pattern plays it
    const owners = drums.filter(d => d.node.hasVoice(target));
    if (owners.length) {
      const playing = owners.filter(d => voiceHasHits(d.node.getPattern(), target));
      const pick = playing.length === 1 ? playing[0] : (owners.length === 1 ? owners[0] : null);
      if (pick) return { key: `${pick.id}.${target}` };
      return { error: `Error: "${target}" is a voice on ${owners.map(d => d.id).join(' and ')} — say which: ${owners.map(d => `${d.id}.${target}`).join(', ')}` };
    }
  }

  const valid = ['master', ...instrumentIds(session)];
  const voices = drums.map(d => `${d.id}.<${d.node.getVoices().join('|')}>`);
  return { error: `Error: unknown effect target "${target}". Valid targets: ${valid.join(', ')}${voices.length ? `; voices: ${voices.join(', ')}` : ''}` };
}

/**
 * Like resolveEffectTarget, for remove/tweak: also accepts a raw key that
 * already holds a chain (legacy saves stored chains under 'ch', 'hats' …
 * that never rendered — they must still be removable).
 */
function resolveChainKey(session, target) {
  const chains = session.mixer?.effectChains || {};
  const r = resolveEffectTarget(session, target);
  if (r.key && chains[r.key]) return r;
  if (target && chains[target]) return { key: target };
  return r;
}

/**
 * Next free effect id on a chain: max existing number + 1, over both the chain
 * and the ParamSystem (fx.<key>.<type>N). Counting effects of the type gave
 * [delay1, delay2] → remove delay1 → next add is "delay2" again: two nodes on
 * one path, tweak hit only the newer, remove_effect deleted both.
 */
function nextEffectId(session, key, chain, type) {
  const re = new RegExp(`^${type}(\\d+)$`);
  let max = 0;
  const bump = (id) => { const m = re.exec(id); if (m) max = Math.max(max, Number(m[1])); };
  for (const e of chain) bump(e.id);
  const prefix = `fx.${key}.`;
  for (const nodeId of session.params?.nodes?.keys?.() || []) {
    if (nodeId.startsWith(prefix)) bump(nodeId.slice(prefix.length));
  }
  return `${type}${max + 1}`;
}

/** Load a named preset onto a fresh node; returns an error string or null. */
function applyPreset(node, effect, preset) {
  if (typeof node.loadPreset !== 'function') {
    return `Error: ${effect} has no presets — set its params directly`;
  }
  if (!node.loadPreset(preset)) {
    const have = typeof node.listPresets === 'function' ? node.listPresets() : [];
    return `Error: unknown ${effect} preset "${preset}"${have.length ? ` (have: ${have.join(', ')})` : ''}`;
  }
  return null;
}

/**
 * Song mode: each arrangement section renders through the inserts captured in
 * its saved pattern (channelInserts), the way it uses the pattern's own params.
 * A live effect change is loop-only until the patterns are saved again, so say
 * so — the same note `tweak` gives for params. Patterns saved before snapshots
 * existed (channelInserts null) still render the live chains: no note.
 */
function songModeFxNote(session, key) {
  if (!Array.isArray(session.arrangement) || session.arrangement.length === 0) return '';
  const inst = String(key).split('.')[0];
  if (inst === 'master') return '';
  const saved = session.patterns?.[inst];
  if (!saved) return '';
  const names = Object.keys(saved).filter(n => saved[n]?.channelInserts && typeof saved[n].channelInserts === 'object');
  if (names.length === 0) return '';
  return ` (song mode: live chain only — saved ${inst} patterns ${names.join(', ')} keep their own inserts. To hear it in the arrangement: load_pattern → change the effect → save_pattern for each)`;
}

/** Does any drum instrument's current pattern hit this voice? (advisory for sidechain messages) */
function triggerCurrentlyPlays(session, trigger) {
  return drumInstruments(session).some(d => voiceHasHits(d.node.getPattern(), trigger));
}

function describeChain(chain, verbose) {
  return chain.map(e => {
    // Read live params from the node — the single source of truth.
    const p = e._node ? e._node.getParams() : (e.params || {});
    const mode = p.mode ? `(${p.mode})` : '';
    let entries = Object.entries(p).filter(([k]) => k !== 'mode');
    if (!verbose) entries = entries.slice(0, 2);
    const params = entries.map(([k, v]) => `${k}=${typeof v === 'number' ? (verbose ? v.toFixed(0) : v) : v}`).join(', ');
    return `${e.id}: ${e.type}${mode}${params ? ` [${params}]` : ''}`;
  }).join(' → ');
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

    const resolved = resolveEffectTarget(session, channel);
    if (resolved.error) return resolved.error;
    const key = resolved.key;

    // Channel-insert semantics: replace an existing insert of the same type
    // (don't stack duplicates). Add the new one first so a rejected param
    // leaves the old insert in place, then drop the old one.
    const old = (session.mixer?.effectChains?.[key] || []).filter(e => e.type === effect).map(e => e.id);
    const result = await mixerTools.add_effect(
      { target: key, effect, preset, after: old.length ? old[old.length - 1] : undefined, ...(userParams || {}) },
      session,
      context
    );
    if (typeof result === 'string' && result.startsWith('Error')) return result;
    if (!old.length) return result;   // add_effect already appended the song-mode note
    for (const id of old) {
      await mixerTools.remove_effect({ target: key, effect: id }, session, context);
    }
    const added = session.mixer.effectChains[key].find(e => e.type === effect);
    const p = added._node.getParams();
    const paramStr = Object.entries(p).filter(([k]) => k !== 'mode').map(([k, v]) => `${k}=${v}`).join(', ');
    return `Replaced ${effect}${preset ? ` (${preset})` : (p.mode ? ` (${p.mode})` : '')} on ${key} [${paramStr}] (addressable as fx.${key}.${added.id})${songModeFxNote(session, key)}`;
  },

  /**
   * Remove channel insert
   */
  remove_channel_insert: async (input, session, context) => {
    const { effect } = input;
    const resolved = resolveChainKey(session, input.channel);
    if (resolved.error) return resolved.error;
    const channel = resolved.key;

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
      return `Removed all ${count} insert(s) from ${channel}${songModeFxNote(session, channel)}`;
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
      return `Removed ${effect} insert from ${channel}${songModeFxNote(session, channel)}`;
    }
  },

  /**
   * Add sidechain ducking (bass ducks on kick, etc.)
   * Creates a proper SidechainNode and registers in ParamSystem.
   */
  add_sidechain: async (input, session, context) => {
    const { trigger, amount, attack, release, hold } = input;
    if (!input.target) {
      return 'Error: add_sidechain requires target';
    }
    const resolved = resolveEffectTarget(session, input.target);
    if (resolved.error) return resolved.error;
    const target = resolved.key;

    ensureMixerState(session);
    const chain = session.mixer.effectChains[target] || [];
    const effectId = nextEffectId(session, target, chain, 'sidechain');

    const node = new SidechainNode(effectId);
    const params = { trigger, amount, attack, release, hold };
    // A refused value (trigger 'bogus', unknown key) used to keep the default
    // while the message echoed what was asked for.
    const rejected = checkEffectParams(node, params);
    if (rejected.length) {
      return `Error: sidechain ${rejected.join('; ')} — nothing added`;
    }
    applyEffectParams(node, params);
    node.validateInterface();

    const paramPath = `fx.${target}.${effectId}`;
    session.params.register(paramPath, node);

    chain.push({
      id: effectId,
      type: 'sidechain',
      _node: node,
    });
    session.mixer.effectChains[target] = chain;

    const p = node.getParams();
    let msg = `Added sidechain: ${target} ducks when ${p.trigger} plays (${(p.amount * 100).toFixed(0)}% reduction, addressable as ${paramPath})`;
    if (!triggerCurrentlyPlays(session, p.trigger)) {
      msg += `. Note: no drum pattern currently hits ${p.trigger} — nothing ducks until one does`;
    }
    return msg;
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

    const formatLevel = (dB) => {
      if (dB === 0) return '0dB';
      return dB > 0 ? `+${dB}dB` : `${dB}dB`;
    };

    lines.push('OUTPUT LEVELS:');
    lines.push('  ' + instrumentIds(session).map(id => {
      const node = nodeOf(session, id);
      const level = typeof node?.getLevel === 'function' ? node.getLevel() : 0;
      return `${id}: ${formatLevel(level)}`;
    }).join('  '));
    lines.push('');

    const effectChains = Object.entries(session.mixer?.effectChains || {}).filter(([, chain]) => chain.length > 0);
    const sends = session.routing?.sends?.size ? [...session.routing.sends.entries()] : [];

    if (effectChains.length === 0 && sends.length === 0) {
      lines.push('Use tweak({ path: "jt90.level", value: -3 }) to adjust levels.');
      lines.push('Use add_channel_insert, add_effect, add_sidechain or add_send for more routing.');
      return lines.join('\n');
    }

    // Effect chains
    if (effectChains.length > 0) {
      lines.push('EFFECT CHAINS:');
      effectChains.forEach(([target, chain]) => {
        lines.push(`  ${target}: ${describeChain(chain, false)}`);
      });
      lines.push('');
    }

    if (sends.length > 0) {
      lines.push('SENDS:');
      for (const [id, send] of sends) {
        lines.push(`  ${id}: ${send.effectType} (tweak via send.${id}.<param>)`);
      }
      lines.push('');
    }

    return lines.join('\n');
  },

  // === EFFECT CHAIN TOOLS ===

  /**
   * Add effect to a target (voice, instrument, or master)
   * @param {Object} input - { target, effect, after?, preset?, ...params }
   */
  add_effect: async (input, session, context) => {
    let { effect, after, preset, target: rawTarget, ...params } = input;
    if (effect === 'ducker') effect = 'sidechain';

    if (!rawTarget || !effect) {
      return 'Error: add_effect requires target and effect parameters';
    }

    // Validate effect type
    const NodeClass = EFFECT_NODE_CLASSES[effect];
    if (!NodeClass) {
      const validEffects = Object.keys(EFFECT_NODE_CLASSES);
      return `Error: Unknown effect type "${effect}". Valid types: ${validEffects.join(', ')}`;
    }

    // Key the chain on the target the renderer consults; refuse anything else.
    const resolved = resolveEffectTarget(session, rawTarget);
    if (resolved.error) return resolved.error;
    const target = resolved.key;

    ensureMixerState(session);
    const chain = session.mixer.effectChains[target] || [];
    const effectId = nextEffectId(session, target, chain, effect);

    // Instantiate the effect node, apply preset first then explicit params on top
    const node = new NodeClass(effectId);
    if (preset) {
      const err = applyPreset(node, effect, preset);
      if (err) return err;
    }
    // Every param must exist on this effect and hold a valid value — a typo or
    // a delay param on a filter used to be dropped while the tool said "Added".
    const rejected = checkEffectParams(node, params);
    if (rejected.length) {
      return `Error: ${effect} ${rejected.join('; ')} — nothing added`;
    }
    const applied = applyEffectParams(node, params);

    // Handle positioning
    let index = chain.length;
    if (after) {
      const afterIndex = chain.findIndex(e => e.type === after || e.id === after);
      if (afterIndex === -1) {
        return `Error: Cannot find "${after}" in ${target} chain to insert after`;
      }
      index = afterIndex + 1;
    }

    // Validate interface at registration time
    node.validateInterface();

    // Register in ParamSystem: fx.{target}.{effectId}
    const paramPath = `fx.${target}.${effectId}`;
    session.params.register(paramPath, node);

    // Store ONLY {id, type, _node} — the node is the single source of truth.
    // A `params` snapshot here would drift from the live node (show_* read the
    // snapshot, render reads the node) on any generic-path write.
    chain.splice(index, 0, { id: effectId, type: effect, _node: node });
    session.mixer.effectChains[target] = chain;

    // Build confirmation message
    const p = node.getParams();
    const flavour = preset ? ` (${preset})` : (p.mode ? ` (${p.mode})` : '');
    const paramStr = applied.filter(a => !a.startsWith('mode=')).join(', ');
    const positionStr = after ? ` after ${after}` : '';
    return `Added ${effect}${flavour} to ${target}${positionStr}${paramStr ? ` [${paramStr}]` : ''} (addressable as ${paramPath})${songModeFxNote(session, target)}`;
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
    const resolved = resolveChainKey(session, input.target);
    if (resolved.error) return resolved.error;
    const target = resolved.key;

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
      return `Removed all ${count} effect(s) from ${target}${songModeFxNote(session, target)}`;
    }

    // Find effects to remove (by type or ID)
    const toRemove = chain.filter(e => e.type === effect || e.id === effect);
    if (toRemove.length === 0) {
      return `No ${effect} found on ${target} (has: ${chain.map(e => e.id).join(', ')})`;
    }
    session.mixer.effectChains[target] = chain.filter(e => e.type !== effect && e.id !== effect);

    // Unregister removed effects from ParamSystem
    for (const e of toRemove) {
      session.params.unregister(`fx.${target}.${e.id}`);
    }

    // Clean up empty chains
    if (session.mixer.effectChains[target].length === 0) {
      delete session.mixer.effectChains[target];
    }

    return `Removed ${toRemove.map(e => e.id).join(', ')} from ${target}${songModeFxNote(session, target)}`;
  },

  /**
   * Display all effect chains
   */
  show_effects: async (input, session, context) => {
    const chains = session.mixer?.effectChains || {};
    const entries = Object.entries(chains).filter(([, chain]) => chain.length > 0);
    const sends = session.routing?.sends?.size ? [...session.routing.sends.entries()] : [];

    if (entries.length === 0 && sends.length === 0) {
      return 'No effect chains configured. Use add_effect to add effects to targets.';
    }

    const lines = ['EFFECT CHAINS:', ''];

    entries.forEach(([target, chain]) => {
      lines.push(`${target}:`);
      lines.push(`  ${describeChain(chain, true)}`);
    });

    if (sends.length > 0) {
      lines.push('', 'SENDS:');
      for (const [id, send] of sends) {
        const p = send.effectNode.getParams();
        const params = Object.entries(p).filter(([k]) => k !== 'mix' && k !== 'mode')
          .map(([k, v]) => `${k}=${typeof v === 'number' ? v.toFixed(0) : v}`).join(', ');
        lines.push(`${id}: ${send.effectType}${p.mode ? `(${p.mode})` : ''} [${params}] — tweak_effect({ target: '${id}', effect: '${send.effectType}', ... })`);
      }
    }

    return lines.join('\n');
  },

  /**
   * Tweak parameters on an existing effect (or on a send bus, by send id)
   * @param {Object} input - { target, effect, ...params }
   */
  tweak_effect: async (input, session, context) => {
    const { effect, target: rawTarget, ...params } = input;

    if (!rawTarget || !effect) {
      return 'Error: tweak_effect requires target and effect parameters';
    }

    let node = null;
    let label = '';
    const resolved = resolveChainKey(session, rawTarget);
    const chain = resolved.key ? session.mixer?.effectChains?.[resolved.key] : null;

    if (chain) {
      const effectObj = chain.find(e => e.type === effect || e.id === effect);
      if (!effectObj) {
        return `No ${effect} found on ${resolved.key} (has: ${chain.map(e => e.id).join(', ')})`;
      }
      if (!effectObj._node) {
        return `Error: ${effectObj.id} on ${resolved.key} has no live node (unknown effect type "${effectObj.type}")`;
      }
      node = effectObj._node;
      label = `${effectObj.id} on ${resolved.key}`;
    } else {
      // A send bus id: tweak the bus effect
      const send = session.routing?.sends?.get?.(rawTarget);
      if (send) {
        if (effect !== send.effectType && effect !== rawTarget) {
          return `Send "${rawTarget}" is a ${send.effectType}, not ${effect}`;
        }
        // Make sure the bus is reachable by path too (send.<id>.<param>)
        if (session.params && session.routing.params !== session.params) session.routing.attachParams(session.params);
        node = send.effectNode;
        label = `send ${rawTarget} (${send.effectType})`;
      } else if (resolved.error) {
        return resolved.error;
      } else {
        return `No effect chain on ${resolved.key}`;
      }
    }

    const wanted = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined));
    if (Object.keys(wanted).length === 0) {
      return `No parameters to tweak on ${effect}`;
    }

    // Refuse the whole tweak on any bad key/value — a rejected value used to
    // keep the old setting while the message echoed the requested one.
    const rejected = checkEffectParams(node, wanted);
    if (rejected.length) {
      return `Error: ${effect} ${rejected.join('; ')} — nothing changed`;
    }
    const applied = applyEffectParams(node, wanted);

    return `Tweaked ${label}: ${applied.join(', ')}${chain ? songModeFxNote(session, resolved.key) : ''}`;
  },
};

registerTools(mixerTools);
