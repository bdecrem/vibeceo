/**
 * JP9000 Rack
 *
 * Container for modules and their connections.
 * Handles signal routing, processing order, and rendering.
 */

import { createModule } from './modules/index.js';

export class Rack {
  constructor(sampleRate = 44100) {
    this.sampleRate = sampleRate;
    this.modules = new Map();       // id -> Module
    this.connections = [];          // [{ from: 'mod.output', to: 'mod.input' }]
    this.outputModuleId = null;     // Final output module ID
    this._processingOrder = null;   // Cached topological sort
    this._idCounter = 0;            // Monotonic ID counter (never reused after removal)
  }

  /**
   * Add a module to the rack
   * @param {string} type - Module type (e.g., 'osc-saw', 'filter-lp24')
   * @param {string} [id] - Optional custom ID
   * @returns {string} Module ID
   */
  addModule(type, id = null) {
    let moduleId;
    if (id) {
      // Explicit ID must not collide with an existing module.
      if (this.modules.has(id)) {
        throw new Error(`Module id already exists: ${id}`);
      }
      moduleId = id;
    } else {
      // Auto ID from a monotonic counter, never reusing a removed module's ID.
      const base = type.replace('-', '_');
      do {
        moduleId = `${base}_${++this._idCounter}`;
      } while (this.modules.has(moduleId));
    }
    const module = createModule(type, moduleId, this.sampleRate);
    this.modules.set(moduleId, module);
    this._processingOrder = null; // Invalidate cache
    return moduleId;
  }

  /**
   * Remove a module from the rack
   * @param {string} id - Module ID
   */
  removeModule(id) {
    const existed = this.modules.delete(id);
    // Remove any connections involving this module
    this.connections = this.connections.filter(
      c => !c.from.startsWith(id + '.') && !c.to.startsWith(id + '.')
    );
    this._processingOrder = null;
    return existed;
  }

  /**
   * Get a module by ID
   * @param {string} id - Module ID
   * @returns {Module|undefined}
   */
  getModule(id) {
    return this.modules.get(id);
  }

  /**
   * Connect two module ports
   * @param {string} from - Source port (e.g., 'osc1.audio')
   * @param {string} to - Destination port (e.g., 'filter1.audio')
   */
  connect(from, to) {
    // Validate ports exist
    const [fromId, fromPort] = from.split('.');
    const [toId, toPort] = to.split('.');

    const fromModule = this.modules.get(fromId);
    const toModule = this.modules.get(toId);

    if (!fromModule) throw new Error(`Module not found: ${fromId}`);
    if (!toModule) throw new Error(`Module not found: ${toId}`);
    if (!fromModule.outputs[fromPort]) throw new Error(`Output not found: ${from}`);
    if (!toModule.inputs[toPort]) throw new Error(`Input not found: ${to}`);

    // Reject feedback loops: the topological renderer can't schedule a cycle
    // and would hand a module a never-filled buffer, silencing the whole patch.
    if (fromId === toId) {
      throw new Error(`Cannot connect a module to itself: ${from} → ${to}`);
    }
    if (this._reaches(toId, fromId)) {
      throw new Error(`Connection would create a feedback loop: ${from} → ${to} (${toId} already feeds ${fromId})`);
    }

    // Check for duplicate connection
    const exists = this.connections.some(c => c.from === from && c.to === to);
    if (!exists) {
      this.connections.push({ from, to });
      this._processingOrder = null;
    }
  }

  /**
   * Can signal flow from startId to targetId through existing connections?
   * Used by connect() to detect cycles before they're wired up.
   * @param {string} startId
   * @param {string} targetId
   * @returns {boolean}
   */
  _reaches(startId, targetId) {
    const stack = [startId];
    const seen = new Set();
    while (stack.length) {
      const cur = stack.pop();
      if (cur === targetId) return true;
      if (seen.has(cur)) continue;
      seen.add(cur);
      for (const conn of this.connections) {
        const [fId] = conn.from.split('.');
        const [tId] = conn.to.split('.');
        if (fId === cur) stack.push(tId);
      }
    }
    return false;
  }

  /**
   * Disconnect two module ports
   * @param {string} from - Source port
   * @param {string} to - Destination port
   */
  disconnect(from, to) {
    const before = this.connections.length;
    this.connections = this.connections.filter(
      c => c.from !== from || c.to !== to
    );
    const removed = before - this.connections.length;
    if (removed > 0) this._processingOrder = null;
    return removed;
  }

  /**
   * Set the output module (final output of the rack)
   * @param {string} moduleId - Module ID
   * @param {string} [outputName='audio'] - Output port name
   */
  setOutput(moduleId, outputName = 'audio') {
    const module = this.modules.get(moduleId);
    if (!module) {
      throw new Error(`Module not found: ${moduleId}. Available: ${[...this.modules.keys()].join(', ') || '(none)'}`);
    }
    if (!module.outputs[outputName]) {
      throw new Error(`Output not found: ${moduleId}.${outputName}. Valid outputs: ${Object.keys(module.outputs).join(', ')}`);
    }
    this.outputModuleId = moduleId;
    this.outputPortName = outputName;
  }

  /**
   * Set a parameter on a module
   * @param {string} moduleId - Module ID
   * @param {string} param - Parameter name
   * @param {number} value - New value
   */
  setParam(moduleId, param, value) {
    const module = this.modules.get(moduleId);
    if (!module) {
      throw new Error(`Module not found: ${moduleId}. Available: ${[...this.modules.keys()].join(', ') || '(none)'}`);
    }
    if (!(param in module.params)) {
      throw new Error(`Unknown param "${param}" on ${moduleId} (${module.type}). Valid params: ${Object.keys(module.params).join(', ')}`);
    }
    module.setParam(param, value);
  }

  /**
   * Get a parameter from a module
   * @param {string} moduleId - Module ID
   * @param {string} param - Parameter name
   * @returns {number|undefined}
   */
  getParam(moduleId, param) {
    const module = this.modules.get(moduleId);
    return module?.getParam(param);
  }

  /**
   * Trigger a module
   * @param {string} moduleId - Module ID
   * @param {number} [velocity=1] - Trigger velocity
   */
  triggerModule(moduleId, velocity = 1) {
    const module = this.modules.get(moduleId);
    if (module) {
      module.trigger(velocity);
    }
  }

  /**
   * Release a module
   * @param {string} moduleId - Module ID
   */
  releaseModule(moduleId) {
    const module = this.modules.get(moduleId);
    if (module) {
      module.release();
    }
  }

  /**
   * Reset all modules
   */
  resetAll() {
    for (const module of this.modules.values()) {
      module.reset();
    }
  }

  /**
   * Get processing order (topological sort)
   * Ensures modules are processed in dependency order
   * @returns {string[]} Array of module IDs in processing order
   */
  _getProcessingOrder() {
    if (this._processingOrder) {
      return this._processingOrder;
    }

    const moduleIds = Array.from(this.modules.keys());
    const visited = new Set();
    const order = [];

    // Build adjacency list (module -> modules it feeds into)
    const adj = new Map();
    for (const id of moduleIds) {
      adj.set(id, []);
    }
    for (const conn of this.connections) {
      const [fromId] = conn.from.split('.');
      const [toId] = conn.to.split('.');
      adj.get(fromId).push(toId);
    }

    // DFS-based topological sort
    const visit = (id) => {
      if (visited.has(id)) return;
      visited.add(id);

      // Visit all modules this one depends on first
      for (const conn of this.connections) {
        const [, toPort] = conn.to.split('.');
        const [toId] = conn.to.split('.');
        const [fromId] = conn.from.split('.');
        if (toId === id && !visited.has(fromId)) {
          visit(fromId);
        }
      }

      order.push(id);
    };

    for (const id of moduleIds) {
      visit(id);
    }

    this._processingOrder = order;
    return order;
  }

  /**
   * Render audio from the rack
   * @param {number} bufferSize - Number of samples to render
   * @returns {Float32Array} Output buffer
   */
  render(bufferSize) {
    const order = this._getProcessingOrder();

    // Clear all input buffers
    for (const module of this.modules.values()) {
      for (const input of Object.values(module.inputs)) {
        input.buffer = null;
      }
    }

    // Process each module in order
    for (const moduleId of order) {
      const module = this.modules.get(moduleId);

      // Collect all incoming source buffers per input port
      const incoming = {}; // toPort -> [Float32Array, ...]
      for (const conn of this.connections) {
        const [toId, toPort] = conn.to.split('.');
        if (toId !== moduleId) continue;
        const [fromId, fromPort] = conn.from.split('.');
        const fromModule = this.modules.get(fromId);
        const buf = fromModule && fromModule.outputs[fromPort]
          ? fromModule.outputs[fromPort].buffer
          : null;
        if (!buf) continue;
        (incoming[toPort] || (incoming[toPort] = [])).push(buf);
      }

      // Wire inputs: a single source passes through; multiple sources into the
      // same port are summed into a fresh mix buffer (last-write-wins would
      // otherwise drop every source but the last).
      for (const toPort in incoming) {
        if (!module.inputs[toPort]) continue;
        const bufs = incoming[toPort];
        if (bufs.length === 1) {
          module.inputs[toPort].buffer = bufs[0];
        } else {
          const mix = new Float32Array(bufferSize);
          for (const b of bufs) {
            const n = Math.min(bufferSize, b.length);
            for (let i = 0; i < n; i++) mix[i] += b[i];
          }
          module.inputs[toPort].buffer = mix;
        }
      }

      // Process the module
      module.process(bufferSize);
    }

    // Return output module's buffer
    if (this.outputModuleId) {
      const outModule = this.modules.get(this.outputModuleId);
      const portName = this.outputPortName || 'audio';
      if (outModule && outModule.outputs[portName]) {
        return outModule.outputs[portName].buffer || new Float32Array(bufferSize);
      }
    }

    return new Float32Array(bufferSize);
  }

  /**
   * Serialize rack state to JSON
   * @returns {Object}
   */
  toJSON() {
    const modules = [];
    for (const [id, module] of this.modules) {
      modules.push(module.toJSON());
    }

    return {
      sampleRate: this.sampleRate,
      modules,
      connections: [...this.connections],
      output: this.outputModuleId,
      outputPort: this.outputPortName || 'audio',
    };
  }

  /**
   * Load rack state from JSON
   * @param {Object} json
   * @returns {Rack}
   */
  static fromJSON(json) {
    const rack = new Rack(json.sampleRate || 44100);

    // Add modules
    for (const modJson of json.modules || []) {
      rack.addModule(modJson.type, modJson.id);
      const module = rack.getModule(modJson.id);
      if (module) {
        module.fromJSON(modJson);
      }
    }

    // Add connections
    rack.connections = json.connections || [];
    rack._processingOrder = null;

    // Set output
    if (json.output) {
      rack.setOutput(json.output, json.outputPort || 'audio');
    }

    return rack;
  }

  /**
   * Get a human-readable description of the rack
   * @returns {string}
   */
  describe() {
    const lines = ['JP9000 RACK', '═'.repeat(40)];

    lines.push('\nMODULES:');
    for (const [id, module] of this.modules) {
      const params = Object.entries(module.params)
        .map(([k, v]) => `${k}=${v.value}${v.unit}`)
        .join(', ');
      lines.push(`  ${id} (${module.type}): ${params || 'no params'}`);
    }

    lines.push('\nCONNECTIONS:');
    if (this.connections.length === 0) {
      lines.push('  (none)');
    } else {
      for (const conn of this.connections) {
        lines.push(`  ${conn.from} → ${conn.to}`);
      }
    }

    lines.push(`\nOUTPUT: ${this.outputModuleId || '(not set)'}`);

    return lines.join('\n');
  }
}
