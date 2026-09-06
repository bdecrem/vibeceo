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
import { coerceChoice } from './node.js';
import { processDelay } from '../effects/delay.js';
import { processEq } from '../effects/eq.js';
import { processFilter } from '../effects/filter.js';
import { processReverb } from '../effects/reverb.js';
import { processSidechain } from '../effects/sidechain.js';

/**
 * Effect processor registry — maps effect type to processing function.
 * Adding a new effect type is a one-liner registration here.
 */
const EFFECT_PROCESSORS = {
  delay: (buffer, params, sampleRate, bpm) => {
    return processDelay(buffer, params, sampleRate, bpm);
  },
  eq: (buffer, params, sampleRate) => {
    return processEq(buffer, params, sampleRate);
  },
  filter: (buffer, params, sampleRate) => {
    return processFilter(buffer, params, sampleRate);
  },
  reverb: (buffer, params, sampleRate) => {
    return processReverb(buffer, params, sampleRate);
  },
  sidechain: (buffer, params, sampleRate, bpm, context) => {
    return processSidechain(buffer, params, sampleRate, bpm, context);
  },
};

/**
 * Apply a single effect to a buffer
 * @param {Object} buffer - Audio buffer with getChannelData()
 * @param {Object} effect - Effect config { id, type, params }
 * @param {number} sampleRate - Audio sample rate
 * @param {number} bpm - Tempo in BPM
 * @param {Object} [context] - Render context (session, stepDuration) for effects that need it
 * @returns {Object} Processed buffer
 */
async function applyEffect(buffer, effect, sampleRate, bpm, context) {
  const { type } = effect;
  // Read live params from effect node when available (keeps ParamSystem in sync),
  // fall back to static params object for backwards compatibility
  const params = effect._node ? effect._node.getParams() : (effect.params || {});
  const processor = EFFECT_PROCESSORS[type];

  if (!processor) {
    console.warn(`Unknown effect type: ${type}`);
    return buffer;
  }

  return processor(buffer, params, sampleRate, bpm, context);
}

/**
 * Process effect chain on a buffer
 * @param {Object} buffer - Audio buffer
 * @param {Array} chain - Array of effect configs
 * @param {number} sampleRate - Sample rate
 * @param {number} bpm - Tempo
 * @param {Object} [context] - Render context for effects that need it
 * @returns {Object} Processed buffer
 */
async function processEffectChain(buffer, chain, sampleRate, bpm, context) {
  let result = buffer;

  for (const effect of chain) {
    result = await applyEffect(result, effect, sampleRate, bpm, context);
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
 * Saved-pattern params are raw engine values captured at save time. Older
 * saves may hold invalid choice values (a waveform stored as 0); coerce
 * them against the node's descriptors and fall back to the node's current
 * value so a stale save can't silence an instrument.
 */
function sanitizeSavedParams(node, params) {
  if (!params || typeof params !== 'object' || Array.isArray(params)) return params;
  const out = {};
  for (const [key, value] of Object.entries(params)) {
    const d = typeof node.getDescriptor === 'function' ? node.getDescriptor(key) : undefined;
    if (d && d.unit === 'choice') {
      const v = coerceChoice(d, value);
      out[key] = v === undefined ? (typeof node.getParam === 'function' ? node.getParam(key) : d.default) : v;
    } else {
      out[key] = value;
    }
  }
  return out;
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
 * @param {Object} [context] - Render context for effects that need it
 * @returns {Promise<Object|null>} Rendered buffer or null
 */
async function renderInstrumentWithEffects(node, renderOptions, effectChains, instrumentId, sampleRate, bpm, context) {
  const voiceChains = getVoiceEffectChains(effectChains, instrumentId);
  const hasVoiceEffects = Object.keys(voiceChains).length > 0;
  const instrumentChain = effectChains?.[instrumentId] || [];

  // If no voice-level effects OR instrument doesn't support per-voice rendering
  if (!hasVoiceEffects || typeof node.renderVoices !== 'function') {
    let buffer = await node.renderPattern(renderOptions);

    if (buffer && instrumentChain.length > 0) {
      buffer = await processEffectChain(buffer, instrumentChain, sampleRate, bpm, context);
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
      processedVoices[voice] = await processEffectChain(buffer, chain, sampleRate, bpm, context);
    } else {
      processedVoices[voice] = buffer;
    }
  }

  // Mix voices together
  let mixedBuffer = mixVoiceBuffers(processedVoices, maxLength, sampleRate);

  // Apply instrument-level effect chain after mixing
  if (instrumentChain.length > 0) {
    mixedBuffer = await processEffectChain(mixedBuffer, instrumentChain, sampleRate, bpm, context);
  }

  return mixedBuffer;
}

/**
 * Is this instrument a drum machine whose pattern can trigger a sidechain?
 */
function isDrumInstrument(session, id) {
  const acc = typeof session.instrument === 'function' ? session.instrument(id) : null;
  if (acc) return acc.kind === 'drums';
  return id === 'jb01' || id === 'jt90';
}

/**
 * Resolve which track drives each rendered instrument. A track's nodeId may be
 * an instrument id, an added instance ('jb202-2') or an alias ('drums',
 * 'lead'); all resolve to the instrument they point at, so mute / solo /
 * volume / pan / sends actually apply. When several tracks point at one
 * instrument, the one keyed on the instrument's own id wins — the legacy
 * auto-created alias tracks never applied and must not start to.
 * @returns {{ trackFor: Map<string, Object>, anySolo: boolean }}
 */
function resolveTracks(session, instrumentIds) {
  const trackFor = new Map();
  let anySolo = false;
  const tracks = session.routing?.tracks;
  if (!tracks) return { trackFor, anySolo };

  const nodeOf = (id) => (typeof session.getNode === 'function' ? session.getNode(id) : session._nodes?.[id]) || null;
  const instrumentOf = (nodeId) => {
    if (instrumentIds.includes(nodeId)) return nodeId;
    const node = nodeOf(nodeId);
    return node ? (instrumentIds.find(id => nodeOf(id) === node) || null) : null;
  };

  for (const [, tr] of tracks) {
    const target = instrumentOf(tr.nodeId || tr.id);
    if (!target) continue;
    const current = trackFor.get(target);
    if (!current || (tr.id === target && current.id !== target)) trackFor.set(target, tr);
  }
  for (const tr of trackFor.values()) if (tr.solo) anySolo = true;
  return { trackFor, anySolo };
}

/**
 * Render a session to an AudioBuffer (no file IO). This is the whole
 * pipeline; renderSession() below is the thin "and write a WAV" wrapper
 * the CLI uses. Browsers call this directly and play the buffer.
 *
 * @param {Object} session - Jambot session object
 * @param {number} bars - Number of bars to render (ignored if arrangement is set)
 * @returns {Promise<{ buffer: AudioBuffer, message: string, bars: number, synths: string[] }>}
 */
export async function renderSessionToBuffer(session, bars) {

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

  // Every instrument instance, canonical ones first (session.instruments);
  // fall back to the fixed list for sessions built without the instance layer.
  const instrumentIds = typeof session.listInstruments === 'function'
    ? session.listInstruments().map(i => i.id)
    : ['jb01', 'jb200', 'jb202', 'jp9000', 'jbs', 'jt10', 'jt30', 'jt90'];
  const drumIds = instrumentIds.filter(id => session._nodes[id] && isDrumInstrument(session, id));

  // === SIDECHAIN TRIGGER CONTEXT ===
  // The sidechain reads drum hits from the pattern that actually plays against
  // the buffer it processes. In song mode that is each section's SAVED drum
  // pattern — not whatever happens to be loaded on the live node — and every
  // drum instance (jb01, jt90, jt90-2 …) is a candidate trigger source.
  const livePatterns = () => {
    const out = {};
    for (const id of drumIds) {
      const p = session._nodes[id].getPattern?.();
      if (p) out[id] = p;
    }
    return out;
  };
  let sectionContexts = null; // one per arrangement section (instrument/voice chains)
  let renderContext;          // whole-mix buffers (master chain, send returns)
  if (hasArrangement) {
    sectionContexts = arrangementPlan.map(section => {
      const triggerPatterns = {};
      for (const id of drumIds) {
        const name = section.patterns[id];
        const saved = name ? session.patterns[id]?.[name] : null;
        if (saved?.pattern) triggerPatterns[id] = saved.pattern;
      }
      return { session, stepDuration, triggerPatterns };
    });
    renderContext = {
      session,
      stepDuration,
      triggerSections: arrangementPlan.map((section, i) => ({
        offsetSamples: Math.floor(section.barStart * samplesPerBar),
        // the last section runs on into the release tail
        lengthSamples: i === arrangementPlan.length - 1
          ? Infinity
          : Math.floor(section.barEnd * samplesPerBar) - Math.floor(section.barStart * samplesPerBar),
        triggerPatterns: sectionContexts[i].triggerPatterns,
      })),
    };
  } else {
    renderContext = { session, stepDuration, triggerPatterns: livePatterns() };
  }

  // === TRACKS (volume/mute/solo/pan/sends from RoutingManager) ===
  const { trackFor, anySolo } = resolveTracks(session, instrumentIds);
  const sends = session.routing?.sends?.size ? session.routing.sends : null;
  // Only instruments that feed a send need their dry buffer after the mix.
  const feedsSend = (id) => {
    if (!sends) return false;
    const tr = trackFor.get(id);
    return !!tr && Object.entries(tr.sends || {}).some(([sendId, lvl]) => sends.has(sendId) && lvl);
  };

  // Mix one rendered buffer into the master at its bar offset.
  const mixIntoMaster = (id, buffer, startBar, level) => {
    const tr = trackFor.get(id);
    // Solo: anything without a soloed track is silent — including instruments
    // that have no track at all (instances added after routing was set up).
    if (tr?.mute || (anySolo && !tr?.solo)) return;

    const trackGain = tr ? Math.pow(10, (tr.volume || 0) / 20) : 1;
    // Equal-power pan: -100 (hard L) .. +100 (hard R); 0 = unity both sides
    const pan = tr ? Math.max(-100, Math.min(100, tr.pan || 0)) / 100 : 0;
    const theta = (pan + 1) * Math.PI / 4;
    const panGain = [Math.cos(theta) * Math.SQRT2, Math.sin(theta) * Math.SQRT2];

    const startSample = Math.floor(startBar * samplesPerBar);
    const mixLength = Math.min(outputBuffer.length - startSample, buffer.length);

    for (let ch = 0; ch < outputBuffer.numberOfChannels; ch++) {
      const mainData = outputBuffer.getChannelData(ch);
      const instData = buffer.getChannelData(ch % buffer.numberOfChannels);
      const g = level * trackGain * (outputBuffer.numberOfChannels > 1 ? panGain[ch % 2] : 1);
      for (let i = 0; i < mixLength; i++) {
        mainData[startSample + i] += instData[i] * g;
      }
    }
  };

  // === RENDER AND MIX EACH INSTRUMENT ===
  // Each buffer is mixed into the master as soon as it renders and then
  // dropped. Holding every instrument's full-length buffer until the end cost
  // ~85 MB per instrument on a 128-bar song. Buffers are kept only for
  // instruments routed to a send bus (the send needs the dry signal).
  const keptBuffers = []; // { id, buffer, startBar, level } — send feeds only
  const renderedIds = []; // instruments that produced at least one buffer
  const failures = [];    // { id, error } — surfaced in the render message

  for (const id of instrumentIds) {
    const node = session._nodes[id];
    if (!node) continue;

    const linearLevel = node.getOutputGain();
    const keep = feedsSend(id);
    const finish = (buffer, startBar) => {
      if (!buffer) return;
      if (!renderedIds.includes(id)) renderedIds.push(id);
      mixIntoMaster(id, buffer, startBar, linearLevel);
      if (keep) keptBuffers.push({ id, buffer, startBar, level: linearLevel });
    };

    if (hasArrangement) {
      // Render each section where this instrument has a pattern
      for (let i = 0; i < arrangementPlan.length; i++) {
        const section = arrangementPlan[i];
        const patternName = section.patterns[id];
        if (!patternName) continue;

        const savedPattern = session.patterns[id]?.[patternName];
        if (!savedPattern) {
          // set_arrangement refuses unsaved names now; a deserialized older
          // arrangement can still name one. Say so instead of skipping in silence.
          const err = `section ${i + 1}: pattern "${patternName}" not saved`;
          if (!failures.some(f => f.id === id && f.error === err)) failures.push({ id, error: err });
          continue;
        }

        // Effects are global: every section renders through the LIVE chains
        // (session.mixer.effectChains). save_pattern also snapshots the
        // instrument's chains into the pattern (channelInserts) and
        // load_pattern restores them, which is how per-section processing is
        // authored (load → add_channel_insert → save) — but rendering from the
        // snapshot instead would silently strip any effect added after a
        // pattern was saved (a sidechain added after save_pattern, a reverb
        // added late in a song build), so the snapshot is never rendered directly.
        const sectionChains = session.mixer?.effectChains;

        try {
          const buffer = await renderInstrumentWithEffects(
            node,
            {
              bars: section.barEnd - section.barStart,
              stepDuration,
              swing: session.clock.swing,
              sampleRate,
              pattern: savedPattern.pattern,
              params: sanitizeSavedParams(node, savedPattern.params),
              automation: savedPattern.automation,
            },
            sectionChains,
            id,
            sampleRate,
            session.bpm,
            sectionContexts[i]
          );
          finish(buffer, section.barStart);
        } catch (e) {
          console.warn(`Failed to render ${id} section:`, e.message);
          if (!failures.some(f => f.id === id)) failures.push({ id, error: e.message });
        }
      }
    } else {
      // Single pattern mode - render node's current pattern
      try {
        // Collect automation for this instrument from ParamSystem
        const instrumentAutomation = {};
        for (const [path, values] of session.params.automation) {
          if (path.startsWith(id + '.')) {
            // Strip instrument prefix: 'jb01.kick.decay' → 'kick.decay'
            instrumentAutomation[path.slice(id.length + 1)] = values;
          }
        }
        const hasAutomation = Object.keys(instrumentAutomation).length > 0;

        const buffer = await renderInstrumentWithEffects(
          node,
          {
            bars: renderBars,
            stepDuration,
            swing: session.clock.swing,
            sampleRate,
            automation: hasAutomation ? instrumentAutomation : undefined,
          },
          session.mixer?.effectChains,
          id,
          sampleRate,
          session.bpm,
          renderContext
        );
        finish(buffer, 0);
      } catch (e) {
        console.warn(`Failed to render ${id}:`, e.message);
        failures.push({ id, error: e.message });
      }
    }
  }

  // === PROCESS SEND BUSES ===
  if (sends) {
    for (const [sendId, send] of sends) {
      // Create empty send buffer
      const sendL = new Float32Array(outputBuffer.length);
      const sendR = new Float32Array(outputBuffer.length);

      // Accumulate contributions from all tracks routed to this send
      for (const [, track] of session.routing.tracks) {
        const sendLevel = track.sends[sendId];
        if (sendLevel === undefined || sendLevel === 0) continue;

        // The instruments this track drives (resolved above, one track per instrument)
        for (const { id, buffer, startBar, level } of keptBuffers) {
          if (trackFor.get(id) !== track) continue;

          const startSample = Math.floor(startBar * samplesPerBar);
          const mixLen = Math.min(outputBuffer.length - startSample, buffer.length);
          const bufL = buffer.getChannelData(0);
          const bufR = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : bufL;

          for (let i = 0; i < mixLen; i++) {
            sendL[startSample + i] += bufL[i] * level * sendLevel;
            sendR[startSample + i] += bufR[i] * level * sendLevel;
          }
        }
      }

      // Process the send buffer through the send's effect
      const sendBuffer = {
        numberOfChannels: 2,
        length: outputBuffer.length,
        sampleRate,
        getChannelData: (ch) => ch === 0 ? sendL : sendR,
      };

      const processor = EFFECT_PROCESSORS[send.effectType];
      if (!processor) continue;

      // Force 100% wet — sends should only return the effect signal.
      // The dry signal is already in the master from the instrument mix.
      const sendParams = { ...send.effectNode.getParams(), mix: 100 };
      const processed = processor(sendBuffer, sendParams, sampleRate, session.bpm, renderContext);

      // Mix wet-only return back into master output
      for (let ch = 0; ch < outputBuffer.numberOfChannels; ch++) {
        const mainData = outputBuffer.getChannelData(ch);
        const wetData = processed.getChannelData(ch % processed.numberOfChannels);
        const wetLen = Math.min(outputBuffer.length, processed.length);
        for (let i = 0; i < wetLen; i++) {
          mainData[i] += wetData[i] * send.level;
        }
      }
    }
  }
  keptBuffers.length = 0;

  // === APPLY MASTER EFFECT CHAIN ===
  const masterChain = session.mixer?.effectChains?.master;

  if (masterChain && masterChain.length > 0) {
    // Wrap outputBuffer to match our buffer interface
    const wrappedBuffer = {
      numberOfChannels: outputBuffer.numberOfChannels,
      length: outputBuffer.length,
      sampleRate: outputBuffer.sampleRate,
      getChannelData: (ch) => outputBuffer.getChannelData(ch),
    };

    const processedMaster = await processEffectChain(wrappedBuffer, masterChain, sampleRate, session.bpm, renderContext);

    // Copy processed data back to outputBuffer
    for (let ch = 0; ch < outputBuffer.numberOfChannels; ch++) {
      const mainData = outputBuffer.getChannelData(ch);
      const processedData = processedMaster.getChannelData(ch);
      for (let i = 0; i < outputBuffer.length; i++) {
        mainData[i] = processedData[i];
      }
    }
  }

  // === PEAK SAFETY ===
  // Instruments are summed with no limiter; three loud sources easily push
  // past 0 dBFS and the WAV/MP3 would clip. Scale the whole mix down to
  // -0.2 dBFS when it exceeds it — a gain change, so dynamics are untouched.
  let peak = 0;
  for (let ch = 0; ch < outputBuffer.numberOfChannels; ch++) {
    const d = outputBuffer.getChannelData(ch);
    for (let i = 0; i < d.length; i++) { const v = d[i] < 0 ? -d[i] : d[i]; if (v > peak) peak = v; }
  }
  const CEILING = 0.977; // -0.2 dBFS
  let trimDb = 0;
  if (peak > CEILING) {
    const g = CEILING / peak;
    trimDb = 20 * Math.log10(g);
    for (let ch = 0; ch < outputBuffer.numberOfChannels; ch++) {
      const d = outputBuffer.getChannelData(ch);
      for (let i = 0; i < d.length; i++) d[i] *= g;
    }
  }

  // Build output message
  const synths = renderedIds.map(id => id.toUpperCase());

  let message;
  if (hasArrangement) {
    const sectionCount = session.arrangement.length;
    message = `Rendered ${renderBars} bars (${sectionCount} sections) at ${session.bpm} BPM (${synths.join('+') || 'empty'})`;
  } else {
    message = `Rendered ${renderBars} bars at ${session.bpm} BPM (${synths.join('+') || 'empty'})`;
  }

  if (trimDb < 0) message += ` — mix trimmed ${trimDb.toFixed(1)} dB to avoid clipping; lower some levels`;
  if (failures.length) {
    message += `. FAILED TO RENDER: ${failures.map(f => `${f.id} (${f.error})`).join('; ')} — fix the parameters and render again`;
  }

  return { buffer: outputBuffer, message, bars: renderBars, synths, hasArrangement, peak, trimDb, failures };
}

/**
 * Render a session to a WAV file (CLI / headless path).
 * @param {Object} session - Jambot session object
 * @param {number} bars - Number of bars to render (ignored if arrangement is set)
 * @param {string} filename - Output filename
 * @returns {Promise<string>} Render result message
 */
export async function renderSession(session, bars, filename) {
  const { buffer, message } = await renderSessionToBuffer(session, bars);
  const wav = audioBufferToWav(buffer);
  writeFileSync(filename, Buffer.from(wav));
  return message;
}
