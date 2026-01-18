/**
 * Generic Tools
 *
 * Unified tools that work on ANY parameter in the system.
 * Replaces bespoke per-instrument tools (tweak_drums, tweak_bass, etc.)
 */

import { registerTools } from './index.js';

const genericTools = {
  /**
   * Get any parameter value
   *
   * Examples:
   *   get_param({ path: 'drums.kick.decay' })
   *   get_param({ path: 'bass.cutoff' })
   *   get_param({ path: 'mixer.sends.reverb1.decay' })
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

    return `${path} = ${JSON.stringify(value)}`;
  },

  /**
   * Set any parameter value (generic tweak)
   *
   * Examples:
   *   tweak({ path: 'drums.kick.decay', value: 75 })
   *   tweak({ path: 'bass.cutoff', value: 2000 })
   *   tweak({ path: 'lead.resonance', value: 80 })
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

    const success = session.set(path, value);

    if (success) {
      return `Set ${path} = ${JSON.stringify(value)}`;
    } else {
      return `Error: Could not set ${path}`;
    }
  },

  /**
   * Set multiple parameters at once
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
      const success = session.set(path, value);
      if (success) {
        results.push(`${path} = ${JSON.stringify(value)}`);
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
