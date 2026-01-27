/**
 * JT90 Drum Machine Engine
 *
 * ONE SYNTH: All voices use pure JS DSP, identical output in browser and Node.js.
 * No duplicate code paths. No drift.
 *
 * Voices:
 * - kick, snare, clap, rimshot
 * - ch (closed hat), oh (open hat)
 * - ltom, mtom, htom
 * - crash, ride
 */

import { KickVoice } from './voices/kick.js';
import { SnareVoice } from './voices/snare.js';
import { ClapVoice } from './voices/clap.js';
import { HiHatVoice } from './voices/hihat.js';
import { TomVoice } from './voices/tom.js';
import { CymbalVoice } from './voices/cymbal.js';
import { RimshotVoice } from './voices/rimshot.js';
import { JT90Sequencer } from './sequencer.js';
import { clamp, fastTanh } from '../../../../jb202/dist/dsp/utils/math.js';

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
  }

  _ensureVoices() {
    const sr = this.context?.sampleRate ?? this.sampleRate;

    if (!this._voices) {
      this._voices = {
        kick: new KickVoice(sr),
        snare: new SnareVoice(sr),
        clap: new ClapVoice(sr),
        rimshot: new RimshotVoice(sr),
        ch: new HiHatVoice(sr, 'closed'),
        oh: new HiHatVoice(sr, 'open'),
        ltom: new TomVoice(sr, 'low'),
        mtom: new TomVoice(sr, 'mid'),
        htom: new TomVoice(sr, 'high'),
        crash: new CymbalVoice(sr, 'crash'),
        ride: new CymbalVoice(sr, 'ride')
      };
    }

    return this._voices;
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
      { id: 'tune', label: 'Tune', min: -1200, max: 1200, defaultValue: 0, unit: 'cents' },
      { id: 'decay', label: 'Decay', min: 0, max: 1, defaultValue: 0.5 },
      { id: 'attack', label: 'Attack', min: 0, max: 1, defaultValue: 0.5 },
      { id: 'sweep', label: 'Sweep', min: 0, max: 1, defaultValue: 0.5 },
      { id: 'level', label: 'Level', min: 0, max: 1, defaultValue: 1 },
    ],
    snare: [
      { id: 'tune', label: 'Tune', min: -1200, max: 1200, defaultValue: 0, unit: 'cents' },
      { id: 'decay', label: 'Decay', min: 0, max: 1, defaultValue: 0.4 },
      { id: 'snappy', label: 'Snappy', min: 0, max: 1, defaultValue: 0.5 },
      { id: 'tone', label: 'Tone', min: 0, max: 1, defaultValue: 0.5 },
      { id: 'level', label: 'Level', min: 0, max: 1, defaultValue: 1 },
    ],
    clap: [
      { id: 'decay', label: 'Decay', min: 0, max: 1, defaultValue: 0.5 },
      { id: 'tone', label: 'Tone', min: 0, max: 1, defaultValue: 0.5 },
      { id: 'level', label: 'Level', min: 0, max: 1, defaultValue: 1 },
    ],
    rimshot: [
      { id: 'tune', label: 'Tune', min: -1200, max: 1200, defaultValue: 0, unit: 'cents' },
      { id: 'decay', label: 'Decay', min: 0, max: 1, defaultValue: 0.3 },
      { id: 'level', label: 'Level', min: 0, max: 1, defaultValue: 1 },
    ],
    ch: [
      { id: 'tune', label: 'Tune', min: -1200, max: 1200, defaultValue: 0, unit: 'cents' },
      { id: 'decay', label: 'Decay', min: 0, max: 1, defaultValue: 0.2 },
      { id: 'tone', label: 'Tone', min: 0, max: 1, defaultValue: 0.5 },
      { id: 'level', label: 'Level', min: 0, max: 1, defaultValue: 1 },
    ],
    oh: [
      { id: 'tune', label: 'Tune', min: -1200, max: 1200, defaultValue: 0, unit: 'cents' },
      { id: 'decay', label: 'Decay', min: 0, max: 1, defaultValue: 0.5 },
      { id: 'tone', label: 'Tone', min: 0, max: 1, defaultValue: 0.5 },
      { id: 'level', label: 'Level', min: 0, max: 1, defaultValue: 1 },
    ],
    ltom: [
      { id: 'tune', label: 'Tune', min: -1200, max: 1200, defaultValue: 0, unit: 'cents' },
      { id: 'decay', label: 'Decay', min: 0, max: 1, defaultValue: 0.5 },
      { id: 'level', label: 'Level', min: 0, max: 1, defaultValue: 1 },
    ],
    mtom: [
      { id: 'tune', label: 'Tune', min: -1200, max: 1200, defaultValue: 0, unit: 'cents' },
      { id: 'decay', label: 'Decay', min: 0, max: 1, defaultValue: 0.5 },
      { id: 'level', label: 'Level', min: 0, max: 1, defaultValue: 1 },
    ],
    htom: [
      { id: 'tune', label: 'Tune', min: -1200, max: 1200, defaultValue: 0, unit: 'cents' },
      { id: 'decay', label: 'Decay', min: 0, max: 1, defaultValue: 0.5 },
      { id: 'level', label: 'Level', min: 0, max: 1, defaultValue: 1 },
    ],
    crash: [
      { id: 'tune', label: 'Tune', min: -1200, max: 1200, defaultValue: 0, unit: 'cents' },
      { id: 'decay', label: 'Decay', min: 0, max: 1, defaultValue: 0.7 },
      { id: 'level', label: 'Level', min: 0, max: 1, defaultValue: 1 },
    ],
    ride: [
      { id: 'tune', label: 'Tune', min: -1200, max: 1200, defaultValue: 0, unit: 'cents' },
      { id: 'decay', label: 'Decay', min: 0, max: 1, defaultValue: 0.6 },
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
      swing = null
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
      ch: new HiHatVoice(sampleRate, 'closed'),
      oh: new HiHatVoice(sampleRate, 'open'),
      ltom: new TomVoice(sampleRate, 'low'),
      mtom: new TomVoice(sampleRate, 'mid'),
      htom: new TomVoice(sampleRate, 'high'),
      crash: new CymbalVoice(sampleRate, 'crash'),
      ride: new CymbalVoice(sampleRate, 'ride')
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
