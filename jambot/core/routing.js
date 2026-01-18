/**
 * Jambot Routing System
 *
 * Dynamic track and send management.
 * Tracks route to sends, sends have effects, all feeds to master.
 */

import { ReverbNode } from '../effects/reverb-node.js';
import { EQNode } from '../effects/eq-node.js';
import { FilterNode } from '../effects/filter-node.js';
import { SidechainNode } from '../effects/sidechain-node.js';

/**
 * Create a new track
 * @param {string} id - Track identifier
 * @param {Object} config - { nodeId, volume, mute }
 * @returns {Object} Track config
 */
export function createTrack(id, config = {}) {
  return {
    id,
    nodeId: config.nodeId || id,  // Maps to instrument node
    volume: config.volume ?? 0,    // dB
    mute: config.mute ?? false,
    solo: config.solo ?? false,
    pan: config.pan ?? 0,          // -100 to +100
    inserts: [],                   // Channel inserts
    sends: {},                     // { sendId: level }
  };
}

/**
 * Create a new send bus
 * @param {string} id - Send identifier
 * @param {string} effectType - 'reverb', 'delay', etc.
 * @param {Object} params - Effect parameters
 * @returns {Object} Send config
 */
export function createSend(id, effectType, params = {}) {
  // Create appropriate effect node
  let effectNode;
  switch (effectType) {
    case 'reverb':
      effectNode = new ReverbNode(id, params);
      break;
    default:
      effectNode = new ReverbNode(id, params);  // Default to reverb
  }

  return {
    id,
    effectType,
    effectNode,
    params: effectNode.getParams(),
    level: params.level ?? 1,  // Send bus output level
  };
}

/**
 * Add insert to a track
 * @param {Object} track - Track config
 * @param {string} effectType - 'eq', 'filter', 'sidechain'
 * @param {Object} config - { preset, params }
 * @returns {Object} Insert config
 */
export function addTrackInsert(track, effectType, config = {}) {
  let effectNode;
  switch (effectType) {
    case 'eq':
      effectNode = new EQNode(`${track.id}-${effectType}`, config);
      break;
    case 'filter':
      effectNode = new FilterNode(`${track.id}-${effectType}`, config);
      break;
    case 'sidechain':
    case 'ducker':
      effectNode = new SidechainNode(`${track.id}-${effectType}`, config);
      break;
    default:
      throw new Error(`Unknown effect type: ${effectType}`);
  }

  // Remove existing insert of same type (replace)
  track.inserts = track.inserts.filter(i => i.effectType !== effectType);

  const insert = {
    effectType,
    effectNode,
    params: effectNode.getParams(),
  };

  track.inserts.push(insert);
  return insert;
}

/**
 * Remove insert from a track
 * @param {Object} track - Track config
 * @param {string} effectType - Effect type to remove, or 'all'
 */
export function removeTrackInsert(track, effectType) {
  if (effectType === 'all') {
    track.inserts = [];
  } else {
    track.inserts = track.inserts.filter(i => i.effectType !== effectType);
  }
}

/**
 * Route a track to a send
 * @param {Object} track - Track config
 * @param {string} sendId - Send bus ID
 * @param {number} level - Send level (0-1)
 */
export function routeToSend(track, sendId, level) {
  track.sends[sendId] = level;
}

/**
 * Remove send routing from a track
 * @param {Object} track - Track config
 * @param {string} sendId - Send bus ID
 */
export function removeFromSend(track, sendId) {
  delete track.sends[sendId];
}

/**
 * RoutingManager - manages all tracks and sends for a session
 */
export class RoutingManager {
  constructor() {
    this.tracks = new Map();
    this.sends = new Map();
    this.master = {
      volume: 0.8,
      inserts: [],
    };
  }

  // === TRACKS ===

  addTrack(id, config = {}) {
    const track = createTrack(id, config);
    this.tracks.set(id, track);
    return track;
  }

  removeTrack(id) {
    return this.tracks.delete(id);
  }

  getTrack(id) {
    return this.tracks.get(id);
  }

  listTracks() {
    return Array.from(this.tracks.keys());
  }

  // === SENDS ===

  addSend(id, effectType = 'reverb', params = {}) {
    const send = createSend(id, effectType, params);
    this.sends.set(id, send);
    return send;
  }

  removeSend(id) {
    // Remove all routings to this send
    for (const track of this.tracks.values()) {
      delete track.sends[id];
    }
    return this.sends.delete(id);
  }

  getSend(id) {
    return this.sends.get(id);
  }

  listSends() {
    return Array.from(this.sends.keys());
  }

  // === ROUTING ===

  route(trackId, sendId, level) {
    const track = this.tracks.get(trackId);
    if (!track) throw new Error(`Unknown track: ${trackId}`);
    if (!this.sends.has(sendId)) throw new Error(`Unknown send: ${sendId}`);
    routeToSend(track, sendId, level);
  }

  unroute(trackId, sendId) {
    const track = this.tracks.get(trackId);
    if (track) {
      removeFromSend(track, sendId);
    }
  }

  // === INSERTS ===

  addInsert(trackId, effectType, config = {}) {
    const track = this.tracks.get(trackId);
    if (!track) throw new Error(`Unknown track: ${trackId}`);
    return addTrackInsert(track, effectType, config);
  }

  removeInsert(trackId, effectType) {
    const track = this.tracks.get(trackId);
    if (track) {
      removeTrackInsert(track, effectType);
    }
  }

  addMasterInsert(effectType, config = {}) {
    let effectNode;
    switch (effectType) {
      case 'eq':
        effectNode = new EQNode(`master-${effectType}`, config);
        break;
      case 'filter':
        effectNode = new FilterNode(`master-${effectType}`, config);
        break;
      default:
        throw new Error(`Unknown effect type: ${effectType}`);
    }

    this.master.inserts.push({
      effectType,
      effectNode,
      params: effectNode.getParams(),
    });
  }

  // === SERIALIZATION ===

  serialize() {
    const tracks = {};
    for (const [id, track] of this.tracks) {
      tracks[id] = {
        nodeId: track.nodeId,
        volume: track.volume,
        mute: track.mute,
        solo: track.solo,
        pan: track.pan,
        sends: { ...track.sends },
        inserts: track.inserts.map(i => ({
          effectType: i.effectType,
          params: i.params,
        })),
      };
    }

    const sends = {};
    for (const [id, send] of this.sends) {
      sends[id] = {
        effectType: send.effectType,
        params: send.params,
        level: send.level,
      };
    }

    return {
      tracks,
      sends,
      master: {
        volume: this.master.volume,
        inserts: this.master.inserts.map(i => ({
          effectType: i.effectType,
          params: i.params,
        })),
      },
    };
  }

  deserialize(data) {
    this.tracks.clear();
    this.sends.clear();

    if (data.tracks) {
      for (const [id, trackData] of Object.entries(data.tracks)) {
        const track = this.addTrack(id, trackData);
        if (trackData.inserts) {
          for (const insertData of trackData.inserts) {
            addTrackInsert(track, insertData.effectType, { params: insertData.params });
          }
        }
      }
    }

    if (data.sends) {
      for (const [id, sendData] of Object.entries(data.sends)) {
        this.addSend(id, sendData.effectType, sendData.params);
      }
    }

    if (data.master) {
      this.master.volume = data.master.volume ?? 0.8;
      this.master.inserts = [];
      if (data.master.inserts) {
        for (const insertData of data.master.inserts) {
          this.addMasterInsert(insertData.effectType, { params: insertData.params });
        }
      }
    }
  }

  // === DISPLAY ===

  getRoutingInfo() {
    const lines = ['ROUTING:', ''];

    // Tracks
    lines.push('TRACKS:');
    for (const [id, track] of this.tracks) {
      let info = `  ${id}:`;
      if (track.mute) info += ' [MUTE]';
      if (track.solo) info += ' [SOLO]';
      info += ` vol=${track.volume}dB`;
      if (track.pan !== 0) info += ` pan=${track.pan}`;
      lines.push(info);

      if (track.inserts.length > 0) {
        lines.push(`    inserts: ${track.inserts.map(i => i.effectType).join(' → ')}`);
      }

      const sendInfo = Object.entries(track.sends)
        .map(([s, l]) => `${s}@${(l * 100).toFixed(0)}%`)
        .join(', ');
      if (sendInfo) {
        lines.push(`    sends: ${sendInfo}`);
      }
    }
    lines.push('');

    // Sends
    if (this.sends.size > 0) {
      lines.push('SENDS:');
      for (const [id, send] of this.sends) {
        lines.push(`  ${id}: ${send.effectType}`);
      }
      lines.push('');
    }

    // Master
    lines.push('MASTER:');
    lines.push(`  volume: ${this.master.volume}`);
    if (this.master.inserts.length > 0) {
      lines.push(`  inserts: ${this.master.inserts.map(i => i.effectType).join(' → ')}`);
    }

    return lines.join('\n');
  }
}
