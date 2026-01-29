/**
 * Jambot Kit Loader - Loads sample kits for R9DS sampler
 *
 * Kit locations (checked in order):
 * 1. Bundled: ./samples/
 * 2. User: ~/Documents/Jambot/kits/
 */

import { readFileSync, existsSync, readdirSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Kit paths
const BUNDLED_KITS_PATH = join(__dirname, 'samples');
const USER_KITS_PATH = join(homedir(), 'Documents', 'Jambot', 'kits');

/**
 * Get paths for kit directories
 * @returns {{ bundled: string, user: string }}
 */
export function getKitPaths() {
  return {
    bundled: BUNDLED_KITS_PATH,
    user: USER_KITS_PATH,
  };
}

/**
 * Ensure user kits directory exists
 */
export function ensureUserKitsDir() {
  if (!existsSync(USER_KITS_PATH)) {
    mkdirSync(USER_KITS_PATH, { recursive: true });
  }
}

/**
 * Scan a directory for kit folders
 * @param {string} basePath
 * @param {string} source - 'bundled' or 'user'
 * @returns {Array<{ id: string, name: string, path: string, source: string }>}
 */
function scanKitsDir(basePath, source) {
  const kits = [];

  if (!existsSync(basePath)) {
    return kits;
  }

  const entries = readdirSync(basePath, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const kitPath = join(basePath, entry.name);
      const kitJsonPath = join(kitPath, 'kit.json');

      if (existsSync(kitJsonPath)) {
        try {
          const kitJson = JSON.parse(readFileSync(kitJsonPath, 'utf8'));
          kits.push({
            id: entry.name,
            name: kitJson.name || entry.name,
            path: kitPath,
            source,
          });
        } catch {
          // Invalid kit.json, skip
        }
      }
    }
  }

  return kits;
}

/**
 * Get all available kits (bundled + user)
 * @returns {Array<{ id: string, name: string, path: string, source: string }>}
 */
export function getAvailableKits() {
  const bundled = scanKitsDir(BUNDLED_KITS_PATH, 'bundled');
  const user = scanKitsDir(USER_KITS_PATH, 'user');

  // User kits override bundled if same ID
  const kitMap = new Map();
  for (const kit of bundled) {
    kitMap.set(kit.id, kit);
  }
  for (const kit of user) {
    kitMap.set(kit.id, kit);
  }

  return Array.from(kitMap.values());
}

/**
 * Load a kit by ID
 * @param {string} kitId
 * @returns {{ id: string, name: string, slots: Array<{ id: string, name: string, short: string, buffer: Buffer }> }}
 */
export function loadKit(kitId) {
  const kits = getAvailableKits();
  const kitInfo = kits.find(k => k.id === kitId);

  if (!kitInfo) {
    throw new Error(`Kit not found: ${kitId}. Available: ${kits.map(k => k.id).join(', ')}`);
  }

  const kitJsonPath = join(kitInfo.path, 'kit.json');
  const kitJson = JSON.parse(readFileSync(kitJsonPath, 'utf8'));

  const samplesPath = join(kitInfo.path, 'samples');
  const slots = [];

  for (const slotDef of kitJson.slots) {
    const samplePath = join(samplesPath, `${slotDef.id}.wav`);

    let buffer = null;
    if (existsSync(samplePath)) {
      buffer = readFileSync(samplePath);
    }

    slots.push({
      id: slotDef.id,
      name: slotDef.name,
      short: slotDef.short || slotDef.name.slice(0, 2).toUpperCase(),
      buffer,
    });
  }

  return {
    id: kitId,
    name: kitJson.name,
    slots,
  };
}
