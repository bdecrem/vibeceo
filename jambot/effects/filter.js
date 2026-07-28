/**
 * Filter DSP Processing
 *
 * LP/HP/BP filter using the shared BiquadFilter from the DSP library.
 * Processes stereo buffers (each channel independently).
 */

import { BiquadFilter } from '../../web/public/jb202/dist/dsp/filters/biquad.js';

/**
 * Process audio through a filter effect
 * @param {Object} inputBuffer - Audio buffer with getChannelData()
 * @param {Object} params - Filter parameters from FilterNode
 * @param {string} params.mode - 'lowpass', 'highpass', or 'bandpass'
 * @param {number} params.cutoff - Filter frequency in Hz (20-20000)
 * @param {number} params.resonance - Filter Q as 0-100 (mapped to Q 0.5-20)
 * @param {number} sampleRate - Audio sample rate
 * @returns {Object} Processed buffer
 */
export function processFilter(inputBuffer, params, sampleRate) {
  const {
    mode = 'lowpass',
    cutoff = 2000,
    resonance = 30,
  } = params;

  const numChannels = inputBuffer.numberOfChannels || 1;
  const length = inputBuffer.length;

  // Map resonance 0-100 to Q with a PERCEPTUAL (squared) curve, not linear.
  // The old linear map (Q 0.5-20) made the DEFAULT resonance 30 a Q of 6.35 =
  // +16 dB resonant peak, so a plain "lowpass the drums" clipped the master.
  // Squared keeps the low/default end tame: res 30 → Q ~2.3, res 100 → Q 20.
  const q = 0.5 + Math.pow(resonance / 100, 2) * 19.5;

  // Makeup attenuation compensating the resonant peak (≈ Q for a resonant
  // biquad), so mode+cutoff-only usage stays near unity and does not clip.
  // At Q ≤ 1 (gentle) this is 1.0 (no change); it only kicks in as Q climbs.
  const makeup = 1 / Math.max(1, q);

  // Build output buffer and apply filter per channel
  const outputChannels = [];
  for (let ch = 0; ch < Math.max(numChannels, 2); ch++) {
    const src = inputBuffer.getChannelData(ch % numChannels);
    const out = new Float32Array(length);
    out.set(src);

    // Each channel gets its own filter instance (independent state)
    const filter = new BiquadFilter(sampleRate);
    if (mode === 'highpass') {
      filter.setHighpass(cutoff, q);
    } else if (mode === 'bandpass') {
      filter.setBandpass(cutoff, q);
    } else {
      filter.setLowpass(cutoff, q);
    }

    filter.process(out);
    if (makeup !== 1) {
      for (let i = 0; i < length; i++) out[i] *= makeup;
    }
    outputChannels.push(out);
  }

  return {
    numberOfChannels: 2,
    length,
    sampleRate,
    getChannelData: (ch) => outputChannels[ch] || outputChannels[0],
  };
}
