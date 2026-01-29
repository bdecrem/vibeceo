/**
 * Mixer Tools
 *
 * Tools for DAW-like mixing: create_send, route_to_send, tweak_reverb,
 * add_channel_insert, remove_channel_insert, add_sidechain, add_master_insert, show_mixer
 */

import { registerTools } from './index.js';

// Helper to ensure mixer state exists
function ensureMixerState(session) {
  if (!session.mixer) {
    session.mixer = { sends: {}, voiceRouting: {}, channelInserts: {}, masterInserts: [], masterVolume: 0.8 };
  }
}

const mixerTools = {
  /**
   * Create a send bus with reverb
   */
  create_send: async (input, session, context) => {
    const { name: busName, effect } = input;

    ensureMixerState(session);

    if (session.mixer.sends[busName]) {
      return `Send bus "${busName}" already exists. Use route_to_send to add sources or tweak_reverb to adjust.`;
    }

    // Store all reverb parameters
    const params = {
      decay: input.decay,
      damping: input.damping,
      predelay: input.predelay,
      modulation: input.modulation,
      lowcut: input.lowcut,
      highcut: input.highcut,
      width: input.width,
      mix: input.mix ?? 0.3
    };

    // Remove undefined values (will use defaults in generatePlateReverbIR)
    Object.keys(params).forEach(k => params[k] === undefined && delete params[k]);

    session.mixer.sends[busName] = { effect, params };

    const paramList = Object.entries(params)
      .filter(([k, v]) => k !== 'mix' && v !== undefined)
      .map(([k, v]) => `${k}=${v}`)
      .join(', ');

    return `Created send bus "${busName}" with plate reverb${paramList ? ` (${paramList})` : ''}. Use route_to_send to send voices to it.`;
  },

  /**
   * Tweak reverb parameters on existing send
   */
  tweak_reverb: async (input, session, context) => {
    const { send: busName } = input;

    if (!session.mixer?.sends?.[busName]) {
      return `Error: Send bus "${busName}" doesn't exist. Use create_send first.`;
    }

    if (session.mixer.sends[busName].effect !== 'reverb') {
      return `Error: "${busName}" is not a reverb bus.`;
    }

    const params = session.mixer.sends[busName].params || {};
    const tweaks = [];

    ['decay', 'damping', 'predelay', 'modulation', 'lowcut', 'highcut', 'width', 'mix'].forEach(p => {
      if (input[p] !== undefined) {
        params[p] = input[p];
        tweaks.push(`${p}=${input[p]}`);
      }
    });

    session.mixer.sends[busName].params = params;

    return `Tweaked reverb "${busName}": ${tweaks.join(', ')}`;
  },

  /**
   * Route a voice to a send bus
   */
  route_to_send: async (input, session, context) => {
    const { voice, send, level } = input;

    if (!session.mixer?.sends?.[send]) {
      return `Error: Send bus "${send}" doesn't exist. Use create_send first.`;
    }

    if (!session.mixer.voiceRouting) session.mixer.voiceRouting = {};
    if (!session.mixer.voiceRouting[voice]) {
      session.mixer.voiceRouting[voice] = { sends: {}, inserts: [] };
    }

    session.mixer.voiceRouting[voice].sends[send] = level ?? 0.3;

    return `Routing ${voice} → ${send} at ${((level ?? 0.3) * 100).toFixed(0)}% level`;
  },

  /**
   * Add channel insert (EQ, filter, etc.) - replaces existing insert of same type
   */
  add_channel_insert: async (input, session, context) => {
    const { channel, effect, preset, params } = input;

    ensureMixerState(session);
    if (!session.mixer.channelInserts) session.mixer.channelInserts = {};
    if (!session.mixer.channelInserts[channel]) session.mixer.channelInserts[channel] = [];

    // Remove existing insert of the same type (replace, don't duplicate)
    session.mixer.channelInserts[channel] = session.mixer.channelInserts[channel].filter(i => i.type !== effect);

    session.mixer.channelInserts[channel].push({
      type: effect,
      preset,
      params: params || {}
    });

    return `Added ${effect}${preset ? ` (${preset})` : ''} insert to ${channel} channel`;
  },

  /**
   * Remove channel insert
   */
  remove_channel_insert: async (input, session, context) => {
    const { channel, effect } = input;

    if (!session.mixer.channelInserts?.[channel]) {
      return `No inserts on ${channel} channel`;
    }

    if (effect === 'all' || !effect) {
      // Remove all inserts for this channel
      const count = session.mixer.channelInserts[channel].length;
      delete session.mixer.channelInserts[channel];
      return `Removed all ${count} insert(s) from ${channel} channel`;
    } else {
      // Remove specific effect type
      const before = session.mixer.channelInserts[channel].length;
      session.mixer.channelInserts[channel] = session.mixer.channelInserts[channel].filter(i => i.type !== effect);
      const removed = before - session.mixer.channelInserts[channel].length;
      if (removed === 0) {
        return `No ${effect} insert found on ${channel} channel`;
      }
      return `Removed ${effect} insert from ${channel} channel`;
    }
  },

  /**
   * Add sidechain ducking (bass ducks on kick, etc.)
   */
  add_sidechain: async (input, session, context) => {
    const { target, trigger, amount } = input;

    ensureMixerState(session);
    if (!session.mixer.channelInserts) session.mixer.channelInserts = {};
    if (!session.mixer.channelInserts[target]) session.mixer.channelInserts[target] = [];

    session.mixer.channelInserts[target].push({
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
   */
  add_master_insert: async (input, session, context) => {
    const { effect, preset, params } = input;

    ensureMixerState(session);
    if (!session.mixer.masterInserts) session.mixer.masterInserts = [];

    session.mixer.masterInserts.push({
      type: effect,
      preset,
      params: params || {}
    });

    return `Added ${effect}${preset ? ` (${preset})` : ''} to master bus`;
  },

  /**
   * Display current mixer configuration
   */
  show_mixer: async (input, session, context) => {
    const lines = ['MIXER CONFIGURATION:', ''];

    // Node output levels (direct properties on session)
    const drums = session.drumLevel ?? 0;
    const bass = session.bassLevel ?? 0;
    const lead = session.leadLevel ?? 0;
    const sampler = session.samplerLevel ?? 0;

    const formatLevel = (dB) => {
      if (dB === 0) return '0dB';
      return dB > 0 ? `+${dB}dB` : `${dB}dB`;
    };

    lines.push('OUTPUT LEVELS:');
    lines.push(`  drums: ${formatLevel(drums)}  bass: ${formatLevel(bass)}  lead: ${formatLevel(lead)}  sampler: ${formatLevel(sampler)}`);
    lines.push('');

    // Check if mixer has any other config
    const hasConfig = session.mixer && (
      Object.keys(session.mixer.sends || {}).length > 0 ||
      Object.keys(session.mixer.voiceRouting || {}).length > 0 ||
      Object.keys(session.mixer.channelInserts || {}).length > 0 ||
      Object.keys(session.mixer.effectChains || {}).length > 0 ||
      (session.mixer.masterInserts || []).length > 0
    );

    if (!hasConfig) {
      lines.push('Use tweak({ path: "drums.level", value: -3 }) to adjust levels.');
      lines.push('Use create_send, add_channel_insert, add_effect, or add_sidechain for more routing.');
      return lines.join('\n');
    }

    // Effect chains (new flexible routing)
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
          return `${e.type}${e.params?.mode ? `(${e.params.mode})` : ''}${params ? ` [${params}]` : ''}`;
        }).join(' → ');
        lines.push(`  ${target}: ${chainStr}`);
      });
      lines.push('');
    }

    // Sends
    const sends = Object.entries(session.mixer.sends || {});
    if (sends.length > 0) {
      lines.push('SEND BUSES:');
      sends.forEach(([name, config]) => {
        lines.push(`  ${name}: ${config.effect}${config.params?.preset ? ` (${config.params.preset})` : ''}`);
      });
      lines.push('');
    }

    // Voice routing
    const routing = Object.entries(session.mixer.voiceRouting || {});
    if (routing.length > 0) {
      lines.push('VOICE ROUTING:');
      routing.forEach(([voice, config]) => {
        const sendInfo = Object.entries(config.sends || {})
          .map(([bus, level]) => `${bus} @ ${(level * 100).toFixed(0)}%`)
          .join(', ');
        if (sendInfo) lines.push(`  ${voice} → ${sendInfo}`);
      });
      lines.push('');
    }

    // Channel inserts
    const inserts = Object.entries(session.mixer.channelInserts || {});
    if (inserts.length > 0) {
      lines.push('CHANNEL INSERTS:');
      inserts.forEach(([channel, effects]) => {
        const effectList = effects.map(e => e.type + (e.preset ? ` (${e.preset})` : '')).join(' → ');
        lines.push(`  ${channel}: ${effectList}`);
      });
      lines.push('');
    }

    // Master inserts
    if ((session.mixer.masterInserts || []).length > 0) {
      const masterEffects = session.mixer.masterInserts.map(e => e.type + (e.preset ? ` (${e.preset})` : '')).join(' → ');
      lines.push('MASTER BUS:');
      lines.push(`  ${masterEffects}`);
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
    const validEffects = ['delay', 'reverb', 'filter', 'eq'];
    if (!validEffects.includes(effect)) {
      return `Error: Unknown effect type "${effect}". Valid types: ${validEffects.join(', ')}`;
    }

    ensureMixerState(session);
    if (!session.mixer.effectChains) session.mixer.effectChains = {};
    if (!session.mixer.effectChains[target]) session.mixer.effectChains[target] = [];

    const chain = session.mixer.effectChains[target];

    // Generate unique ID
    const effectCount = chain.filter(e => e.type === effect).length;
    const effectId = `${effect}${effectCount + 1}`;

    const newEffect = {
      id: effectId,
      type: effect,
      params: { ...params },
    };

    // Handle positioning
    if (after) {
      // Find the effect to insert after
      const afterIndex = chain.findIndex(e => e.type === after || e.id === after);
      if (afterIndex === -1) {
        return `Error: Cannot find "${after}" in ${target} chain to insert after`;
      }
      chain.splice(afterIndex + 1, 0, newEffect);
    } else {
      // Append to end
      chain.push(newEffect);
    }

    // Build confirmation message
    const paramStr = Object.entries(params)
      .filter(([k, v]) => v !== undefined)
      .map(([k, v]) => `${k}=${v}`)
      .join(', ');

    const positionStr = after ? ` after ${after}` : '';
    return `Added ${effect}${params.mode ? ` (${params.mode})` : ''} to ${target}${positionStr}${paramStr ? ` [${paramStr}]` : ''}`;
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
      // Remove entire chain
      const count = chain.length;
      delete session.mixer.effectChains[target];
      return `Removed all ${count} effect(s) from ${target}`;
    }

    // Remove specific effect (by type or ID)
    const beforeLen = chain.length;
    session.mixer.effectChains[target] = chain.filter(e => e.type !== effect && e.id !== effect);
    const removed = beforeLen - session.mixer.effectChains[target].length;

    if (removed === 0) {
      return `No ${effect} found on ${target}`;
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

    // Update params
    const tweaked = [];
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
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
