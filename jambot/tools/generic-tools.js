/**
 * Generic Tools
 *
 * Unified tools that work on ANY parameter in the system.
 * These are the PRIMARY tools for parameter access across all instruments.
 */

import { registerTools } from './index.js';
import { toEngine, fromEngine, formatValue } from '../params/converters.js';

/**
 * Nodes that store/consume producer units directly (effects, jbs sampler)
 * declare producerUnitStorage — the generic paths skip unit conversion for
 * them so conversion happens at most once, at the node's own boundary.
 */
function nodeStoresProducerUnits(session, path) {
  const resolved = session.params?._resolveNode?.(path);
  return !!(resolved && resolved.node && resolved.node.producerUnitStorage);
}

// Session-level "parameters" that aren't on any node. Agents reach for
// tweak({ path: 'bpm' }) naturally; without this they fall back to
// create_session, which wipes the whole track.
const SESSION_PARAMS = {
  bpm:   { min: 40, max: 300, unit: 'BPM',   get: s => s.bpm,   set: (s, v) => { s.bpm = v; } },
  swing: { min: 0,  max: 100, unit: '%',     get: s => s.swing, set: (s, v) => { s.swing = v; } },
  bars:  { min: 1,  max: 64,  unit: 'bars',  get: s => s.bars,  set: (s, v) => { s.bars = Math.round(v); } },
};

function sessionParam(session, path, value, delta) {
  const def = SESSION_PARAMS[path];
  if (!def) return null;
  if (value === undefined && delta === undefined) {
    return `${path} = ${def.get(session)} ${def.unit}`;
  }
  let v = delta !== undefined ? (def.get(session) || 0) + delta : value;
  if (typeof v !== 'number' || !isFinite(v)) return `Error: ${path} needs a number`;
  v = Math.max(def.min, Math.min(def.max, v));
  def.set(session, v);
  return `Set ${path} = ${def.get(session)} ${def.unit}`;
}

// In song mode the arrangement renders each section from the params captured
// inside the saved patterns, so tweaking the live node changes nothing audible
// until the pattern is re-saved. Say so in the tool result.
function songModeNote(session, path) {
  if (!Array.isArray(session.arrangement) || session.arrangement.length === 0) return '';
  const inst = String(path).split('.')[0];
  const saved = session.patterns?.[inst];
  if (!saved || Object.keys(saved).length === 0) return '';
  const segs = String(path).split('.');
  if (segs.length === 2 && segs[1] === 'level') return '';   // node level applies at mix time
  const names = Object.keys(saved).join(', ');
  return ` (song mode: live pattern only — saved ${inst} patterns ${names} unchanged. To hear it in the arrangement: load_pattern → tweak → save_pattern for each)`;
}

const genericTools = {
  /**
   * Change tempo of the current track (keeps everything else).
   * Same as tweak({ path: 'bpm' }); exists so the agent never reaches for
   * create_session (which wipes the track) to change tempo.
   */
  set_bpm: async (input, session, context) => {
    const bpm = Number(input.bpm);
    if (!isFinite(bpm) || bpm < 40 || bpm > 300) return 'Error: bpm must be 40-300';
    session.bpm = bpm;
    return `Tempo set to ${session.bpm} BPM`;
  },

  /**
   * Get any parameter value (returns producer-friendly units)
   *
   * Examples:
   *   get_param({ path: 'drums.kick.decay' })     → "drums.kick.decay = 75" (0-100)
   *   get_param({ path: 'bass.cutoff' })          → "bass.cutoff = 2000Hz"
   *   get_param({ path: 'drums.kick.level' })     → "drums.kick.level = -3dB"
   */
  get_param: async (input, session, context) => {
    const { path } = input;

    if (!path) {
      return 'Error: path required (e.g., "drums.kick.decay")';
    }

    if (SESSION_PARAMS[path]) return sessionParam(session, path);

    const value = session.get(path);

    if (value === undefined) {
      // Check if node exists — resolver handles multi-segment ids ('fx.*')
      if (!session.params?._resolveNode?.(path)) {
        return `Error: No node for "${path}". Available: ${session.listNodes().join(', ')}`;
      }
      return `${path} is not set (undefined)`;
    }

    // Get descriptor for unit conversion
    const descriptor = session.getDescriptor(path);

    if (descriptor) {
      // Node-level 'level' already returns dB from getLevel(); producer-unit
      // nodes (effects, jbs) store producer values raw — skip fromEngine
      const segs = path.split('.');
      const isNodeLevel = segs.length === 2 && segs[1] === 'level';
      const skip = isNodeLevel || nodeStoresProducerUnits(session, path);
      const producerValue = skip ? value : fromEngine(value, descriptor);
      return `${path} = ${formatValue(producerValue, descriptor)}`;
    }

    // No descriptor - return raw value
    return `${path} = ${JSON.stringify(value)}`;
  },

  /**
   * Set any parameter value (generic tweak with automatic unit conversion)
   *
   * Accepts producer-friendly values and converts to engine units:
   *   - dB → linear gain (level: -6 → 0.25)
   *   - 0-100 → 0-1 (decay: 75 → 0.75)
   *   - Hz → log-normalized 0-1 (cutoff: 2000 → ~0.65)
   *   - semitones → cents (tune: +3 → 300)
   *   - pan → -1 to +1 (pan: -50 → -0.5)
   *
   * Use `value` for absolute values, `delta` for relative adjustments:
   *
   * Absolute examples:
   *   tweak({ path: 'drums.kick.decay', value: 75 })       → Sets decay to 75%
   *   tweak({ path: 'bass.cutoff', value: 2000 })          → Sets filter to 2000Hz
   *   tweak({ path: 'drums.kick.level', value: -6 })       → Sets level to -6dB
   *
   * Relative examples (delta):
   *   tweak({ path: 'jb202.bass.level', delta: -5 })       → Reduce level by 5
   *   tweak({ path: 'drums.kick.decay', delta: 10 })       → Increase decay by 10
   *   tweak({ path: 'bass.filterCutoff', delta: -200 })    → Lower cutoff by 200Hz
   */
  tweak: async (input, session, context) => {
    const { path, value, delta } = input;

    if (!path) {
      return 'Error: path required (e.g., "drums.kick.decay")';
    }

    if (value === undefined && delta === undefined) {
      return 'Error: value or delta required';
    }

    if (SESSION_PARAMS[path]) return sessionParam(session, path, value, delta);

    // Validate node exists — use the resolver, node ids can be multi-segment
    // (effect nodes register as 'fx.<target>.<id>')
    if (!session.params?._resolveNode?.(path)) {
      return `Error: No node for "${path}". Available: ${session.listNodes().join(', ')}`;
    }

    // Get descriptor for unit conversion
    const descriptor = session.getDescriptor(path);

    // Node-level 'level' (e.g. 'jt10.level') — setLevel() works in dB directly,
    // so skip toEngine/fromEngine to avoid double-conversion
    const segments = path.split('.');
    const isNodeLevel = segments.length === 2 && segments[1] === 'level';
    const skipConvert = isNodeLevel || nodeStoresProducerUnits(session, path);

    let finalProducerValue;

    if (delta !== undefined) {
      // Relative adjustment: get current value, add delta
      const currentEngineValue = session.get(path);
      if (currentEngineValue === undefined) {
        return `Error: Cannot apply delta - ${path} has no current value`;
      }
      // Convert current engine value back to producer units
      const currentProducerValue = (descriptor && !skipConvert) ? fromEngine(currentEngineValue, descriptor) : currentEngineValue;
      finalProducerValue = currentProducerValue + delta;
      // Clamp to valid range if we have a descriptor
      if (descriptor) {
        finalProducerValue = Math.max(descriptor.min, Math.min(descriptor.max, finalProducerValue));
      }
    } else {
      finalProducerValue = value;
    }
    const engineValue = (descriptor && !skipConvert) ? toEngine(finalProducerValue, descriptor) : finalProducerValue;

    const success = session.set(path, engineValue);

    if (success) {
      // Format the display value
      const displayValue = descriptor ? formatValue(finalProducerValue, descriptor) : JSON.stringify(finalProducerValue);
      const action = delta !== undefined ? `Adjusted ${path} by ${delta > 0 ? '+' : ''}${delta} →` : 'Set';
      return `${action} ${path} = ${displayValue}${songModeNote(session, path)}`;
    } else {
      return `Error: Could not set ${path}`;
    }
  },

  /**
   * Set multiple parameters at once (with automatic unit conversion)
   *
   * Examples:
   *   tweak_multi({ params: { 'drums.kick.decay': 75, 'drums.kick.level': -3, 'bass.cutoff': 2000 } })
   */
  tweak_multi: async (input, session, context) => {
    const { params } = input;

    if (!params || typeof params !== 'object') {
      return 'Error: params object required (e.g., { "drums.kick.decay": 75 })';
    }

    const results = [];
    for (const [path, value] of Object.entries(params)) {
      if (SESSION_PARAMS[path]) { results.push(sessionParam(session, path, value)); continue; }
      // Get descriptor for unit conversion
      const descriptor = session.getDescriptor(path);

      // Node-level 'level' (e.g. 'jt10.level') goes straight to setLevel(dB);
      // producer-unit nodes (effects, jbs) take producer values raw
      const segments = path.split('.');
      const isNodeLevel = segments.length === 2 && segments[1] === 'level';
      const skipConvert = isNodeLevel || nodeStoresProducerUnits(session, path);
      const engineValue = (descriptor && !skipConvert) ? toEngine(value, descriptor) : value;

      const success = session.set(path, engineValue);
      if (success) {
        const displayValue = descriptor ? formatValue(value, descriptor) : JSON.stringify(value);
        results.push(`${path} = ${displayValue}${songModeNote(session, path)}`);
      } else {
        results.push(`${path}: FAILED`);
      }
    }

    return `Set ${results.length} params:\n  ${results.join('\n  ')}`;
  },

  /**
   * List available parameters for a node
   *
   * Examples:
   *   list_params({ node: 'drums' })
   *   list_params({ node: 'bass' })
   *   list_params({})  // List all nodes
   */
  list_params: async (input, session, context) => {
    const { node } = input;

    if (!node) {
      // List all nodes
      const nodes = session.listNodes();
      return `Available nodes: ${nodes.join(', ')}\n\nUse list_params({ node: 'drums' }) to see parameters for a specific node.`;
    }

    const descriptors = session.describe(node);

    if (!descriptors || Object.keys(descriptors).length === 0) {
      if (!session.params.nodes.has(node)) {
        return `Error: Unknown node "${node}". Available: ${session.listNodes().join(', ')}`;
      }
      return `Node "${node}" has no parameters registered.`;
    }

    const lines = [`PARAMETERS FOR ${node.toUpperCase()}:`, ''];

    // Group by voice/section
    const groups = {};
    for (const [path, desc] of Object.entries(descriptors)) {
      const parts = path.split('.');
      const group = parts.length > 1 ? parts[0] : '_root';
      if (!groups[group]) groups[group] = [];

      const paramName = parts.length > 1 ? parts.slice(1).join('.') : path;
      groups[group].push({ name: paramName, path, desc });
    }

    for (const [group, params] of Object.entries(groups)) {
      if (group !== '_root') {
        lines.push(`${group}:`);
      }

      for (const { name, path, desc } of params) {
        let info = name;
        if (desc.unit) info += ` (${desc.unit})`;
        if (desc.min !== undefined && desc.max !== undefined) {
          info += ` [${desc.min}-${desc.max}]`;
        }
        if (desc.options) {
          info += ` [${desc.options.join('|')}]`;
        }
        if (desc.default !== undefined) {
          info += ` default=${desc.default}`;
        }
        lines.push(`  ${info}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  },

  /**
   * Get current state of all parameters for a node
   *
   * Examples:
   *   get_state({ node: 'drums', voice: 'kick' })
   *   get_state({ node: 'bass' })
   */
  get_state: async (input, session, context) => {
    const { node, voice } = input;

    if (!node) {
      return 'Error: node required (e.g., "drums", "bass")';
    }

    const descriptors = session.describe(node);
    if (!descriptors || Object.keys(descriptors).length === 0) {
      return `No parameters for "${node}"`;
    }

    const lines = [`STATE FOR ${node.toUpperCase()}${voice ? '.' + voice : ''}:`, ''];

    for (const [path, desc] of Object.entries(descriptors)) {
      // Filter by voice if specified
      if (voice && !path.startsWith(voice + '.')) continue;

      const value = session.get(`${node}.${path}`);
      const displayValue = value !== undefined ? JSON.stringify(value) : '(not set)';
      lines.push(`  ${path}: ${displayValue}`);
    }

    return lines.join('\n');
  },
};

registerTools(genericTools);
