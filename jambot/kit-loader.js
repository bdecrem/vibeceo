/**
 * Kit Loader — Node.js implementation for JB-S sampler
 *
 * Discovers and loads sample kits from:
 *   1. Bundled: ./samples/*/kit.json
 *   2. User:    ~/Documents/Jambot/kits/*/kit.json
 *
 * Returns raw Uint8Array WAV bytes per slot (the engine's renderPattern
 * calls decodeAudioData on these buffers).
 */

import { readFileSync, readdirSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BUNDLED_DIR = join(__dirname, 'samples');
const USER_DIR = join(homedir(), 'Documents', 'Jambot', 'kits');

/**
 * Get paths for both kit directories
 * @returns {{ bundled: string, user: string }}
 */
export function getKitPaths() {
  return { bundled: BUNDLED_DIR, user: USER_DIR };
}

/**
 * Ensure user kits directory exists
 */
export function ensureUserKitsDir() {
  if (!existsSync(USER_DIR)) {
    mkdirSync(USER_DIR, { recursive: true });
  }
}

/**
 * Scan a directory for kit folders (each must contain kit.json)
 * @param {string} dir - Directory to scan
 * @param {string} source - Source label ('bundled' or 'user')
 * @returns {Array<{id: string, name: string, path: string, source: string}>}
 */
function scanKitDir(dir, source) {
  if (!existsSync(dir)) return [];

  const kits = [];
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const kitJsonPath = join(dir, entry.name, 'kit.json');
      if (!existsSync(kitJsonPath)) continue;

      try {
        const meta = JSON.parse(readFileSync(kitJsonPath, 'utf-8'));
        kits.push({
          id: entry.name,
          name: meta.name || entry.name,
          path: join(dir, entry.name),
          source,
        });
      } catch {
        // Skip kits with invalid kit.json
      }
    }
  } catch {
    // Directory not readable
  }
  return kits;
}

/**
 * Get all available kits (bundled + user)
 * User kits override bundled kits with the same ID.
 * @returns {Array<{id: string, name: string, path: string, source: string}>}
 */
export function getAvailableKits() {
  const bundled = scanKitDir(BUNDLED_DIR, 'bundled');
  const user = scanKitDir(USER_DIR, 'user');

  // User kits override bundled by ID
  const byId = new Map();
  for (const kit of bundled) byId.set(kit.id, kit);
  for (const kit of user) byId.set(kit.id, kit);

  return Array.from(byId.values());
}

/**
 * Load a kit by ID — reads kit.json and all WAV sample files
 * @param {string} kitId - Kit ID (folder name)
 * @returns {{ id: string, name: string, slots: Array<{id: string, name: string, short: string, buffer: Uint8Array}> }}
 */
export function loadKit(kitId) {
  const kits = getAvailableKits();
  const kitInfo = kits.find(k => k.id === kitId);

  if (!kitInfo) {
    const available = kits.map(k => k.id).join(', ');
    throw new Error(`Unknown kit: ${kitId}. Available: ${available || 'none'}`);
  }

  const metaPath = join(kitInfo.path, 'kit.json');
  const meta = JSON.parse(readFileSync(metaPath, 'utf-8'));

  const slots = meta.slots.map(slot => {
    const wavPath = join(kitInfo.path, 'samples', `${slot.id}.wav`);
    let buffer = null;

    if (existsSync(wavPath)) {
      buffer = new Uint8Array(readFileSync(wavPath));
    } else {
      console.warn(`Kit ${kitId}: missing sample ${slot.id}.wav`);
    }

    return {
      id: slot.id,
      name: slot.name,
      short: slot.short,
      buffer,
    };
  });

  return {
    id: kitInfo.id,
    name: meta.name,
    slots,
  };
}
