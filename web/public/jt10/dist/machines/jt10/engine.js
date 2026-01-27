/**
 * JT10 Synth Engine - Lead/Bass Synth
 *
 * ONE SYNTH: Single SynthVoice class used by both real-time and offline rendering.
 * No duplicate code paths. No drift.
 *
 * Features:
 * - Saw + Pulse oscillators (mixable) with PWM
 * - Sub-oscillator (1 or 2 octaves down)
 * - Moog ladder filter
 * - ADSR envelopes for filter and amp
 * - LFO modulation (pitch, filter, PWM)
 *
 * Architecture follows JB202 pattern - imports DSP modules from jb202/dist/dsp/
 */

import {
  SawtoothOscillator,
  SquareOscillator,
  TriangleOscillator,
  PulseOscillator,
  createOscillatorSync
} from '../../../../jb202/dist/dsp/oscillators/index.js';
import { MoogLadderFilter, normalizedToHz } from '../../../../jb202/dist/dsp/filters/index.js';
import { ADSREnvelope } from '../../../../jb202/dist/dsp/envelopes/index.js';
import { Drive } from '../../../../jb202/dist/dsp/effects/index.js';
import { LFO } from '../../../../jb202/dist/dsp/modulators/index.js';
import { clamp, fastTanh, TWO_PI } from '../../../../jb202/dist/dsp/utils/math.js';
import { noteToMidi, midiToFreq, transpose, detune } from '../../../../jb202/dist/dsp/utils/note.js';
import { JT10Sequencer } from './sequencer.js';

// Default parameters (engine units, 0-1 unless noted)
const DEFAULT_PARAMS = {
  // Oscillator mix
  sawLevel: 0.5,             // Saw oscillator level (0-1)
  pulseLevel: 0.5,           // Pulse oscillator level (0-1)
  pulseWidth: 0.5,           // Pulse width (0-1, 0.5 = square)
  subLevel: 0.3,             // Sub-oscillator level (0-1)
  subMode: 0,                // Sub mode: 0 = -1 oct square, 1 = -2 oct square, 2 = -1 oct pulse

  // Filter
  cutoff: 0.5,               // Filter cutoff (0-1)
  resonance: 0.3,            // Filter resonance (0-1)
  envMod: 0.5,               // Filter envelope amount (0-1)
  keyTrack: 0.5,             // Keyboard tracking (0-1)

  // Envelopes
  attack: 0.01,              // Amp attack (0-1, maps to 0-2s)
  decay: 0.3,                // Amp decay (0-1)
  sustain: 0.7,              // Amp sustain (0-1)
  release: 0.3,              // Amp release (0-1)

  // Filter envelope (follows amp by default)
  filterAttack: null,        // null = follow amp
  filterDecay: null,
  filterSustain: null,
  filterRelease: null,

  // LFO
  lfoRate: 0.3,              // LFO rate (0-1, maps to 0.1-30 Hz)
  lfoWaveform: 'triangle',   // 'triangle', 'square', 'sh' (sample & hold)
  lfoToPitch: 0,             // LFO to pitch amount (0-1)
  lfoToFilter: 0,            // LFO to filter amount (0-1)
  lfoToPW: 0,                // LFO to pulse width amount (0-1)

  // Output
  glideTime: 0.05,           // Portamento time (0-1)
  level: 0.8,                // Output level (0-1)
};

// LFO imported from jb202/dist/dsp/modulators/index.js
// PulseOscillator imported from jb202/dist/dsp/oscillators/index.js

/**
 * SynthVoice - THE lead synth. One class, used everywhere.
 */
class SynthVoice {
  constructor(sampleRate, params) {
    this.sampleRate = sampleRate;
    this.params = params;

    // DSP components
    this.sawOsc = new SawtoothOscillator(sampleRate);
    this.pulseOsc = new PulseOscillator(sampleRate);
    this.subOsc = new SquareOscillator(sampleRate);
    this.filter = new MoogLadderFilter(sampleRate);
    this.filterEnv = new ADSREnvelope(sampleRate);
    this.ampEnv = new ADSREnvelope(sampleRate);
    this.lfo = new LFO(sampleRate);
    this.drive = new Drive(sampleRate);

    // Voice state
    this.currentFreq = 440;
    this.targetFreq = 440;
    this.currentNote = 60;
    this.slideProgress = 1;
    this.slideDuration = 0.05;
    this.gateOpen = false;

    // Apply params
    this.updateParams(params);
  }

  updateParams(params) {
    this.params = params;

    // Amp envelope
    this.ampEnv.setParameters(
      params.attack * 100,
      params.decay * 100,
      params.sustain * 100,
      params.release * 100
    );

    // Filter envelope (follows amp or has own settings)
    this.filterEnv.setParameters(
      (params.filterAttack ?? params.attack) * 100,
      (params.filterDecay ?? params.decay) * 100,
      (params.filterSustain ?? params.sustain) * 100,
      (params.filterRelease ?? params.release) * 100
    );

    // Filter
    const baseCutoff = normalizedToHz(params.cutoff);
    const resonance = params.resonance * 100;
    this.filter.setParameters(baseCutoff, resonance);

    // LFO
    this.lfo.setRate(params.lfoRate);
    this.lfo.setWaveform(params.lfoWaveform);

    // Drive
    this.drive.setAmount(15);  // Subtle warmth

    this.slideDuration = params.glideTime;
  }

  /**
   * Trigger a new note
   */
  triggerNote(note, velocity = 1.0, slide = false) {
    const midi = typeof note === 'string' ? noteToMidi(note) : note;
    const freq = midiToFreq(midi);

    if (slide && this.gateOpen) {
      // Slide to new note
      this.targetFreq = freq;
      this.slideProgress = 0;
    } else {
      // New note
      this.currentFreq = freq;
      this.targetFreq = freq;
      this.slideProgress = 1;
      this.currentNote = midi;

      this.sawOsc.reset();
      this.pulseOsc.reset();
      this.subOsc.reset();
      this.filter.reset();

      this.ampEnv.trigger(velocity);
      this.filterEnv.trigger(velocity);
    }

    this.gateOpen = true;
  }

  /**
   * Release the current note
   */
  releaseNote() {
    this.ampEnv.gateOff();
    this.filterEnv.gateOff();
    this.gateOpen = false;
  }

  /**
   * Process step event
   */
  processStepEvent(stepData, nextStepData) {
    if (!stepData.gate) return;

    const slide = stepData.slide && this.gateOpen;
    const velocity = stepData.accent ? 1.0 : 0.7;
    this.triggerNote(stepData.note, velocity, slide);
  }

  /**
   * Check if we should release
   */
  shouldReleaseAfterStep(stepData, nextStepData) {
    return stepData.gate && (!nextStepData || !nextStepData.slide || !nextStepData.gate);
  }

  /**
   * Generate one audio sample
   */
  processSample(masterVolume = 1.0) {
    const params = this.params;

    // Handle glide
    if (this.slideProgress < 1) {
      const slideRate = 1 / (this.slideDuration * this.sampleRate);
      this.slideProgress = Math.min(1, this.slideProgress + slideRate);
      this.currentFreq = this.currentFreq + (this.targetFreq - this.currentFreq) * 0.1;
    }

    // LFO
    const lfoValue = this.lfo.processSample();

    // Apply LFO to pitch
    let freq = this.currentFreq;
    if (params.lfoToPitch > 0) {
      const pitchMod = lfoValue * params.lfoToPitch * 0.1;  // Up to ±10% pitch
      freq *= (1 + pitchMod);
    }

    // Apply LFO to pulse width
    let pw = params.pulseWidth;
    if (params.lfoToPW > 0) {
      pw = clamp(pw + lfoValue * params.lfoToPW * 0.3, 0.1, 0.9);
    }

    // Set oscillator frequencies
    this.sawOsc.setFrequency(freq);
    this.pulseOsc.setFrequency(freq);
    this.pulseOsc.setPulseWidth(pw);

    // Sub-oscillator (1 or 2 octaves down)
    const subOctave = params.subMode >= 1 ? 2 : 1;
    this.subOsc.setFrequency(freq / Math.pow(2, subOctave));

    // Generate oscillators
    const sawSample = this.sawOsc._generateSample() * params.sawLevel;
    this.sawOsc._advancePhase();

    const pulseSample = this.pulseOsc._generateSample() * params.pulseLevel;
    this.pulseOsc._advancePhase();

    const subSample = this.subOsc._generateSample() * params.subLevel;
    this.subOsc._advancePhase();

    // Mix
    let sample = sawSample + pulseSample + subSample;

    // Normalize mix level
    const totalLevel = params.sawLevel + params.pulseLevel + params.subLevel;
    if (totalLevel > 1) {
      sample /= totalLevel;
    }

    // Envelopes
    const ampValue = this.ampEnv.processSample();
    const filterEnvValue = this.filterEnv.processSample();

    // Filter modulation
    let baseCutoff = normalizedToHz(params.cutoff);

    // Keyboard tracking
    if (params.keyTrack > 0) {
      const trackAmount = (this.currentNote - 60) / 12;  // Octaves from C4
      baseCutoff *= Math.pow(2, trackAmount * params.keyTrack);
    }

    // Envelope modulation
    const envMod = params.envMod * filterEnvValue * 8000;

    // LFO modulation
    let lfoMod = 0;
    if (params.lfoToFilter > 0) {
      lfoMod = lfoValue * params.lfoToFilter * 4000;
    }

    const modCutoff = clamp(baseCutoff + envMod + lfoMod, 20, 16000);
    this.filter.setCutoff(modCutoff);

    // Filter
    sample = this.filter.processSample(sample);

    // VCA
    sample *= ampValue;

    // Drive
    sample = this.drive.processSample(sample);

    // Output level
    sample *= params.level * masterVolume;

    return sample;
  }
}

/**
 * JT10Engine - Lead/Bass Synth
 */
export class JT10Engine {
  constructor(options = {}) {
    this.sampleRate = options.sampleRate ?? 44100;
    this.masterVolume = options.masterVolume ?? 0.8;
    this.params = { ...DEFAULT_PARAMS };

    // Sequencer
    this.sequencer = new JT10Sequencer({
      steps: 16,
      bpm: options.bpm ?? 120
    });
    this.sequencer.onStep = this._handleSequencerStep.bind(this);

    // Voice
    this._voice = null;

    // Web Audio
    this.context = options.context ?? null;
    this._scriptNode = null;
    this._isRealTimePlaying = false;
    this._pendingRelease = null;
  }

  _ensureVoice() {
    const sr = this.context?.sampleRate ?? this.sampleRate;
    if (!this._voice || this._voice.sampleRate !== sr) {
      this._voice = new SynthVoice(sr, this.params);
    }
    return this._voice;
  }

  // === Parameter API ===

  setParameter(id, value) {
    if (id in this.params) {
      this.params[id] = value;
      if (this._voice) {
        this._voice.updateParams(this.params);
      }
    }
  }

  getParameter(id) { return this.params[id]; }
  getParameters() { return { ...this.params }; }

  // === Sequencer API ===

  setBpm(bpm) { this.sequencer.setBpm(bpm); }
  getBpm() { return this.sequencer.getBpm(); }
  setPattern(pattern) { this.sequencer.setPattern(pattern); }
  getPattern() { return this.sequencer.getPattern(); }
  setStep(index, data) { this.sequencer.setStep(index, data); }
  getStep(index) { return this.sequencer.getStep(index); }

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

    this._ensureVoice();

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

    if (this._voice) this._voice.releaseNote();
    if (this._pendingRelease) {
      clearTimeout(this._pendingRelease);
      this._pendingRelease = null;
    }

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

  _handleSequencerStep(step, stepData, nextStepData) {
    if (!this._voice) return;

    this._voice.processStepEvent(stepData, nextStepData);

    if (this._pendingRelease) {
      clearTimeout(this._pendingRelease);
      this._pendingRelease = null;
    }

    if (this._voice.shouldReleaseAfterStep(stepData, nextStepData)) {
      const stepDuration = 60 / this.sequencer.getBpm() / 4;
      this._pendingRelease = setTimeout(() => {
        if (this._voice?.gateOpen) {
          this._voice.releaseNote();
        }
        this._pendingRelease = null;
      }, stepDuration * 0.9 * 1000);
    }
  }

  _processAudio(event) {
    if (!this._voice) return;

    const outputL = event.outputBuffer.getChannelData(0);
    const outputR = event.outputBuffer.getChannelData(1);

    for (let i = 0; i < outputL.length; i++) {
      const sample = this._voice.processSample(this.masterVolume);
      outputL[i] = sample;
      outputR[i] = sample;
    }
  }

  async playNote(note, velocity = 1.0, slide = false) {
    // Create audio context if needed
    if (!this.context) {
      this.context = new (window.AudioContext || window.webkitAudioContext)();
    }

    // Resume if suspended
    if (this.context.state === 'suspended') {
      await this.context.resume();
    }

    this._ensureVoice();

    if (!this._scriptNode) {
      const bufferSize = 1024;
      this._scriptNode = this.context.createScriptProcessor(bufferSize, 0, 2);
      this._scriptNode.onaudioprocess = this._processAudio.bind(this);
      this._scriptNode.connect(this.context.destination);
    }

    this._voice.triggerNote(note, velocity, slide);
  }

  noteOff() {
    if (this._voice) {
      this._voice.releaseNote();
    }
  }

  // Alias for noteOff
  stopNote() {
    this.noteOff();
  }

  // === Offline Rendering ===

  async renderPattern(options = {}) {
    const {
      bars = 1,
      stepDuration = null,
      sampleRate = this.sampleRate,
      pattern = null,
      params = null
    } = options;

    const renderPattern = pattern ?? this.sequencer.getPattern();
    const renderParams = params ? { ...this.params, ...params } : this.params;

    const steps = renderPattern.length;
    const stepsPerBar = 16;
    const totalSteps = bars * stepsPerBar;
    const stepDur = stepDuration ?? (60 / this.sequencer.getBpm() / 4);
    const totalSamples = Math.ceil((totalSteps * stepDur + 2) * sampleRate);

    const output = new Float32Array(totalSamples);

    // Create voice - SAME CLASS as real-time
    const voice = new SynthVoice(sampleRate, renderParams);

    let sampleIndex = 0;

    for (let stepNum = 0; stepNum < totalSteps; stepNum++) {
      const patternStep = stepNum % steps;
      const stepData = renderPattern[patternStep];
      const nextPatternStep = (patternStep + 1) % steps;
      const nextStepData = renderPattern[nextPatternStep];

      voice.processStepEvent(stepData, nextStepData);

      const stepSamples = Math.floor(stepDur * sampleRate);
      const shouldRelease = voice.shouldReleaseAfterStep(stepData, nextStepData);
      const releaseSample = shouldRelease ? Math.floor(stepSamples * 0.9) : stepSamples;

      for (let i = 0; i < stepSamples && sampleIndex < totalSamples; i++, sampleIndex++) {
        output[sampleIndex] = voice.processSample(this.masterVolume);

        if (shouldRelease && i === releaseSample) {
          voice.releaseNote();
        }
      }
    }

    return {
      sampleRate,
      length: totalSamples,
      duration: totalSteps * stepDur,
      numberOfChannels: 1,
      getChannelData: (channel) => channel === 0 ? output : null,
      _data: output
    };
  }

  getOutput() { return this._scriptNode ?? null; }

  // === WAV Export ===

  async audioBufferToBlob(buffer) {
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
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bytesPerSample * 8, true);

    // data chunk
    this._writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

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
    this._voice = null;
  }
}

export default JT10Engine;
