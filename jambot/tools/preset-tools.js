/**
 * Preset Tools (Generic)
 *
 * Universal preset system for all instruments: save_preset, load_preset, list_presets
 * Presets are stored in ~/Documents/Jambot/presets/<instrument>/
 */

import { registerTools } from './index.js';
import { homedir } from 'os';
import { join } from 'path';
import { existsSync, readdirSync, mkdirSync, readFileSync, writeFileSync } from 'fs';

// Valid instruments
const INSTRUMENTS = ['drums', 'bass', 'lead', 'sampler'];

// Base path for user presets
const PRESETS_PATH = join(homedir(), 'Documents', 'Jambot', 'presets');

/**
 * Ensure preset directory exists for an instrument
 */
function ensurePresetDir(instrument) {
  const dir = join(PRESETS_PATH, instrument);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Get user presets for an instrument
 * @param {string} instrument
 * @returns {Array}
 */
function getUserPresets(instrument) {
  const dir = ensurePresetDir(instrument);
  const presets = [];
  try {
    const files = readdirSync(dir).filter(f => f.endsWith('.json'));
    for (const file of files) {
      try {
        const content = readFileSync(join(dir, file), 'utf-8');
        const preset = JSON.parse(content);
        presets.push(preset);
      } catch (e) {
        // Skip invalid files
      }
    }
  } catch (e) {
    // Directory doesn't exist or can't be read
  }
  return presets;
}

/**
 * Extract current params from session for an instrument
 * @param {string} instrument
 * @param {Object} session
 * @returns {Object}
 */
function extractParams(instrument, session) {
  switch (instrument) {
    case 'drums':
      return {
        kit: session.drumKit,
        params: JSON.parse(JSON.stringify(session.drumParams || {})),
        engines: JSON.parse(JSON.stringify(session.drumVoiceEngines || {})),
        useSample: JSON.parse(JSON.stringify(session.drumUseSample || {})),
      };
    case 'bass':
      return {
        params: JSON.parse(JSON.stringify(session.bassParams || {})),
      };
    case 'lead':
      return {
        preset: session.leadPreset,
        params: JSON.parse(JSON.stringify(session.leadParams || {})),
        arp: JSON.parse(JSON.stringify(session.leadArp || {})),
      };
    case 'sampler':
      return {
        kit: session.samplerKit?.id || null,
        params: JSON.parse(JSON.stringify(session.samplerParams || {})),
      };
    default:
      return {};
  }
}

/**
 * Apply preset params to session
 * @param {string} instrument
 * @param {Object} preset
 * @param {Object} session
 */
function applyParams(instrument, preset, session) {
  switch (instrument) {
    case 'drums':
      if (preset.kit) session.drumKit = preset.kit;
      if (preset.params) {
        for (const [voice, params] of Object.entries(preset.params)) {
          session.drumParams[voice] = { ...params };
        }
      }
      if (preset.engines) session.drumVoiceEngines = { ...preset.engines };
      if (preset.useSample) session.drumUseSample = { ...preset.useSample };
      break;
    case 'bass':
      if (preset.params) {
        session.bassParams = { ...session.bassParams, ...preset.params };
      }
      break;
    case 'lead':
      if (preset.preset) session.leadPreset = preset.preset;
      if (preset.params) {
        session.leadParams = { ...session.leadParams, ...preset.params };
      }
      if (preset.arp) session.leadArp = { ...preset.arp };
      break;
    case 'sampler':
      // Note: kit must be loaded separately (contains audio buffers)
      if (preset.params) {
        for (const [slot, params] of Object.entries(preset.params)) {
          session.samplerParams[slot] = { ...params };
        }
      }
      break;
  }
}

/**
 * Format preset for display
 */
function formatPreset(preset) {
  const desc = preset.description ? `: ${preset.description}` : '';
  return `  ${preset.id} - ${preset.name}${desc}`;
}

const presetTools = {
  /**
   * Save current instrument settings as a user preset
   */
  save_preset: async (input, session, context) => {
    const { instrument, id, name, description } = input;

    if (!instrument || !INSTRUMENTS.includes(instrument)) {
      return `Error: instrument required. Valid: ${INSTRUMENTS.join(', ')}`;
    }
    if (!id) {
      return 'Error: id required (e.g., "my-deep-kick")';
    }
    if (!name) {
      return 'Error: name required (e.g., "My Deep Kick")';
    }

    const dir = ensurePresetDir(instrument);

    // Build preset from current session state
    const preset = {
      id,
      name,
      description: description || `User preset: ${name}`,
      instrument,
      ...extractParams(instrument, session),
    };

    // Save to file
    const filePath = join(dir, `${id}.json`);
    const exists = existsSync(filePath);
    writeFileSync(filePath, JSON.stringify(preset, null, 2));

    const action = exists ? 'Updated' : 'Saved';
    return `${action} ${instrument} preset "${name}" (${id})\nLocation: ${filePath}`;
  },

  /**
   * Load a user preset for an instrument
   */
  load_preset: async (input, session, context) => {
    const { instrument, id } = input;

    if (!instrument || !INSTRUMENTS.includes(instrument)) {
      return `Error: instrument required. Valid: ${INSTRUMENTS.join(', ')}`;
    }
    if (!id) {
      return 'Error: id required';
    }

    const dir = join(PRESETS_PATH, instrument);
    const filePath = join(dir, `${id}.json`);

    if (!existsSync(filePath)) {
      const available = getUserPresets(instrument).map(p => p.id);
      if (available.length === 0) {
        return `No presets found for ${instrument}. Use save_preset to create one.`;
      }
      return `Preset "${id}" not found for ${instrument}. Available: ${available.join(', ')}`;
    }

    try {
      const content = readFileSync(filePath, 'utf-8');
      const preset = JSON.parse(content);
      applyParams(instrument, preset, session);

      // Build summary of what was applied
      let summary = `Loaded ${instrument} preset "${preset.name}"`;
      if (instrument === 'drums' && preset.kit) {
        summary += ` (kit: ${preset.kit})`;
      }
      if (instrument === 'sampler' && preset.kit) {
        summary += `\nNote: Sampler kit "${preset.kit}" must be loaded separately with load_kit.`;
      }
      return summary;
    } catch (e) {
      return `Error loading preset: ${e.message}`;
    }
  },

  /**
   * List available presets for an instrument (or all instruments)
   */
  list_presets: async (input, session, context) => {
    const { instrument } = input;

    if (instrument && !INSTRUMENTS.includes(instrument)) {
      return `Error: invalid instrument. Valid: ${INSTRUMENTS.join(', ')}`;
    }

    const instruments = instrument ? [instrument] : INSTRUMENTS;
    const lines = ['User Presets:', ''];

    let totalCount = 0;
    for (const inst of instruments) {
      const presets = getUserPresets(inst);
      if (presets.length > 0) {
        lines.push(`${inst.toUpperCase()}:`);
        presets.forEach(p => lines.push(formatPreset(p)));
        lines.push('');
        totalCount += presets.length;
      }
    }

    if (totalCount === 0) {
      lines.push('No user presets found.');
      lines.push('');
      lines.push('Use save_preset to create one:');
      lines.push('  save_preset({ instrument: "drums", id: "my-kit", name: "My Kit" })');
    }

    lines.push(`Presets folder: ${PRESETS_PATH}`);
    return lines.join('\n');
  },
};

registerTools(presetTools);
