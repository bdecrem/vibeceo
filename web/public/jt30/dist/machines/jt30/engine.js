/**
 * JT30 Synth Engine - Acid Bass
 *
 * ONE SYNTH: Single SynthVoice class used by both real-time and offline rendering.
 * No duplicate code paths. No drift.
 *
 * Architecture follows JB202 pattern - imports DSP modules from jb202/dist/dsp/
 */

import {
  SawtoothOscillator,
  SquareOscillator,
  createOscillatorSync
} from '../../../../jb202/dist/dsp/oscillators/index.js';
import { MoogLadderFilter, normalizedToHz } from '../../../../jb202/dist/dsp/filters/index.js';
import { ADSREnvelope } from '../../../../jb202/dist/dsp/envelopes/index.js';
import { Drive } from '../../../../jb202/dist/dsp/effects/index.js';
import { clamp, fastTanh } from '../../../../jb202/dist/dsp/utils/math.js';
import { noteToMidi, midiToFreq, transpose, detune } from '../../../../jb202/dist/dsp/utils/note.js';
import { JT30Sequencer } from './sequencer.js';

// Default parameters (engine units, 0-1 unless noted)
// Tuned based on TB-303 research:
// - Low cutoff so envelope can "open" the filter dramatically
// - Moderate resonance (accent will boost it for squelch)
// - Strong envelope modulation for that acid "wow"
// - Medium decay for sustaining filter sweep
const DEFAULT_PARAMS = {
  waveform: 'sawtooth',      // 'sawtooth' or 'square'
  cutoff: 0.15,              // Filter cutoff (0-1) - LOW so envelope opens it
  resonance: 0.45,           // Filter resonance (0-1) - audible squelch with new curve
  envMod: 0.75,              // Filter envelope amount (0-1) - aggressive for acid
  decay: 0.45,               // Envelope decay (0-1) - medium for "wow" sweep
  accent: 0.8,               // Accent intensity (0-1)
  level: 0.8,                // Output level (0-1)
  slideTime: 0.06,           // Portamento time in seconds
};

/**
 * SynthVoice - THE acid bass synth. One class, used everywhere.
 * Holds all DSP state, processes samples, handles note events.
 */
class SynthVoice {
  constructor(sampleRate, params) {
    this.sampleRate = sampleRate;
    this.params = params;

    // DSP components
    this.osc = createOscillatorSync(params.waveform, sampleRate);
    this.filter = new MoogLadderFilter(sampleRate);
    this.filterEnv = new ADSREnvelope(sampleRate);
    this.ampEnv = new ADSREnvelope(sampleRate);
    this.drive = new Drive(sampleRate);

    // Voice state
    this.currentFreq = 220;
    this.targetFreq = 220;
    this.slideProgress = 0;
    this.slideDuration = params.slideTime;
    this.gateOpen = false;
    this.accentActive = false;
    this.accentResonanceBoost = 0;  // For 303-style accent resonance boost

    // Apply params
    this.updateParams(params);
  }

  updateParams(params) {
    this.params = params;

    // Filter envelope: fast attack, variable decay, no sustain (like 303)
    const decayTime = params.decay * 100;  // 0-100 scale for ADSR
    this.filterEnv.setParameters(
      0,           // Attack: instant
      decayTime,   // Decay: variable
      0,           // Sustain: 0 (full decay)
      5            // Release: short
    );

    // Amp envelope: short attack, short decay, high sustain, short release
    this.ampEnv.setParameters(
      0,           // Attack: instant
      10,          // Decay: short
      80,          // Sustain: 80%
      10           // Release: short
    );

    // Filter
    const baseCutoff = normalizedToHz(params.cutoff);
    const resonance = params.resonance * 100;
    this.filter.setParameters(baseCutoff, resonance);

    // Drive - 303 has subtle saturation
    this.drive.setAmount(20);

    this.slideDuration = params.slideTime;
  }

  updateWaveform(waveform) {
    if (waveform !== this.params.waveform) {
      this.osc = createOscillatorSync(waveform, this.sampleRate);
      this.params.waveform = waveform;
    }
  }

  /**
   * Trigger a new note
   *
   * 303 accent behavior (from research):
   * - Accent boosts volume
   * - Accent boosts filter envelope amount
   * - Accent boosts resonance (crucial for squelch!)
   */
  triggerNote(freq, accent, slide = false) {
    if (slide && this.gateOpen) {
      // Slide: glide to new frequency
      this.targetFreq = freq;
      this.slideProgress = 0;
    } else {
      // New note: reset oscillator and envelopes
      this.currentFreq = freq;
      this.targetFreq = freq;
      this.slideProgress = 1; // No slide needed

      this.osc.reset();
      this.filter.reset();

      // Trigger envelopes with accent
      const ampVel = accent ? 1.0 : 0.7;
      const filterVel = accent ? 1.5 : 1.0;  // Accent opens filter more

      this.ampEnv.trigger(ampVel);
      this.filterEnv.trigger(filterVel);

      this.accentActive = accent;
      // 303-style: accent boosts resonance for that squelch!
      // This decays quickly but gives the characteristic "wow"
      this.accentResonanceBoost = accent ? 35 : 0;  // +35% resonance on accent (more with gentler curve)
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
   * Process step event - SINGLE implementation used by both paths
   */
  processStepEvent(stepData, nextStepData) {
    if (!stepData.gate) return;

    const freq = midiToFreq(noteToMidi(stepData.note));
    const accent = stepData.accent;
    const slide = stepData.slide;

    this.triggerNote(freq, accent, slide);
  }

  /**
   * Check if we should release at end of step
   */
  shouldReleaseAfterStep(stepData, nextStepData) {
    return stepData.gate && (!nextStepData || !nextStepData.slide || !nextStepData.gate);
  }

  /**
   * Generate one audio sample - THE DSP, used everywhere
   */
  processSample(masterVolume = 1.0) {
    const params = this.params;

    // Handle slide (exponential glide for authentic 303 sound)
    if (this.slideProgress < 1) {
      const slideRate = 1 / (this.slideDuration * this.sampleRate);
      this.slideProgress = Math.min(1, this.slideProgress + slideRate);
      // Exponential interpolation for musical glide
      const t = this.slideProgress * this.slideProgress; // Quadratic easing
      this.currentFreq = this.currentFreq + (this.targetFreq - this.currentFreq) * 0.15;
    }

    // Set oscillator frequency
    this.osc.setFrequency(this.currentFreq);

    // Generate oscillator
    let sample = this.osc._generateSample();
    this.osc._advancePhase();

    // Envelopes
    const ampValue = this.ampEnv.processSample();
    const filterEnvValue = this.filterEnv.processSample();

    // Decay the accent resonance boost over time (fast decay for snappy squelch)
    if (this.accentResonanceBoost > 0) {
      this.accentResonanceBoost *= 0.9995;  // ~50ms decay at 44.1kHz
      if (this.accentResonanceBoost < 0.5) this.accentResonanceBoost = 0;
    }

    // Filter modulation - 303 has aggressive envelope modulation
    const baseCutoff = normalizedToHz(params.cutoff);
    const envAmount = params.envMod;
    // Accent boosts envelope effect AND cutoff
    const accentCutoffBoost = this.accentActive ? 1.4 : 1.0;
    const modCutoff = clamp(baseCutoff + envAmount * filterEnvValue * 10000 * accentCutoffBoost, 20, 18000);

    // 303-style: accent boosts resonance multiplicatively (not additive)
    // This prevents accidental overshoot past 100 and scales naturally
    const baseResonance = params.resonance * 100;
    const accentMult = 1.0 + (this.accentResonanceBoost / 100);  // +35 becomes 1.35x
    const modResonance = clamp(baseResonance * accentMult, 0, 85);  // Cap at 85 to stay musical

    // Update filter with modulated cutoff and resonance
    this.filter.setParameters(modCutoff, modResonance);

    // Filter
    sample = this.filter.processSample(sample);

    // VCA
    sample *= ampValue;

    // Drive (subtle 303 saturation)
    sample = this.drive.processSample(sample);

    // Output level
    sample *= params.level * masterVolume;

    return sample;
  }
}

/**
 * JT30Engine - Wrapper that provides real-time and offline interfaces
 * Both use the same SynthVoice internally
 */
export class JT30Engine {
  constructor(options = {}) {
    this.sampleRate = options.sampleRate ?? 44100;
    this.masterVolume = options.masterVolume ?? 0.8;
    this.params = { ...DEFAULT_PARAMS };

    // Sequencer
    this.sequencer = new JT30Sequencer({
      steps: 16,
      bpm: options.bpm ?? 130
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
    if (id === 'waveform') {
      this.params.waveform = value;
      if (this._voice) {
        this._voice.updateWaveform(value);
      }
    } else if (id in this.params) {
      this.params[id] = value;
      if (this._voice) {
        this._voice.updateParams(this.params);
      }
    }
  }

  getParameter(id) { return this.params[id]; }
  getParameters() { return { ...this.params }; }

  setWaveform(waveform) {
    this.setParameter('waveform', waveform);
  }

  toggleWaveform() {
    const next = this.params.waveform === 'sawtooth' ? 'square' : 'sawtooth';
    this.setWaveform(next);
    return next;
  }

  getWaveform() {
    return this.params.waveform;
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

    const freq = midiToFreq(typeof note === 'string' ? noteToMidi(note) : note);
    this._voice.triggerNote(freq, accent, slide);
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

export default JT30Engine;
