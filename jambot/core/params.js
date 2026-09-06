/**
 * Jambot Unified Parameter System
 *
 * Every parameter in the system is addressable via a dot-path:
 *   session.get('drums.kick.decay')
 *   session.set('bass.cutoff', 0.7)
 *   session.get('fx.master.delay1.feedback')
 *
 * Nodes (instruments, effects, mixer sections) register themselves
 * and handle their own parameter access.
 */

export class ParamSystem {
  constructor() {
    // Registered nodes: 'drums' -> JB01, 'bass' -> JB200, etc.
    // Node IDs can be multi-segment (e.g., 'fx.jb01.ch.delay1')
    this.nodes = new Map();

    // Automation data: 'drums.kick.decay' -> [values array]
    this.automation = new Map();
  }

  /**
   * Resolve a dot-path to { node, paramPath } by trying progressively
   * longer prefixes as node IDs. Supports both simple IDs ('jb01') and
   * multi-segment IDs ('fx.jb01.ch.delay1').
   *
   * For path 'fx.jb01.ch.delay1.feedback', tries:
   *   'fx' → 'fx.jb01' → 'fx.jb01.ch' → 'fx.jb01.ch.delay1' ✓
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
   * Canonical storage form of a path: alias heads (drums.*, bass.*, sampler.*)
   * are rewritten to the node's own id ('jb01.kick.decay'). Effect nodes
   * resolve via multi-segment 'fx.*' keys and keep their path. Unresolvable
   * paths come back unchanged.
   * @param {string} path
   * @returns {string}
   */
  canonicalPath(path) {
    const resolved = this._resolveNode(path);
    if (!resolved) return path;
    const firstSegment = path.split('.')[0];
    if (firstSegment !== resolved.node.id && this.nodes.get(resolved.node.id) === resolved.node) {
      return resolved.paramPath ? `${resolved.node.id}.${resolved.paramPath}` : resolved.node.id;
    }
    return path;
  }

  /**
   * Validate that a path names a real parameter before a tool writes to it.
   * Instrument nodes accept any key in setParam (`this._params[path] = value`),
   * so a typo such as 'jt90.hat.level' or 'jb01.kick.pitch' used to be stored
   * as a dead key and reported as "Set …". Nodes that publish no parameter
   * descriptors beyond 'level' (the jp9000 rack) can't be validated and pass.
   *
   * @param {string} path
   * @returns {{ ok: true, resolved: Object, descriptor: Object|null, mute: boolean } | { ok: false, error: string }}
   */
  checkPath(path) {
    const resolved = this._resolveNode(path);
    if (!resolved) {
      return { ok: false, error: `Error: No node for "${path}". Available: ${this.listNodes().join(', ')}` };
    }
    const { node, nodeId, paramPath } = resolved;
    if (!paramPath) {
      return { ok: false, error: `Error: "${path}" is a node, not a parameter. Use list_params({ node: '${nodeId}' }) to see its parameters.` };
    }
    const descriptor = (typeof node.getDescriptor === 'function' ? node.getDescriptor(paramPath) : null) || null;
    const mute = paramPath === 'mute' || paramPath.endsWith('.mute');
    if (descriptor || mute) return { ok: true, resolved, descriptor, mute };

    const descriptors = typeof node.getParameterDescriptors === 'function' ? node.getParameterDescriptors() : {};
    const keys = Object.keys(descriptors).filter(k => k !== 'level');
    if (keys.length === 0) return { ok: true, resolved, descriptor: null, mute: false };   // dynamic params (jp9000 rack)

    const voices = typeof node.getVoices === 'function' ? node.getVoices() : [];
    const segs = paramPath.split('.');
    if (voices.length > 1 && segs.length >= 2 && !voices.includes(segs[0])) {
      return { ok: false, error: `Error: unknown voice "${segs[0]}" on ${nodeId}. Voices: ${voices.join(', ')}` };
    }
    const scope = voices.length > 1 && voices.includes(segs[0]) ? `${segs[0]}.` : null;
    const valid = [...new Set(
      keys.filter(k => !scope || k.startsWith(scope)).map(k => scope ? k.slice(scope.length) : k.split('.').pop())
    )];
    return { ok: false, error: `Error: unknown parameter "${path}". Valid for ${nodeId}${scope ? '.' + segs[0] : ''}: ${valid.join(', ')}` };
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

    // Store under the CANONICAL node id. Render collects automation by
    // canonical-id prefix, so lanes stored under alias paths (drums.*,
    // bass.*, sampler.*) were accepted here and then silently dropped.
    this.automation.set(this.canonicalPath(path), values);
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
    // One entry per node, under its canonical key. Aliases (drums→jb01,
    // bass/lead/synth→jb202, sampler→jbs) point at the same instance; writing
    // each of them repeated the whole JB202 pattern four times in every save
    // (~0.5 MB for a 128-bar bass line). Effect nodes are registered under
    // multi-segment 'fx.*' keys that never equal node.id — they keep the first
    // key they were registered under.
    const keyFor = new Map();
    for (const [id, node] of this.nodes) {
      if (typeof node.serialize !== 'function') continue;
      if (!keyFor.has(node) || id === node.id) keyFor.set(node, id);
    }
    const nodes = {};
    for (const [node, id] of keyFor) {
      nodes[id] = node.serialize();
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
