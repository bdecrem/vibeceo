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
    if (!session.mixer || (
      Object.keys(session.mixer.sends || {}).length === 0 &&
      Object.keys(session.mixer.voiceRouting || {}).length === 0 &&
      Object.keys(session.mixer.channelInserts || {}).length === 0 &&
      (session.mixer.masterInserts || []).length === 0
    )) {
      return 'Mixer is empty. Use create_send, route_to_send, add_channel_insert, or add_sidechain to configure.';
    }

    const lines = ['MIXER CONFIGURATION:', ''];

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
};

registerTools(mixerTools);
