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

  // Map resonance 0-100 to Q 0.5-20
  const q = 0.5 + (resonance / 100) * 19.5;

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
    outputChannels.push(out);
  }

  return {
    numberOfChannels: 2,
    length,
    sampleRate,
    getChannelData: (ch) => outputChannels[ch] || outputChannels[0],
  };
}
