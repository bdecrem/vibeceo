/**
 * JB202 Noise Generator
 *
 * Deterministic PRNG-based noise for cross-platform consistency.
 * Same seed = same noise sequence, guaranteed.
 *
 * Uses Linear Congruential Generator (LCG) for speed and predictability.
 */

export class Noise {
  constructor(seed = 12345) {
    this.seed = seed;
    this.state = seed;
  }

  /**
   * Reset to initial seed or new seed
   * @param {number} [seed] - New seed (uses original if not provided)
   */
  reset(seed = null) {
    this.state = seed ?? this.seed;
  }

  /**
   * Set a new seed and reset
   * @param {number} seed
   */
  setSeed(seed) {
    this.seed = seed;
    this.state = seed;
  }

  /**
   * Generate next noise sample
   * @returns {number} White noise sample (-1 to +1)
   */
  nextSample() {
    // LCG: state = (a * state + c) mod m
    // Constants from Numerical Recipes (same as glibc)
    this.state = (this.state * 1103515245 + 12345) & 0x7fffffff;
    return (this.state / 0x3fffffff) - 1;  // Map to -1 to +1
  }

  /**
   * Generate filtered noise sample (single-pole lowpass)
   * @param {number} prevSample - Previous output sample
   * @param {number} cutoff - Filter coefficient (0-1, higher = brighter)
   * @returns {number} Filtered noise sample
   */
  nextFilteredSample(prevSample, cutoff = 0.5) {
    const newSample = this.nextSample();
    return prevSample + cutoff * (newSample - prevSample);
  }

  /**
   * Generate a single random value without advancing state
   * Useful for one-shot random values
   * @returns {number} Random value (-1 to +1)
   */
  peek() {
    const tempState = (this.state * 1103515245 + 12345) & 0x7fffffff;
    return (tempState / 0x3fffffff) - 1;
  }

  /**
   * Get current state (for save/restore)
   * @returns {number}
   */
  getState() {
    return this.state;
  }

  /**
   * Restore state (for save/restore)
   * @param {number} state
   */
  setState(state) {
    this.state = state;
  }
}

/**
 * Pre-generate a noise buffer for consistent playback
 * @param {number} samples - Number of samples to generate
 * @param {number} [seed=12345] - Random seed
 * @returns {Float32Array} Noise buffer
 */
export function generateNoiseBuffer(samples, seed = 12345) {
  const noise = new Noise(seed);
  const buffer = new Float32Array(samples);
  for (let i = 0; i < samples; i++) {
    buffer[i] = noise.nextSample();
  }
  return buffer;
}

/**
 * Create a noise generator with a specific seed
 * @param {number} [seed=12345]
 * @returns {Noise}
 */
export function createNoise(seed = 12345) {
  return new Noise(seed);
}
