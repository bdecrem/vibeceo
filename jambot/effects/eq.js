/**
 * EQ DSP Processing
 *
 * 4-band parametric EQ using biquad filters:
 *   1. Highpass (removes sub-bass rumble)
 *   2. Low shelf (boost/cut lows)
 *   3. Parametric mid (boost/cut at target frequency with Q)
 *   4. High shelf (boost/cut highs)
 *
 * Each band is a Direct Form II Transposed biquad.
 * Processes stereo buffers (each channel independently).
 */

/**
 * Compute biquad coefficients for various filter types
 * Returns { b0, b1, b2, a1, a2 } (a0 already normalized out)
 */
function highpassCoeffs(freq, q, sampleRate) {
  const w0 = (2 * Math.PI * freq) / sampleRate;
  const cosW0 = Math.cos(w0);
  const sinW0 = Math.sin(w0);
  const alpha = sinW0 / (2 * q);
  const a0 = 1 + alpha;

  return {
    b0: ((1 + cosW0) / 2) / a0,
    b1: (-(1 + cosW0)) / a0,
    b2: ((1 + cosW0) / 2) / a0,
    a1: (-2 * cosW0) / a0,
    a2: (1 - alpha) / a0,
  };
}

function lowShelfCoeffs(freq, gainDb, sampleRate) {
  const A = Math.pow(10, gainDb / 40);
  const w0 = (2 * Math.PI * freq) / sampleRate;
  const cosW0 = Math.cos(w0);
  const sinW0 = Math.sin(w0);
  const alpha = (sinW0 / 2) * Math.sqrt((A + 1 / A) * (1 / 0.707 - 1) + 2);
  const sqrtA2alpha = 2 * Math.sqrt(A) * alpha;
  const a0 = (A + 1) + (A - 1) * cosW0 + sqrtA2alpha;

  return {
    b0: (A * ((A + 1) - (A - 1) * cosW0 + sqrtA2alpha)) / a0,
    b1: (2 * A * ((A - 1) - (A + 1) * cosW0)) / a0,
    b2: (A * ((A + 1) - (A - 1) * cosW0 - sqrtA2alpha)) / a0,
    a1: (-2 * ((A - 1) + (A + 1) * cosW0)) / a0,
    a2: ((A + 1) + (A - 1) * cosW0 - sqrtA2alpha) / a0,
  };
}

function peakingCoeffs(freq, gainDb, q, sampleRate) {
  const A = Math.pow(10, gainDb / 40);
  const w0 = (2 * Math.PI * freq) / sampleRate;
  const cosW0 = Math.cos(w0);
  const sinW0 = Math.sin(w0);
  const alpha = sinW0 / (2 * q);
  const a0 = 1 + alpha / A;

  return {
    b0: (1 + alpha * A) / a0,
    b1: (-2 * cosW0) / a0,
    b2: (1 - alpha * A) / a0,
    a1: (-2 * cosW0) / a0,
    a2: (1 - alpha / A) / a0,
  };
}

function highShelfCoeffs(freq, gainDb, sampleRate) {
  const A = Math.pow(10, gainDb / 40);
  const w0 = (2 * Math.PI * freq) / sampleRate;
  const cosW0 = Math.cos(w0);
  const sinW0 = Math.sin(w0);
  const alpha = (sinW0 / 2) * Math.sqrt((A + 1 / A) * (1 / 0.707 - 1) + 2);
  const sqrtA2alpha = 2 * Math.sqrt(A) * alpha;
  const a0 = (A + 1) - (A - 1) * cosW0 + sqrtA2alpha;

  return {
    b0: (A * ((A + 1) + (A - 1) * cosW0 + sqrtA2alpha)) / a0,
    b1: (-2 * A * ((A - 1) + (A + 1) * cosW0)) / a0,
    b2: (A * ((A + 1) + (A - 1) * cosW0 - sqrtA2alpha)) / a0,
    a1: (2 * ((A - 1) - (A + 1) * cosW0)) / a0,
    a2: ((A + 1) - (A - 1) * cosW0 - sqrtA2alpha) / a0,
  };
}

/**
 * Apply a biquad filter to a buffer in-place (Direct Form II Transposed)
 */
function applyBiquad(data, length, coeffs) {
  const { b0, b1, b2, a1, a2 } = coeffs;
  let z1 = 0, z2 = 0;

  for (let i = 0; i < length; i++) {
    const input = data[i];
    const output = b0 * input + z1;
    z1 = b1 * input - a1 * output + z2;
    z2 = b2 * input - a2 * output;
    data[i] = output;
  }
}

/**
 * Process audio through parametric EQ
 * @param {Object} inputBuffer - Audio buffer with getChannelData()
 * @param {Object} params - EQ parameters from EQNode
 * @param {number} params.highpass - Highpass frequency in Hz (20-2000)
 * @param {number} params.lowGain - Low shelf gain in dB (-12 to +12)
 * @param {number} params.midFreq - Mid peak frequency in Hz (100-10000)
 * @param {number} params.midGain - Mid peak gain in dB (-12 to +12)
 * @param {number} params.midQ - Mid peak Q (0.1-10)
 * @param {number} params.highGain - High shelf gain in dB (-12 to +12)
 * @param {number} sampleRate - Audio sample rate
 * @returns {Object} Processed buffer
 */
export function processEq(inputBuffer, params, sampleRate) {
  const {
    highpass = 30,
    lowGain = 0,
    midFreq = 1000,
    midGain = 0,
    midQ = 1,
    highGain = 0,
  } = params;

  const numChannels = inputBuffer.numberOfChannels || 1;
  const length = inputBuffer.length;

  // Build output buffer
  const outputChannels = [];
  for (let ch = 0; ch < Math.max(numChannels, 2); ch++) {
    const src = inputBuffer.getChannelData(ch % numChannels);
    const out = new Float32Array(length);
    out.set(src);
    outputChannels.push(out);
  }

  // Compute coefficients for each active band
  const bands = [];

  // Band 1: Highpass (always active if > 20Hz)
  if (highpass > 20) {
    bands.push(highpassCoeffs(
      Math.min(Math.max(highpass, 20), sampleRate * 0.49),
      0.707,
      sampleRate
    ));
  }

  // Band 2: Low shelf (skip if gain is ~0)
  if (Math.abs(lowGain) > 0.1) {
    bands.push(lowShelfCoeffs(200, lowGain, sampleRate));
  }

  // Band 3: Parametric mid (skip if gain is ~0)
  if (Math.abs(midGain) > 0.1) {
    bands.push(peakingCoeffs(
      Math.min(Math.max(midFreq, 20), sampleRate * 0.49),
      midGain,
      Math.max(midQ, 0.1),
      sampleRate
    ));
  }

  // Band 4: High shelf (skip if gain is ~0)
  if (Math.abs(highGain) > 0.1) {
    bands.push(highShelfCoeffs(8000, highGain, sampleRate));
  }

  // Apply all bands to each channel
  for (const data of outputChannels) {
    for (const coeffs of bands) {
      applyBiquad(data, length, coeffs);
    }
  }

  return {
    numberOfChannels: 2,
    length,
    sampleRate,
    getChannelData: (ch) => outputChannels[ch] || outputChannels[0],
  };
}
