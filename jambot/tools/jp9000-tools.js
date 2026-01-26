/**
 * JP9000 Tools (Modular Synthesizer)
 *
 * Tools for the JP9000 modular synth:
 *   - add_jp9000 (initialize with optional preset)
 *   - add_module, remove_module (module management)
 *   - connect_modules, disconnect_modules (patching)
 *   - set_jp9000_output (set rack output)
 *   - tweak_module (adjust parameters)
 *   - pluck_string (trigger Karplus-Strong)
 *   - add_jp9000_pattern, set_trigger_modules (sequencing)
 *   - show_jp9000, list_module_types (info)
 *   - save_jp9000_rig, load_jp9000_rig, list_jp9000_rigs (rig management)
 */

import { registerTools } from './index.js';
import { JP9000Node, JP9000_PRESETS } from '../instruments/jp9000-node.js';
import { MODULE_NAMES, MODULE_CATEGORIES, getModuleTypes } from '../../web/public/jp9000/dist/modules/index.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

/**
 * Get the rigs directory path, creating it if needed
 */
function getRigsDir() {
  const rigsDir = join(homedir(), 'Documents', 'Jambot', 'rigs');
  if (!existsSync(rigsDir)) {
    mkdirSync(rigsDir, { recursive: true });
  }
  return rigsDir;
}

/**
 * Sanitize a rig name for use as filename
 */
function sanitizeName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/**
 * Ensure JP9000 node exists in session
 */
function ensureJP9000(session) {
  if (!session._nodes) {
    session._nodes = {};
  }
  if (!session._nodes.jp9000) {
    session._nodes.jp9000 = new JP9000Node({ sampleRate: 44100 });
  }
  return session._nodes.jp9000;
}

const jp9000Tools = {
  /**
   * Initialize JP9000 modular synth
   */
  add_jp9000: async (input, session, context) => {
    const jp9000 = ensureJP9000(session);
    const preset = input.preset || 'empty';

    if (preset !== 'empty' && JP9000_PRESETS[preset]) {
      JP9000_PRESETS[preset](jp9000);
      return `JP9000 initialized with "${preset}" preset:\n${jp9000.describe()}`;
    }

    return `JP9000 modular synth ready. Use add_module to add modules, connect_modules to patch them.`;
  },

  /**
   * Add a module to the rack
   */
  add_module: async (input, session, context) => {
    const jp9000 = ensureJP9000(session);
    const { type, id } = input;

    if (!type) {
      return `Error: module type required. Available: ${getModuleTypes().join(', ')}`;
    }

    try {
      const moduleId = jp9000.addModule(type, id);
      const name = MODULE_NAMES[type] || type;
      return `Added ${name} as "${moduleId}"`;
    } catch (err) {
      return `Error: ${err.message}`;
    }
  },

  /**
   * Remove a module from the rack
   */
  remove_module: async (input, session, context) => {
    const jp9000 = ensureJP9000(session);
    const { id } = input;

    if (!id) {
      return `Error: module id required`;
    }

    jp9000.removeModule(id);
    return `Removed module "${id}"`;
  },

  /**
   * Connect two module ports
   */
  connect_modules: async (input, session, context) => {
    const jp9000 = ensureJP9000(session);
    const { from, to } = input;

    if (!from || !to) {
      return `Error: both "from" and "to" ports required (e.g., from: "osc1.audio", to: "filter1.audio")`;
    }

    try {
      jp9000.connect(from, to);
      return `Connected ${from} → ${to}`;
    } catch (err) {
      return `Error: ${err.message}`;
    }
  },

  /**
   * Disconnect two module ports
   */
  disconnect_modules: async (input, session, context) => {
    const jp9000 = ensureJP9000(session);
    const { from, to } = input;

    if (!from || !to) {
      return `Error: both "from" and "to" ports required`;
    }

    jp9000.disconnect(from, to);
    return `Disconnected ${from} → ${to}`;
  },

  /**
   * Set the output module
   */
  set_jp9000_output: async (input, session, context) => {
    const jp9000 = ensureJP9000(session);
    const { module, port } = input;

    if (!module) {
      return `Error: module id required`;
    }

    jp9000.setOutput(module, port || 'audio');
    return `Output set to ${module}.${port || 'audio'}`;
  },

  /**
   * Tweak a module parameter
   */
  tweak_module: async (input, session, context) => {
    const jp9000 = ensureJP9000(session);
    const { module: moduleId, param, value } = input;

    if (!moduleId || !param || value === undefined) {
      return `Error: module, param, and value required`;
    }

    jp9000.setModuleParam(moduleId, param, value);
    return `Set ${moduleId}.${param} = ${value}`;
  },

  /**
   * Pluck a string module
   */
  pluck_string: async (input, session, context) => {
    const jp9000 = ensureJP9000(session);
    const { module: moduleId, note, velocity } = input;

    if (!moduleId || !note) {
      return `Error: module and note required (e.g., module: "string1", note: "E2")`;
    }

    jp9000.pluck(moduleId, note, velocity || 1);
    return `Plucked ${moduleId} at ${note}${velocity && velocity !== 1 ? ` (velocity: ${velocity})` : ''}`;
  },

  /**
   * Set the JP9000 pattern
   */
  add_jp9000_pattern: async (input, session, context) => {
    const jp9000 = ensureJP9000(session);
    const pattern = input.pattern || [];

    // Normalize pattern to 16 steps
    const normalized = Array(16).fill(null).map((_, i) => {
      const step = pattern[i] || {};
      return {
        note: step.note || 'C2',
        gate: step.gate || false,
        accent: step.accent || false,
        velocity: step.velocity ?? 1,
      };
    });

    jp9000.setPattern(normalized);

    const activeSteps = normalized.filter(s => s.gate).length;
    return `JP9000 pattern set: ${activeSteps} notes`;
  },

  /**
   * Set which modules to trigger
   */
  set_trigger_modules: async (input, session, context) => {
    const jp9000 = ensureJP9000(session);
    const modules = input.modules || [];

    jp9000.setTriggerModules(modules);
    return `Trigger modules: ${modules.join(', ') || '(none)'}`;
  },

  /**
   * Show current JP9000 state
   */
  show_jp9000: async (input, session, context) => {
    const jp9000 = ensureJP9000(session);
    return jp9000.describe();
  },

  /**
   * List available module types
   */
  list_module_types: async (input, session, context) => {
    const lines = ['JP9000 MODULE TYPES', '═'.repeat(40)];

    for (const [category, types] of Object.entries(MODULE_CATEGORIES)) {
      lines.push(`\n${category}:`);
      for (const type of types) {
        const name = MODULE_NAMES[type] || type;
        lines.push(`  ${type} — ${name}`);
      }
    }

    return lines.join('\n');
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // RIG MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Save current JP9000 rack as a named rig
   */
  save_jp9000_rig: async (input, session, context) => {
    const jp9000 = ensureJP9000(session);
    const { name, description } = input;

    if (!name) {
      return `Error: rig name required`;
    }

    const filename = sanitizeName(name) + '.json';
    const filepath = join(getRigsDir(), filename);

    const rig = {
      name,
      description: description || '',
      savedAt: new Date().toISOString(),
      rack: jp9000.rack.toJSON(),
      triggerModules: [...jp9000._triggerModules],
    };

    try {
      writeFileSync(filepath, JSON.stringify(rig, null, 2));
      return `Saved rig "${name}" to ${filepath}`;
    } catch (err) {
      return `Error saving rig: ${err.message}`;
    }
  },

  /**
   * Load a saved JP9000 rig by name
   */
  load_jp9000_rig: async (input, session, context) => {
    const jp9000 = ensureJP9000(session);
    const { name } = input;

    if (!name) {
      return `Error: rig name required`;
    }

    const filename = sanitizeName(name) + '.json';
    const filepath = join(getRigsDir(), filename);

    if (!existsSync(filepath)) {
      // Try exact filename match
      const exactPath = join(getRigsDir(), name.endsWith('.json') ? name : name + '.json');
      if (!existsSync(exactPath)) {
        return `Error: rig "${name}" not found. Use list_jp9000_rigs to see available rigs.`;
      }
    }

    try {
      const data = JSON.parse(readFileSync(filepath, 'utf-8'));

      // Import rack state
      const { Rack } = await import('../../web/public/jp9000/dist/rack.js');
      jp9000.rack = Rack.fromJSON(data.rack);

      // Restore trigger modules
      if (data.triggerModules) {
        jp9000._triggerModules = [...data.triggerModules];
      }

      return `Loaded rig "${data.name}":\n${jp9000.describe()}`;
    } catch (err) {
      return `Error loading rig: ${err.message}`;
    }
  },

  /**
   * List all saved JP9000 rigs
   */
  list_jp9000_rigs: async (input, session, context) => {
    const rigsDir = getRigsDir();

    try {
      const files = readdirSync(rigsDir).filter(f => f.endsWith('.json'));

      if (files.length === 0) {
        return `No saved rigs found in ${rigsDir}`;
      }

      const lines = ['JP9000 SAVED RIGS', '═'.repeat(40)];

      for (const file of files) {
        try {
          const data = JSON.parse(readFileSync(join(rigsDir, file), 'utf-8'));
          const moduleCount = data.rack?.modules?.length || 0;
          const desc = data.description ? ` — ${data.description}` : '';
          lines.push(`  ${data.name} (${moduleCount} modules)${desc}`);
        } catch {
          lines.push(`  ${file} (unreadable)`);
        }
      }

      lines.push(`\nLocation: ${rigsDir}`);
      return lines.join('\n');
    } catch (err) {
      return `Error listing rigs: ${err.message}`;
    }
  },
};

// Register all tools
registerTools(jp9000Tools);

export { jp9000Tools };
