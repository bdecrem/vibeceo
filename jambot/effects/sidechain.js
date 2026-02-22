/**
 * Sidechain DSP Processing
 *
 * Pattern-based sidechain ducking — reads the trigger voice's pattern
 * to generate an envelope that ducks the target signal on each hit.
 *
 * Uses attack/hold/release envelope with configurable amount.
 * Works like a MIDI-triggered sidechain (deterministic, no audio analysis needed).
 */

/**
 * Build an array of sample positions where the trigger voice has hits
 * @param {Object} pattern - Instrument pattern (e.g., { kick: [...], snare: [...] })
 * @param {string} trigger - Voice name (e.g., 'kick')
 * @param {number} stepDuration - Seconds per step
 * @param {number} sampleRate - Audio sample rate
 * @param {number} totalLength - Total buffer length in samples
 * @returns {number[]} Array of sample positions
 */
function getTriggerPositions(pattern, trigger, stepDuration, sampleRate, totalLength) {
  if (!pattern) return [];

  // Drum patterns: { kick: [0, 4, 8, 12], snare: [4, 12] }
  const voiceSteps = pattern[trigger];
  if (!voiceSteps || !Array.isArray(voiceSteps)) return [];

  const patternLength = voiceSteps.length > 0
    ? Math.max(...voiceSteps) + 1
    : 16;

  // voiceSteps contains step indices where hits occur
  // But could also be a full array like [1, 0, 0, 0, 1, 0, ...]
  // Detect format: if values are all 0 or 1, it's a gate array; otherwise step indices
  const isGateArray = voiceSteps.length >= 16 || voiceSteps.every(v => v === 0 || v === 1);

  const hitSteps = [];
  if (isGateArray) {
    for (let i = 0; i < voiceSteps.length; i++) {
      if (voiceSteps[i]) hitSteps.push(i);
    }
  } else {
    // Step indices directly
    hitSteps.push(...voiceSteps);
  }

  if (hitSteps.length === 0) return [];

  // Convert step indices to sample positions, looping pattern to fill buffer
  const stepsInPattern = isGateArray ? voiceSteps.length : 16;
  const samplesPerStep = Math.round(stepDuration * sampleRate);
  const samplesPerPattern = stepsInPattern * samplesPerStep;
  const positions = [];

  if (samplesPerPattern <= 0) return [];

  const loops = Math.ceil(totalLength / samplesPerPattern);
  for (let loop = 0; loop < loops; loop++) {
    const loopOffset = loop * samplesPerPattern;
    for (const step of hitSteps) {
      const pos = loopOffset + step * samplesPerStep;
      if (pos < totalLength) {
        positions.push(pos);
      }
    }
  }

  return positions;
}

/**
 * Process audio through sidechain ducking
 * @param {Object} inputBuffer - Audio buffer with getChannelData()
 * @param {Object} params - Sidechain parameters from SidechainNode
 * @param {string} params.trigger - Trigger voice name (e.g., 'kick')
 * @param {number} params.amount - Duck amount 0-1
 * @param {number} params.attack - Attack time in ms
 * @param {number} params.release - Release time in ms
 * @param {number} params.hold - Hold time in ms
 * @param {number} sampleRate - Audio sample rate
 * @param {number} bpm - Tempo (unused, timing comes from context)
 * @param {Object} context - Render context with session data
 * @param {Object} context.session - Session object for pattern lookup
 * @param {number} context.stepDuration - Seconds per step
 * @returns {Object} Processed buffer
 */
export function processSidechain(inputBuffer, params, sampleRate, bpm, context) {
  const {
    trigger = 'kick',
    amount = 0.5,
    attack = 5,
    release = 100,
    hold = 20,
  } = params;

  const numChannels = inputBuffer.numberOfChannels || 1;
  const length = inputBuffer.length;

  // If no context or session, pass through (can't determine trigger timing)
  if (!context?.session || !context?.stepDuration) {
    return inputBuffer;
  }

  // Find the trigger instrument's pattern via public session API
  // The trigger voice (e.g., 'kick') typically belongs to a drum machine
  const session = context.session;
  let triggerPattern = null;

  for (const pattern of [session.jb01Pattern, session.jt90Pattern]) {
    if (pattern && pattern[trigger]) {
      triggerPattern = pattern;
      break;
    }
  }

  if (!triggerPattern) {
    return inputBuffer; // No trigger pattern found, pass through
  }

  // Get trigger hit positions in samples
  const positions = getTriggerPositions(
    triggerPattern, trigger, context.stepDuration, sampleRate, length
  );

  if (positions.length === 0) {
    return inputBuffer; // No hits, pass through
  }

  // Generate duck envelope
  const envelope = new Float32Array(length);
  envelope.fill(1.0); // Start at full volume

  const attackSamples = Math.max(1, Math.round((attack / 1000) * sampleRate));
  const holdSamples = Math.round((hold / 1000) * sampleRate);
  const releaseSamples = Math.max(1, Math.round((release / 1000) * sampleRate));
  const duckLevel = 1 - amount;

  for (const pos of positions) {
    // Attack phase: ramp down from 1 to duckLevel
    for (let i = 0; i < attackSamples; i++) {
      const idx = pos + i;
      if (idx >= length) break;
      const t = i / attackSamples;
      const gain = 1 - (1 - duckLevel) * t;
      envelope[idx] = Math.min(envelope[idx], gain);
    }

    // Hold phase: stay at duckLevel
    const holdStart = pos + attackSamples;
    for (let i = 0; i < holdSamples; i++) {
      const idx = holdStart + i;
      if (idx >= length) break;
      envelope[idx] = Math.min(envelope[idx], duckLevel);
    }

    // Release phase: ramp back up from duckLevel to 1
    const releaseStart = holdStart + holdSamples;
    for (let i = 0; i < releaseSamples; i++) {
      const idx = releaseStart + i;
      if (idx >= length) break;
      const t = i / releaseSamples;
      const gain = duckLevel + (1 - duckLevel) * t;
      envelope[idx] = Math.min(envelope[idx], gain);
    }
  }

  // Apply envelope to all channels
  const outputChannels = [];
  for (let ch = 0; ch < Math.max(numChannels, 2); ch++) {
    const src = inputBuffer.getChannelData(ch % numChannels);
    const out = new Float32Array(length);
    for (let i = 0; i < length; i++) {
      out[i] = src[i] * envelope[i];
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
