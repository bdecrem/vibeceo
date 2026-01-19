/**
 * R2D2Engine - Bass Monosynth Engine
 *
 * 2-oscillator bass synth with:
 * - 2 oscillators (saw/square/tri) with octave, detune, and level
 * - 24dB lowpass filter with resonance
 * - Filter ADSR envelope with depth control
 * - Amp ADSR envelope
 * - Drive/saturation stage
 *
 * Designed for offline rendering via renderPattern().
 */

import { OfflineAudioContext } from 'node-web-audio-api';

// Note frequency lookup
const NOTE_FREQS = {
  'C0': 16.35, 'C#0': 17.32, 'D0': 18.35, 'D#0': 19.45, 'E0': 20.60, 'F0': 21.83,
  'F#0': 23.12, 'G0': 24.50, 'G#0': 25.96, 'A0': 27.50, 'A#0': 29.14, 'B0': 30.87,
  'C1': 32.70, 'C#1': 34.65, 'D1': 36.71, 'D#1': 38.89, 'E1': 41.20, 'F1': 43.65,
  'F#1': 46.25, 'G1': 49.00, 'G#1': 51.91, 'A1': 55.00, 'A#1': 58.27, 'B1': 61.74,
  'C2': 65.41, 'C#2': 69.30, 'D2': 73.42, 'D#2': 77.78, 'E2': 82.41, 'F2': 87.31,
  'F#2': 92.50, 'G2': 98.00, 'G#2': 103.83, 'A2': 110.00, 'A#2': 116.54, 'B2': 123.47,
  'C3': 130.81, 'C#3': 138.59, 'D3': 146.83, 'D#3': 155.56, 'E3': 164.81, 'F3': 174.61,
  'F#3': 185.00, 'G3': 196.00, 'G#3': 207.65, 'A3': 220.00, 'A#3': 233.08, 'B3': 246.94,
  'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'D#4': 311.13, 'E4': 329.63, 'F4': 349.23,
  'F#4': 369.99, 'G4': 392.00, 'G#4': 415.30, 'A4': 440.00, 'A#4': 466.16, 'B4': 493.88,
  'C5': 523.25, 'C#5': 554.37, 'D5': 587.33, 'D#5': 622.25, 'E5': 659.26, 'F5': 698.46,
};

/**
 * Get frequency for a note name
 */
function getFrequency(note) {
  return NOTE_FREQS[note] || NOTE_FREQS['C2'];
}

/**
 * Convert 0-100 to time in seconds for ADSR
 * 0 = instant (2ms), 100 = slow (2s)
 */
function knobToTime(value) {
  // Exponential curve: 0.002s to 2s
  return 0.002 + (value / 100) * (value / 100) * 1.998;
}

/**
 * Convert 0-100 to filter Q
 * 0 = Q of 0.5 (gentle), 100 = Q of 20 (screaming)
 */
function knobToQ(value) {
  return 0.5 + (value / 100) * 19.5;
}

/**
 * Convert Hz cutoff to 0-1 normalized value (log scale)
 */
function hzToNormalized(hz, min = 20, max = 16000) {
  const logMin = Math.log(min);
  const logMax = Math.log(max);
  const logHz = Math.log(Math.max(min, Math.min(max, hz)));
  return (logHz - logMin) / (logMax - logMin);
}

/**
 * Apply soft saturation (drive)
 */
function makeDriveShaper(context, amount) {
  const k = amount * 50;  // 0-100 → 0-5000 (soft to hard)
  const n = 8192;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i * 2 / n) - 1;
    // Soft clipping curve with adjustable amount
    if (k === 0) {
      curve[i] = x;  // No distortion
    } else {
      curve[i] = (Math.PI + k) * x / (Math.PI + k * Math.abs(x));
    }
  }
  const shaper = context.createWaveShaper();
  shaper.curve = curve;
  shaper.oversample = '2x';
  return shaper;
}

export class R2D2Engine {
  constructor(config = {}) {
    this.context = config.context;
    this.sampleRate = config.context?.sampleRate || 44100;

    // Default parameters (producer units)
    this.params = {
      level: 0,  // dB

      osc1Waveform: 'sawtooth',
      osc1Octave: 0,
      osc1Detune: 0,
      osc1Level: 100,

      osc2Waveform: 'sawtooth',
      osc2Octave: -12,
      osc2Detune: 7,
      osc2Level: 80,

      filterCutoff: 800,  // Hz
      filterResonance: 40,  // 0-100
      filterEnvAmount: 60,  // -100 to 100

      filterAttack: 0,
      filterDecay: 40,
      filterSustain: 20,
      filterRelease: 30,

      ampAttack: 0,
      ampDecay: 30,
      ampSustain: 60,
      ampRelease: 20,

      drive: 20,
    };

    // Pattern (16 steps)
    this.pattern = [];
  }

  /**
   * Set a parameter value
   */
  setParameter(name, value) {
    if (name === 'volume' || name === 'level') {
      // Convert from engine 0-1 to dB if needed
      if (typeof value === 'number' && value >= 0 && value <= 2) {
        // This is already in engine format (linear gain), convert to dB
        this.params.level = value <= 0.001 ? -60 : 20 * Math.log10(value);
      } else {
        this.params.level = value;
      }
      return;
    }

    // Handle all other params
    if (this.params.hasOwnProperty(name)) {
      this.params[name] = value;
    }
  }

  /**
   * Set the pattern
   */
  setPattern(pattern) {
    this.pattern = pattern;
  }

  /**
   * Render pattern to audio buffer (offline)
   * @param {Object} options - { bars, bpm }
   * @returns {Promise<AudioBuffer>}
   */
  async renderPattern(options = {}) {
    const { bars = 2, bpm = 128 } = options;

    // Calculate render duration
    const beatsPerBar = 4;
    const stepsPerBeat = 4;  // 16th notes
    const totalBeats = bars * beatsPerBar;
    const secondsPerBeat = 60 / bpm;
    const duration = totalBeats * secondsPerBeat;
    const stepDuration = secondsPerBeat / 4;  // 16th note duration

    // Create offline context
    const sampleRate = this.sampleRate;
    const totalSamples = Math.ceil(duration * sampleRate) + sampleRate;  // Extra second for release
    const context = new OfflineAudioContext(2, totalSamples, sampleRate);

    // Master output
    const masterGain = context.createGain();
    const outputLevel = Math.pow(10, (this.params.level || 0) / 20);
    masterGain.gain.value = outputLevel;
    masterGain.connect(context.destination);

    // Drive/saturation
    const driveAmount = (this.params.drive || 0) / 100;
    let driveNode = null;
    if (driveAmount > 0.01) {
      driveNode = makeDriveShaper(context, this.params.drive);
      driveNode.connect(masterGain);
    }
    const finalOutput = driveNode || masterGain;

    // Pre-calculate note triggers
    const triggers = [];
    const totalSteps = bars * 16;  // 16 steps per bar
    const patternLength = this.pattern.length || 16;

    for (let i = 0; i < totalSteps; i++) {
      const step = this.pattern[i % patternLength];
      if (step && step.gate) {
        const startTime = i * stepDuration;
        triggers.push({
          time: startTime,
          note: step.note || 'C2',
          accent: step.accent || false,
          slide: step.slide || false,
        });
      }
    }

    // Render each note
    let prevOsc1 = null;
    let prevOsc2 = null;
    let prevFilter = null;
    let prevVCA = null;

    for (let i = 0; i < triggers.length; i++) {
      const trigger = triggers[i];
      const nextTrigger = triggers[i + 1];
      const time = trigger.time;
      const baseFreq = getFrequency(trigger.note);

      // Calculate gate duration (until next note or step duration)
      const maxGate = nextTrigger
        ? nextTrigger.time - time - 0.001
        : stepDuration * 2;  // Last note holds longer
      const gateTime = Math.min(stepDuration * 0.95, maxGate);

      // Check if we should slide to this note
      const shouldSlide = trigger.slide && prevOsc1 !== null;

      // Oscillator 1
      const osc1 = context.createOscillator();
      osc1.type = this.params.osc1Waveform || 'sawtooth';
      const osc1Freq = baseFreq * Math.pow(2, (this.params.osc1Octave || 0) / 12);
      const osc1Detune = (this.params.osc1Detune || 0) * 1;  // cents

      if (shouldSlide) {
        // Slide from previous frequency
        osc1.frequency.setValueAtTime(prevOsc1.frequency.value, time);
        osc1.frequency.linearRampToValueAtTime(osc1Freq, time + 0.05);
      } else {
        osc1.frequency.setValueAtTime(osc1Freq, time);
      }
      osc1.detune.setValueAtTime(osc1Detune, time);

      // Oscillator 2
      const osc2 = context.createOscillator();
      osc2.type = this.params.osc2Waveform || 'sawtooth';
      const osc2Freq = baseFreq * Math.pow(2, (this.params.osc2Octave || -12) / 12);
      const osc2Detune = (this.params.osc2Detune || 7) * 1;

      if (shouldSlide) {
        osc2.frequency.setValueAtTime(prevOsc2.frequency.value, time);
        osc2.frequency.linearRampToValueAtTime(osc2Freq, time + 0.05);
      } else {
        osc2.frequency.setValueAtTime(osc2Freq, time);
      }
      osc2.detune.setValueAtTime(osc2Detune, time);

      // Oscillator mixers
      const osc1Gain = context.createGain();
      osc1Gain.gain.value = (this.params.osc1Level || 100) / 100;
      osc1.connect(osc1Gain);

      const osc2Gain = context.createGain();
      osc2Gain.gain.value = (this.params.osc2Level || 80) / 100;
      osc2.connect(osc2Gain);

      // Mix oscillators
      const oscMixer = context.createGain();
      oscMixer.gain.value = 0.5;  // Prevent clipping
      osc1Gain.connect(oscMixer);
      osc2Gain.connect(oscMixer);

      // Filter (24dB lowpass using two cascaded biquads)
      const filter1 = context.createBiquadFilter();
      filter1.type = 'lowpass';
      const filter2 = context.createBiquadFilter();
      filter2.type = 'lowpass';

      const baseCutoff = this.params.filterCutoff || 800;
      const resonance = knobToQ(this.params.filterResonance || 40);
      filter1.Q.value = resonance * 0.7;  // Slightly reduced Q for first stage
      filter2.Q.value = resonance * 0.5;

      // Filter envelope
      const envAmount = (this.params.filterEnvAmount || 60) / 100;
      const filterAttack = knobToTime(this.params.filterAttack || 0);
      const filterDecay = knobToTime(this.params.filterDecay || 40);
      const filterSustain = (this.params.filterSustain || 20) / 100;
      const filterRelease = knobToTime(this.params.filterRelease || 30);

      // Calculate envelope peak (can go above or below base cutoff)
      const envPeakOffset = Math.abs(envAmount) * 8000;  // Max ±8000Hz modulation
      const envPeak = envAmount >= 0
        ? Math.min(16000, baseCutoff + envPeakOffset)
        : Math.max(20, baseCutoff - envPeakOffset);
      const envSustainFreq = baseCutoff + (envPeak - baseCutoff) * filterSustain;

      // Apply filter envelope
      const accentBoost = trigger.accent ? 1.5 : 1;
      const peakCutoff = Math.min(16000, envPeak * accentBoost);

      filter1.frequency.setValueAtTime(baseCutoff, time);
      filter1.frequency.linearRampToValueAtTime(peakCutoff, time + filterAttack);
      filter1.frequency.exponentialRampToValueAtTime(Math.max(20, envSustainFreq), time + filterAttack + filterDecay);

      filter2.frequency.setValueAtTime(baseCutoff, time);
      filter2.frequency.linearRampToValueAtTime(peakCutoff, time + filterAttack);
      filter2.frequency.exponentialRampToValueAtTime(Math.max(20, envSustainFreq), time + filterAttack + filterDecay);

      // Schedule release after gate
      const releaseTime = time + gateTime;
      filter1.frequency.setValueAtTime(Math.max(20, envSustainFreq), releaseTime);
      filter1.frequency.exponentialRampToValueAtTime(Math.max(20, baseCutoff * 0.5), releaseTime + filterRelease);
      filter2.frequency.setValueAtTime(Math.max(20, envSustainFreq), releaseTime);
      filter2.frequency.exponentialRampToValueAtTime(Math.max(20, baseCutoff * 0.5), releaseTime + filterRelease);

      oscMixer.connect(filter1);
      filter1.connect(filter2);

      // VCA (amp envelope)
      const vca = context.createGain();
      const ampAttack = knobToTime(this.params.ampAttack || 0);
      const ampDecay = knobToTime(this.params.ampDecay || 30);
      const ampSustain = (this.params.ampSustain || 60) / 100;
      const ampRelease = knobToTime(this.params.ampRelease || 20);

      const peakLevel = trigger.accent ? 1.0 : 0.8;

      vca.gain.setValueAtTime(0, time);
      vca.gain.linearRampToValueAtTime(peakLevel, time + ampAttack);
      vca.gain.exponentialRampToValueAtTime(Math.max(0.001, ampSustain * peakLevel), time + ampAttack + ampDecay);

      // Release
      vca.gain.setValueAtTime(Math.max(0.001, ampSustain * peakLevel), releaseTime);
      vca.gain.exponentialRampToValueAtTime(0.001, releaseTime + ampRelease);

      filter2.connect(vca);
      vca.connect(finalOutput);

      // Schedule oscillators
      osc1.start(time);
      osc2.start(time);
      const stopTime = releaseTime + ampRelease + 0.1;
      osc1.stop(stopTime);
      osc2.stop(stopTime);

      // Store for slide
      prevOsc1 = { frequency: { value: osc1Freq } };
      prevOsc2 = { frequency: { value: osc2Freq } };
      prevFilter = filter1;
      prevVCA = vca;
    }

    // Render
    const renderedBuffer = await context.startRendering();
    return renderedBuffer;
  }
}
