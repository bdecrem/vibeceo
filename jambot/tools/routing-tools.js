/**
 * Routing Tools
 *
 * Dynamic track and send management tools.
 */

import { registerTools } from './index.js';
import { RoutingManager } from '../core/routing.js';

// Ensure session has routing manager
function ensureRouting(session) {
  if (!session.routing) {
    session.routing = new RoutingManager();

    // Initialize default tracks for existing instruments
    const nodes = session.listNodes();
    for (const nodeId of nodes) {
      session.routing.addTrack(nodeId, { nodeId });
    }
  }
  return session.routing;
}

const routingTools = {
  /**
   * Add a new track
   *
   * Examples:
   *   add_track({ id: 'synth2', nodeId: 'lead' })  // Another lead track
   *   add_track({ id: 'fx_return', volume: -6 })   // FX return channel
   */
  add_track: async (input, session, context) => {
    const { id, nodeId, volume, mute, pan } = input;

    if (!id) {
      return 'Error: id required';
    }

    const routing = ensureRouting(session);

    if (routing.tracks.has(id)) {
      return `Track "${id}" already exists`;
    }

    routing.addTrack(id, { nodeId, volume, mute, pan });

    return `Added track "${id}"${nodeId ? ` → ${nodeId}` : ''}`;
  },

  /**
   * Remove a track
   */
  remove_track: async (input, session, context) => {
    const { id } = input;

    if (!id) {
      return 'Error: id required';
    }

    const routing = ensureRouting(session);

    if (!routing.tracks.has(id)) {
      return `Track "${id}" doesn't exist`;
    }

    routing.removeTrack(id);
    return `Removed track "${id}"`;
  },

  /**
   * List all tracks
   */
  list_tracks: async (input, session, context) => {
    const routing = ensureRouting(session);
    const tracks = routing.listTracks();

    if (tracks.length === 0) {
      return 'No tracks';
    }

    const lines = ['TRACKS:', ''];
    for (const id of tracks) {
      const track = routing.getTrack(id);
      let info = `  ${id}`;
      if (track.nodeId !== id) info += ` → ${track.nodeId}`;
      if (track.mute) info += ' [MUTE]';
      if (track.volume !== 0) info += ` (${track.volume}dB)`;
      lines.push(info);
    }

    return lines.join('\n');
  },

  /**
   * Add a send bus (with effect)
   *
   * Examples:
   *   add_send({ id: 'reverb1', effect: 'reverb', decay: 2.5 })
   *   add_send({ id: 'delay1', effect: 'delay', time: 375 })
   */
  add_send: async (input, session, context) => {
    const { id, effect, ...params } = input;

    if (!id) {
      return 'Error: id required';
    }

    const routing = ensureRouting(session);

    if (routing.sends.has(id)) {
      return `Send "${id}" already exists`;
    }

    routing.addSend(id, effect || 'reverb', params);

    return `Added send "${id}" with ${effect || 'reverb'}`;
  },

  /**
   * Remove a send bus
   */
  remove_send: async (input, session, context) => {
    const { id } = input;

    if (!id) {
      return 'Error: id required';
    }

    const routing = ensureRouting(session);

    if (!routing.sends.has(id)) {
      return `Send "${id}" doesn't exist`;
    }

    routing.removeSend(id);
    return `Removed send "${id}"`;
  },

  /**
   * List all sends
   */
  list_sends: async (input, session, context) => {
    const routing = ensureRouting(session);
    const sends = routing.listSends();

    if (sends.length === 0) {
      return 'No sends. Use add_send({ id: "reverb1", effect: "reverb" }) to create one.';
    }

    const lines = ['SENDS:', ''];
    for (const id of sends) {
      const send = routing.getSend(id);
      lines.push(`  ${id}: ${send.effectType}`);
    }

    return lines.join('\n');
  },

  /**
   * Route a track to a send
   *
   * Examples:
   *   route({ track: 'drums', send: 'reverb1', level: 0.3 })
   *   route({ track: 'ch', send: 'reverb1', level: 0.5 })
   */
  route: async (input, session, context) => {
    const { track, send, level } = input;

    if (!track || !send) {
      return 'Error: track and send required';
    }

    const routing = ensureRouting(session);

    if (!routing.tracks.has(track)) {
      return `Track "${track}" doesn't exist. Available: ${routing.listTracks().join(', ')}`;
    }

    if (!routing.sends.has(send)) {
      return `Send "${send}" doesn't exist. Available: ${routing.listSends().join(', ')}`;
    }

    routing.route(track, send, level ?? 0.3);

    return `Routed ${track} → ${send} @ ${((level ?? 0.3) * 100).toFixed(0)}%`;
  },

  /**
   * Remove routing from track to send
   */
  unroute: async (input, session, context) => {
    const { track, send } = input;

    if (!track || !send) {
      return 'Error: track and send required';
    }

    const routing = ensureRouting(session);
    routing.unroute(track, send);

    return `Unrouted ${track} from ${send}`;
  },

  /**
   * Show full routing configuration
   */
  show_routing: async (input, session, context) => {
    const routing = ensureRouting(session);
    return routing.getRoutingInfo();
  },

  /**
   * Set track volume
   *
   * Examples:
   *   set_track_volume({ track: 'drums', volume: -3 })
   *   set_track_volume({ track: 'bass', volume: -6 })
   */
  set_track_volume: async (input, session, context) => {
    const { track, volume } = input;

    if (!track) {
      return 'Error: track required';
    }

    const routing = ensureRouting(session);
    const t = routing.getTrack(track);

    if (!t) {
      return `Track "${track}" doesn't exist`;
    }

    t.volume = volume ?? 0;

    return `Set ${track} volume to ${volume ?? 0}dB`;
  },

  /**
   * Mute/unmute a track
   */
  mute_track: async (input, session, context) => {
    const { track, mute } = input;

    if (!track) {
      return 'Error: track required';
    }

    const routing = ensureRouting(session);
    const t = routing.getTrack(track);

    if (!t) {
      return `Track "${track}" doesn't exist`;
    }

    t.mute = mute ?? !t.mute;

    return `${track} ${t.mute ? 'muted' : 'unmuted'}`;
  },

  /**
   * Solo a track (mutes all others)
   */
  solo_track: async (input, session, context) => {
    const { track, solo } = input;

    if (!track) {
      return 'Error: track required';
    }

    const routing = ensureRouting(session);
    const t = routing.getTrack(track);

    if (!t) {
      return `Track "${track}" doesn't exist`;
    }

    // If turning solo on, turn off other solos
    if (solo !== false) {
      for (const [id, tr] of routing.tracks) {
        tr.solo = (id === track);
      }
    } else {
      t.solo = false;
    }

    return `${track} ${t.solo ? 'soloed' : 'solo off'}`;
  },
};

registerTools(routingTools);
