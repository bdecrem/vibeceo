/**
 * JB202 Synth Engine
 *
 * ONE SYNTH: Single SynthVoice class used by both real-time and offline rendering.
 * No duplicate code paths. No drift.
 */

import {
  SawtoothOscillator,
  SquareOscillator,
  TriangleOscillator,
  createOscillatorSync
} from '../../dsp/oscillators/index.js';
import { Lowpass24Filter, normalizedToHz } from '../../dsp/filters/index.js';
import { ADSREnvelope } from '../../dsp/envelopes/index.js';
import { Drive } from '../../dsp/effects/index.js';
import { clamp, dbToLinear } from '../../dsp/utils/math.js';
import { noteToMidi, midiToFreq, transpose, detune } from '../../dsp/utils/note.js';
import { JB202Sequencer } from './sequencer.js';

// Default parameters (engine units, 0-1 unless noted)
const DEFAULT_PARAMS = {
  osc1Waveform: 'sawtooth',
  osc1Octave: 0,
  osc1Detune: 0.5,
  osc1Level: 0.63,
  osc2Waveform: 'sawtooth',
  osc2Octave: 0,
  osc2Detune: 0.57,
  osc2Level: 1.0,
  filterCutoff: 0.6,
  filterResonance: 0,
  filterEnvAmount: 0.6,
  filterAttack: 0,
  filterDecay: 0.4,
  filterSustain: 0.2,
  filterRelease: 0.3,
  ampAttack: 0,
  ampDecay: 0.3,
  ampSustain: 0,
  ampRelease: 0.2,
  drive: 0.2,
  level: 1.0,
};

/**
 * SynthVoice - THE synth. One class, used everywhere.
 * Holds all DSP state, processes samples, handles note events.
 */
class SynthVoice {
  constructor(sampleRate, params) {
    this.sampleRate = sampleRate;
    this.params = params;

    // DSP components
    this.osc1 = createOscillatorSync(params.osc1Waveform, sampleRate);
    this.osc2 = createOscillatorSync(params.osc2Waveform, sampleRate);
    this.filter = new Lowpass24Filter(sampleRate);
    this.filterEnv = new ADSREnvelope(sampleRate);
    this.ampEnv = new ADSREnvelope(sampleRate);
    this.drive = new Drive(sampleRate);

    // Voice state
    this.currentFreq = 440;
    this.slideTarget = null;
    this.slideProgress = 0;
    this.slideDuration = 0.05;
    this.gateOpen = false;

    // Apply params
    this.updateParams(params);
  }

  updateParams(params) {
    this.params = params;

    // Envelopes
    this.filterEnv.setParameters(
      params.filterAttack * 100,
      params.filterDecay * 100,
      params.filterSustain * 100,
      params.filterRelease * 100
    );
    this.ampEnv.setParameters(
      params.ampAttack * 100,
      params.ampDecay * 100,
      params.ampSustain * 100,
      params.ampRelease * 100
    );

    // Filter
    const baseCutoff = normalizedToHz(params.filterCutoff);
    const resonance = params.filterResonance * 100;
    this.filter.setParameters(baseCutoff, resonance);

    // Drive
    this.drive.setAmount(params.drive * 100);
  }

  updateOscillators(params) {
    // Recreate if waveform changed
    const osc1Type = this.osc1.constructor.name.toLowerCase().replace('oscillator', '');
    const osc2Type = this.osc2.constructor.name.toLowerCase().replace('oscillator', '');
    const waveformMap = { sawtooth: 'sawtooth', square: 'square', triangle: 'triangle' };

    if (waveformMap[osc1Type] !== params.osc1Waveform) {
      this.osc1 = createOscillatorSync(params.osc1Waveform, this.sampleRate);
    }
    if (waveformMap[osc2Type] !== params.osc2Waveform) {
      this.osc2 = createOscillatorSync(params.osc2Waveform, this.sampleRate);
    }
    this.params = params;
  }

  /**
   * Trigger a new note
   */
  triggerNote(freq, accent) {
    this.currentFreq = freq;
    this.slideTarget = null;

    this.osc1.reset();
    this.osc2.reset();
    this.filter.reset();

    this.ampEnv.trigger(accent ? 1.0 : 0.8);
    this.filterEnv.trigger(accent ? 1.5 : 1.0);

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
   * Slide to a new frequency (portamento)
   */
  slideTo(freq) {
    this.slideTarget = freq;
    this.slideProgress = 0;
  }

  /**
   * Process step event - SINGLE implementation used by both paths
   */
  processStepEvent(stepData, nextStepData) {
    if (!stepData.gate) return;

    const freq = midiToFreq(noteToMidi(stepData.note));
    const accent = stepData.accent;
    const slide = stepData.slide;

    // Slide only if gate is open (not releasing)
    if (slide && this.gateOpen) {
      this.slideTo(freq);
    } else {
      this.triggerNote(freq, accent);
    }
  }

  /**
   * Check if we should release at end of step
   */
  shouldReleaseAfterStep(stepData, nextStepData) {
    return stepData.gate && !nextStepData.slide;
  }

  /**
   * Generate one audio sample - THE DSP, used everywhere
   */
  processSample(masterVolume = 1.0) {
    const params = this.params;

    // Handle slide
    if (this.slideTarget !== null) {
      this.slideProgress += 1 / (this.slideDuration * this.sampleRate);
      if (this.slideProgress >= 1) {
        this.currentFreq = this.slideTarget;
        this.slideTarget = null;
      } else {
        this.currentFreq = this.currentFreq + (this.slideTarget - this.currentFreq) * 0.1;
      }
    }

    // Oscillator frequencies
    const osc1Freq = transpose(this.currentFreq, params.osc1Octave);
    const osc2Freq = transpose(this.currentFreq, params.osc2Octave);
    const detune1 = (params.osc1Detune - 0.5) * 100;
    const detune2 = (params.osc2Detune - 0.5) * 100;

    this.osc1.setFrequency(detune(osc1Freq, detune1));
    this.osc2.setFrequency(detune(osc2Freq, detune2));

    // Generate oscillators
    const osc1Sample = this.osc1._generateSample() * params.osc1Level;
    const osc2Sample = this.osc2._generateSample() * params.osc2Level;
    this.osc1._advancePhase();
    this.osc2._advancePhase();

    // Mix
    let sample = osc1Sample + osc2Sample;

    // Envelopes
    const ampValue = this.ampEnv.processSample();
    const filterEnvValue = this.filterEnv.processSample();

    // Filter modulation
    const baseCutoff = normalizedToHz(params.filterCutoff);
    const envAmount = (params.filterEnvAmount - 0.5) * 2;
    const modCutoff = clamp(baseCutoff + envAmount * filterEnvValue * 8000, 20, 16000);
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
 * JB202Engine - Wrapper that provides real-time and offline interfaces
 * Both use the same SynthVoice internally
 */
export class JB202Engine {
  constructor(options = {}) {
    this.sampleRate = options.sampleRate ?? 44100;
    this.masterVolume = options.masterVolume ?? 0.8;
    this.params = { ...DEFAULT_PARAMS };

    // Sequencer
    this.sequencer = new JB202Sequencer({
      steps: 16,
      bpm: options.bpm ?? 120
    });
    this.sequencer.onStep = this._handleSequencerStep.bind(this);

    // Voice (created on demand)
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
        if (id.startsWith('osc') && (id.includes('Waveform'))) {
          this._voice.updateOscillators(this.params);
        } else {
          this._voice.updateParams(this.params);
        }
      }
    }
  }

  getParameter(id) { return this.params[id]; }
  getParameters() { return { ...this.params }; }

  setOsc1Waveform(waveform) {
    this.params.osc1Waveform = waveform;
    if (this._voice) this._voice.updateOscillators(this.params);
  }

  setOsc2Waveform(waveform) {
    this.params.osc2Waveform = waveform;
    if (this._voice) this._voice.updateOscillators(this.params);
  }

  // === Sequencer API ===

  setBpm(bpm) { this.sequencer.setBpm(bpm); }
  getBpm() { return this.sequencer.getBpm(); }
  setPattern(pattern) { this.sequencer.setPattern(pattern); }
  getPattern() { return this.sequencer.getPattern(); }
  setStep(index, data) { this.sequencer.setStep(index, data); }
  getStep(index) { return this.sequencer.getStep(index); }

  // === Real-time Playback ===

  async startSequencer() {
    if (!this.context) return;

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

    // Use the SAME method as offline
    this._voice.processStepEvent(stepData, nextStepData);

    // Schedule release if needed
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

  async playNote(note, accent = false, slide = false) {
    if (!this.context) return;

    this._ensureVoice();

    if (!this._scriptNode) {
      const bufferSize = 1024;
      this._scriptNode = this.context.createScriptProcessor(bufferSize, 0, 2);
      this._scriptNode.onaudioprocess = this._processAudio.bind(this);
      this._scriptNode.connect(this.context.destination);
    }

    const freq = midiToFreq(typeof note === 'string' ? noteToMidi(note) : note);

    if (slide && this._voice.gateOpen) {
      this._voice.slideTo(freq);
    } else {
      if (this._voice.gateOpen) this._voice.releaseNote();
      this._voice.triggerNote(freq, accent);
    }
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

      // Use the SAME method as real-time
      voice.processStepEvent(stepData, nextStepData);

      const stepSamples = Math.floor(stepDur * sampleRate);
      const shouldRelease = voice.shouldReleaseAfterStep(stepData, nextStepData);
      const releaseSample = shouldRelease ? Math.floor(stepSamples * 0.9) : stepSamples;

      for (let i = 0; i < stepSamples && sampleIndex < totalSamples; i++, sampleIndex++) {
        // Use the SAME method as real-time
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

  async renderTestTone(options = {}) {
    const { note = 'A4', duration = 1.0, sampleRate = this.sampleRate } = options;
    const totalSamples = Math.ceil(duration * sampleRate);
    const output = new Float32Array(totalSamples);

    const osc = new SawtoothOscillator(sampleRate);
    osc.setFrequency(midiToFreq(noteToMidi(note)));

    for (let i = 0; i < totalSamples; i++) {
      output[i] = osc._generateSample() * 0.5;
      osc._advancePhase();
    }

    return {
      sampleRate, length: totalSamples, duration, numberOfChannels: 1,
      getChannelData: (channel) => channel === 0 ? output : null,
      _data: output
    };
  }

  getOutput() { return this._scriptNode ?? null; }

  dispose() {
    this.stopSequencer();
    if (this._scriptNode) {
      this._scriptNode.disconnect();
      this._scriptNode = null;
    }
    this._voice = null;
  }
}

export default JB202Engine;
