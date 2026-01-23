/**
 * Session Renderer (Generic)
 *
 * Renders a Jambot session to WAV file using the unified instrument interface.
 * Each instrument node handles its own rendering via renderPattern().
 */

import { OfflineAudioContext, AudioContext } from 'node-web-audio-api';
import { writeFileSync } from 'fs';

// Make Web Audio APIs available globally (synth engines expect browser globals)
globalThis.OfflineAudioContext = OfflineAudioContext;
globalThis.AudioContext = AudioContext;

// Local modules
import { audioBufferToWav } from './wav.js';

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
          const buffer = await node.renderPattern({
            bars: section.barEnd - section.barStart,
            stepDuration,
            swing: session.clock.swing,
            sampleRate,
            pattern: savedPattern.pattern,
            params: savedPattern.params,
            automation: savedPattern.automation,
          });

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
        const buffer = await node.renderPattern({
          bars: renderBars,
          stepDuration,
          swing: session.clock.swing,
          sampleRate,
        });

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
