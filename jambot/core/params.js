/**
 * Jambot Unified Parameter System
 *
 * Every parameter in the system is addressable via a dot-path:
 *   session.get('drums.kick.decay')
 *   session.set('bass.cutoff', 0.7)
 *   session.get('fx.master.reverb1.decay')
 *
 * Nodes (instruments, effects, mixer sections) register themselves
 * and handle their own parameter access.
 */

export class ParamSystem {
  constructor() {
    // Registered nodes: 'drums' -> JB01, 'bass' -> JB200, etc.
    // Node IDs can be multi-segment (e.g., 'fx.jb01.ch.reverb1')
    this.nodes = new Map();

    // Automation data: 'drums.kick.decay' -> [values array]
    this.automation = new Map();
  }

  /**
   * Resolve a dot-path to { node, paramPath } by trying progressively
   * longer prefixes as node IDs. Supports both simple IDs ('jb01') and
   * multi-segment IDs ('fx.jb01.ch.reverb1').
   *
   * For path 'fx.jb01.ch.reverb1.decay', tries:
   *   'fx' → 'fx.jb01' → 'fx.jb01.ch' → 'fx.jb01.ch.reverb1' ✓
   *
   * @param {string} path - Full dot-separated path
   * @returns {{ node: Node, nodeId: string, paramPath: string } | null}
   */
  _resolveNode(path) {
    const segments = path.split('.');

    // Try progressively longer prefixes (shortest first for backwards compat)
    for (let i = 1; i <= segments.length; i++) {
      const candidateId = segments.slice(0, i).join('.');
      const node = this.nodes.get(candidateId);
      if (node) {
        return {
          node,
          nodeId: candidateId,
          paramPath: segments.slice(i).join('.'),
        };
      }
    }

    return null;
  }

  /**
   * Register a node (instrument, effect, mixer section)
   * @param {string} id - Node identifier (e.g., 'drums', 'bass', 'mixer')
   * @param {Node} node - Node instance implementing getParam/setParam
   */
  register(id, node) {
    if (this.nodes.has(id)) {
      console.warn(`ParamSystem: Node "${id}" is being re-registered`);
    }
    // Validate interface at registration time (catches drift early)
    if (typeof node.validateInterface === 'function') {
      node.validateInterface();
    }
    this.nodes.set(id, node);
  }

  /**
   * Unregister a node
   * @param {string} id - Node identifier
   */
  unregister(id) {
    this.nodes.delete(id);
    // Clean up automation for this node
    for (const path of this.automation.keys()) {
      if (path.startsWith(id + '.')) {
        this.automation.delete(path);
      }
    }
  }

  /**
   * Get a parameter value by path
   * @param {string} path - Dot-separated path (e.g., 'drums.kick.decay')
   * @returns {*} Parameter value, or undefined if not found
   */
  get(path) {
    const resolved = this._resolveNode(path);

    if (!resolved) {
      console.warn(`ParamSystem: No node found for path "${path}"`);
      return undefined;
    }

    return resolved.node.getParam(resolved.paramPath);
  }

  /**
   * Set a parameter value by path
   * @param {string} path - Dot-separated path (e.g., 'drums.kick.decay')
   * @param {*} value - Value to set
   * @returns {boolean} True if successful
   */
  set(path, value) {
    const resolved = this._resolveNode(path);

    if (!resolved) {
      console.warn(`ParamSystem: No node found for path "${path}"`);
      return false;
    }

    return resolved.node.setParam(resolved.paramPath, value);
  }

  /**
   * Get parameter descriptors for a node (for agent introspection)
   * @param {string} nodeId - Node identifier
   * @returns {Object} Parameter descriptors { 'kick.decay': {min, max, unit, default}, ... }
   */
  describe(nodeId) {
    const node = this.nodes.get(nodeId);

    if (!node) {
      console.warn(`ParamSystem: Unknown node "${nodeId}"`);
      return {};
    }

    return node.getParameterDescriptors();
  }

  /**
   * Get all parameter descriptors across all nodes
   * @returns {Object} { 'drums': {...}, 'bass': {...}, ... }
   */
  describeAll() {
    const result = {};
    for (const [id, node] of this.nodes) {
      result[id] = node.getParameterDescriptors();
    }
    return result;
  }

  /**
   * Get a single parameter descriptor by full path
   * Same split logic as get()/set() — one code path for everything.
   * @param {string} path - Full dot-path (e.g., 'jb202.filterCutoff', 'jb01.kick.decay')
   * @returns {Object|null} Descriptor or null
   */
  getDescriptor(path) {
    const resolved = this._resolveNode(path);
    if (!resolved) return null;
    return resolved.node.getDescriptor(resolved.paramPath) || null;
  }

  /**
   * List all registered node IDs
   * @returns {string[]}
   */
  listNodes() {
    return Array.from(this.nodes.keys());
  }

  /**
   * Set automation values for a parameter
   * @param {string} path - Parameter path
   * @param {Array} values - Array of values (one per step)
   */
  automate(path, values) {
    // Validate the path exists
    const resolved = this._resolveNode(path);
    if (!resolved) {
      console.warn(`ParamSystem: Cannot automate unknown path "${path}"`);
      return false;
    }

    this.automation.set(path, values);
    return true;
  }

  /**
   * Get automation values for a parameter
   * @param {string} path - Parameter path
   * @returns {Array|undefined} Automation values or undefined
   */
  getAutomation(path) {
    return this.automation.get(path);
  }

  /**
   * Check if a parameter has automation
   * @param {string} path - Parameter path
   * @returns {boolean}
   */
  hasAutomation(path) {
    return this.automation.has(path);
  }

  /**
   * Get all automation paths
   * @returns {string[]}
   */
  listAutomation() {
    return Array.from(this.automation.keys());
  }

  /**
   * Clear automation for a path (or all if no path specified)
   * @param {string} [path] - Optional path to clear
   */
  clearAutomation(path) {
    if (path) {
      this.automation.delete(path);
    } else {
      this.automation.clear();
    }
  }

  /**
   * Get automation value at a specific step
   * @param {string} path - Parameter path
   * @param {number} step - Step index
   * @returns {*} Value at step, or undefined
   */
  getAutomationAt(path, step) {
    const values = this.automation.get(path);
    if (!values) return undefined;
    return values[step % values.length];
  }

  /**
   * Serialize the entire param system state
   * @returns {Object} Serialized state
   */
  serialize() {
    const nodes = {};
    for (const [id, node] of this.nodes) {
      if (typeof node.serialize === 'function') {
        nodes[id] = node.serialize();
      }
    }

    return {
      nodes,
      automation: Object.fromEntries(this.automation),
    };
  }

  /**
   * Deserialize state back into param system
   * @param {Object} data - Serialized state
   */
  deserialize(data) {
    if (data.nodes) {
      for (const [id, nodeData] of Object.entries(data.nodes)) {
        const node = this.nodes.get(id);
        if (node && typeof node.deserialize === 'function') {
          node.deserialize(nodeData);
        }
      }
    }

    if (data.automation) {
      this.automation = new Map(Object.entries(data.automation));
    }
  }
}

// Singleton instance for the session
let instance = null;

export function getParamSystem() {
  if (!instance) {
    instance = new ParamSystem();
  }
  return instance;
}

export function resetParamSystem() {
  instance = new ParamSystem();
  return instance;
}
