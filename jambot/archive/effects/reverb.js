/**
 * Plate Reverb Impulse Response Generator
 *
 * Generates a realistic plate reverb impulse response using Dattorro-style techniques.
 * Used during render to create convolution reverb effects.
 */

/**
 * Seeded pseudo-random number generator (deterministic)
 * Uses LCG (Linear Congruential Generator) for reproducible "random" values
 */
function createSeededRandom(seed = 12345) {
  let state = seed;
  return function() {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

/**
 * Generate a plate reverb impulse response
 * @param {BaseAudioContext} context - Web Audio context (Offline or realtime)
 * @param {Object} params - Reverb parameters
 * @param {number} [params.decay=2] - Tail length in seconds (0.5-10)
 * @param {number} [params.damping=0.5] - High-frequency rolloff (0-1, 0=bright, 1=dark)
 * @param {number} [params.predelay=20] - Gap before reverb in ms (0-100)
 * @param {number} [params.modulation=0.3] - Pitch wobble for shimmer (0-1)
 * @param {number} [params.lowcut=100] - Remove mud below this Hz (20-500)
 * @param {number} [params.highcut=8000] - Tame harshness above this Hz (2000-20000)
 * @param {number} [params.width=1] - Stereo spread (0-1)
 * @param {number} [params.seed=12345] - Random seed for reproducible output
 * @returns {AudioBuffer} Stereo impulse response buffer
 */
export function generatePlateReverbIR(context, params = {}) {
  const sampleRate = context.sampleRate;

  // Create seeded random for deterministic output
  const seed = params.seed ?? 12345;
  const random = createSeededRandom(seed);

  // Extract parameters with defaults
  const decay = Math.max(0.5, Math.min(10, params.decay ?? 2));        // seconds
  const damping = Math.max(0, Math.min(1, params.damping ?? 0.5));     // 0-1
  const predelayMs = Math.max(0, Math.min(100, params.predelay ?? 20)); // ms
  const modulation = Math.max(0, Math.min(1, params.modulation ?? 0.3)); // 0-1
  const lowcut = Math.max(20, Math.min(500, params.lowcut ?? 100));     // Hz
  const highcut = Math.max(2000, Math.min(20000, params.highcut ?? 8000)); // Hz
  const width = Math.max(0, Math.min(1, params.width ?? 1));           // 0-1

  // Calculate buffer length
  const predelaySamples = Math.floor((predelayMs / 1000) * sampleRate);
  const tailSamples = Math.floor(decay * sampleRate * 1.5); // Extra for natural decay
  const totalSamples = predelaySamples + tailSamples;

  const buffer = context.createBuffer(2, totalSamples, sampleRate);

  // Allpass filter coefficients for diffusion (Dattorro-style prime numbers)
  const diffusionDelays = [142, 107, 379, 277, 419, 181, 521, 233];
  const diffusionCoeff = 0.625;

  // Generate raw reverb tail for each channel
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);

    // Predelay: silence
    for (let i = 0; i < predelaySamples; i++) {
      data[i] = 0;
    }

    // Generate dense reverb tail
    const tailStart = predelaySamples;

    // Early reflections (first 50ms) - sparse, discrete
    const earlyEnd = tailStart + Math.floor(0.05 * sampleRate);
    const earlyReflections = [
      { delay: 0.007, gain: 0.8 },
      { delay: 0.011, gain: 0.7 },
      { delay: 0.019, gain: 0.6 },
      { delay: 0.027, gain: 0.5 },
      { delay: 0.031, gain: 0.45 },
      { delay: 0.041, gain: 0.35 },
    ];

    // Stereo offset for width
    const stereoPhase = ch === 0 ? 0 : Math.PI * 0.7 * width;
    const stereoMod = ch === 0 ? 1 : (1 - width * 0.5 + width * 0.5);

    for (const ref of earlyReflections) {
      const samplePos = tailStart + Math.floor(ref.delay * sampleRate);
      const stereoDelay = ch === 0 ? 0 : Math.floor(0.003 * sampleRate * width);
      if (samplePos + stereoDelay < data.length) {
        data[samplePos + stereoDelay] += ref.gain * (ch === 0 ? 1 : 0.95);
      }
    }

    // Late reverb tail - dense diffuse decay
    for (let i = earlyEnd; i < totalSamples; i++) {
      const t = (i - tailStart) / sampleRate;
      const tNorm = t / decay;

      // Base decay envelope (multi-stage for realism)
      const fastDecay = Math.exp(-4 * t / decay);
      const slowDecay = Math.exp(-2.5 * t / decay);
      const envelope = fastDecay * 0.6 + slowDecay * 0.4;

      // Damping: high frequencies decay faster over time
      // Simulate with reduced high-frequency content as time progresses
      const dampingFactor = 1 - (damping * tNorm * 0.8);

      // Generate diffuse noise with phase variation
      const phase1 = i * 0.0001 + stereoPhase;
      const phase2 = i * 0.00017 + stereoPhase * 1.3;

      // Multi-frequency noise for density (using seeded PRNG for determinism)
      let noise = 0;
      noise += (random() * 2 - 1) * 0.5;
      noise += Math.sin(i * 0.01 + ch * Math.PI) * (random() * 0.3);
      noise += Math.sin(i * 0.003 + phase1) * (random() * 0.2);

      // Modulation: subtle pitch/phase wobble
      if (modulation > 0) {
        const modFreq = 0.5 + random() * 1.5;
        const modDepth = modulation * 0.15;
        noise *= (1 + Math.sin(t * modFreq * Math.PI * 2 + ch * Math.PI * 0.5) * modDepth);
      }

      // Apply diffusion (smear the impulse)
      for (const delay of diffusionDelays) {
        const sourceIdx = i - delay;
        if (sourceIdx >= tailStart && sourceIdx < i) {
          noise += (data[sourceIdx] || 0) * diffusionCoeff * 0.1;
        }
      }

      // Combine
      data[i] = noise * envelope * dampingFactor * 0.4 * stereoMod;
    }

    // Apply filtering (lowcut and highcut simulation)
    // Simple IIR lowpass for highcut
    if (highcut < 15000) {
      const rc = 1 / (2 * Math.PI * highcut);
      const dt = 1 / sampleRate;
      const alpha = dt / (rc + dt);
      let prev = 0;
      for (let i = tailStart; i < totalSamples; i++) {
        prev = prev + alpha * (data[i] - prev);
        data[i] = prev;
      }
    }

    // Simple IIR highpass for lowcut
    if (lowcut > 30) {
      const rc = 1 / (2 * Math.PI * lowcut);
      const dt = 1 / sampleRate;
      const alpha = rc / (rc + dt);
      let prevIn = 0;
      let prevOut = 0;
      for (let i = tailStart; i < totalSamples; i++) {
        const input = data[i];
        data[i] = alpha * (prevOut + input - prevIn);
        prevIn = input;
        prevOut = data[i];
      }
    }
  }

  // Normalize to prevent clipping
  let maxAmp = 0;
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < totalSamples; i++) {
      maxAmp = Math.max(maxAmp, Math.abs(data[i]));
    }
  }
  if (maxAmp > 0.5) {
    const normFactor = 0.5 / maxAmp;
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < totalSamples; i++) {
        data[i] *= normFactor;
      }
    }
  }

  return buffer;
}
