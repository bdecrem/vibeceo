/**
 * JT90 Noise Generator
 *
 * Deterministic LFSR-based noise for cross-platform consistency.
 * Same seed = same noise sequence.
 */

export class Noise {
  constructor(seed = 12345) {
    this.seed = seed;
    this.state = seed;
  }

  reset(seed = null) {
    this.state = seed ?? this.seed;
  }

  /**
   * Generate next noise sample (-1 to 1)
   * Uses Linear Congruential Generator for speed and determinism
   */
  nextSample() {
    // LCG: state = (a * state + c) mod m
    this.state = (this.state * 1103515245 + 12345) & 0x7fffffff;
    return (this.state / 0x3fffffff) - 1;  // Map to -1 to 1
  }

  /**
   * Generate filtered noise sample (lowpass approximation)
   */
  nextFilteredSample(prevSample, cutoff = 0.5) {
    const newSample = this.nextSample();
    return prevSample + cutoff * (newSample - prevSample);
  }
}

/**
 * Pre-generate a noise buffer for consistent playback
 */
export function generateNoiseBuffer(samples, seed = 12345) {
  const noise = new Noise(seed);
  const buffer = new Float32Array(samples);
  for (let i = 0; i < samples; i++) {
    buffer[i] = noise.nextSample();
  }
  return buffer;
}

export default Noise;
