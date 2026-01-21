/**
 * Session Renderer
 *
 * Renders a Jambot session to WAV file using Web Audio OfflineAudioContext.
 * Handles arrangement mode, mixer configuration, and all synth engines.
 */

import { OfflineAudioContext, AudioContext } from 'node-web-audio-api';
import { writeFileSync } from 'fs';

// Make Web Audio APIs available globally (synth engines expect browser globals)
globalThis.OfflineAudioContext = OfflineAudioContext;
globalThis.AudioContext = AudioContext;

// Engine imports (dynamic in renderSession for fresh resolution)
import { TR909_KITS } from '../../web/public/909/dist/machines/tr909/presets.js';
import { JB200Engine } from '../../web/public/jb200/dist/machines/jb200/engine.js';
import { JB01Engine } from '../../web/public/jb01/dist/machines/jb01/engine.js';

// Local modules
import { audioBufferToWav } from './wav.js';
import { generatePlateReverbIR } from '../effects/reverb.js';
import { convertTweaks, toEngine, getParamDef } from '../params/converters.js';
import { SampleVoice } from '../sample-voice.js';

// EQ presets
const EQ_PRESETS = {
  acidBass: { highpass: 60, lowGain: 2, midGain: 3, midFreq: 800, highGain: -2 },
  crispHats: { highpass: 200, lowGain: -3, midGain: 0, midFreq: 3000, highGain: 2 },
  warmPad: { highpass: 80, lowGain: 2, midGain: -1, midFreq: 500, highGain: -3 },
  master: { highpass: 30, lowGain: 0, midGain: 0, midFreq: 1000, highGain: 1 },
  punchyKick: { highpass: 30, lowGain: 3, midGain: -2, midFreq: 400, highGain: 0 },
  cleanSnare: { highpass: 100, lowGain: -2, midGain: 2, midFreq: 2000, highGain: 1 },
};

// Filter presets (mode: lowpass/highpass/bandpass, cutoff in Hz, resonance 0-100)
const FILTER_PRESETS = {
  dubDelay: { mode: 'lowpass', cutoff: 800, resonance: 30 },
  telephone: { mode: 'bandpass', cutoff: 1500, resonance: 50 },
  lofi: { mode: 'lowpass', cutoff: 3000, resonance: 10 },
  darkRoom: { mode: 'lowpass', cutoff: 400, resonance: 40 },
  airFilter: { mode: 'highpass', cutoff: 500, resonance: 20 },
  thinOut: { mode: 'highpass', cutoff: 1000, resonance: 30 },
};

/**
 * Create 3-band EQ chain
 * @param {BaseAudioContext} ctx
 * @param {Object} params
 * @returns {{ input: GainNode, output: GainNode }}
 */
function createEQ(ctx, params = {}) {
  const p = params.preset ? { ...EQ_PRESETS[params.preset], ...params } : params;

  const input = ctx.createGain();
  const output = ctx.createGain();

  // Highpass filter
  const hpf = ctx.createBiquadFilter();
  hpf.type = 'highpass';
  hpf.frequency.value = p.highpass || 20;
  hpf.Q.value = 0.7;

  // Low shelf
  const lowShelf = ctx.createBiquadFilter();
  lowShelf.type = 'lowshelf';
  lowShelf.frequency.value = 200;
  lowShelf.gain.value = p.lowGain || 0;

  // Mid peak
  const midPeak = ctx.createBiquadFilter();
  midPeak.type = 'peaking';
  midPeak.frequency.value = p.midFreq || 1000;
  midPeak.Q.value = 1.5;
  midPeak.gain.value = p.midGain || 0;

  // High shelf
  const highShelf = ctx.createBiquadFilter();
  highShelf.type = 'highshelf';
  highShelf.frequency.value = 6000;
  highShelf.gain.value = p.highGain || 0;

  // Chain: input → HPF → lowShelf → midPeak → highShelf → output
  input.connect(hpf);
  hpf.connect(lowShelf);
  lowShelf.connect(midPeak);
  midPeak.connect(highShelf);
  highShelf.connect(output);

  return { input, output };
}

/**
 * Create resonant filter (lowpass/highpass/bandpass)
 * @param {BaseAudioContext} ctx
 * @param {Object} params
 * @returns {{ input: GainNode, output: GainNode, filterNode: BiquadFilterNode }}
 */
function createFilter(ctx, params = {}) {
  const p = params.preset ? { ...FILTER_PRESETS[params.preset], ...params } : params;

  const input = ctx.createGain();
  const output = ctx.createGain();

  const filter = ctx.createBiquadFilter();
  filter.type = p.mode || 'lowpass';
  filter.frequency.value = p.cutoff || 1000;
  // Convert resonance 0-100 to Q (0.5 to 20)
  const resonance = p.resonance ?? 0;
  filter.Q.value = 0.5 + (resonance / 100) * 19.5;

  input.connect(filter);
  filter.connect(output);

  return { input, output, filterNode: filter };
}

/**
 * Render a session to WAV file
 * @param {Object} session - Jambot session object
 * @param {number} bars - Number of bars to render (ignored if arrangement is set)
 * @param {string} filename - Output filename
 * @returns {Promise<string>} Render result message
 */
export async function renderSession(session, bars, filename) {
  // Dynamic imports to ensure fresh module resolution
  const { TR909Engine } = await import('../../web/public/909/dist/machines/tr909/engine-v3.js');
  const TB303Mod = await import('../../web/public/303/dist/machines/tb303/engine.js');
  const TB303Engine = TB303Mod.TB303Engine || TB303Mod.default;
  const SH101Mod = await import('../../web/public/101/dist/machines/sh101/engine.js');
  const SH101Engine = SH101Mod.SH101Engine || SH101Mod.default;

  // === ARRANGEMENT MODE ===
  // If arrangement is set, calculate total bars from sections and build a render plan
  const hasArrangement = session.arrangement && session.arrangement.length > 0;
  let renderBars = bars;
  let arrangementPlan = null;  // { barStart, barEnd, patterns } for each section

  if (hasArrangement) {
    // Build the render plan
    arrangementPlan = [];
    let currentBar = 0;
    for (const section of session.arrangement) {
      arrangementPlan.push({
        barStart: currentBar,
        barEnd: currentBar + section.bars,
        patterns: section.patterns
      });
      currentBar += section.bars;
    }
    renderBars = currentBar;
  }

  // Collect ALL channel inserts from ALL patterns (for arrangement mode)
  // This lets us create filter nodes that can be enabled/disabled per-section
  const allPatternInserts = new Map(); // channel -> array of insert configs from any pattern
  if (hasArrangement) {
    const instruments = ['drums', 'bass', 'lead', 'sampler', 'jb200'];
    for (const inst of instruments) {
      for (const [patternName, patternData] of Object.entries(session.patterns[inst] || {})) {
        if (patternData.channelInserts) {
          for (const [channel, inserts] of Object.entries(patternData.channelInserts)) {
            if (!allPatternInserts.has(channel)) {
              allPatternInserts.set(channel, inserts);
            }
            // Just keep first one found - we'll reconfigure at section boundaries
          }
        }
      }
    }
  }

  // Helper: get pattern data for a specific instrument at a given bar
  const getPatternForBar = (instrument, bar) => {
    if (!hasArrangement) {
      // Use current working pattern
      if (instrument === 'drums') return { pattern: session.drumPattern, params: session.drumParams, automation: session.drumAutomation, length: session.drumPatternLength };
      if (instrument === 'bass') return { pattern: session.bassPattern, params: session.bassParams };
      if (instrument === 'lead') return { pattern: session.leadPattern, params: session.leadParams };
      if (instrument === 'sampler') return { pattern: session.samplerPattern, params: session.samplerParams };
      if (instrument === 'jb200') return { pattern: session.jb200Pattern, params: session.jb200Params };
      return null;
    }

    // Find which section this bar is in
    const section = arrangementPlan.find(s => bar >= s.barStart && bar < s.barEnd);
    if (!section) return null;

    const patternName = section.patterns[instrument];
    if (!patternName) return null;  // Instrument silenced in this section

    const savedPattern = session.patterns[instrument]?.[patternName];
    if (!savedPattern) return null;

    return savedPattern;
  };

  const stepsPerBar = 16;
  const totalSteps = renderBars * stepsPerBar;

  // Get timing from master clock (single source of truth)
  const stepDuration = session.clock.stepDuration;

  // Drum-specific step duration based on scale mode
  const drumScaleMultipliers = {
    '16th': 1,           // Standard 16th notes
    '8th-triplet': 4/3,  // 8th triplets (slower, 12 per bar)
    '16th-triplet': 2/3, // 16th triplets (faster, 24 per bar)
    '32nd': 0.5          // 32nd notes (double speed)
  };
  const drumStepDuration = stepDuration * (drumScaleMultipliers[session.drumScale] || 1);
  const drumPatternLength = session.drumPatternLength || 16;

  const totalDuration = totalSteps * stepDuration + 2; // Extra time for release tails
  const sampleRate = 44100;

  const context = new OfflineAudioContext(2, totalDuration * sampleRate, sampleRate);

  // Workaround for node-web-audio-api WaveShaper.curve limitation:
  // node-web-audio-api throws "cannot assign curve twice" even on new WaveShapers
  // Patch createWaveShaper to return shapers with a safe curve setter
  const originalCreateWaveShaper = context.createWaveShaper.bind(context);
  context.createWaveShaper = function() {
    const shaper = originalCreateWaveShaper();
    let curveSet = false;
    const originalCurve = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(shaper), 'curve');
    Object.defineProperty(shaper, 'curve', {
      get() { return originalCurve?.get?.call(this); },
      set(value) {
        if (!curveSet) {
          curveSet = true;
          originalCurve?.set?.call(this, value);
        }
        // Silently ignore subsequent sets
      },
      configurable: true,
    });
    return shaper;
  };

  // Create master mixer
  const masterGain = context.createGain();
  masterGain.gain.value = 0.8;
  masterGain.connect(context.destination);

  // Create per-instrument output gain nodes (for node-level mixing)
  // Note: drumLevel/samplerLevel are in dB (-60 to +6), bassParams/leadParams.level are 0-1 engine values
  const drumsGain = context.createGain();
  const drumsLevel = session.drumLevel ?? 0;  // dB, default 0 = unity
  drumsGain.gain.value = Math.pow(10, drumsLevel / 20);
  drumsGain.connect(masterGain);

  const bassGain = context.createGain();
  // Bass level is stored as engine value (0-1), but we'll treat session.bassLevel as dB if present
  const bassLevel = session.bassLevel ?? 0;  // dB, default 0 = unity
  bassGain.gain.value = Math.pow(10, bassLevel / 20);
  bassGain.connect(masterGain);

  const leadGain = context.createGain();
  const leadLevel = session.leadLevel ?? 0;  // dB, default 0 = unity
  leadGain.gain.value = Math.pow(10, leadLevel / 20);
  leadGain.connect(masterGain);

  const samplerGain = context.createGain();
  const samplerLevel = session.samplerLevel ?? 0;  // dB, default 0 = unity
  samplerGain.gain.value = Math.pow(10, samplerLevel / 20);
  samplerGain.connect(masterGain);

  const jb200Gain = context.createGain();
  const jb200Level = session.jb200Level ?? 0;  // dB, default 0 = unity
  jb200Gain.gain.value = Math.pow(10, jb200Level / 20);
  jb200Gain.connect(masterGain);

  const jb01Gain = context.createGain();
  const jb01Level = session.jb01Level ?? 0;  // dB, default 0 = unity
  jb01Gain.gain.value = Math.pow(10, jb01Level / 20);
  jb01Gain.connect(masterGain);

  // === R9D9 (Drums) ===
  // Get kit - EXACTLY like web app's loadKit()
  const drumKit = TR909_KITS.find(k => k.id === session.drumKit) || TR909_KITS[0];
  const drums = new TR909Engine({ context });
  drums.connectOutput(drumsGain);  // Route through node gain

  // Step 1: Reset all per-voice engines to defaults (like web app)
  if (drums.resetAllVoiceEngines) {
    drums.resetAllVoiceEngines();
  }

  // Step 2-3: Force engine change (like web app)
  if (drumKit.engine && drums.setEngine) {
    drums.currentEngine = null; // Force re-init
    drums.setEngine(drumKit.engine);
  }

  // Step 4: Reset ALL voice params to defaults (like web app)
  const voiceNames = ['kick', 'snare', 'clap', 'ch', 'oh', 'ltom', 'mtom', 'htom', 'rimshot', 'crash', 'ride'];
  if (drums.getVoiceParameterDescriptors) {
    const descriptors = drums.getVoiceParameterDescriptors();
    Object.entries(descriptors).forEach(([voiceId, params]) => {
      params.forEach((param) => {
        try {
          drums.setVoiceParam(voiceId, param.id, param.defaultValue);
        } catch (e) {
          // Ignore - param may not exist on current engine
        }
      });
    });
  }

  // Step 5: Apply drum params (kit defaults + user tweaks, stored in producer units)
  // Only apply session.drumParams in single-pattern mode.
  // In arrangement mode, per-pattern params are applied during the render loop.
  if (!hasArrangement) {
    for (const voiceId of voiceNames) {
      const producerParams = session.drumParams[voiceId];
      if (producerParams && Object.keys(producerParams).length > 0) {
        // Convert producer units to engine units
        const engineParams = convertTweaks('r9d9', voiceId, producerParams);
        Object.entries(engineParams).forEach(([paramId, value]) => {
          try {
            drums.setVoiceParam(voiceId, paramId, value);
          } catch (e) {
            // Ignore - param may not exist on current engine
          }
        });
      }
    }
  }

  // Step 7: Apply per-voice engine selection
  if (session.drumVoiceEngines && drums.setVoiceEngine) {
    Object.entries(session.drumVoiceEngines).forEach(([voiceId, engine]) => {
      try {
        drums.setVoiceEngine(voiceId, engine);
      } catch (e) {
        // Ignore
      }
    });
  }

  // Step 8: Apply sample mode for hats/cymbals
  if (session.drumUseSample) {
    const sampleCapable = ['ch', 'oh', 'crash', 'ride'];
    sampleCapable.forEach(voiceId => {
      if (session.drumUseSample[voiceId] !== undefined) {
        const voice = drums.voices.get(voiceId);
        if (voice && voice.setUseSample) {
          voice.setUseSample(session.drumUseSample[voiceId]);
        }
      }
    });
  }

  // Step 9: Apply flam (globalAccent is applied during manual triggering below)
  if (session.drumFlam > 0 && drums.setFlam) {
    drums.setFlam(session.drumFlam);
  }

  // === R3D3 (Bass) ===
  const bass = new TB303Engine({ context, engine: 'E1' });
  bass.connectOutput(bassGain);  // Route through node gain
  const bassVoice = bass.voices.get('bass');
  // Apply bass params
  if (session.bassParams.waveform) {
    bass.setWaveform(session.bassParams.waveform);
  }
  Object.entries(session.bassParams).forEach(([key, value]) => {
    if (key !== 'waveform') {
      bass.setParameter(key, value);
    }
  });

  // === R1D1 (Lead) ===
  // For arrangement mode, pre-render each unique lead pattern and store with section offsets
  // For single-pattern mode, pre-render once
  const leadBuffers = [];  // { buffer, startBar, bars }

  if (hasArrangement) {
    // Collect unique lead patterns with their section info
    const leadSections = [];
    for (const section of arrangementPlan) {
      const patternName = section.patterns.lead;
      if (patternName && session.patterns.lead?.[patternName]) {
        leadSections.push({
          patternName,
          patternData: session.patterns.lead[patternName],
          startBar: section.barStart,
          bars: section.barEnd - section.barStart
        });
      }
    }

    // Pre-render each lead section
    for (const sec of leadSections) {
      const leadInitContext = new OfflineAudioContext(2, 44100, 44100);
      const lead = new SH101Engine({ context: leadInitContext, engine: 'E1' });

      // Apply params
      Object.entries(sec.patternData.params || {}).forEach(([key, value]) => {
        const paramKey = key === 'level' ? 'volume' : key;
        lead.setParameter(paramKey, value);
      });
      lead.setPattern(sec.patternData.pattern);

      if (sec.patternData.pattern?.some(s => s.gate)) {
        const buffer = await lead.renderPattern({ bars: sec.bars, bpm: session.bpm });
        leadBuffers.push({ buffer, startBar: sec.startBar, bars: sec.bars });
      }
    }
  } else {
    // Single pattern mode - original behavior
    const leadInitContext = new OfflineAudioContext(2, 44100, 44100);
    const lead = new SH101Engine({ context: leadInitContext, engine: 'E1' });
    Object.entries(session.leadParams).forEach(([key, value]) => {
      const paramKey = key === 'level' ? 'volume' : key;
      lead.setParameter(paramKey, value);
    });
    lead.setPattern(session.leadPattern);

    if (session.leadPattern.some(s => s.gate)) {
      const buffer = await lead.renderPattern({ bars: renderBars, bpm: session.bpm });
      leadBuffers.push({ buffer, startBar: 0, bars: renderBars });
    }
  }

  // === JB200 (Bass Monosynth) ===
  // For arrangement mode, pre-render each unique JB200 pattern and store with section offsets
  // For single-pattern mode, pre-render once
  const jb200Buffers = [];  // { buffer, startBar, bars }

  if (hasArrangement) {
    // Collect unique JB200 patterns with their section info
    const jb200Sections = [];
    for (const section of arrangementPlan) {
      const patternName = section.patterns.jb200;
      if (patternName && session.patterns.jb200?.[patternName]) {
        jb200Sections.push({
          patternName,
          patternData: session.patterns.jb200[patternName],
          startBar: section.barStart,
          bars: section.barEnd - section.barStart
        });
      }
    }

    // Pre-render each JB200 section
    for (const sec of jb200Sections) {
      const jb200InitContext = new OfflineAudioContext(2, 44100, 44100);
      const jb200 = new JB200Engine({ context: jb200InitContext });

      // Apply params
      Object.entries(sec.patternData.params || {}).forEach(([key, value]) => {
        jb200.setParameter(key, value);
      });
      jb200.setPattern(sec.patternData.pattern);

      if (sec.patternData.pattern?.some(s => s.gate)) {
        // Pass clock timing - engines don't need to know BPM
        const buffer = await jb200.renderPattern({
          bars: sec.bars,
          stepDuration: session.clock.stepDuration,
          sampleRate: session.clock.sampleRate,
        });
        jb200Buffers.push({ buffer, startBar: sec.startBar, bars: sec.bars });
      }
    }
  } else {
    // Single pattern mode - original behavior
    const jb200InitContext = new OfflineAudioContext(2, 44100, 44100);
    const jb200 = new JB200Engine({ context: jb200InitContext });

    // Get params explicitly from JB200Node (see ARCHITECTURE.md: Pre-Render Pattern)
    const jb200Params = session._nodes.jb200.getEngineParams();
    Object.entries(jb200Params).forEach(([key, value]) => {
      jb200.setParameter(key, value);
    });
    jb200.setPattern(session.jb200Pattern);

    if (session.jb200Pattern.some(s => s.gate)) {
      // Pass clock timing - engines don't need to know BPM
      const buffer = await jb200.renderPattern({
        bars: renderBars,
        stepDuration: session.clock.stepDuration,
        sampleRate: session.clock.sampleRate,
      });
      jb200Buffers.push({ buffer, startBar: 0, bars: renderBars });
    }
  }

  // === JB01 (Reference Drum Machine) ===
  // Pre-render JB01 drum patterns
  const jb01Buffers = [];  // { buffer, startBar, bars }

  if (hasArrangement) {
    // Collect JB01 patterns from arrangement
    const jb01Sections = [];
    for (const section of arrangementPlan) {
      const patternName = section.patterns.jb01;
      if (patternName && session.patterns.jb01?.[patternName]) {
        jb01Sections.push({
          patternName,
          patternData: session.patterns.jb01[patternName],
          startBar: section.barStart,
          bars: section.barEnd - section.barStart
        });
      }
    }

    // Pre-render each JB01 section
    for (const sec of jb01Sections) {
      const jb01InitContext = new OfflineAudioContext(2, 44100, 44100);
      const jb01 = new JB01Engine({ context: jb01InitContext });

      // Apply voice params
      const patternParams = sec.patternData.params || {};
      for (const [voice, voiceParams] of Object.entries(patternParams)) {
        for (const [param, value] of Object.entries(voiceParams)) {
          jb01.setVoiceParam(voice, param, value);
        }
      }

      // Check if pattern has any hits
      const pattern = sec.patternData.pattern || {};
      const hasHits = Object.values(pattern).some(track =>
        track.some(s => s && s.velocity > 0)
      );

      if (hasHits) {
        // Pass clock timing - engines don't need to know BPM
        const buffer = await jb01.renderPattern(pattern, {
          bars: sec.bars,
          stepDuration: session.clock.stepDuration,
          swing: session.clock.swing,
          sampleRate: session.clock.sampleRate,
        });
        jb01Buffers.push({ buffer, startBar: sec.startBar, bars: sec.bars });
      }
    }
  } else {
    // Single pattern mode
    const jb01Pattern = session.jb01Pattern;
    const jb01Params = session.jb01Params || {};

    // Check if pattern has any hits
    const hasHits = jb01Pattern && Object.values(jb01Pattern).some(track =>
      Array.isArray(track) && track.some(s => s && s.velocity > 0)
    );

    if (hasHits) {
      const jb01InitContext = new OfflineAudioContext(2, 44100, 44100);
      const jb01 = new JB01Engine({ context: jb01InitContext });

      // Apply voice params
      for (const [voice, voiceParams] of Object.entries(jb01Params)) {
        for (const [param, value] of Object.entries(voiceParams)) {
          jb01.setVoiceParam(voice, param, value);
        }
      }

      // Pass clock timing - engines don't need to know BPM
      const buffer = await jb01.renderPattern(jb01Pattern, {
        bars: renderBars,
        stepDuration: session.clock.stepDuration,
        swing: session.clock.swing,
        sampleRate: session.clock.sampleRate,
      });
      jb01Buffers.push({ buffer, startBar: 0, bars: renderBars });
    }
  }

  // === R9DS (Sampler) ===
  const samplerVoices = new Map();
  if (session.samplerKit) {
    for (const slot of session.samplerKit.slots) {
      if (slot.buffer) {
        const voice = new SampleVoice(slot.id, context);
        // Decode the buffer (it's raw WAV bytes, need to convert to AudioBuffer)
        try {
          // Convert Node.js Buffer to ArrayBuffer for decodeAudioData
          const arrayBuffer = slot.buffer.buffer.slice(
            slot.buffer.byteOffset,
            slot.buffer.byteOffset + slot.buffer.byteLength
          );
          const audioBuffer = await context.decodeAudioData(arrayBuffer);
          voice.setBuffer(audioBuffer);
          voice.setMeta(slot.name, slot.short);
          // Apply params
          const params = session.samplerParams[slot.id];
          if (params) {
            Object.entries(params).forEach(([key, value]) => {
              voice.setParameter(key, value);
            });
          }
          voice.connect(samplerGain);  // Route through node gain
          samplerVoices.set(slot.id, voice);
        } catch (e) {
          console.warn(`Could not decode sample for ${slot.id}:`, e.message);
        }
      }
    }
  }

  // === APPLY MIXER CONFIGURATION ===
  const mixerConfig = session.mixer || {};
  const sendBuses = new Map();  // name -> { input, effect, output }
  const sidechainTargets = new Map(); // target -> { gain, trigger, amount }

  // Create send buses (reverb or EQ)
  if (mixerConfig.sends) {
    for (const [busName, busConfig] of Object.entries(mixerConfig.sends)) {
      const sendInput = context.createGain();
      sendInput.gain.value = 1;
      let effectOutput = sendInput;

      if (busConfig.effect === 'reverb') {
        // Plate reverb using Dattorro-style algorithm
        const convolver = context.createConvolver();
        const reverbParams = busConfig.params || {};
        const reverbBuffer = generatePlateReverbIR(context, reverbParams);
        convolver.buffer = reverbBuffer;
        sendInput.connect(convolver);

        const wetGain = context.createGain();
        wetGain.gain.value = reverbParams.mix ?? 0.3;
        convolver.connect(wetGain);
        effectOutput = wetGain;

      } else if (busConfig.effect === 'eq') {
        // EQ send bus
        const eq = createEQ(context, busConfig.params || {});
        sendInput.connect(eq.input);
        effectOutput = eq.output;
      }

      effectOutput.connect(masterGain);
      sendBuses.set(busName, { input: sendInput, output: effectOutput });
    }
  }

  // Route voices to sends
  if (mixerConfig.voiceRouting) {
    for (const [voiceId, routeConfig] of Object.entries(mixerConfig.voiceRouting)) {
      let voiceOutput = null;

      // Drum voices
      if (['kick', 'snare', 'clap', 'ch', 'oh', 'ltom', 'mtom', 'htom', 'rimshot', 'crash', 'ride'].includes(voiceId)) {
        voiceOutput = drums.voices.get(voiceId)?.output;
      } else if (voiceId === 'bass') {
        voiceOutput = bassVoice?.output;
      } else if (voiceId.startsWith('s') && samplerVoices.has(voiceId)) {
        voiceOutput = samplerVoices.get(voiceId)?.output;
      }

      if (voiceOutput && routeConfig.sends) {
        for (const [busName, level] of Object.entries(routeConfig.sends)) {
          const bus = sendBuses.get(busName);
          if (bus) {
            const sendGain = context.createGain();
            sendGain.gain.value = level;
            voiceOutput.connect(sendGain);
            sendGain.connect(bus.input);
          }
        }
      }
    }
  }

  // Channel inserts (EQ, filter, ducker) - track which channels have been rerouted
  const channelOutputs = new Map(); // channel -> final output node
  const channelFilters = new Map(); // channel -> { filter: BiquadFilterNode, type: 'eq'|'filter' } for reconfiguring

  // Merge current mixer config with all pattern inserts (for arrangement mode)
  const allChannelInserts = { ...(mixerConfig.channelInserts || {}) };
  if (hasArrangement) {
    for (const [channel, inserts] of allPatternInserts) {
      if (!allChannelInserts[channel]) {
        allChannelInserts[channel] = inserts;
      }
    }
  }

  // Track which drum voices have individual inserts (so we don't double-connect them)
  const voicesWithInserts = new Set();

  if (Object.keys(allChannelInserts).length > 0) {
    for (const [channel, inserts] of Object.entries(allChannelInserts)) {
      // Get the channel's source output
      let sourceOutput = null;
      let destinationNode = masterGain; // Default destination

      if (channel === 'bass' && bass.masterGain) {
        sourceOutput = bass.masterGain;
      } else if (channel === 'drums' && drums.compressor) {
        sourceOutput = drums.compressor;
      } else if (['kick', 'snare', 'clap', 'rimshot', 'ch', 'oh', 'ltom', 'mtom', 'htom', 'crash', 'ride'].includes(channel)) {
        // Individual drum voice - insert filter on voice output
        // Note: filtered voices route to master (bypass drum compressor) since we can't insert into internal bus
        const voice = drums.voices.get(channel);
        if (voice?.output) {
          sourceOutput = voice.output;
          destinationNode = masterGain; // Route to master (bypasses drum compressor)
          voicesWithInserts.add(channel);
        }
      }

      if (!sourceOutput) continue;

      // Disconnect from current destination
      try { sourceOutput.disconnect(); } catch (e) { /* already disconnected */ }

      // Build insert chain
      let chainInput = sourceOutput;
      let chainOutput = null;

      for (const insert of inserts) {
        if (insert.type === 'eq') {
          const eqParams = { ...insert.params, preset: insert.preset };
          const eq = createEQ(context, eqParams);
          chainInput.connect(eq.input);
          chainInput = eq.output;
          chainOutput = eq.output;
          // Store for reconfiguration (EQ has multiple filters, store the high shelf)
          channelFilters.set(channel, { type: 'eq', eq });

        } else if (insert.type === 'filter') {
          const filterParams = { ...insert.params, preset: insert.preset };
          const filter = createFilter(context, filterParams);
          chainInput.connect(filter.input);
          chainInput = filter.output;
          chainOutput = filter.output;
          // Store the raw BiquadFilter for reconfiguration
          channelFilters.set(channel, { type: 'filter', filter: filter.filterNode });

        } else if (insert.type === 'ducker' && insert.params?.trigger) {
          const duckGain = context.createGain();
          duckGain.gain.value = 1;
          chainInput.connect(duckGain);
          chainInput = duckGain;
          chainOutput = duckGain;

          sidechainTargets.set(channel, {
            gain: duckGain,
            trigger: insert.params.trigger,
            amount: insert.params.amount ?? 0.5
          });
        }
      }

      // Connect chain output to destination (master for channels, drum bus for individual voices)
      if (chainOutput) {
        chainOutput.connect(destinationNode);
        channelOutputs.set(channel, chainOutput);
      } else {
        // No inserts applied, reconnect directly
        sourceOutput.connect(destinationNode);
      }
    }
  }

  // Master inserts (applied to the master bus before destination)
  let finalMaster = masterGain;
  if (mixerConfig.masterInserts && mixerConfig.masterInserts.length > 0) {
    masterGain.disconnect();

    let chainInput = masterGain;
    let chainOutput = masterGain;

    for (const insert of mixerConfig.masterInserts) {
      if (insert.type === 'eq') {
        const eqParams = { ...insert.params, preset: insert.preset };
        const eq = createEQ(context, eqParams);
        chainInput.connect(eq.input);
        chainInput = eq.output;
        chainOutput = eq.output;
      } else if (insert.type === 'filter') {
        const filterParams = { ...insert.params, preset: insert.preset };
        const filter = createFilter(context, filterParams);
        chainInput.connect(filter.input);
        chainInput = filter.output;
        chainOutput = filter.output;
      }
    }

    chainOutput.connect(context.destination);
    finalMaster = chainOutput;
  }

  // === Schedule all notes ===
  const swingAmount = session.swing / 100;
  const maxSwingDelay = stepDuration * 0.5;

  // Helper to convert note name to frequency
  const noteToFreq = (note) => {
    const noteMap = { 'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11 };
    const match = note.match(/^([A-G])([#b]?)(\d+)$/);
    if (!match) return 440;
    let n = noteMap[match[1]];
    if (match[2] === '#') n += 1;
    if (match[2] === 'b') n -= 1;
    const octave = parseInt(match[3]);
    const midi = n + (octave + 1) * 12;
    return 440 * Math.pow(2, (midi - 69) / 12);
  };

  // Track current section to apply params when section changes
  let lastDrumSection = null;
  let lastBassSection = null;
  let lastSamplerSection = null;
  let lastFilterSection = null;

  // Helper: Reconfigure a filter based on pattern's channelInserts (or bypass if none)
  const reconfigureFilter = (channel, patternInserts, atTime) => {
    const filterInfo = channelFilters.get(channel);
    if (!filterInfo || filterInfo.type !== 'filter') return;

    const filterNode = filterInfo.filter;
    if (!filterNode) return;

    // Find filter config in this pattern's inserts
    const inserts = patternInserts?.[channel];
    const filterInsert = inserts?.find(i => i.type === 'filter');

    if (filterInsert) {
      // Apply the filter config
      const p = filterInsert.preset ? { ...FILTER_PRESETS[filterInsert.preset], ...filterInsert.params } : filterInsert.params;
      filterNode.type = p.mode || 'lowpass';
      filterNode.frequency.setValueAtTime(p.cutoff || 1000, atTime);
      const resonance = p.resonance ?? 0;
      filterNode.Q.setValueAtTime(0.5 + (resonance / 100) * 19.5, atTime);
    } else {
      // Bypass: set to neutral (lowpass at 20000Hz passes everything)
      filterNode.type = 'lowpass';
      filterNode.frequency.setValueAtTime(20000, atTime);
      filterNode.Q.setValueAtTime(0.5, atTime);
    }
  };

  for (let i = 0; i < totalSteps; i++) {
    let time = i * stepDuration;
    const step = i % 16;
    const currentBar = Math.floor(i / 16);

    // Apply swing to off-beats (for bass/sampler)
    if (step % 2 === 1) {
      time += swingAmount * maxSwingDelay;
    }

    // === Channel inserts: reconfigure filters at section boundaries ===
    if (hasArrangement && channelFilters.size > 0) {
      const currentSection = arrangementPlan.find(s => currentBar >= s.barStart && currentBar < s.barEnd);
      if (currentSection !== lastFilterSection) {
        lastFilterSection = currentSection;
        // Get channelInserts from patterns used in this section
        for (const [channel] of channelFilters) {
          // Find which instrument owns this channel
          let patternInserts = null;
          if (channel === 'drums' || ['kick', 'snare', 'clap', 'ch', 'oh', 'ltom', 'mtom', 'htom', 'rimshot', 'crash', 'ride'].includes(channel)) {
            const drumPatternName = currentSection?.patterns?.drums;
            if (drumPatternName) {
              patternInserts = session.patterns.drums?.[drumPatternName]?.channelInserts;
            }
          } else if (channel === 'bass') {
            const bassPatternName = currentSection?.patterns?.bass;
            if (bassPatternName) {
              patternInserts = session.patterns.bass?.[bassPatternName]?.channelInserts;
            }
          } else if (channel === 'lead') {
            const leadPatternName = currentSection?.patterns?.lead;
            if (leadPatternName) {
              patternInserts = session.patterns.lead?.[leadPatternName]?.channelInserts;
            }
          } else if (channel === 'sampler') {
            const samplerPatternName = currentSection?.patterns?.sampler;
            if (samplerPatternName) {
              patternInserts = session.patterns.sampler?.[samplerPatternName]?.channelInserts;
            }
          }
          reconfigureFilter(channel, patternInserts, time);
        }
      }
    }

    // === R9D9 drums (uses arrangement-aware patterns) ===
    const drumData = getPatternForBar('drums', currentBar);
    if (drumData && drumData.pattern) {
      // Apply pattern params when section changes (for per-pattern level/tune/etc)
      const drumSectionKey = hasArrangement ? arrangementPlan.find(s => currentBar >= s.barStart && currentBar < s.barEnd) : null;
      if (drumSectionKey !== lastDrumSection) {
        lastDrumSection = drumSectionKey;
        // FIRST: Reset ALL voice params to defaults so automation/tweaks don't carry over
        // This ensures pattern B with no automation doesn't inherit pattern A's knob-mashed values
        if (drums.getVoiceParameterDescriptors) {
          const descriptors = drums.getVoiceParameterDescriptors();
          for (const voiceName of voiceNames) {
            const voiceDesc = descriptors[voiceName];
            if (voiceDesc) {
              for (const param of voiceDesc) {
                try {
                  drums.setVoiceParam(voiceName, param.id, param.defaultValue);
                } catch (e) { /* Ignore */ }
              }
            }
          }
        }
        // THEN: Apply this pattern's params (convert from producer to engine units)
        for (const [voiceName, voiceParams] of Object.entries(drumData.params || {})) {
          if (voiceParams && Object.keys(voiceParams).length > 0) {
            const engineParams = convertTweaks('r9d9', voiceName, voiceParams);
            Object.entries(engineParams).forEach(([paramId, value]) => {
              try {
                drums.setVoiceParam(voiceName, paramId, value);
              } catch (e) {
                // Ignore
              }
            });
          }
        }
      }

      const patternLength = drumData.length || 16;
      const drumStep = i % patternLength;  // Wrap based on pattern length
      let drumTime = i * drumStepDuration;
      // Apply swing to drum off-beats
      if (drumStep % 2 === 1) {
        drumTime += swingAmount * (drumStepDuration * 0.5);
      }

      for (const name of voiceNames) {
        if (drumData.pattern[name]?.[drumStep]?.velocity > 0) {
          const voice = drums.voices.get(name);
          if (voice) {
            // Apply automation for this step (knob mashing)
            // Automation values are in producer units (0-100, dB, etc.) - convert to engine units
            const voiceAutomation = drumData.automation?.[name];
            if (voiceAutomation) {
              for (const [paramId, stepValues] of Object.entries(voiceAutomation)) {
                const autoValue = stepValues[drumStep];
                if (autoValue !== null && autoValue !== undefined) {
                  // Convert from producer units to engine units
                  const def = getParamDef('r9d9', name, paramId);
                  const engineValue = def ? toEngine(autoValue, def) : autoValue;
                  voice[paramId] = engineValue;
                }
              }
            }
            voice.trigger(drumTime, drumData.pattern[name][drumStep].velocity);
          }

          // Schedule sidechain ducking if this voice is a trigger
          for (const [targetChannel, scConfig] of sidechainTargets) {
            if (scConfig.trigger === name) {
              const attackTime = 0.005; // 5ms attack
              const releaseTime = 0.15; // 150ms release
              const targetGain = 1 - scConfig.amount;

              scConfig.gain.gain.setValueAtTime(1, drumTime);
              scConfig.gain.gain.linearRampToValueAtTime(targetGain, drumTime + attackTime);
              scConfig.gain.gain.linearRampToValueAtTime(1, drumTime + attackTime + releaseTime);
            }
          }
        }
      }
    }

    // === R3D3 bass (uses arrangement-aware patterns) ===
    const bassData = getPatternForBar('bass', currentBar);
    if (bassData && bassData.pattern) {
      // Apply pattern params when section changes (for per-pattern level/cutoff/etc)
      const bassSectionKey = hasArrangement ? arrangementPlan.find(s => currentBar >= s.barStart && currentBar < s.barEnd) : null;
      if (bassSectionKey !== lastBassSection) {
        lastBassSection = bassSectionKey;
        // FIRST: Reset level to default so mutes don't carry over
        try { bass.setParameter('level', 1); } catch (e) { /* Ignore */ }
        // THEN: Apply this pattern's params to bass
        Object.entries(bassData.params || {}).forEach(([key, value]) => {
          if (key !== 'waveform') {
            bass.setParameter(key, value);
          }
        });
        if (bassData.params?.waveform) {
          bass.setWaveform(bassData.params.waveform);
        }
      }

      const bassStep = bassData.pattern[step];
      if (bassStep?.gate && bassVoice) {
        const freq = noteToFreq(bassStep.note);
        const nextStep = bassData.pattern[(step + 1) % 16];
        const shouldSlide = bassStep.slide && nextStep?.gate;
        const nextFreq = shouldSlide ? noteToFreq(nextStep.note) : null;
        bassVoice.trigger(time, 0.8, freq, bassStep.accent, shouldSlide, nextFreq);
      }
    }

    // R1D1 lead is pre-rendered above using engine.renderPattern()

    // === R9DS sampler (uses arrangement-aware patterns) ===
    const samplerData = getPatternForBar('sampler', currentBar);
    if (samplerData && samplerData.pattern) {
      // Apply pattern params when section changes
      const samplerSectionKey = hasArrangement ? arrangementPlan.find(s => currentBar >= s.barStart && currentBar < s.barEnd) : null;
      if (samplerSectionKey !== lastSamplerSection) {
        lastSamplerSection = samplerSectionKey;
        // FIRST: Reset all sampler voice levels to default so mutes don't carry over
        for (const [slotId, voice] of samplerVoices) {
          try { voice.setParameter('level', 1); } catch (e) { /* Ignore */ }
        }
        // THEN: Apply this pattern's params to sampler voices
        for (const [slotId, slotParams] of Object.entries(samplerData.params || {})) {
          const voice = samplerVoices.get(slotId);
          if (voice) {
            Object.entries(slotParams).forEach(([key, value]) => {
              voice.setParameter(key, value);
            });
          }
        }
      }

      for (const [slotId, voice] of samplerVoices) {
        if (samplerData.pattern[slotId]?.[step]?.velocity > 0) {
          voice.trigger(time, samplerData.pattern[slotId][step].velocity);
        }
      }
    }
  }

  // Count what we rendered (check both current patterns and arrangement)
  let hasDrums = Object.keys(session.drumPattern).length > 0;
  let hasBass = session.bassPattern.some(s => s.gate);
  let hasLead = session.leadPattern.some(s => s.gate);
  let hasJB200 = session.jb200Pattern.some(s => s.gate);
  let hasJB01 = jb01Buffers.length > 0;
  let hasSamples = Object.keys(session.samplerPattern).length > 0 && session.samplerKit;

  if (hasArrangement) {
    // Check if any section uses each instrument
    hasDrums = arrangementPlan.some(s => s.patterns.drums && session.patterns.drums[s.patterns.drums]);
    hasBass = arrangementPlan.some(s => s.patterns.bass && session.patterns.bass[s.patterns.bass]);
    hasLead = leadBuffers.length > 0;
    hasJB200 = jb200Buffers.length > 0;
    hasJB01 = jb01Buffers.length > 0;
    hasSamples = arrangementPlan.some(s => s.patterns.sampler && session.patterns.sampler[s.patterns.sampler]) && session.samplerKit;
  }

  const synths = [hasDrums && 'R9D9', hasBass && 'R3D3', hasLead && 'R1D1', hasJB200 && 'JB200', hasJB01 && 'JB01', hasSamples && 'R9DS'].filter(Boolean);

  return context.startRendering().then(buffer => {
    // Mix in pre-rendered lead buffers at their respective positions
    const samplesPerBar = session.clock.samplesPerBar;  // From master clock

    // Get lead output level as linear gain
    const leadMixLevel = leadGain.gain.value;

    for (const { buffer: leadBuffer, startBar } of leadBuffers) {
      const startSample = Math.floor(startBar * samplesPerBar);
      const mixLength = Math.min(buffer.length - startSample, leadBuffer.length);

      for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
        const mainData = buffer.getChannelData(ch);
        const leadData = leadBuffer.getChannelData(ch % leadBuffer.numberOfChannels);
        for (let i = 0; i < mixLength; i++) {
          mainData[startSample + i] += leadData[i] * leadMixLevel;  // Apply node-level gain
        }
      }
    }

    // Mix in pre-rendered JB200 buffers at their respective positions
    const jb200MixLevel = jb200Gain.gain.value;

    for (const { buffer: jb200Buffer, startBar } of jb200Buffers) {
      const startSample = Math.floor(startBar * samplesPerBar);
      const mixLength = Math.min(buffer.length - startSample, jb200Buffer.length);

      for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
        const mainData = buffer.getChannelData(ch);
        const jb200Data = jb200Buffer.getChannelData(ch % jb200Buffer.numberOfChannels);
        for (let i = 0; i < mixLength; i++) {
          mainData[startSample + i] += jb200Data[i] * jb200MixLevel;  // Apply node-level gain
        }
      }
    }

    // Mix in pre-rendered JB01 buffers at their respective positions
    const jb01MixLevel = jb01Gain.gain.value;

    for (const { buffer: jb01Buffer, startBar } of jb01Buffers) {
      const startSample = Math.floor(startBar * samplesPerBar);
      const mixLength = Math.min(buffer.length - startSample, jb01Buffer.length);

      for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
        const mainData = buffer.getChannelData(ch);
        const jb01Data = jb01Buffer.getChannelData(ch % jb01Buffer.numberOfChannels);
        for (let i = 0; i < mixLength; i++) {
          mainData[startSample + i] += jb01Data[i] * jb01MixLevel;  // Apply node-level gain
        }
      }
    }

    const wav = audioBufferToWav(buffer);
    writeFileSync(filename, Buffer.from(wav));

    // Output message varies based on mode
    if (hasArrangement) {
      const sectionCount = session.arrangement.length;
      return `Rendered ${renderBars} bars (${sectionCount} sections) at ${session.bpm} BPM (${synths.join('+') || 'empty'})`;
    }
    return `Rendered ${renderBars} bars at ${session.bpm} BPM (${synths.join('+') || 'empty'})`;
  });
}
