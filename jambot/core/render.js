/**
 * Session Renderer (Generic)
 *
 * Renders a Jambot session to WAV file using the unified instrument interface.
 * Each instrument node handles its own rendering via renderPattern().
 *
 * Effect chain processing:
 * 1. Render instruments to buffers
 * 2. Apply effect chains to each instrument buffer
 * 3. Mix all buffers to master
 * 4. Apply master effect chain
 * 5. Write WAV
 */

import { OfflineAudioContext, AudioContext } from 'node-web-audio-api';
import { writeFileSync } from 'fs';

// Make Web Audio APIs available globally (synth engines expect browser globals)
globalThis.OfflineAudioContext = OfflineAudioContext;
globalThis.AudioContext = AudioContext;

// Local modules
import { audioBufferToWav } from './wav.js';
import { processDelay } from '../effects/delay.js';
import { generatePlateReverbIR } from '../effects/reverb.js';

/**
 * Apply a single effect to a buffer
 * @param {Object} buffer - Audio buffer with getChannelData()
 * @param {Object} effect - Effect config { id, type, params }
 * @param {number} sampleRate - Audio sample rate
 * @param {number} bpm - Tempo in BPM
 * @returns {Object} Processed buffer
 */
async function applyEffect(buffer, effect, sampleRate, bpm) {
  const { type, params = {} } = effect;

  switch (type) {
    case 'delay':
      return processDelay(buffer, params, sampleRate, bpm);

    case 'reverb':
      // Create a context for IR generation
      const context = new OfflineAudioContext(2, buffer.length, sampleRate);
      const ir = generatePlateReverbIR(context, params);

      // Apply convolution reverb
      return applyConvolution(buffer, ir, params.mix ?? 0.3, sampleRate);

    // Future effects can be added here
    // case 'filter':
    // case 'eq':

    default:
      console.warn(`Unknown effect type: ${type}`);
      return buffer;
  }
}

/**
 * Apply convolution reverb to a buffer
 * @param {Object} inputBuffer - Input audio buffer
 * @param {AudioBuffer} ir - Impulse response buffer
 * @param {number} mix - Wet/dry mix (0-1)
 * @param {number} sampleRate - Sample rate
 * @returns {Object} Processed buffer
 */
function applyConvolution(inputBuffer, ir, mix, sampleRate) {
  const length = inputBuffer.length;
  const irLength = ir.length;
  const outputLength = length + irLength - 1;

  const outputL = new Float32Array(outputLength);
  const outputR = new Float32Array(outputLength);

  const inputL = inputBuffer.getChannelData(0);
  const inputR = inputBuffer.numberOfChannels > 1 ? inputBuffer.getChannelData(1) : inputL;
  const irL = ir.getChannelData(0);
  const irR = ir.numberOfChannels > 1 ? ir.getChannelData(1) : irL;

  // Simple convolution (can be optimized with FFT for longer IRs)
  for (let i = 0; i < length; i++) {
    for (let j = 0; j < irLength; j++) {
      outputL[i + j] += inputL[i] * irL[j];
      outputR[i + j] += inputR[i] * irR[j];
    }
  }

  // Mix dry and wet, trim to original length
  const dryGain = 1 - mix;
  const wetGain = mix;
  const resultL = new Float32Array(length);
  const resultR = new Float32Array(length);

  for (let i = 0; i < length; i++) {
    resultL[i] = inputL[i] * dryGain + outputL[i] * wetGain;
    resultR[i] = inputR[i] * dryGain + outputR[i] * wetGain;
  }

  return {
    numberOfChannels: 2,
    length,
    sampleRate,
    getChannelData: (ch) => ch === 0 ? resultL : resultR,
  };
}

/**
 * Process effect chain on a buffer
 * @param {Object} buffer - Audio buffer
 * @param {Array} chain - Array of effect configs
 * @param {number} sampleRate - Sample rate
 * @param {number} bpm - Tempo
 * @returns {Object} Processed buffer
 */
async function processEffectChain(buffer, chain, sampleRate, bpm) {
  let result = buffer;

  for (const effect of chain) {
    result = await applyEffect(result, effect, sampleRate, bpm);
  }

  return result;
}

/**
 * Get voice-level effect chains for an instrument
 * Looks for targets like 'jb01.ch', 'jb01.kick', etc.
 * @param {Object} effectChains - All effect chains from session.mixer
 * @param {string} instrumentId - Instrument ID (e.g., 'jb01')
 * @returns {Object} Map of voice -> effect chain
 */
function getVoiceEffectChains(effectChains, instrumentId) {
  if (!effectChains) return {};

  const voiceChains = {};
  const prefix = `${instrumentId}.`;

  for (const [target, chain] of Object.entries(effectChains)) {
    if (target.startsWith(prefix) && chain.length > 0) {
      const voice = target.slice(prefix.length);
      voiceChains[voice] = chain;
    }
  }

  return voiceChains;
}

/**
 * Mix multiple voice buffers into a single buffer
 * @param {Object} voiceBuffers - Map of voice -> buffer
 * @param {number} length - Output buffer length
 * @param {number} sampleRate - Sample rate
 * @returns {Object} Mixed buffer
 */
function mixVoiceBuffers(voiceBuffers, length, sampleRate) {
  const outputL = new Float32Array(length);
  const outputR = new Float32Array(length);

  for (const [voice, buffer] of Object.entries(voiceBuffers)) {
    if (!buffer) continue;

    const bufferL = buffer.getChannelData(0);
    const bufferR = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : bufferL;
    const mixLen = Math.min(length, buffer.length);

    for (let i = 0; i < mixLen; i++) {
      outputL[i] += bufferL[i];
      outputR[i] += bufferR[i];
    }
  }

  return {
    numberOfChannels: 2,
    length,
    sampleRate,
    getChannelData: (ch) => ch === 0 ? outputL : outputR,
  };
}

/**
 * Render an instrument with per-voice effect support
 * If instrument supports renderVoices() and has voice-level effects, uses that.
 * Otherwise falls back to renderPattern() with instrument-level effects only.
 *
 * @param {Object} node - Instrument node
 * @param {Object} renderOptions - Options for renderPattern/renderVoices
 * @param {Object} effectChains - All effect chains from session.mixer
 * @param {string} instrumentId - Instrument ID
 * @param {number} sampleRate - Sample rate
 * @param {number} bpm - BPM for tempo-synced effects
 * @returns {Promise<Object|null>} Rendered buffer or null
 */
async function renderInstrumentWithEffects(node, renderOptions, effectChains, instrumentId, sampleRate, bpm) {
  const voiceChains = getVoiceEffectChains(effectChains, instrumentId);
  const hasVoiceEffects = Object.keys(voiceChains).length > 0;
  const instrumentChain = effectChains?.[instrumentId] || [];

  // If no voice-level effects OR instrument doesn't support per-voice rendering
  if (!hasVoiceEffects || typeof node.renderVoices !== 'function') {
    let buffer = await node.renderPattern(renderOptions);

    if (buffer && instrumentChain.length > 0) {
      buffer = await processEffectChain(buffer, instrumentChain, sampleRate, bpm);
    }

    return buffer;
  }

  // Render voices separately, apply per-voice effects, then mix
  const voiceBuffers = await node.renderVoices(renderOptions);

  if (!voiceBuffers || Object.keys(voiceBuffers).length === 0) {
    return null;
  }

  // Find max buffer length
  let maxLength = 0;
  for (const buffer of Object.values(voiceBuffers)) {
    if (buffer && buffer.length > maxLength) {
      maxLength = buffer.length;
    }
  }

  // Apply per-voice effect chains
  const processedVoices = {};
  for (const [voice, buffer] of Object.entries(voiceBuffers)) {
    if (!buffer) continue;

    const chain = voiceChains[voice];
    if (chain && chain.length > 0) {
      processedVoices[voice] = await processEffectChain(buffer, chain, sampleRate, bpm);
    } else {
      processedVoices[voice] = buffer;
    }
  }

  // Mix voices together
  let mixedBuffer = mixVoiceBuffers(processedVoices, maxLength, sampleRate);

  // Apply instrument-level effect chain after mixing
  if (instrumentChain.length > 0) {
    mixedBuffer = await processEffectChain(mixedBuffer, instrumentChain, sampleRate, bpm);
  }

  return mixedBuffer;
}

/**
 * Render a session to WAV file
 * @param {Object} session - Jambot session object
 * @param {number} bars - Number of bars to render (ignored if arrangement is set)
 * @param {string} filename - Output filename
 * @returns {Promise<string>} Render result message
 */
export async function renderSession(session, bars, filename) {

  // === ARRANGEMENT MODE ===
  const hasArrangement = session.arrangement && session.arrangement.length > 0;
  let renderBars = bars;
  let arrangementPlan = null;

  if (hasArrangement) {
    arrangementPlan = [];
    let currentBar = 0;
    for (const section of session.arrangement) {
      arrangementPlan.push({
        barStart: currentBar,
        barEnd: currentBar + section.bars,
        patterns: section.patterns,
      });
      currentBar += section.bars;
    }
    renderBars = currentBar;
  }

  // Get timing from master clock
  const sampleRate = session.clock.sampleRate || 44100;
  const stepDuration = session.clock.stepDuration;
  const samplesPerBar = session.clock.samplesPerBar;

  // Create the output context (just for timing calculation)
  const stepsPerBar = 16;
  const totalSteps = renderBars * stepsPerBar;
  const totalDuration = totalSteps * stepDuration + 2; // Extra time for release tails
  const context = new OfflineAudioContext(2, totalDuration * sampleRate, sampleRate);

  // Create master gain (for silent base render)
  const masterGain = context.createGain();
  masterGain.gain.value = 0.8;
  masterGain.connect(context.destination);

  // Render the silent base buffer
  const outputBuffer = await context.startRendering();

  // === RENDER ALL INSTRUMENTS ===
  const instrumentBuffers = []; // { id, buffer, startBar, level }
  const canonicalIds = ['jb01', 'jb200', 'sampler', 'r9d9', 'r3d3', 'r1d1'];

  for (const id of canonicalIds) {
    const node = session._nodes[id];
    if (!node) continue;

    const level = session.getInstrumentLevel(id);
    const linearLevel = Math.pow(10, level / 20);

    if (hasArrangement) {
      // Render each section where this instrument has a pattern
      for (const section of arrangementPlan) {
        const patternName = section.patterns[id];
        if (!patternName) continue;

        const savedPattern = session.patterns[id]?.[patternName];
        if (!savedPattern) continue;

        try {
          const buffer = await renderInstrumentWithEffects(
            node,
            {
              bars: section.barEnd - section.barStart,
              stepDuration,
              swing: session.clock.swing,
              sampleRate,
              pattern: savedPattern.pattern,
              params: savedPattern.params,
              automation: savedPattern.automation,
            },
            session.mixer?.effectChains,
            id,
            sampleRate,
            session.bpm
          );

          if (buffer) {
            instrumentBuffers.push({
              id,
              buffer,
              startBar: section.barStart,
              level: linearLevel,
            });
          }
        } catch (e) {
          console.warn(`Failed to render ${id} section:`, e.message);
        }
      }
    } else {
      // Single pattern mode - render node's current pattern
      try {
        const buffer = await renderInstrumentWithEffects(
          node,
          {
            bars: renderBars,
            stepDuration,
            swing: session.clock.swing,
            sampleRate,
          },
          session.mixer?.effectChains,
          id,
          sampleRate,
          session.bpm
        );

        if (buffer) {
          instrumentBuffers.push({
            id,
            buffer,
            startBar: 0,
            level: linearLevel,
          });
        }
      } catch (e) {
        console.warn(`Failed to render ${id}:`, e.message);
      }
    }
  }

  // === MIX ALL BUFFERS ===
  for (const { buffer, startBar, level } of instrumentBuffers) {
    const startSample = Math.floor(startBar * samplesPerBar);
    const mixLength = Math.min(outputBuffer.length - startSample, buffer.length);

    for (let ch = 0; ch < outputBuffer.numberOfChannels; ch++) {
      const mainData = outputBuffer.getChannelData(ch);
      const instData = buffer.getChannelData(ch % buffer.numberOfChannels);
      for (let i = 0; i < mixLength; i++) {
        mainData[startSample + i] += instData[i] * level;
      }
    }
  }

  // === APPLY MASTER EFFECT CHAIN ===
  const masterChain = session.mixer?.effectChains?.master;
  let finalBuffer = outputBuffer;

  if (masterChain && masterChain.length > 0) {
    // Wrap outputBuffer to match our buffer interface
    const wrappedBuffer = {
      numberOfChannels: outputBuffer.numberOfChannels,
      length: outputBuffer.length,
      sampleRate: outputBuffer.sampleRate,
      getChannelData: (ch) => outputBuffer.getChannelData(ch),
    };

    const processedMaster = await processEffectChain(wrappedBuffer, masterChain, sampleRate, session.bpm);

    // Copy processed data back to outputBuffer
    for (let ch = 0; ch < outputBuffer.numberOfChannels; ch++) {
      const mainData = outputBuffer.getChannelData(ch);
      const processedData = processedMaster.getChannelData(ch);
      for (let i = 0; i < outputBuffer.length; i++) {
        mainData[i] = processedData[i];
      }
    }
  }

  // === WRITE WAV ===
  const wav = audioBufferToWav(outputBuffer);
  writeFileSync(filename, Buffer.from(wav));

  // Build output message
  const synths = instrumentBuffers
    .map(b => b.id.toUpperCase())
    .filter((v, i, a) => a.indexOf(v) === i);

  if (hasArrangement) {
    const sectionCount = session.arrangement.length;
    return `Rendered ${renderBars} bars (${sectionCount} sections) at ${session.bpm} BPM (${synths.join('+') || 'empty'})`;
  }
  return `Rendered ${renderBars} bars at ${session.bpm} BPM (${synths.join('+') || 'empty'})`;
}
