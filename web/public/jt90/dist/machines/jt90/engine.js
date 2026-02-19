/**
 * JT90 Drum Machine Engine
 *
 * Hybrid drum machine: analog synthesis + ROM samples, like the real 909.
 * - Kick, snare, clap, rimshot, toms: pure JS DSP synthesis
 * - CH, OH, crash, ride: sample playback (909Mars WAVs)
 *
 * All processing uses processSample() — identical pipeline for both types.
 */

import { KickVoice } from './voices/kick.js';
import { SnareVoice } from './voices/snare.js';
import { ClapVoice } from './voices/clap.js';
import { TomVoice } from './voices/tom.js';
import { RimshotVoice } from './voices/rimshot.js';
import { SampleVoice, decodeWav } from './voices/sample-voice.js';
import { JT90Sequencer } from './sequencer.js';
import { clamp, fastTanh } from '../../../../jb202/dist/dsp/utils/math.js';

// Sample voice configurations
// maxDecay must be ~5-10x the sample duration so decay=1 is nearly transparent
// CH: 192ms, OH: 590ms, Crash: 951ms, Ride: 960ms
const SAMPLE_CONFIGS = {
  ch:    { file: 'ch.wav',    minDecay: 0.01, maxDecay: 2.0,  hasChoke: false, hasTone: true },
  oh:    { file: 'oh.wav',    minDecay: 0.05, maxDecay: 5.0,  hasChoke: true,  hasTone: true },
  crash: { file: 'crash.wav', minDecay: 0.3,  maxDecay: 10.0, hasChoke: false, hasTone: false },
  ride:  { file: 'ride.wav',  minDecay: 0.2,  maxDecay: 8.0,  hasChoke: false, hasTone: false },
};

// Voice IDs
const VOICE_IDS = ['kick', 'snare', 'clap', 'rimshot', 'ch', 'oh', 'ltom', 'mtom', 'htom', 'crash', 'ride'];

/**
 * JT90Engine - 909-style drum machine
 */
export class JT90Engine {
  constructor(options = {}) {
    this.sampleRate = options.sampleRate ?? 44100;
    this.masterVolume = options.masterVolume ?? 0.8;

    // Create voices
    this._voices = null;

    // Sequencer
    this.sequencer = new JT90Sequencer({
      steps: 16,
      bpm: options.bpm ?? 125
    });
    this.sequencer.onStep = this._handleSequencerStep.bind(this);

    // Web Audio context
    this.context = options.context ?? null;
    this._scriptNode = null;
    this._isRealTimePlaying = false;

    // Open hi-hat tracking for choke
    this._openHatActive = false;

    // Sample data for ROM voices (loaded async)
    this._sampleData = null;   // { ch: { samples, sampleRate }, oh: ..., crash: ..., ride: ... }
    this._samplesBasePath = options.samplesPath ?? '../../samples';
  }

  _ensureVoices() {
    const sr = this.context?.sampleRate ?? this.sampleRate;

    if (!this._voices) {
      this._voices = {
        kick: new KickVoice(sr),
        snare: new SnareVoice(sr),
        clap: new ClapVoice(sr),
        rimshot: new RimshotVoice(sr),
        ch: this._createSampleVoice('ch', sr),
        oh: this._createSampleVoice('oh', sr),
        ltom: new TomVoice(sr, 'low'),
        mtom: new TomVoice(sr, 'mid'),
        htom: new TomVoice(sr, 'high'),
        crash: this._createSampleVoice('crash', sr),
        ride: this._createSampleVoice('ride', sr),
      };
    }

    return this._voices;
  }

  /**
   * Create a SampleVoice for a ROM voice.
   * Returns a silent stub if samples haven't loaded yet.
   */
  _createSampleVoice(voiceId, sampleRate) {
    const cfg = SAMPLE_CONFIGS[voiceId];
    const data = this._sampleData?.[voiceId];

    if (!data) {
      // Samples not loaded — return a silent stub with the right API
      return {
        tune: 0, decay: cfg.minDecay, tone: 0.5, level: 1.0,
        active: false,
        trigger() {},
        choke() {},
        processSample() { return 0; },
        setParameter() {},
        isActive() { return false; },
      };
    }

    return new SampleVoice(sampleRate, data.samples, {
      sampleSampleRate: data.sampleRate,
      minDecay: cfg.minDecay,
      maxDecay: cfg.maxDecay,
      hasChoke: cfg.hasChoke,
      hasTone: cfg.hasTone,
    });
  }

  /**
   * Load WAV samples for ROM voices (CH, OH, crash, ride).
   * Call this before starting playback. Safe to call multiple times.
   */
  async loadSamples(basePath) {
    if (this._sampleData) return;  // Already loaded

    const base = basePath || this._samplesBasePath;
    const entries = Object.entries(SAMPLE_CONFIGS);

    const results = await Promise.all(
      entries.map(async ([voiceId, cfg]) => {
        const url = `${base}/${cfg.file}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to load sample: ${url}`);
        const arrayBuffer = await response.arrayBuffer();
        return [voiceId, decodeWav(arrayBuffer)];
      })
    );

    this._sampleData = {};
    for (const [voiceId, data] of results) {
      this._sampleData[voiceId] = data;
    }

    // If voices were already created (as stubs), replace them
    if (this._voices) {
      const sr = this.context?.sampleRate ?? this.sampleRate;
      for (const voiceId of Object.keys(SAMPLE_CONFIGS)) {
        const newVoice = this._createSampleVoice(voiceId, sr);
        // Apply VOICE_PARAMS defaults (stubs have no-op setParameter, so
        // any values set via loadKit were lost — use the canonical defaults)
        const params = JT90Engine.VOICE_PARAMS[voiceId];
        if (params) {
          for (const p of params) {
            const engineVal = p.unit === 'semitones' ? p.defaultValue * 100 : p.defaultValue;
            newVoice.setParameter(p.id, engineVal);
          }
        }
        this._voices[voiceId] = newVoice;
      }
    }
  }

  // === Volume and Accent ===

  setVolume(level) {
    this.masterVolume = Math.max(0, Math.min(1, level));
  }

  getVolume() {
    return this.masterVolume;
  }

  setAccentLevel(level) {
    this._accentLevel = Math.max(0, Math.min(1, level));
  }

  getAccentLevel() {
    return this._accentLevel ?? 1.0;
  }

  // === Parameter API ===

  // Voice parameter descriptors for UI
  static VOICE_PARAMS = {
    kick: [
      { id: 'tune', label: 'Tune', min: -12, max: 12, defaultValue: 0, unit: 'semitones' },
      { id: 'decay', label: 'Decay', min: 0, max: 1, defaultValue: 0.5 },
      { id: 'attack', label: 'Attack', min: 0, max: 1, defaultValue: 0.5 },
      { id: 'sweep', label: 'Sweep', min: 0, max: 1, defaultValue: 0.5 },
      { id: 'level', label: 'Level', min: 0, max: 1, defaultValue: 1 },
    ],
    snare: [
      { id: 'tune', label: 'Tune', min: -12, max: 12, defaultValue: 0, unit: 'semitones' },
      { id: 'decay', label: 'Decay', min: 0, max: 1, defaultValue: 0.4 },
      { id: 'snappy', label: 'Snappy', min: 0, max: 1, defaultValue: 0.5 },
      { id: 'tone', label: 'Tone', min: 0, max: 1, defaultValue: 0.5 },
      { id: 'level', label: 'Level', min: 0, max: 1, defaultValue: 1 },
    ],
    clap: [
      { id: 'decay', label: 'Decay', min: 0, max: 1, defaultValue: 0.03 },
      { id: 'tone', label: 'Tone', min: 0, max: 1, defaultValue: 0.13 },
      { id: 'level', label: 'Level', min: 0, max: 1, defaultValue: 1 },
    ],
    rimshot: [
      { id: 'tune', label: 'Tune', min: -12, max: 12, defaultValue: -7, unit: 'semitones' },
      { id: 'decay', label: 'Decay', min: 0, max: 1, defaultValue: 0.1 },
      { id: 'level', label: 'Level', min: 0, max: 1, defaultValue: 1 },
    ],
    ch: [
      { id: 'tune', label: 'Tune', min: -12, max: 12, defaultValue: 0, unit: 'semitones' },
      { id: 'decay', label: 'Decay', min: 0, max: 1, defaultValue: 1 },
      { id: 'tone', label: 'Tone', min: 0, max: 1, defaultValue: 1 },
      { id: 'level', label: 'Level', min: 0, max: 1, defaultValue: 1 },
    ],
    oh: [
      { id: 'tune', label: 'Tune', min: -12, max: 12, defaultValue: 0, unit: 'semitones' },
      { id: 'decay', label: 'Decay', min: 0, max: 1, defaultValue: 1 },
      { id: 'tone', label: 'Tone', min: 0, max: 1, defaultValue: 1 },
      { id: 'level', label: 'Level', min: 0, max: 1, defaultValue: 1 },
    ],
    ltom: [
      { id: 'tune', label: 'Tune', min: -12, max: 12, defaultValue: 0, unit: 'semitones' },
      { id: 'decay', label: 'Decay', min: 0, max: 1, defaultValue: 1 },
      { id: 'level', label: 'Level', min: 0, max: 1, defaultValue: 1 },
    ],
    mtom: [
      { id: 'tune', label: 'Tune', min: -12, max: 12, defaultValue: -5, unit: 'semitones' },
      { id: 'decay', label: 'Decay', min: 0, max: 1, defaultValue: 0.8 },
      { id: 'level', label: 'Level', min: 0, max: 1, defaultValue: 1 },
    ],
    htom: [
      { id: 'tune', label: 'Tune', min: -12, max: 12, defaultValue: -5, unit: 'semitones' },
      { id: 'decay', label: 'Decay', min: 0, max: 1, defaultValue: 0.55 },
      { id: 'level', label: 'Level', min: 0, max: 1, defaultValue: 1 },
    ],
    crash: [
      { id: 'tune', label: 'Tune', min: -12, max: 12, defaultValue: 0, unit: 'semitones' },
      { id: 'decay', label: 'Decay', min: 0, max: 1, defaultValue: 1 },
      { id: 'level', label: 'Level', min: 0, max: 1, defaultValue: 1 },
    ],
    ride: [
      { id: 'tune', label: 'Tune', min: -12, max: 12, defaultValue: 0, unit: 'semitones' },
      { id: 'decay', label: 'Decay', min: 0, max: 1, defaultValue: 1 },
      { id: 'level', label: 'Level', min: 0, max: 1, defaultValue: 1 },
    ],
  };

  getVoiceParams(voiceId) {
    return JT90Engine.VOICE_PARAMS[voiceId] ?? [];
  }

  getAllVoiceParams() {
    this._ensureVoices();
    const result = {};
    for (const voiceId of VOICE_IDS) {
      const params = JT90Engine.VOICE_PARAMS[voiceId];
      if (!params) continue;
      result[voiceId] = {};
      for (const param of params) {
        const value = this._voices[voiceId]?.[param.id];
        if (value !== undefined && value !== param.defaultValue) {
          result[voiceId][param.id] = value;
        }
      }
      if (Object.keys(result[voiceId]).length === 0) {
        delete result[voiceId];
      }
    }
    return result;
  }

  setVoiceParameter(voiceId, paramId, value) {
    this._ensureVoices();
    const voice = this._voices[voiceId];
    if (voice) {
      voice.setParameter(paramId, value);
    }
  }

  getVoiceParameter(voiceId, paramId) {
    this._ensureVoices();
    const voice = this._voices[voiceId];
    return voice?.[paramId] ?? 0;
  }

  // === Track API (aliases for sequencer) ===

  getTrackPattern(voiceId) {
    const pattern = this.sequencer.getPattern();
    return pattern[voiceId] ?? [];
  }

  setTrackStep(voiceId, step, data) {
    this.sequencer.setStep(voiceId, step, data);
  }

  getFullPattern() {
    return this.sequencer.getPattern();
  }

  // === Trigger API ===

  trigger(voiceId, velocity = 1.0) {
    this._ensureVoices();
    const voice = this._voices[voiceId];
    if (!voice) return;

    // Hi-hat choke: closed hat cuts open hat
    if (voiceId === 'ch' && this._voices.oh.isActive()) {
      this._voices.oh.choke();
    }

    voice.trigger(velocity);

    // Track open hat for choke
    if (voiceId === 'oh') {
      this._openHatActive = true;
    }
  }

  // Alias for trigger
  triggerVoice(voiceId, velocity = 1.0) {
    this.trigger(voiceId, velocity);
  }

  // === Sequencer API ===

  setBpm(bpm) { this.sequencer.setBpm(bpm); }
  getBpm() { return this.sequencer.getBpm(); }
  setPattern(pattern) { this.sequencer.setPattern(pattern); }
  getPattern() { return this.sequencer.getPattern(); }
  setStep(voiceId, step, data) { this.sequencer.setStep(voiceId, step, data); }
  getStep(voiceId, step) { return this.sequencer.getStep(voiceId, step); }
  setSwing(amount) { this.sequencer.setSwing(amount); }
  getSwing() { return this.sequencer.getSwing(); }
  setPatternLength(length) { this.sequencer.setPatternLength(length); }
  getPatternLength() { return this.sequencer.getPatternLength(); }
  setScale(scale) { this.sequencer.setScale(scale); }
  getScale() { return this.sequencer.getScale(); }

  // === Real-time Playback ===

  async startSequencer() {
    // Create audio context if needed
    if (!this.context) {
      this.context = new (window.AudioContext || window.webkitAudioContext)();
    }

    // Resume if suspended (for autoplay policy)
    if (this.context.state === 'suspended') {
      await this.context.resume();
    }

    this._ensureVoices();

    const bufferSize = 1024;
    this._scriptNode = this.context.createScriptProcessor(bufferSize, 0, 2);
    this._scriptNode.onaudioprocess = this._processAudio.bind(this);
    this._scriptNode.connect(this.context.destination);

    this._isRealTimePlaying = true;
    this.sequencer.setContext(this.context);
    this.sequencer.start();
  }

  stopSequencer() {
    this.sequencer.stop();
    this._isRealTimePlaying = false;

    if (this._scriptNode) {
      setTimeout(() => {
        if (this._scriptNode && !this._isRealTimePlaying) {
          this._scriptNode.disconnect();
          this._scriptNode = null;
        }
      }, 500);
    }
  }

  isPlaying() { return this.sequencer.isRunning(); }

  _handleSequencerStep(step, events) {
    if (!this._voices) return;

    events.forEach(event => {
      this.trigger(event.voice, event.velocity * (event.accent ? 1.1 : 1));
    });

    // Notify UI
    this.onStepChange?.(step);
  }

  _processAudio(event) {
    if (!this._voices) return;

    const outputL = event.outputBuffer.getChannelData(0);
    const outputR = event.outputBuffer.getChannelData(1);

    for (let i = 0; i < outputL.length; i++) {
      let sample = 0;

      // Sum all active voices
      for (const voiceId of VOICE_IDS) {
        const voice = this._voices[voiceId];
        if (voice.isActive()) {
          sample += voice.processSample();
        }
      }

      // Soft limiting
      sample = fastTanh(sample * 0.7) / fastTanh(0.7);
      sample *= this.masterVolume;

      outputL[i] = sample;
      outputR[i] = sample;
    }
  }

  // === Offline Rendering ===

  async renderPattern(options = {}) {
    const {
      bars = 1,
      bpm = null,
      sampleRate = this.sampleRate,
      pattern = null,
      swing = null,
      automation = null,
    } = options;

    const renderBpm = bpm ?? this.sequencer.getBpm();
    const renderPattern = pattern ?? this.sequencer.getPattern();
    const renderSwing = swing ?? this.sequencer.getSwing();

    const stepsPerBar = 16;
    const totalSteps = bars * stepsPerBar;
    const baseStepDuration = 60 / renderBpm / 4;
    const swingFactor = renderSwing * 0.5;

    // Calculate total duration with swing
    let totalDuration = 0;
    for (let step = 0; step < totalSteps; step++) {
      const interval = renderSwing > 0
        ? baseStepDuration * (step % 2 === 1 ? 1 + swingFactor : 1 - swingFactor)
        : baseStepDuration;
      totalDuration += interval;
    }
    totalDuration += 2;  // Add tail for decay

    const totalSamples = Math.ceil(totalDuration * sampleRate);
    const output = new Float32Array(totalSamples);

    // Create fresh voices for offline rendering
    const voices = {
      kick: new KickVoice(sampleRate),
      snare: new SnareVoice(sampleRate),
      clap: new ClapVoice(sampleRate),
      rimshot: new RimshotVoice(sampleRate),
      ch: this._createSampleVoice('ch', sampleRate),
      oh: this._createSampleVoice('oh', sampleRate),
      ltom: new TomVoice(sampleRate, 'low'),
      mtom: new TomVoice(sampleRate, 'mid'),
      htom: new TomVoice(sampleRate, 'high'),
      crash: this._createSampleVoice('crash', sampleRate),
      ride: this._createSampleVoice('ride', sampleRate),
    };

    // Copy current voice parameters
    if (this._voices) {
      for (const voiceId of VOICE_IDS) {
        const srcVoice = this._voices[voiceId];
        const dstVoice = voices[voiceId];
        // Copy common parameters
        ['tune', 'decay', 'level', 'attack', 'sweep', 'tone', 'snappy'].forEach(param => {
          if (srcVoice[param] !== undefined) {
            dstVoice[param] = srcVoice[param];
          }
        });
      }
    }

    let currentTime = 0;
    let sampleIndex = 0;

    for (let step = 0; step < totalSteps; step++) {
      const patternStep = step % stepsPerBar;

      // Apply per-step automation (values already in engine units)
      if (automation) {
        for (const [path, values] of Object.entries(automation)) {
          const dotIdx = path.indexOf('.');
          if (dotIdx === -1) continue;
          const voiceId = path.slice(0, dotIdx);
          const paramId = path.slice(dotIdx + 1);
          const val = values[patternStep % values.length];
          if (val !== null && val !== undefined) {
            const voice = voices[voiceId];
            if (voice) voice[paramId] = val;
          }
        }
      }

      // Collect events for this step
      const events = this._collectEventsForStep(renderPattern, patternStep);

      // Trigger voices
      events.forEach(event => {
        const voice = voices[event.voice];
        if (voice) {
          // Hi-hat choke
          if (event.voice === 'ch' && voices.oh.isActive()) {
            voices.oh.choke();
          }
          voice.trigger(event.velocity * (event.accent ? 1.1 : 1));
        }
      });

      // Calculate step duration with swing
      const stepDuration = renderSwing > 0
        ? baseStepDuration * (step % 2 === 1 ? 1 + swingFactor : 1 - swingFactor)
        : baseStepDuration;

      const stepSamples = Math.floor(stepDuration * sampleRate);

      // Process samples for this step
      for (let i = 0; i < stepSamples && sampleIndex < totalSamples; i++, sampleIndex++) {
        let sample = 0;

        for (const voiceId of VOICE_IDS) {
          const voice = voices[voiceId];
          if (voice.isActive()) {
            sample += voice.processSample();
          }
        }

        // Soft limiting
        sample = fastTanh(sample * 0.7) / fastTanh(0.7);
        sample *= this.masterVolume;

        output[sampleIndex] = sample;
      }

      currentTime += stepDuration;
    }

    // Process remaining samples for decay tails
    while (sampleIndex < totalSamples) {
      let sample = 0;
      let anyActive = false;

      for (const voiceId of VOICE_IDS) {
        const voice = voices[voiceId];
        if (voice.isActive()) {
          sample += voice.processSample();
          anyActive = true;
        }
      }

      if (!anyActive) break;

      sample = fastTanh(sample * 0.7) / fastTanh(0.7);
      sample *= this.masterVolume;

      output[sampleIndex++] = sample;
    }

    return {
      sampleRate,
      length: sampleIndex,
      duration: sampleIndex / sampleRate,
      numberOfChannels: 1,
      getChannelData: (channel) => channel === 0 ? output.slice(0, sampleIndex) : null,
      _data: output.slice(0, sampleIndex)
    };
  }

  _collectEventsForStep(pattern, step) {
    const events = [];

    for (const voiceId of VOICE_IDS) {
      const track = pattern[voiceId];
      if (!track || !track[step]) continue;

      const stepData = track[step];
      if (stepData.velocity > 0) {
        events.push({
          voice: voiceId,
          velocity: stepData.velocity,
          accent: stepData.accent
        });
      }
    }

    return events;
  }

  getOutput() { return this._scriptNode ?? null; }

  // === WAV Export ===

  async audioBufferToBlob(buffer) {
    // Simple WAV encoding
    const numChannels = 1;
    const sampleRate = buffer.sampleRate;
    const data = buffer._data ?? buffer.getChannelData(0);
    const length = data.length;
    const bytesPerSample = 2;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = length * blockAlign;

    const bufferSize = 44 + dataSize;
    const arrayBuffer = new ArrayBuffer(bufferSize);
    const view = new DataView(arrayBuffer);

    // RIFF header
    this._writeString(view, 0, 'RIFF');
    view.setUint32(4, bufferSize - 8, true);
    this._writeString(view, 8, 'WAVE');

    // fmt chunk
    this._writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bytesPerSample * 8, true);

    // data chunk
    this._writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    // Write samples
    let offset = 44;
    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, data[i]));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  _writeString(view, offset, str) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  dispose() {
    this.stopSequencer();
    if (this._scriptNode) {
      this._scriptNode.disconnect();
      this._scriptNode = null;
    }
    this._voices = null;
  }

  // Static voice list
  static get VOICES() { return VOICE_IDS; }
}

export default JT90Engine;
