/**
 * Generic Tools
 *
 * Unified tools that work on ANY parameter in the system.
 * These are the PRIMARY tools for parameter access across all instruments.
 */

import { registerTools } from './index.js';
import { getParamDef, toEngine, fromEngine, formatValue } from '../params/converters.js';

/**
 * Map node IDs to synth IDs for converter lookup
 *
 * REAL INSTRUMENTS:
 *   - jb01 (drum machine)
 *   - jb200 (bass/synth)
 *   - sampler
 *
 * ALIASES (point to same instruments):
 *   - drums → jb01
 *   - bass, lead, synth → jb200
 */
const NODE_TO_SYNTH = {
  // Real instruments
  jb01: 'jb01',
  jb200: 'jb200',
  sampler: 'r9ds',
  // Aliases
  drums: 'jb01',
  bass: 'jb200',
  lead: 'jb200',
  synth: 'jb200',
};

/**
 * Parse a path like 'drums.kick.decay' into { nodeId, voice, param }
 * or 'bass.cutoff' into { nodeId, voice: 'bass', param: 'cutoff' }
 */
function parsePath(path) {
  const parts = path.split('.');

  if (parts.length < 2) {
    return null;
  }

  const nodeId = parts[0];

  // Single-voice instruments: bass.cutoff → voice='bass', param='cutoff'
  // Multi-voice instruments: drums.kick.decay → voice='kick', param='decay'
  // JB200: jb200.bass.filterCutoff → voice='bass', param='filterCutoff'

  if (parts.length === 2) {
    // bass.cutoff, lead.resonance
    // For single-voice, the voice is the same as the nodeId
    return { nodeId, voice: nodeId, param: parts[1] };
  }

  if (parts.length >= 3) {
    // drums.kick.decay, sampler.s1.level, jb200.bass.filterCutoff
    return { nodeId, voice: parts[1], param: parts.slice(2).join('.') };
  }

  return null;
}

/**
 * Get the descriptor for a path
 */
function getDescriptorForPath(path) {
  const parsed = parsePath(path);
  if (!parsed) return null;

  const synthId = NODE_TO_SYNTH[parsed.nodeId];
  if (!synthId) return null;

  return getParamDef(synthId, parsed.voice, parsed.param);
}

const genericTools = {
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

    const value = session.get(path);

    if (value === undefined) {
      // Check if node exists
      const [nodeId] = path.split('.');
      if (!session.params.nodes.has(nodeId)) {
        return `Error: Unknown node "${nodeId}". Available: ${session.listNodes().join(', ')}`;
      }
      return `${path} is not set (undefined)`;
    }

    // Get descriptor for unit conversion
    const descriptor = getDescriptorForPath(path);

    if (descriptor) {
      // Convert engine value back to producer units
      const producerValue = fromEngine(value, descriptor);
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
   * Examples:
   *   tweak({ path: 'drums.kick.decay', value: 75 })       → Sets decay to 75%
   *   tweak({ path: 'bass.cutoff', value: 2000 })          → Sets filter to 2000Hz
   *   tweak({ path: 'drums.kick.level', value: -6 })       → Sets level to -6dB
   *   tweak({ path: 'jb200.bass.filterCutoff', value: 800 }) → Sets JB200 filter
   */
  tweak: async (input, session, context) => {
    const { path, value } = input;

    if (!path) {
      return 'Error: path required (e.g., "drums.kick.decay")';
    }

    if (value === undefined) {
      return 'Error: value required';
    }

    // Validate node exists
    const [nodeId] = path.split('.');
    if (!session.params.nodes.has(nodeId)) {
      return `Error: Unknown node "${nodeId}". Available: ${session.listNodes().join(', ')}`;
    }

    // Get descriptor for unit conversion
    const descriptor = getDescriptorForPath(path);

    // Convert producer units to engine units if descriptor exists
    const engineValue = descriptor ? toEngine(value, descriptor) : value;

    const success = session.set(path, engineValue);

    if (success) {
      // Format the display value
      const displayValue = descriptor ? formatValue(value, descriptor) : JSON.stringify(value);
      return `Set ${path} = ${displayValue}`;
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
      // Get descriptor for unit conversion
      const descriptor = getDescriptorForPath(path);

      // Convert producer units to engine units if descriptor exists
      const engineValue = descriptor ? toEngine(value, descriptor) : value;

      const success = session.set(path, engineValue);
      if (success) {
        const displayValue = descriptor ? formatValue(value, descriptor) : JSON.stringify(value);
        results.push(`${path} = ${displayValue}`);
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
