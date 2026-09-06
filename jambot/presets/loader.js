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

// Path to the library presets (web/public/{synth}/dist/presets.json)
const LIBRARY_PRESETS_PATH = join(__dirname, '..', '..', 'web', 'public');

/**
 * Load library presets from web/public/{synth}/dist/presets.json
 * These are the canonical presets shared with the web UI.
 * Values are already in engine units (0-1).
 */
function loadLibraryPresets(synth) {
  const libraryPath = join(LIBRARY_PRESETS_PATH, synth, 'dist', 'presets.json');
  if (!existsSync(libraryPath)) {
    return [];
  }

  try {
    const data = JSON.parse(readFileSync(libraryPath, 'utf-8'));
    return (data.presets || []).map(preset => ({
      id: preset.id,
      name: preset.name,
      description: preset.description || '',
      params: preset.params,  // Already in engine units
      source: 'library',
      isEngineUnits: true,    // Flag to skip conversion
    }));
  } catch (e) {
    console.error(`Failed to load library presets for ${synth}:`, e.message);
    return [];
  }
}

/**
 * Load library sequences from web/public/{synth}/dist/sequences.json
 * These are the canonical sequences shared with the web UI.
 */
function loadLibrarySequences(synth) {
  const libraryPath = join(LIBRARY_PRESETS_PATH, synth, 'dist', 'sequences.json');
  if (!existsSync(libraryPath)) {
    return [];
  }

  try {
    const data = JSON.parse(readFileSync(libraryPath, 'utf-8'));
    return (data.sequences || []).map(seq => ({
      id: seq.id,
      name: seq.name,
      description: seq.description || '',
      pattern: seq.pattern,
      source: 'library',
    }));
  } catch (e) {
    console.error(`Failed to load library sequences for ${synth}:`, e.message);
    return [];
  }
}

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
 *
 * Priority order (later sources can override earlier):
 * 1. Library presets (web/public/{synth}/dist/presets.json) - canonical, shared with web UI
 * 2. Bundled kits (presets/{synth}/kits/*.json) - legacy/additional
 * 3. User kits (~/Documents/Jambot/presets/{synth}/kits/*.json) - user overrides
 */
export function listKits(synth) {
  const { bundledPath, userPath } = getPresetPaths(synth, 'kits');
  const kits = [];

  // 1. Library presets (canonical - shared with web UI)
  const libraryPresets = loadLibraryPresets(synth);
  for (const preset of libraryPresets) {
    kits.push({
      id: preset.id,
      name: preset.name,
      description: preset.description,
      source: 'library',
      isEngineUnits: true,
      params: preset.params,  // Cache for direct loading
    });
  }

  // 2. Bundled kits (legacy)
  if (existsSync(bundledPath)) {
    const files = readdirSync(bundledPath).filter(f => f.endsWith('.json'));
    for (const file of files) {
      try {
        const data = JSON.parse(readFileSync(join(bundledPath, file), 'utf-8'));
        const id = file.replace('.json', '');
        // Skip if already in library presets
        if (kits.find(k => k.id === id)) continue;
        kits.push({
          id,
          name: data.name || id,
          description: data.description || '',
          path: join(bundledPath, file),
          source: 'bundled',
        });
      } catch (e) {
        console.error(`Failed to load kit ${file}:`, e.message);
      }
    }
  }

  // 3. User kits (can override everything)
  if (existsSync(userPath)) {
    const files = readdirSync(userPath).filter(f => f.endsWith('.json'));
    for (const file of files) {
      try {
        const data = JSON.parse(readFileSync(join(userPath, file), 'utf-8'));
        const id = file.replace('.json', '');
        // Remove any version if user has override
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
 *
 * Library presets are already in engine units, bundled/user kits need conversion.
 */
export function loadKit(synth, kitId, voice = 'bass') {
  const kits = listKits(synth);
  const kit = kits.find(k => k.id === kitId || k.name.toLowerCase() === kitId.toLowerCase());

  if (!kit) {
    return { error: `Kit '${kitId}' not found. Available: ${kits.map(k => k.id).join(', ')}` };
  }

  // Library presets: already in engine units, cached in listKits
  if (kit.source === 'library' && kit.params) {
    return {
      id: kit.id,
      name: kit.name,
      description: kit.description,
      params: { ...kit.params },  // Copy to prevent mutation
      source: kit.source,
    };
  }

  // Bundled/user kits: load from file and convert
  try {
    const data = JSON.parse(readFileSync(kit.path, 'utf-8'));
    const rawParams = data.params || {};

    // Drum-machine kits are nested per voice:
    //   { params: { kick: { level, tune, decay }, snare: {...}, ... } }
    // Before this branch existed the flat loop below treated each voice object
    // as one "unknown param" and passed it through — load_jb01_kit then wrote
    // 64 object-valued keys (kick.kick, kick.snare, ...) into the node and
    // applied none of the kit. Convert voice by voice, keep only descriptor-
    // backed numeric values, and report what was skipped.
    const isNested = Object.values(rawParams).some(v => v && typeof v === 'object' && !Array.isArray(v));
    if (isNested) {
      const convertVoice = (voiceName, src) => {
        const out = {};
        const skipped = [];
        for (const [param, value] of Object.entries(src || {})) {
          const def = getParamDef(synth, voiceName, param);
          if (!def) { skipped.push(`${voiceName}.${param}`); continue; }
          if (def.unit === 'choice') { out[param] = value; continue; }
          if (typeof value !== 'number' || !Number.isFinite(value)) { skipped.push(`${voiceName}.${param}`); continue; }
          // toEngine handles every unit, semitones included: drum voices pitch
          // in cents (JB01/JT90 voices do 2^(tune/1200)), matching tweak_jb01.
          out[param] = toEngine(value, def);
        }
        return { out, skipped };
      };

      // Caller asked for one voice (legacy per-voice call shape)
      if (voice && rawParams[voice] && typeof rawParams[voice] === 'object') {
        const { out, skipped } = convertVoice(voice, rawParams[voice]);
        return {
          id: kit.id,
          name: data.name,
          description: data.description,
          voice,
          params: out,
          skipped,
          source: kit.source,
        };
      }

      const params = {};
      const skipped = [];
      for (const [voiceName, src] of Object.entries(rawParams)) {
        if (!src || typeof src !== 'object' || Array.isArray(src)) { skipped.push(voiceName); continue; }
        const r = convertVoice(voiceName, src);
        skipped.push(...r.skipped);
        if (Object.keys(r.out).length > 0) params[voiceName] = r.out;
        else if (Object.keys(src).length > 0) skipped.push(voiceName);
      }
      return {
        id: kit.id,
        name: data.name,
        description: data.description,
        nested: true,
        params,
        skipped,
        source: kit.source,
      };
    }

    const engineParams = {};

    // Convert producer values to engine values
    for (const [param, value] of Object.entries(rawParams)) {
      const def = getParamDef(synth, voice, param);
      if (def) {
        // Use converter for most params
        if (def.unit === 'choice') {
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
 *
 * Priority order (later sources can override earlier):
 * 1. Library sequences (web/public/{synth}/dist/sequences.json) - canonical, shared with web UI
 * 2. Bundled sequences (presets/{synth}/sequences/*.json) - legacy/additional
 * 3. User sequences (~/Documents/Jambot/presets/{synth}/sequences/*.json) - user overrides
 */
export function listSequences(synth) {
  const { bundledPath, userPath } = getPresetPaths(synth, 'sequences');
  const sequences = [];

  // 1. Library sequences (canonical - shared with web UI)
  const librarySequences = loadLibrarySequences(synth);
  for (const seq of librarySequences) {
    sequences.push({
      id: seq.id,
      name: seq.name,
      description: seq.description,
      source: 'library',
      pattern: seq.pattern,  // Cache for direct loading
    });
  }

  // 2. Bundled sequences (legacy)
  if (existsSync(bundledPath)) {
    const files = readdirSync(bundledPath).filter(f => f.endsWith('.json'));
    for (const file of files) {
      try {
        const data = JSON.parse(readFileSync(join(bundledPath, file), 'utf-8'));
        const id = file.replace('.json', '');
        // Skip if already in library sequences
        if (sequences.find(s => s.id === id)) continue;
        sequences.push({
          id,
          name: data.name || id,
          description: data.description || '',
          path: join(bundledPath, file),
          source: 'bundled',
        });
      } catch (e) {
        console.error(`Failed to load sequence ${file}:`, e.message);
      }
    }
  }

  // 3. User sequences (can override everything)
  if (existsSync(userPath)) {
    const files = readdirSync(userPath).filter(f => f.endsWith('.json'));
    for (const file of files) {
      try {
        const data = JSON.parse(readFileSync(join(userPath, file), 'utf-8'));
        const id = file.replace('.json', '');
        // Remove any version if user has override
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
 * Returns pattern (array for melodic synths, object for drum machines)
 */
export function loadSequence(synth, seqId) {
  const sequences = listSequences(synth);
  const seq = sequences.find(s => s.id === seqId || s.name.toLowerCase() === seqId.toLowerCase());

  if (!seq) {
    return { error: `Sequence '${seqId}' not found. Available: ${sequences.map(s => s.id).join(', ')}` };
  }

  // Library sequences: pattern already cached in listSequences
  if (seq.source === 'library' && seq.pattern) {
    let pattern = seq.pattern;

    // Normalize melodic patterns to 16 steps
    if (Array.isArray(pattern)) {
      pattern = pattern.slice(0, 16);
      while (pattern.length < 16) {
        pattern.push({ note: 'C2', gate: false, accent: false, slide: false });
      }
    }

    return {
      id: seq.id,
      name: seq.name,
      description: seq.description,
      pattern,
      source: seq.source,
    };
  }

  // Bundled/user sequences: load from file
  try {
    const data = JSON.parse(readFileSync(seq.path, 'utf-8'));

    // Handle different pattern formats:
    // - JB01/drums: object { kick: [...], snare: [...], ... }
    // - JB200/melodic: array [{ note, gate, accent, slide }, ...]
    let pattern = data.pattern;

    if (Array.isArray(pattern)) {
      // Melodic synth: normalize to 16 steps
      pattern = pattern.slice(0, 16);
      while (pattern.length < 16) {
        pattern.push({ note: 'C2', gate: false, accent: false, slide: false });
      }
    }
    // For drum patterns (objects), pass through as-is

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
