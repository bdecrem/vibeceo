/**
 * KitLoader - Loads sample kits from folders
 *
 * Kit structure:
 * /kits/
 *   index.json - list of available kits
 *   808/
 *     kit.json - metadata (name, slot names)
 *     samples/s1.wav, s2.wav, ... s10.wav
 *
 * To add a new kit:
 * 1. Create folder: /90s/kits/mykit/
 * 2. Add kit.json with name and slots
 * 3. Add samples/s1.wav through s10.wav
 * 4. Add entry to /90s/kits/index.json
 */

// Fallback kits if index.json fails to load
const FALLBACK_KITS = [
  { id: 'bartdekit', name: 'Bart DeKit', path: '/90s/kits/bartdekit' },
  { id: '909kicks', name: '909 Kicks', path: '/90s/kits/909kicks' },
  { id: 'amber', name: 'Amber Kit', path: '/90s/kits/amber' },
  { id: '808', name: '808 Kit', path: '/90s/kits/808' }
];

// Cache for the kit manifest
let cachedKitList = null;

/**
 * Fetch available kits from index.json
 */
export async function getAvailableKits() {
  if (cachedKitList) {
    return cachedKitList;
  }

  try {
    const response = await fetch('/90s/kits/index.json?v=' + Date.now());
    if (response.ok) {
      const data = await response.json();
      cachedKitList = data.kits || FALLBACK_KITS;
      return cachedKitList;
    }
  } catch (e) {
    console.warn('Failed to load kits index, using fallback:', e);
  }

  cachedKitList = FALLBACK_KITS;
  return cachedKitList;
}

// For synchronous access (after first load)
export const AVAILABLE_KITS = FALLBACK_KITS;

export class KitLoader {
  constructor(context) {
    this.context = context;
    this.cache = new Map(); // Cache loaded buffers
    this.kitsLoaded = false;
    this.availableKits = FALLBACK_KITS;
  }

  /**
   * Initialize - load the kits manifest
   */
  async init() {
    if (!this.kitsLoaded) {
      this.availableKits = await getAvailableKits();
      this.kitsLoaded = true;
    }
    return this.availableKits;
  }

  /**
   * Get list of available kits
   */
  async getAvailableKits() {
    await this.init();
    return this.availableKits;
  }

  /**
   * Load a kit by ID
   * Returns: { name, slots: [{ id, name, short, buffer }] }
   */
  async loadKit(kitId) {
    await this.init();

    const kitInfo = this.availableKits.find(k => k.id === kitId);
    if (!kitInfo) {
      throw new Error(`Unknown kit: ${kitId}. Available: ${this.availableKits.map(k => k.id).join(', ')}`);
    }

    return this.loadKitFromPath(kitInfo.path);
  }

  /**
   * Load a kit from a path
   */
  async loadKitFromPath(basePath) {
    // Load kit.json
    const metaResponse = await fetch(`${basePath}/kit.json?v=` + Date.now());
    if (!metaResponse.ok) {
      throw new Error(`Failed to load kit.json from ${basePath}`);
    }
    const meta = await metaResponse.json();

    // Load samples for each slot
    const slots = await Promise.all(
      meta.slots.map(async (slot) => {
        const buffer = await this.loadSample(`${basePath}/samples/${slot.id}.wav`);
        return {
          id: slot.id,
          name: slot.name,
          short: slot.short,
          buffer
        };
      })
    );

    return {
      name: meta.name,
      slots
    };
  }

  /**
   * Load a single sample file
   */
  async loadSample(url) {
    // Check cache
    if (this.cache.has(url)) {
      return this.cache.get(url);
    }

    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`Sample not found: ${url}`);
        return null;
      }

      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.context.decodeAudioData(arrayBuffer);

      // Cache it
      this.cache.set(url, audioBuffer);

      return audioBuffer;
    } catch (e) {
      console.warn(`Failed to load sample ${url}:`, e);
      return null;
    }
  }

  /**
   * Clear the sample cache
   */
  clearCache() {
    this.cache.clear();
  }
}

export default KitLoader;
