/**
 * JB202 Synth Engine
 *
 * 2-oscillator bass monosynth with:
 * - Dual oscillators (saw/square/triangle) with detune
 * - 24dB lowpass filter with envelope modulation
 * - ADSR envelopes for filter and amplitude
 * - Soft-clipping drive
 *
 * All synthesis uses custom DSP components for cross-platform consistency.
 * API compatible with JB200 for drop-in replacement.
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
  // Oscillator 1
  osc1Waveform: 'sawtooth',
  osc1Octave: 0,       // semitones (-24 to +24)
  osc1Detune: 0.5,     // 0-1, center = 0.5 = 0 cents
  osc1Level: 0.63,     // 0-1

  // Oscillator 2
  osc2Waveform: 'sawtooth',
  osc2Octave: 0,
  osc2Detune: 0.57,    // Slight detune for thickness
  osc2Level: 1.0,

  // Filter
  filterCutoff: 0.6,   // 0-1 (log scale, 20-16000Hz)
  filterResonance: 0,  // 0-1 (maps to 0-100)
  filterEnvAmount: 0.6, // 0-1, center = 0.5 = 0%

  // Filter envelope
  filterAttack: 0,     // 0-1 (maps to 2ms-2s)
  filterDecay: 0.4,
  filterSustain: 0.2,
  filterRelease: 0.3,

  // Amp envelope
  ampAttack: 0,
  ampDecay: 0.3,
  ampSustain: 0,
  ampRelease: 0.2,

  // Drive
  drive: 0.2,          // 0-1 (maps to 0-100)

  // Output
  level: 1.0,          // 0-1
};

export class JB202Engine {
  constructor(options = {}) {
    this.sampleRate = options.sampleRate ?? 44100;
    this.masterVolume = options.masterVolume ?? 0.8;

    // Parameters (engine units)
    this.params = { ...DEFAULT_PARAMS };

    // Sequencer
    this.sequencer = new JB202Sequencer({
      steps: 16,
      bpm: options.bpm ?? 120
    });
    this.sequencer.onStep = this._handleSequencerStep.bind(this);

    // Current note state (for monophonic voice)
    this._currentNote = null;
    this._currentFreq = 440;
    this._gateOpen = false;

    // DSP components (created per-render or per-voice)
    this._osc1 = null;
    this._osc2 = null;
    this._filter = null;
    this._filterEnv = null;
    this._ampEnv = null;
    this._drive = null;

    // Web Audio context (for real-time playback)
    this.context = options.context ?? null;
    this._scriptNode = null;
    this._activeVoice = null;
  }

  // === Parameter API (JB200 compatible) ===

  setParameter(id, value) {
    if (id in this.params) {
      this.params[id] = value;
    }
  }

  getParameter(id) {
    return this.params[id];
  }

  getParameters() {
    return { ...this.params };
  }

  setOsc1Waveform(waveform) {
    this.params.osc1Waveform = waveform;
  }

  setOsc2Waveform(waveform) {
    this.params.osc2Waveform = waveform;
  }

  // === BPM / Sequencer API ===

  setBpm(bpm) {
    this.sequencer.setBpm(bpm);
  }

  getBpm() {
    return this.sequencer.getBpm();
  }

  setPattern(pattern) {
    this.sequencer.setPattern(pattern);
  }

  getPattern() {
    return this.sequencer.getPattern();
  }

  setStep(index, data) {
    this.sequencer.setStep(index, data);
  }

  getStep(index) {
    return this.sequencer.getStep(index);
  }

  // === Real-time Playback (Web Audio) ===

  startSequencer() {
    if (!this.context) {
      console.warn('JB202Engine: No audio context for real-time playback');
      return;
    }
    this.sequencer.setContext(this.context);
    this.sequencer.start();
  }

  stopSequencer() {
    this.sequencer.stop();
    this._releaseVoice();
  }

  isPlaying() {
    return this.sequencer.isRunning();
  }

  _handleSequencerStep(step, stepData, nextStepData) {
    if (!this.context) return;

    const { frequency, time, accent, slide } = stepData;
    const nextSlide = nextStepData?.slide ?? false;

    // Handle slide: don't release if next step slides
    if (!slide && this._activeVoice) {
      this._releaseVoice(time);
    }

    // Create new voice or slide to new frequency
    if (slide && this._activeVoice) {
      // Portamento to new frequency
      this._slideVoice(frequency, time);
    } else {
      this._createVoice(frequency, time, accent, nextSlide);
    }
  }

  playNote(note, accent = false, slide = false) {
    if (!this.context) return;

    const midi = typeof note === 'string' ? noteToMidi(note) : note;
    const freq = midiToFreq(midi);
    const time = this.context.currentTime;

    if (!slide && this._activeVoice) {
      this._releaseVoice(time);
    }

    this._createVoice(freq, time, accent, slide);
  }

  _createVoice(freq, time, accent, slide) {
    // For Web Audio real-time, we use native oscillators + our filter logic
    // This is a simplified version - full DSP rendering is in renderPattern
    if (!this.context) return;

    const ctx = this.context;
    const voice = {};

    // Create oscillators (using native for real-time performance)
    voice.osc1 = ctx.createOscillator();
    voice.osc2 = ctx.createOscillator();
    voice.osc1Gain = ctx.createGain();
    voice.osc2Gain = ctx.createGain();
    voice.mixer = ctx.createGain();
    voice.filter1 = ctx.createBiquadFilter();
    voice.filter2 = ctx.createBiquadFilter();
    voice.vca = ctx.createGain();
    voice.output = ctx.createGain();

    // Configure oscillators
    voice.osc1.type = this.params.osc1Waveform;
    voice.osc2.type = this.params.osc2Waveform;

    const osc1Freq = transpose(freq, this.params.osc1Octave);
    const osc2Freq = transpose(freq, this.params.osc2Octave);
    const detune1 = (this.params.osc1Detune - 0.5) * 100; // cents
    const detune2 = (this.params.osc2Detune - 0.5) * 100;

    voice.osc1.frequency.value = osc1Freq;
    voice.osc2.frequency.value = osc2Freq;
    voice.osc1.detune.value = detune1;
    voice.osc2.detune.value = detune2;

    voice.osc1Gain.gain.value = this.params.osc1Level;
    voice.osc2Gain.gain.value = this.params.osc2Level;

    // Configure filter
    const cutoffHz = normalizedToHz(this.params.filterCutoff);
    const q = 0.5 + this.params.filterResonance * 19.5;
    voice.filter1.type = 'lowpass';
    voice.filter2.type = 'lowpass';
    voice.filter1.frequency.value = cutoffHz;
    voice.filter2.frequency.value = cutoffHz;
    voice.filter1.Q.value = q * 0.7;
    voice.filter2.Q.value = q * 0.5;

    // VCA starts at 0
    voice.vca.gain.value = 0;

    // Connect signal path
    voice.osc1.connect(voice.osc1Gain);
    voice.osc2.connect(voice.osc2Gain);
    voice.osc1Gain.connect(voice.mixer);
    voice.osc2Gain.connect(voice.mixer);
    voice.mixer.connect(voice.filter1);
    voice.filter1.connect(voice.filter2);
    voice.filter2.connect(voice.vca);
    voice.vca.connect(voice.output);
    voice.output.gain.value = this.params.level * this.masterVolume;
    voice.output.connect(ctx.destination);

    // Schedule envelopes
    const peakLevel = accent ? 1.0 : 0.8;
    const attackTime = this._knobToTime(this.params.ampAttack * 100);
    const decayTime = this._knobToTime(this.params.ampDecay * 100);
    const sustainLevel = this.params.ampSustain * peakLevel;

    voice.vca.gain.setValueAtTime(0, time);
    voice.vca.gain.linearRampToValueAtTime(peakLevel, time + attackTime);
    voice.vca.gain.exponentialRampToValueAtTime(
      Math.max(0.001, sustainLevel),
      time + attackTime + decayTime
    );

    // Filter envelope
    const envAmount = (this.params.filterEnvAmount - 0.5) * 2; // -1 to +1
    const filterAttack = this._knobToTime(this.params.filterAttack * 100);
    const filterDecay = this._knobToTime(this.params.filterDecay * 100);
    const filterSustain = this.params.filterSustain;

    const envPeak = cutoffHz + envAmount * 8000 * (accent ? 1.5 : 1);
    const envSustainFreq = cutoffHz + (envPeak - cutoffHz) * filterSustain;

    voice.filter1.frequency.setValueAtTime(cutoffHz, time);
    voice.filter1.frequency.linearRampToValueAtTime(
      clamp(envPeak, 20, 16000),
      time + filterAttack
    );
    voice.filter1.frequency.exponentialRampToValueAtTime(
      clamp(envSustainFreq, 20, 16000),
      time + filterAttack + filterDecay
    );
    voice.filter2.frequency.setValueAtTime(cutoffHz, time);
    voice.filter2.frequency.linearRampToValueAtTime(
      clamp(envPeak, 20, 16000),
      time + filterAttack
    );
    voice.filter2.frequency.exponentialRampToValueAtTime(
      clamp(envSustainFreq, 20, 16000),
      time + filterAttack + filterDecay
    );

    // Start oscillators
    voice.osc1.start(time);
    voice.osc2.start(time);

    voice.startTime = time;
    voice.freq = freq;
    this._activeVoice = voice;
  }

  _releaseVoice(time) {
    if (!this._activeVoice || !this.context) return;

    const voice = this._activeVoice;
    const releaseTime = this._knobToTime(this.params.ampRelease * 100);
    const t = time ?? this.context.currentTime;

    voice.vca.gain.cancelScheduledValues(t);
    voice.vca.gain.setValueAtTime(voice.vca.gain.value, t);
    voice.vca.gain.exponentialRampToValueAtTime(0.001, t + releaseTime);

    // Stop oscillators after release
    voice.osc1.stop(t + releaseTime + 0.1);
    voice.osc2.stop(t + releaseTime + 0.1);

    this._activeVoice = null;
  }

  _slideVoice(newFreq, time) {
    if (!this._activeVoice) return;

    const voice = this._activeVoice;
    const slideTime = 0.05; // 50ms portamento

    const osc1Freq = transpose(newFreq, this.params.osc1Octave);
    const osc2Freq = transpose(newFreq, this.params.osc2Octave);

    voice.osc1.frequency.linearRampToValueAtTime(osc1Freq, time + slideTime);
    voice.osc2.frequency.linearRampToValueAtTime(osc2Freq, time + slideTime);
    voice.freq = newFreq;
  }

  _knobToTime(value) {
    const normalized = clamp(value / 100, 0, 1);
    return 0.002 + normalized * normalized * 1.998;
  }

  // === Offline Rendering (Buffer-based) ===

  /**
   * Render pattern to AudioBuffer using pure DSP
   * This produces identical output across all platforms
   */
  async renderPattern(options = {}) {
    const {
      bars = 1,
      stepDuration = null,
      sampleRate = this.sampleRate,
      pattern = null,
      params = null
    } = options;

    // Use provided pattern/params or current state
    const renderPattern = pattern ?? this.sequencer.getPattern();
    const renderParams = params ? { ...this.params, ...params } : this.params;

    const steps = renderPattern.length;
    const stepsPerBar = 16;
    const totalSteps = bars * stepsPerBar;
    const stepDur = stepDuration ?? (60 / this.sequencer.getBpm() / 4);
    const totalDuration = totalSteps * stepDur;
    const totalSamples = Math.ceil(totalDuration * sampleRate);

    // Create output buffer
    const output = new Float32Array(totalSamples);

    // Initialize DSP components
    const osc1 = createOscillatorSync(renderParams.osc1Waveform, sampleRate);
    const osc2 = createOscillatorSync(renderParams.osc2Waveform, sampleRate);
    const filter = new Lowpass24Filter(sampleRate);
    const filterEnv = new ADSREnvelope(sampleRate);
    const ampEnv = new ADSREnvelope(sampleRate);
    const drive = new Drive(sampleRate);

    // Configure envelopes
    filterEnv.setParameters(
      renderParams.filterAttack * 100,
      renderParams.filterDecay * 100,
      renderParams.filterSustain * 100,
      renderParams.filterRelease * 100
    );
    ampEnv.setParameters(
      renderParams.ampAttack * 100,
      renderParams.ampDecay * 100,
      renderParams.ampSustain * 100,
      renderParams.ampRelease * 100
    );

    // Configure filter base
    const baseCutoff = normalizedToHz(renderParams.filterCutoff);
    const resonance = renderParams.filterResonance * 100;
    filter.setParameters(baseCutoff, resonance);

    // Configure drive
    drive.setAmount(renderParams.drive * 100);

    // Envelope amount (-1 to +1)
    const envAmount = (renderParams.filterEnvAmount - 0.5) * 2;

    // Process each step
    let sampleIndex = 0;
    let currentFreq = 440;
    let slideTarget = null;
    let slideProgress = 0;
    const slideDuration = 0.05; // 50ms portamento

    for (let stepNum = 0; stepNum < totalSteps; stepNum++) {
      const patternStep = stepNum % steps;
      const stepData = renderPattern[patternStep];
      const nextPatternStep = (patternStep + 1) % steps;
      const nextStepData = renderPattern[nextPatternStep];

      const stepSamples = Math.floor(stepDur * sampleRate);
      const stepEndIndex = Math.min(sampleIndex + stepSamples, totalSamples);

      if (stepData.gate) {
        const midi = noteToMidi(stepData.note);
        const newFreq = midiToFreq(midi);
        const accent = stepData.accent;
        const slide = stepData.slide;

        if (slide && ampEnv.isActive()) {
          // Portamento - slide to new frequency
          slideTarget = newFreq;
          slideProgress = 0;
        } else {
          // New note - reset envelopes
          currentFreq = newFreq;
          slideTarget = null;
          osc1.reset();
          osc2.reset();
          filter.reset();
          ampEnv.trigger(accent ? 1.0 : 0.8);
          filterEnv.trigger(accent ? 1.5 : 1.0);
        }
      }

      // Check if we should release at end of step
      const shouldRelease = !nextStepData.slide && stepData.gate;

      // Render samples for this step
      const releaseSample = shouldRelease
        ? Math.floor(stepSamples * 0.9)
        : stepSamples;

      for (let i = 0; sampleIndex < stepEndIndex; i++, sampleIndex++) {
        // Handle slide
        if (slideTarget !== null) {
          slideProgress += 1 / (slideDuration * sampleRate);
          if (slideProgress >= 1) {
            currentFreq = slideTarget;
            slideTarget = null;
          } else {
            currentFreq = currentFreq + (slideTarget - currentFreq) * 0.1;
          }
        }

        // Update oscillator frequencies
        const osc1Freq = transpose(currentFreq, renderParams.osc1Octave);
        const osc2Freq = transpose(currentFreq, renderParams.osc2Octave);
        const detune1 = (renderParams.osc1Detune - 0.5) * 100;
        const detune2 = (renderParams.osc2Detune - 0.5) * 100;

        osc1.setFrequency(detune(osc1Freq, detune1));
        osc2.setFrequency(detune(osc2Freq, detune2));

        // Generate oscillator samples
        const osc1Sample = osc1._generateSample() * renderParams.osc1Level;
        const osc2Sample = osc2._generateSample() * renderParams.osc2Level;
        osc1._advancePhase();
        osc2._advancePhase();

        // Mix oscillators
        let sample = osc1Sample + osc2Sample;

        // Process envelopes
        const ampValue = ampEnv.processSample();
        const filterEnvValue = filterEnv.processSample();

        // Modulate filter cutoff
        const modCutoff = clamp(
          baseCutoff + envAmount * filterEnvValue * 8000,
          20,
          16000
        );
        filter.setCutoff(modCutoff);

        // Apply filter
        sample = filter.processSample(sample);

        // Apply VCA
        sample *= ampValue;

        // Apply drive
        sample = drive.processSample(sample);

        // Apply output level
        sample *= renderParams.level * this.masterVolume;

        output[sampleIndex] = sample;

        // Trigger release near end of step
        if (shouldRelease && i === releaseSample) {
          ampEnv.gateOff();
          filterEnv.gateOff();
        }
      }
    }

    // Return as AudioBuffer-like object
    return {
      sampleRate,
      length: totalSamples,
      duration: totalDuration,
      numberOfChannels: 1,
      getChannelData: (channel) => channel === 0 ? output : null,
      _data: output
    };
  }

  /**
   * Render a single test tone (for audio analysis)
   */
  async renderTestTone(options = {}) {
    const {
      note = 'A4',
      duration = 1.0,
      sampleRate = this.sampleRate
    } = options;

    const midi = noteToMidi(note);
    const freq = midiToFreq(midi);
    const totalSamples = Math.ceil(duration * sampleRate);
    const output = new Float32Array(totalSamples);

    // Simple sawtooth test tone
    const osc = new SawtoothOscillator(sampleRate);
    osc.setFrequency(freq);

    for (let i = 0; i < totalSamples; i++) {
      output[i] = osc._generateSample() * 0.5;
      osc._advancePhase();
    }

    return {
      sampleRate,
      length: totalSamples,
      duration,
      numberOfChannels: 1,
      getChannelData: (channel) => channel === 0 ? output : null,
      _data: output
    };
  }

  // === Output routing (Web Audio) ===

  getOutput() {
    return this._activeVoice?.output ?? null;
  }

  // === Cleanup ===

  dispose() {
    this.stopSequencer();
    this._activeVoice = null;
  }
}

export default JB202Engine;
