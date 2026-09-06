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
  let voiceSteps = pattern[trigger];
  if (!voiceSteps || !Array.isArray(voiceSteps)) return [];

  // Drum patterns arrive as arrays of {velocity, accent} step objects.
  // Normalize to a gate array via velocity — the old code fell into the
  // gate-array branch (length >= 16) where every object was truthy, so
  // the sidechain ducked on all 16 steps regardless of the pattern.
  if (voiceSteps.length > 0 && typeof voiceSteps[0] === 'object' && voiceSteps[0] !== null) {
    voiceSteps = voiceSteps.map(s => (s && s.velocity > 0) ? 1 : 0);
  }

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
 * True when a drum pattern has at least one hit on `voice`.
 * Steps are {velocity, accent} objects (drum nodes) or 0/1 gates.
 */
function voiceHasHits(pattern, voice) {
  const steps = pattern?.[voice];
  return Array.isArray(steps) && steps.some(s =>
    (typeof s === 'object' && s !== null) ? s.velocity > 0 : !!s);
}

/**
 * Pick the pattern to read trigger hits from. Prefers one whose trigger voice
 * actually HAS hits — jb01's default pattern exists with all-zero velocities
 * and used to shadow the real trigger instrument (e.g. a jt90 kick).
 * @param {Object|Object[]} patterns - { drumId: pattern } map or a list
 * @param {string} trigger - voice name
 * @returns {Object|null}
 */
function pickTriggerPattern(patterns, trigger) {
  const list = Array.isArray(patterns) ? patterns : Object.values(patterns || {});
  let fallback = null;
  for (const pattern of list) {
    if (!pattern || !pattern[trigger]) continue;
    if (voiceHasHits(pattern, trigger)) return pattern;
    if (!fallback) fallback = pattern;
  }
  return fallback;
}

/**
 * Process audio through sidechain ducking
 *
 * The trigger timing comes from the drum pattern that is actually playing
 * against this buffer, handed in by the renderer:
 *   - context.triggerPatterns: { drumId: pattern } for the whole buffer
 *     (loop mode: the live patterns; song mode: one section's saved patterns)
 *   - context.triggerSections: [{ offsetSamples, lengthSamples, triggerPatterns }]
 *     for whole-mix buffers (master chain, send returns) in song mode
 * Without either, falls back to the live jb01/jt90 patterns (legacy callers).
 * Every drum instance (jb01, jt90, jt90-2, …) is a candidate; the one whose
 * trigger voice has hits wins.
 *
 * @param {Object} inputBuffer - Audio buffer with getChannelData()
 * @param {Object} params - Sidechain parameters from SidechainNode
 * @param {string} params.trigger - Trigger voice name (e.g., 'kick')
 * @param {number} params.amount - Duck amount 0-1
 * @param {number} params.attack - Attack time in ms
 * @param {number} params.release - Release time in ms
 * @param {number} params.hold - Hold time in ms
 * @param {number} sampleRate - Audio sample rate
 * @param {number} bpm - Tempo (unused, timing comes from context)
 * @param {Object} context - Render context
 * @param {Object} [context.session] - Session (legacy pattern lookup)
 * @param {number} context.stepDuration - Seconds per step
 * @param {Object} [context.triggerPatterns] - { drumId: pattern }
 * @param {Array} [context.triggerSections] - per-section patterns with offsets
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

  // Without step timing (or any pattern source) we can't place the hits: pass through
  if (!context?.stepDuration) return inputBuffer;
  if (!context.triggerPatterns && !context.triggerSections && !context.session) return inputBuffer;

  const stepDuration = context.stepDuration;
  let positions = [];

  if (Array.isArray(context.triggerSections)) {
    // Whole-mix buffer in song mode: each section ducks to its own drum
    // patterns, placed at the section's offset. The last section's length may
    // be Infinity so the release tail keeps the groove.
    for (const section of context.triggerSections) {
      const pattern = pickTriggerPattern(section.triggerPatterns, trigger);
      if (!pattern) continue;
      const offset = Math.max(0, Math.floor(section.offsetSamples || 0));
      const sectionLength = Math.min(section.lengthSamples ?? Infinity, length - offset);
      if (!(sectionLength > 0)) continue;
      for (const pos of getTriggerPositions(pattern, trigger, stepDuration, sampleRate, sectionLength)) {
        positions.push(pos + offset);
      }
    }
  } else {
    const patterns = context.triggerPatterns
      ?? [context.session?.jb01Pattern, context.session?.jt90Pattern]; // legacy: live canonical drums
    const pattern = pickTriggerPattern(patterns, trigger);
    if (pattern) {
      positions = getTriggerPositions(pattern, trigger, stepDuration, sampleRate, length);
    }
  }

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
