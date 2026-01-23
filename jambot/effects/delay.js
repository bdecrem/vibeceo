/**
 * Delay DSP Processing
 *
 * Two processing modes:
 * 1. Analog Delay - Mono filtered feedback with soft saturation
 * 2. Ping Pong Delay - Stereo bouncing (L→R→L)
 *
 * Both use circular delay buffers and one-pole filters for feedback filtering.
 */

/**
 * Process audio through analog delay
 * @param {AudioBuffer} inputBuffer - Stereo input buffer
 * @param {Object} params - Delay parameters
 * @param {number} params.time - Delay time in ms
 * @param {number} params.feedback - Feedback amount 0-100
 * @param {number} params.mix - Wet/dry mix 0-100
 * @param {number} params.lowcut - Highpass frequency Hz
 * @param {number} params.highcut - Lowpass frequency Hz
 * @param {number} params.saturation - Saturation amount 0-100
 * @param {number} sampleRate - Audio sample rate
 * @returns {AudioBuffer} Processed stereo buffer
 */
export function processAnalogDelay(inputBuffer, params, sampleRate) {
  const {
    time = 375,
    feedback = 50,
    mix = 30,
    lowcut = 80,
    highcut = 8000,
    saturation = 20,
  } = params;

  const numChannels = inputBuffer.numberOfChannels;
  const length = inputBuffer.length;

  // Create output buffer (copy input structure)
  const outputL = new Float32Array(length);
  const outputR = new Float32Array(length);

  // Get input data
  const inputL = inputBuffer.getChannelData(0);
  const inputR = numChannels > 1 ? inputBuffer.getChannelData(1) : inputL;

  // Calculate delay in samples
  const delaySamples = Math.floor((time / 1000) * sampleRate);

  // Create delay buffer (mono for analog mode)
  const delayBuffer = new Float32Array(delaySamples + 1);
  let delayWriteIndex = 0;

  // Filter coefficients (one-pole IIR)
  const hpAlpha = calculateHighpassAlpha(lowcut, sampleRate);
  const lpAlpha = calculateLowpassAlpha(highcut, sampleRate);

  // Filter state
  let hpPrev = 0;
  let lpPrev = 0;

  // Convert params to 0-1 range
  const feedbackGain = feedback / 100;
  const wetGain = mix / 100;
  const dryGain = 1 - wetGain;
  const satAmount = saturation / 100;

  for (let i = 0; i < length; i++) {
    // Sum input to mono for delay input
    const inputMono = (inputL[i] + inputR[i]) * 0.5;

    // Read from delay buffer
    const readIndex = (delayWriteIndex - delaySamples + delayBuffer.length) % delayBuffer.length;
    let delayed = delayBuffer[readIndex];

    // Apply highpass filter to feedback (remove mud)
    const hpFiltered = delayed - hpPrev;
    hpPrev = delayed - hpAlpha * hpFiltered;
    delayed = hpFiltered;

    // Apply lowpass filter to feedback (tame harshness)
    lpPrev = lpPrev + lpAlpha * (delayed - lpPrev);
    delayed = lpPrev;

    // Apply soft saturation if enabled
    if (satAmount > 0) {
      delayed = softSaturate(delayed, satAmount);
    }

    // Write to delay buffer (input + feedback)
    delayBuffer[delayWriteIndex] = inputMono + delayed * feedbackGain;
    delayWriteIndex = (delayWriteIndex + 1) % delayBuffer.length;

    // Mix dry and wet
    outputL[i] = inputL[i] * dryGain + delayed * wetGain;
    outputR[i] = inputR[i] * dryGain + delayed * wetGain;
  }

  // Return as a simple object with channel data
  return {
    numberOfChannels: 2,
    length,
    sampleRate,
    getChannelData: (ch) => ch === 0 ? outputL : outputR,
  };
}

/**
 * Process audio through ping pong delay
 * @param {AudioBuffer} inputBuffer - Stereo input buffer
 * @param {Object} params - Delay parameters
 * @param {number} params.time - Delay time in ms (per bounce)
 * @param {number} params.feedback - Feedback amount 0-100
 * @param {number} params.mix - Wet/dry mix 0-100
 * @param {number} params.lowcut - Highpass frequency Hz
 * @param {number} params.highcut - Lowpass frequency Hz
 * @param {number} params.spread - Stereo spread 0-100
 * @param {number} sampleRate - Audio sample rate
 * @returns {AudioBuffer} Processed stereo buffer
 */
export function processPingPongDelay(inputBuffer, params, sampleRate) {
  const {
    time = 375,
    feedback = 50,
    mix = 30,
    lowcut = 80,
    highcut = 8000,
    spread = 100,
  } = params;

  const numChannels = inputBuffer.numberOfChannels;
  const length = inputBuffer.length;

  // Create output buffer
  const outputL = new Float32Array(length);
  const outputR = new Float32Array(length);

  // Get input data
  const inputL = inputBuffer.getChannelData(0);
  const inputR = numChannels > 1 ? inputBuffer.getChannelData(1) : inputL;

  // Calculate delay in samples
  const delaySamples = Math.floor((time / 1000) * sampleRate);

  // Create stereo delay buffers (L and R)
  const delayBufferL = new Float32Array(delaySamples + 1);
  const delayBufferR = new Float32Array(delaySamples + 1);
  let delayWriteIndexL = 0;
  let delayWriteIndexR = 0;

  // Filter coefficients
  const hpAlpha = calculateHighpassAlpha(lowcut, sampleRate);
  const lpAlpha = calculateLowpassAlpha(highcut, sampleRate);

  // Filter state (separate for each channel)
  let hpPrevL = 0, hpPrevR = 0;
  let lpPrevL = 0, lpPrevR = 0;

  // Convert params to 0-1 range
  const feedbackGain = feedback / 100;
  const wetGain = mix / 100;
  const dryGain = 1 - wetGain;
  const spreadAmount = spread / 100;

  // Spread affects stereo width of output
  // spread=100: full ping-pong (L stays L, R stays R)
  // spread=0: mono (L and R averaged)
  const crossGain = spreadAmount;  // For feedback routing
  const monoMix = (1 - spreadAmount) * 0.5;  // How much opposite channel bleeds in

  for (let i = 0; i < length; i++) {
    // Read from delay buffers (unfiltered for output)
    const readIndexL = (delayWriteIndexL - delaySamples + delayBufferL.length) % delayBufferL.length;
    const readIndexR = (delayWriteIndexR - delaySamples + delayBufferR.length) % delayBufferR.length;

    const delayedL = delayBufferL[readIndexL];
    const delayedR = delayBufferR[readIndexR];

    // Apply filters to FEEDBACK path only (not output)
    // This prevents startup transient from attenuating first tap
    let feedbackL = delayedL;
    let feedbackR = delayedR;

    // Apply filters to L feedback
    const hpFilteredL = feedbackL - hpPrevL;
    hpPrevL = feedbackL - hpAlpha * hpFilteredL;
    feedbackL = hpFilteredL;
    lpPrevL = lpPrevL + lpAlpha * (feedbackL - lpPrevL);
    feedbackL = lpPrevL;

    // Apply filters to R feedback
    const hpFilteredR = feedbackR - hpPrevR;
    hpPrevR = feedbackR - hpAlpha * hpFilteredR;
    feedbackR = hpFilteredR;
    lpPrevR = lpPrevR + lpAlpha * (feedbackR - lpPrevR);
    feedbackR = lpPrevR;

    // Ping pong: L delay feeds into R, R delay feeds into L
    // Input goes to L first, then bounces
    // Use filtered feedback for what goes back into the buffer
    const toDelayL = inputL[i] * 0.5 + inputR[i] * 0.5 + feedbackR * feedbackGain * crossGain;
    const toDelayR = feedbackL * feedbackGain * crossGain;

    // Write to delay buffers
    delayBufferL[delayWriteIndexL] = toDelayL;
    delayBufferR[delayWriteIndexR] = toDelayR;

    delayWriteIndexL = (delayWriteIndexL + 1) % delayBufferL.length;
    delayWriteIndexR = (delayWriteIndexR + 1) % delayBufferR.length;

    // Mix dry and wet (use unfiltered delay for output - full strength first tap)
    // Spread controls stereo width: 100 = full ping pong, 0 = mono delay
    const wetL = delayedL * (1 - monoMix) + delayedR * monoMix;
    const wetR = delayedR * (1 - monoMix) + delayedL * monoMix;

    outputL[i] = inputL[i] * dryGain + wetL * wetGain;
    outputR[i] = inputR[i] * dryGain + wetR * wetGain;
  }

  return {
    numberOfChannels: 2,
    length,
    sampleRate,
    getChannelData: (ch) => ch === 0 ? outputL : outputR,
  };
}

/**
 * Main delay processor - routes to appropriate mode
 * @param {AudioBuffer} inputBuffer - Input audio buffer
 * @param {Object} params - Delay parameters including mode
 * @param {number} sampleRate - Audio sample rate
 * @param {number} [bpm] - Tempo for sync calculations
 * @returns {AudioBuffer} Processed audio buffer
 */
export function processDelay(inputBuffer, params, sampleRate, bpm) {
  // Calculate synced time if needed
  let effectiveTime = params.time ?? 375;

  if (params.sync && params.sync !== 0 && params.sync !== 'off' && bpm) {
    const beatMs = (60 / bpm) * 1000;
    const syncMode = typeof params.sync === 'string'
      ? ['off', '8th', 'dotted8th', 'triplet8th', '16th', 'quarter'].indexOf(params.sync)
      : params.sync;

    switch (syncMode) {
      case 1: effectiveTime = beatMs / 2; break;        // 8th
      case 2: effectiveTime = (beatMs / 2) * 1.5; break; // Dotted 8th
      case 3: effectiveTime = beatMs / 3; break;        // Triplet 8th
      case 4: effectiveTime = beatMs / 4; break;        // 16th
      case 5: effectiveTime = beatMs; break;            // Quarter
    }
  }

  const processParams = { ...params, time: effectiveTime };

  // Route to appropriate processor based on mode
  const mode = params.mode ?? 0;
  const isPingPong = mode === 1 || mode === 'pingpong';

  if (isPingPong) {
    return processPingPongDelay(inputBuffer, processParams, sampleRate);
  } else {
    return processAnalogDelay(inputBuffer, processParams, sampleRate);
  }
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

/**
 * Soft saturation function (tanh-like)
 * @param {number} x - Input sample
 * @param {number} amount - Saturation amount 0-1
 * @returns {number} Saturated sample
 */
function softSaturate(x, amount) {
  if (amount <= 0) return x;

  // Drive the signal based on saturation amount
  const drive = 1 + amount * 3;
  const driven = x * drive;

  // Soft clip using tanh approximation
  const saturated = driven / (1 + Math.abs(driven));

  // Mix dry and saturated based on amount
  return x * (1 - amount) + saturated * amount;
}
