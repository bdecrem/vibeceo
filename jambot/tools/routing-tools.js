/**
 * Routing Tools
 *
 * Dynamic track and send management tools.
 *
 * Tracks are one per instrument instance (jb01, jt90, jb202-2 …), created on
 * demand, and every track tool accepts an instrument id, an added instance or
 * an alias ('drums' → jb01). Send buses register their effect node in the
 * ParamSystem as `send.<id>` so `tweak` / `tweak_effect` reach them.
 */

import { registerTools } from './index.js';
import { RoutingManager, SEND_EFFECT_CLASSES, checkEffectParams } from '../core/routing.js';

function instrumentIds(session) {
  if (typeof session.listInstruments === 'function') return session.listInstruments().map(i => i.id);
  return session.listNodes();
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

/** The track driving an instrument: keyed on its id, or any track whose nodeId is it. */
function trackForInstrument(routing, id) {
  return routing.tracks.get(id) || [...routing.tracks.values()].find(t => t.nodeId === id) || null;
}

// Ensure session has routing manager
function ensureRouting(session) {
  if (!session.routing) session.routing = new RoutingManager();
  const routing = session.routing;

  // Send effect nodes live in the ParamSystem as send.<id> (also after a reload)
  if (session.params && routing.params !== session.params) routing.attachParams(session.params);

  // One track per instrument instance, created on demand. The old one-shot
  // snapshot of listNodes() included the aliases (drums/bass/lead/synth/
  // sampler) — tracks that never matched a rendered instrument — and never
  // picked up instruments added afterwards.
  for (const id of instrumentIds(session)) {
    if (!trackForInstrument(routing, id)) routing.addTrack(id, { nodeId: id });
  }
  return routing;
}

/**
 * Resolve a track name. Instrument ids, added instances and aliases resolve to
 * that instrument's track (created if needed); anything else must be an
 * explicit track id (add_track).
 */
function resolveTrack(session, routing, name) {
  if (!name) return null;
  const inst = canonicalInstrumentId(session, name);
  if (inst) return trackForInstrument(routing, inst) || routing.addTrack(inst, { nodeId: inst });
  return routing.tracks.get(name) || null;
}

function noTrack(routing, name) {
  return `Track "${name}" doesn't exist. Tracks: ${routing.listTracks().join(', ')}`;
}

function describeTrack(id, track) {
  let info = `  ${id}`;
  if (track.nodeId !== id) info += ` → ${track.nodeId}`;
  if (track.mute) info += ' [MUTE]';
  if (track.solo) info += ' [SOLO]';
  if (track.volume !== 0) info += ` (${track.volume}dB)`;
  if (track.pan) info += ` pan=${track.pan}`;
  const sends = Object.entries(track.sends || {}).filter(([, l]) => l).map(([s, l]) => `${s}@${(l * 100).toFixed(0)}%`);
  if (sends.length) info += ` sends: ${sends.join(', ')}`;
  return info;
}

const routingTools = {
  /**
   * Add a new track
   *
   * Examples:
   *   add_track({ id: 'synth2', nodeId: 'jb202-2' })  // Another track for an instance
   *   add_track({ id: 'fx_return', volume: -6 })      // FX return channel
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

    // A track only does something when it drives an instrument
    const target = nodeId ? canonicalInstrumentId(session, nodeId) : canonicalInstrumentId(session, id);
    if (nodeId && !target) {
      return `Error: nodeId "${nodeId}" is not an instrument. Instruments: ${instrumentIds(session).join(', ')}`;
    }

    routing.addTrack(id, { nodeId: target || nodeId, volume, mute, pan });

    return `Added track "${id}"${target ? ` → ${target}` : ' (drives no instrument)'}`;
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
      return noTrack(routing, id);
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
      lines.push(describeTrack(id, routing.getTrack(id)));
    }

    return lines.join('\n');
  },

  /**
   * Add a send bus (with effect)
   *
   * Examples:
   *   add_send({ id: 'dly', effect: 'delay', time: 375, feedback: 60 })
   *   add_send({ id: 'verb', effect: 'reverb', decay: 4, size: 70 })
   */
  add_send: async (input, session, context) => {
    const { id, effect = 'delay', ...params } = input;

    if (!id) {
      return 'Error: id required';
    }

    const routing = ensureRouting(session);

    if (routing.sends.has(id)) {
      return `Send "${id}" already exists`;
    }
    if (id === 'master' || id === 'fx' || id === 'send' || canonicalInstrumentId(session, id) || session.params?.nodes?.has(id)) {
      return `Error: "${id}" is an instrument name — pick a send id like 'verb' or 'dly'`;
    }

    const NodeClass = SEND_EFFECT_CLASSES[effect];
    if (!NodeClass || effect === 'sidechain') {
      return `Error: unknown send effect "${effect}". Sends take: delay, reverb, eq, filter`;
    }

    const { level, ...effectParams } = params;
    if (level !== undefined && typeof level !== 'number') {
      return 'Error: level must be a number (send return level, 0-1)';
    }
    // Refuse bad params up front — the bus used to be created with stock
    // defaults and report success whatever was asked for.
    const rejected = checkEffectParams(new NodeClass(id), effectParams);
    if (rejected.length) {
      return `Error: ${effect} ${rejected.join('; ')} — send not created`;
    }

    const send = routing.addSend(id, effect, params);
    const p = send.effectNode.getParams();
    const applied = Object.keys(effectParams).filter(k => effectParams[k] !== undefined).map(k => `${k}=${p[k]}`);

    let msg = `Added send "${id}" with ${effect}${applied.length ? ` [${applied.join(', ')}]` : ''}.`;
    msg += ` It returns 100% wet — feed it with route({ track, send: '${id}', level }).`;
    msg += ` Adjust with tweak_effect({ target: '${id}', effect: '${effect}', ... }) or tweak({ path: 'send.${id}.<param>' })`;
    if (effectParams.mix !== undefined) msg += ' (mix is ignored on a send; use the route level)';
    return msg;
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
      return 'No sends. Use add_send({ id: "verb", effect: "reverb" }) to create one.';
    }

    const lines = ['SENDS:', ''];
    for (const id of sends) {
      const send = routing.getSend(id);
      const p = send.effectNode.getParams();
      const summary = Object.entries(p).filter(([k]) => k !== 'mix').map(([k, v]) => `${k}=${v}`).join(', ');
      const fed = [...routing.tracks.values()].filter(t => t.sends[id]).map(t => `${t.id}@${(t.sends[id] * 100).toFixed(0)}%`);
      lines.push(`  ${id}: ${send.effectType} [${summary}] level=${send.level}${fed.length ? ` ← ${fed.join(', ')}` : ' (nothing routed yet)'}`);
    }

    return lines.join('\n');
  },

  /**
   * Route a track to a send
   *
   * Examples:
   *   route({ track: 'jt90', send: 'dly', level: 0.3 })
   *   route({ track: 'jb202-2', send: 'verb', level: 0.5 })
   */
  route: async (input, session, context) => {
    const { track, send, level } = input;

    if (!track || !send) {
      return 'Error: track and send required';
    }

    const routing = ensureRouting(session);
    const t = resolveTrack(session, routing, track);

    if (!t) {
      return noTrack(routing, track);
    }

    if (!routing.sends.has(send)) {
      return `Send "${send}" doesn't exist. Available: ${routing.listSends().join(', ') || 'none — add_send first'}`;
    }

    routing.route(t.id, send, level ?? 0.3);

    return `Routed ${t.id} → ${send} @ ${((level ?? 0.3) * 100).toFixed(0)}%`;
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
    const t = resolveTrack(session, routing, track);
    if (!t) {
      return noTrack(routing, track);
    }
    if (t.sends[send] === undefined) {
      return `${t.id} is not routed to ${send}`;
    }
    routing.unroute(t.id, send);

    return `Unrouted ${t.id} from ${send}`;
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
   *   set_track_volume({ track: 'jt90', volume: -3 })
   *   set_track_volume({ track: 'jb202', volume: -6 })
   */
  set_track_volume: async (input, session, context) => {
    const { track, volume } = input;

    if (!track) {
      return 'Error: track required';
    }
    if (volume !== undefined && typeof volume !== 'number') {
      return 'Error: volume must be a number (dB)';
    }

    const routing = ensureRouting(session);
    const t = resolveTrack(session, routing, track);

    if (!t) {
      return noTrack(routing, track);
    }

    t.volume = volume ?? 0;

    return `Set ${t.id} volume to ${t.volume}dB`;
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
    const t = resolveTrack(session, routing, track);

    if (!t) {
      return noTrack(routing, track);
    }

    t.mute = mute ?? !t.mute;

    return `${t.id} ${t.mute ? 'muted' : 'unmuted'}`;
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
    const t = resolveTrack(session, routing, track);

    if (!t) {
      return noTrack(routing, track);
    }

    // If turning solo on, turn off other solos
    if (solo !== false) {
      for (const tr of routing.tracks.values()) {
        tr.solo = (tr === t);
      }
    } else {
      t.solo = false;
    }

    return `${t.id} ${t.solo ? 'soloed' : 'solo off'}`;
  },
};

registerTools(routingTools);
