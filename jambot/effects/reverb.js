/**
 * Reverb DSP Processing
 *
 * Freeverb-style algorithmic reverb:
 *   8 parallel comb filters → 4 series allpass filters → stereo output
 *
 * Processes audio sample-by-sample through tuned delay lines with feedback
 * and damping. No AudioContext dependency — pure offline DSP.
 */

// Comb filter tunings (Freeverb standard, prime-ish for density)
const COMB_TUNINGS = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
// Allpass filter tunings
const ALLPASS_TUNINGS = [556, 441, 341, 225];
// Stereo offset for R channel decorrelation
const STEREO_OFFSET = 23;

/**
 * Process audio through Freeverb-style algorithmic reverb
 * @param {Object} inputBuffer - Stereo input buffer
 * @param {Object} params - Reverb parameters
 * @param {number} sampleRate - Audio sample rate
 * @returns {Object} Processed stereo buffer
 */
export function processReverb(inputBuffer, params, sampleRate) {
  const {
    decay = 2.0,
    damping = 50,
    predelay = 10,
    mix = 30,
    width = 100,
    lowcut = 80,
    highcut = 10000,
    size = 50,
  } = params;

  const numChannels = inputBuffer.numberOfChannels;
  const length = inputBuffer.length;

  const inputL = inputBuffer.getChannelData(0);
  const inputR = numChannels > 1 ? inputBuffer.getChannelData(1) : inputL;

  const outputL = new Float32Array(length);
  const outputR = new Float32Array(length);

  // Scale factor for sample rate (tunings are designed for 44100)
  const srScale = sampleRate / 44100;
  // Size scales comb/allpass buffer lengths (0.5x–3.0x)
  // At size=0: ~12-18ms (tight room). At size=100: ~75-110ms (cathedral).
  const sizeScale = 0.5 + (size / 100) * 2.5;

  // Feedback per comb is derived from `decay` (the target RT60 in seconds) AND
  // that comb's actual loop time, so 'seconds' is accurate and size-independent
  // by construction. A comb of loop time L recirculating at gain g reaches
  // −60 dB (0.001) after RT60 = L·log(0.001)/log(g); solving for g at RT60=decay
  // gives g = 10^(−3·L/decay). (Old code used one fixed gain for every comb, so
  // RT60 scaled with loop length: 6× swing across size, and 0.1–2s barely
  // moved.) Ceiling stays at 0.965 (the just-fixed anti-integrator limit).
  const clampDecay = Math.min(decay, 10);
  const combFbFor = (loopSamples) => {
    const loopSec = loopSamples / sampleRate;
    return Math.min(0.965, Math.pow(10, (-3 * loopSec) / clampDecay));
  };
  // Damping: one-pole lowpass in each comb's feedback path. Scaled like stock
  // Freeverb (Jezar's scaledamp = 0.4) so damping=100 reads as MAXIMALLY DARK
  // rather than OFF. The lowpass has unity DC gain for any damp, so it only
  // rolls off highs — it never kills the tail. (Old `damp = damping/100` made
  // damp2 = 0 at damping=100, zeroing the entire feedback path = silent tail.)
  const damp = (damping / 100) * 0.4;
  const damp2 = 1 - damp;

  const wetGain = mix / 100;
  const dryGain = 1 - wetGain;
  const widthAmount = width / 100;
  const wet1 = wetGain * (widthAmount / 2 + 0.5);
  const wet2 = wetGain * ((1 - widthAmount) / 2);

  // --- Predelay buffer ---
  const predelaySamples = Math.max(1, Math.floor((predelay / 1000) * sampleRate));
  const predelayBuf = new Float32Array(predelaySamples);
  let predelayIdx = 0;

  // --- Comb filters (8 per channel, L and R with stereo offset) ---
  const combBufsL = [];
  const combBufsR = [];
  const combIdxL = new Int32Array(8);
  const combIdxR = new Int32Array(8);
  const combFilterStateL = new Float32Array(8);
  const combFilterStateR = new Float32Array(8);

  // Per-comb feedback gains (derived from each comb's real loop length).
  const combFeedbackL = new Float32Array(8);
  const combFeedbackR = new Float32Array(8);

  for (let c = 0; c < 8; c++) {
    const tunedL = Math.floor(COMB_TUNINGS[c] * sizeScale * srScale);
    const tunedR = Math.floor((COMB_TUNINGS[c] + STEREO_OFFSET) * sizeScale * srScale);
    const lenL = Math.max(1, tunedL);
    const lenR = Math.max(1, tunedR);
    combBufsL.push(new Float32Array(lenL));
    combBufsR.push(new Float32Array(lenR));
    combFeedbackL[c] = combFbFor(lenL);
    combFeedbackR[c] = combFbFor(lenR);
  }

  // --- Allpass filters (4 per channel) ---
  const allpassBufsL = [];
  const allpassBufsR = [];
  const allpassIdxL = new Int32Array(4);
  const allpassIdxR = new Int32Array(4);

  for (let a = 0; a < 4; a++) {
    const tunedL = Math.floor(ALLPASS_TUNINGS[a] * sizeScale * srScale);
    const tunedR = Math.floor((ALLPASS_TUNINGS[a] + STEREO_OFFSET) * sizeScale * srScale);
    allpassBufsL.push(new Float32Array(Math.max(1, tunedL)));
    allpassBufsR.push(new Float32Array(Math.max(1, tunedR)));
  }

  // --- Wet signal filters (highpass + lowpass) ---
  const hpAlpha = calculateHighpassAlpha(lowcut, sampleRate);
  const lpAlpha = calculateLowpassAlpha(highcut, sampleRate);
  let hpPrevL = 0, hpPrevR = 0;
  let lpPrevL = 0, lpPrevR = 0;

  // --- Per-sample processing ---
  for (let i = 0; i < length; i++) {
    // Sum input to mono for reverb input
    const inputMono = (inputL[i] + inputR[i]) * 0.5;

    // Write to predelay and read delayed
    const predelayed = predelayBuf[predelayIdx];
    predelayBuf[predelayIdx] = inputMono;
    predelayIdx = (predelayIdx + 1) % predelaySamples;

    // Process 8 comb filters in parallel (sum outputs)
    let combSumL = 0;
    let combSumR = 0;

    for (let c = 0; c < 8; c++) {
      // Left channel comb
      const bufL = combBufsL[c];
      const idxL = combIdxL[c];
      const readL = bufL[idxL];
      // One-pole lowpass damping in feedback path
      combFilterStateL[c] = readL * damp2 + combFilterStateL[c] * damp;
      bufL[idxL] = predelayed + combFilterStateL[c] * combFeedbackL[c];
      combIdxL[c] = (idxL + 1) % bufL.length;
      combSumL += readL;

      // Right channel comb (offset tuning for stereo)
      const bufR = combBufsR[c];
      const idxR = combIdxR[c];
      const readR = bufR[idxR];
      combFilterStateR[c] = readR * damp2 + combFilterStateR[c] * damp;
      bufR[idxR] = predelayed + combFilterStateR[c] * combFeedbackR[c];
      combIdxR[c] = (idxR + 1) % bufR.length;
      combSumR += readR;
    }

    // Scale comb sum (Jezar uses scalewet≈3, not 1/8 peak normalization)
    combSumL /= 3;
    combSumR /= 3;

    // Process 4 allpass filters in series
    let allpassOutL = combSumL;
    let allpassOutR = combSumR;

    for (let a = 0; a < 4; a++) {
      // Left allpass (Jezar/Schroeder: output = -in + delayed, buffer = in + delayed * g)
      const abufL = allpassBufsL[a];
      const aidxL = allpassIdxL[a];
      const bufferedL = abufL[aidxL];
      const inL = allpassOutL;
      allpassOutL = bufferedL - inL;
      abufL[aidxL] = inL + bufferedL * 0.5;
      allpassIdxL[a] = (aidxL + 1) % abufL.length;

      // Right allpass
      const abufR = allpassBufsR[a];
      const aidxR = allpassIdxR[a];
      const bufferedR = abufR[aidxR];
      const inR = allpassOutR;
      allpassOutR = bufferedR - inR;
      abufR[aidxR] = inR + bufferedR * 0.5;
      allpassIdxR[a] = (aidxR + 1) % abufR.length;
    }

    // Apply highpass to wet signal (remove mud)
    let wetL = allpassOutL;
    let wetR = allpassOutR;

    const hpFilteredL = wetL - hpPrevL;
    hpPrevL = wetL - hpAlpha * hpFilteredL;
    wetL = hpFilteredL;

    const hpFilteredR = wetR - hpPrevR;
    hpPrevR = wetR - hpAlpha * hpFilteredR;
    wetR = hpFilteredR;

    // Apply lowpass to wet signal (tame harshness)
    lpPrevL = lpPrevL + lpAlpha * (wetL - lpPrevL);
    wetL = lpPrevL;

    lpPrevR = lpPrevR + lpAlpha * (wetR - lpPrevR);
    wetR = lpPrevR;

    // Stereo width mixing and dry/wet blend
    outputL[i] = inputL[i] * dryGain + wetL * wet1 + wetR * wet2;
    outputR[i] = inputR[i] * dryGain + wetR * wet1 + wetL * wet2;
  }

  return {
    numberOfChannels: 2,
    length,
    sampleRate,
    getChannelData: (ch) => ch === 0 ? outputL : outputR,
  };
}

// === Helper Functions ===

/**
 * Calculate one-pole highpass filter coefficient
 * @param {number} freq - Cutoff frequency in Hz
 * @param {number} sampleRate - Audio sample rate
 * @returns {number} Filter coefficient
 */
function calculateHighpassAlpha(freq, sampleRate) {
  const rc = 1 / (2 * Math.PI * freq);
  const dt = 1 / sampleRate;
  return rc / (rc + dt);
}

/**
 * Calculate one-pole lowpass filter coefficient
 * @param {number} freq - Cutoff frequency in Hz
 * @param {number} sampleRate - Audio sample rate
 * @returns {number} Filter coefficient
 */
function calculateLowpassAlpha(freq, sampleRate) {
  const rc = 1 / (2 * Math.PI * freq);
  const dt = 1 / sampleRate;
  return dt / (rc + dt);
}
