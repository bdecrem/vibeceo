/**
 * Generic Preset Loader
 *
 * Unified kit and sequence loading for all synths.
 * Kits store producer-friendly values, loader converts to engine values.
 *
 * Directory structure:
 *   presets/{synth}/kits/*.json     - Sound presets (params only)
 *   presets/{synth}/sequences/*.json - Pattern presets (notes only)
 *
 * Usage:
 *   import { listKits, loadKit, listSequences, loadSequence } from '../presets/loader.js';
 *
 *   const kits = listKits('jb200');
 *   const kit = loadKit('jb200', 'default');
 *   const sequences = listSequences('jb200');
 *   const seq = loadSequence('jb200', 'default');
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { homedir } from 'os';
import { getParamDef, toEngine } from '../params/converters.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Get paths to check for presets (bundled + user)
 */
function getPresetPaths(synth, type) {
  const bundledPath = join(__dirname, synth, type);
  const userPath = join(homedir(), 'Documents', 'Jambot', 'presets', synth, type);
  return { bundledPath, userPath };
}

/**
 * List all available kits for a synth
 * Returns: [{ id, name, description, path, source }]
 */
export function listKits(synth) {
  const { bundledPath, userPath } = getPresetPaths(synth, 'kits');
  const kits = [];

  // Bundled kits
  if (existsSync(bundledPath)) {
    const files = readdirSync(bundledPath).filter(f => f.endsWith('.json'));
    for (const file of files) {
      try {
        const data = JSON.parse(readFileSync(join(bundledPath, file), 'utf-8'));
        kits.push({
          id: file.replace('.json', ''),
          name: data.name || file.replace('.json', ''),
          description: data.description || '',
          path: join(bundledPath, file),
          source: 'bundled',
        });
      } catch (e) {
        console.error(`Failed to load kit ${file}:`, e.message);
      }
    }
  }

  // User kits (can override bundled)
  if (existsSync(userPath)) {
    const files = readdirSync(userPath).filter(f => f.endsWith('.json'));
    for (const file of files) {
      try {
        const data = JSON.parse(readFileSync(join(userPath, file), 'utf-8'));
        const id = file.replace('.json', '');
        // Remove bundled version if user has override
        const existingIdx = kits.findIndex(k => k.id === id);
        if (existingIdx >= 0) kits.splice(existingIdx, 1);
        kits.push({
          id,
          name: data.name || id,
          description: data.description || '',
          path: join(userPath, file),
          source: 'user',
        });
      } catch (e) {
        console.error(`Failed to load user kit ${file}:`, e.message);
      }
    }
  }

  return kits;
}

/**
 * Load a kit by ID
 * Returns params converted to engine values (0-1)
 */
export function loadKit(synth, kitId, voice = 'bass') {
  const kits = listKits(synth);
  const kit = kits.find(k => k.id === kitId || k.name.toLowerCase() === kitId.toLowerCase());

  if (!kit) {
    return { error: `Kit '${kitId}' not found. Available: ${kits.map(k => k.id).join(', ')}` };
  }

  try {
    const data = JSON.parse(readFileSync(kit.path, 'utf-8'));
    const engineParams = {};

    // Convert producer values to engine values
    for (const [param, value] of Object.entries(data.params || {})) {
      const def = getParamDef(synth, voice, param);
      if (def) {
        // Use converter for most params
        if (def.unit === 'semitones') {
          // Semitones pass through (engine expects semitones, not cents)
          engineParams[param] = value;
        } else if (def.unit === 'choice') {
          // Choices pass through
          engineParams[param] = value;
        } else {
          engineParams[param] = toEngine(value, def);
        }
      } else {
        // Unknown param - pass through
        engineParams[param] = value;
      }
    }

    return {
      id: kit.id,
      name: data.name,
      description: data.description,
      params: engineParams,
      source: kit.source,
    };
  } catch (e) {
    return { error: `Failed to load kit: ${e.message}` };
  }
}

/**
 * List all available sequences for a synth
 * Returns: [{ id, name, description, path, source }]
 */
export function listSequences(synth) {
  const { bundledPath, userPath } = getPresetPaths(synth, 'sequences');
  const sequences = [];

  // Bundled sequences
  if (existsSync(bundledPath)) {
    const files = readdirSync(bundledPath).filter(f => f.endsWith('.json'));
    for (const file of files) {
      try {
        const data = JSON.parse(readFileSync(join(bundledPath, file), 'utf-8'));
        sequences.push({
          id: file.replace('.json', ''),
          name: data.name || file.replace('.json', ''),
          description: data.description || '',
          path: join(bundledPath, file),
          source: 'bundled',
        });
      } catch (e) {
        console.error(`Failed to load sequence ${file}:`, e.message);
      }
    }
  }

  // User sequences
  if (existsSync(userPath)) {
    const files = readdirSync(userPath).filter(f => f.endsWith('.json'));
    for (const file of files) {
      try {
        const data = JSON.parse(readFileSync(join(userPath, file), 'utf-8'));
        const id = file.replace('.json', '');
        const existingIdx = sequences.findIndex(s => s.id === id);
        if (existingIdx >= 0) sequences.splice(existingIdx, 1);
        sequences.push({
          id,
          name: data.name || id,
          description: data.description || '',
          path: join(userPath, file),
          source: 'user',
        });
      } catch (e) {
        console.error(`Failed to load user sequence ${file}:`, e.message);
      }
    }
  }

  return sequences;
}

/**
 * Load a sequence by ID
 * Returns pattern array ready to use
 */
export function loadSequence(synth, seqId) {
  const sequences = listSequences(synth);
  const seq = sequences.find(s => s.id === seqId || s.name.toLowerCase() === seqId.toLowerCase());

  if (!seq) {
    return { error: `Sequence '${seqId}' not found. Available: ${sequences.map(s => s.id).join(', ')}` };
  }

  try {
    const data = JSON.parse(readFileSync(seq.path, 'utf-8'));

    // Normalize pattern to 16 steps
    const pattern = (data.pattern || []).slice(0, 16);
    while (pattern.length < 16) {
      pattern.push({ note: 'C2', gate: false, accent: false, slide: false });
    }

    return {
      id: seq.id,
      name: data.name,
      description: data.description,
      pattern,
      source: seq.source,
    };
  } catch (e) {
    return { error: `Failed to load sequence: ${e.message}` };
  }
}
