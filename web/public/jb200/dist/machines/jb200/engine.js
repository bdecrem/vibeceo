/**
 * JB200 Bass Monosynth Engine (Browser)
 *
 * 2-oscillator bass synth with:
 * - 2 oscillators (saw/square/tri) with octave, detune, and level
 * - 24dB lowpass filter with resonance
 * - Filter ADSR envelope with depth control
 * - Amp ADSR envelope
 * - Drive/saturation stage
 *
 * Supports both real-time playback and offline rendering.
 */

import { SynthEngine } from '../../core/engine.js';
import { JB200Sequencer, midiToFreq, noteToMidi } from './sequencer.js';

/**
 * Convert 0-100 to time in seconds for ADSR
 * 0 = instant (2ms), 100 = slow (2s)
 */
function knobToTime(value) {
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
 * Create soft saturation waveshaper
 */
function makeDriveShaper(context, amount) {
    const k = amount * 50;  // 0-100 -> 0-5000
    const n = 8192;
    const curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
        const x = (i * 2 / n) - 1;
        if (k === 0) {
            curve[i] = x;
        } else {
            curve[i] = (Math.PI + k) * x / (Math.PI + k * Math.abs(x));
        }
    }
    const shaper = context.createWaveShaper();
    shaper.curve = curve;
    shaper.oversample = '2x';
    return shaper;
}

export class JB200Engine extends SynthEngine {
    constructor(options = {}) {
        super(options);

        // Sequencer
        this.sequencer = new JB200Sequencer({ steps: 16, bpm: 120 });
        this.sequencer.setContext(this.context);
        this.currentBpm = 120;

        // Synth parameters (0-1 normalized for knobs, except where noted)
        // Defaults match jb200-params.json for consistent sound between web UI and Jambot
        this.parameters = {
            // Oscillator 1
            osc1Waveform: 'sawtooth',
            osc1Octave: 0,        // semitones: -24 to +24, default 0
            osc1Detune: 0.5,      // 0-1 -> -50 to +50 cents (0 cents)
            osc1Level: 0.63,      // 0-1 (63%)

            // Oscillator 2
            osc2Waveform: 'sawtooth',
            osc2Octave: 0,        // semitones, default 0 (same octave)
            osc2Detune: 0.57,     // 0-1, default ~7 cents
            osc2Level: 1.0,       // 0-1 (100%)

            // Filter
            filterCutoff: 0.603,  // 0-1 (log scale 20Hz-16kHz) - ~1129 Hz
            filterResonance: 0,   // 0-1 (0%)
            filterEnvAmount: 0.6, // 0-1 (bipolar: 0.5 = 0, 0 = -100%, 1 = +100%) - 20%

            // Filter envelope
            filterAttack: 0,      // 0-1
            filterDecay: 0.4,     // 0-1 (40%)
            filterSustain: 0.2,   // 0-1 (20%)
            filterRelease: 0.3,   // 0-1 (30%)

            // Amp envelope
            ampAttack: 0,         // 0-1
            ampDecay: 0.3,        // 0-1 (30%)
            ampSustain: 0,        // 0-1 (0% - plucky, no sustain)
            ampRelease: 0.2,      // 0-1 (20%)

            // Drive
            drive: 0.2,           // 0-1 (20%)

            // Master level
            level: 1.0,           // 0-1 (unity gain, 0dB)
        };

        // Active voice tracking for monophonic operation
        this.activeVoice = null;

        // Drive node (recreated when drive changes)
        this.driveNode = null;
        this.outputGain = this.context.createGain();
        this.outputGain.gain.value = this.parameters.level;
        this.outputGain.connect(this.compressor);
        this.updateDrive();

        // Sequencer callback
        this.sequencer.onStep = (step, stepData, nextStepData) => {
            this.handleSequencerStep(step, stepData, nextStepData);
        };

        // UI callback for step indicator
        this.sequencer.onStepChange = (step) => {
            this.onStepChange?.(step);
        };
    }

    updateDrive() {
        const driveAmount = this.parameters.drive * 100;
        if (this.driveNode) {
            this.driveNode.disconnect();
        }
        if (driveAmount > 1) {
            this.driveNode = makeDriveShaper(this.context, driveAmount);
            this.driveNode.connect(this.outputGain);
        } else {
            this.driveNode = null;
        }
    }

    getOutput() {
        return this.driveNode || this.outputGain;
    }

    // ========================================
    // Parameter Access
    // ========================================

    setParameter(id, value) {
        if (this.parameters.hasOwnProperty(id)) {
            this.parameters[id] = value;

            // Handle special cases
            if (id === 'level') {
                this.outputGain.gain.value = value;
            } else if (id === 'drive') {
                this.updateDrive();
            }
        }
    }

    getParameter(id) {
        return this.parameters[id];
    }

    getParameters() {
        return { ...this.parameters };
    }

    setOsc1Waveform(waveform) {
        this.parameters.osc1Waveform = waveform;
    }

    setOsc2Waveform(waveform) {
        this.parameters.osc2Waveform = waveform;
    }

    // ========================================
    // Note Playback (Real-time)
    // ========================================

    playNote(note, accent = false, slide = false) {
        if (this.context.state === 'suspended') {
            this.context.resume();
        }

        const time = this.context.currentTime;
        const midi = typeof note === 'string' ? noteToMidi(note) : note;
        const baseFreq = midiToFreq(midi);

        // Kill previous voice if not sliding
        if (this.activeVoice && !slide) {
            this.releaseVoice(this.activeVoice, time);
        }

        // Create voice
        const voice = this.createVoice(baseFreq, time, accent, slide);
        this.activeVoice = voice;

        // Auto-release after a short time for preview
        setTimeout(() => {
            if (this.activeVoice === voice) {
                this.releaseVoice(voice, this.context.currentTime);
                this.activeVoice = null;
            }
        }, 300);
    }

    createVoice(baseFreq, time, accent, slide) {
        const p = this.parameters;

        // Oscillator 1
        const osc1 = this.context.createOscillator();
        osc1.type = p.osc1Waveform;
        const osc1Freq = baseFreq * Math.pow(2, p.osc1Octave / 12);
        const osc1Detune = (p.osc1Detune - 0.5) * 100;  // -50 to +50 cents
        osc1.frequency.setValueAtTime(osc1Freq, time);
        osc1.detune.setValueAtTime(osc1Detune, time);

        // Oscillator 2
        const osc2 = this.context.createOscillator();
        osc2.type = p.osc2Waveform;
        const osc2Freq = baseFreq * Math.pow(2, p.osc2Octave / 12);
        const osc2Detune = (p.osc2Detune - 0.5) * 100;
        osc2.frequency.setValueAtTime(osc2Freq, time);
        osc2.detune.setValueAtTime(osc2Detune, time);

        // Oscillator gains
        const osc1Gain = this.context.createGain();
        osc1Gain.gain.value = p.osc1Level;
        osc1.connect(osc1Gain);

        const osc2Gain = this.context.createGain();
        osc2Gain.gain.value = p.osc2Level;
        osc2.connect(osc2Gain);

        // Mix oscillators
        const oscMixer = this.context.createGain();
        oscMixer.gain.value = 0.5;
        osc1Gain.connect(oscMixer);
        osc2Gain.connect(oscMixer);

        // Filter (24dB - two cascaded biquads)
        const filter1 = this.context.createBiquadFilter();
        filter1.type = 'lowpass';
        const filter2 = this.context.createBiquadFilter();
        filter2.type = 'lowpass';

        // Cutoff: log scale 20Hz to 16kHz
        const baseCutoff = 20 * Math.pow(800, p.filterCutoff);
        const resonance = knobToQ(p.filterResonance * 100);
        filter1.Q.value = resonance * 0.7;
        filter2.Q.value = resonance * 0.5;

        // Filter envelope
        const envAmount = (p.filterEnvAmount - 0.5) * 2;  // -1 to +1
        const filterAttack = knobToTime(p.filterAttack * 100);
        const filterDecay = knobToTime(p.filterDecay * 100);
        const filterSustain = p.filterSustain;
        const filterRelease = knobToTime(p.filterRelease * 100);

        const envPeakOffset = Math.abs(envAmount) * 8000;
        const envPeak = envAmount >= 0
            ? Math.min(16000, baseCutoff + envPeakOffset)
            : Math.max(20, baseCutoff - envPeakOffset);
        const envSustainFreq = baseCutoff + (envPeak - baseCutoff) * filterSustain;

        const accentBoost = accent ? 1.5 : 1;
        const peakCutoff = Math.min(16000, envPeak * accentBoost);

        filter1.frequency.setValueAtTime(baseCutoff, time);
        filter1.frequency.linearRampToValueAtTime(peakCutoff, time + filterAttack);
        filter1.frequency.exponentialRampToValueAtTime(Math.max(20, envSustainFreq), time + filterAttack + filterDecay);

        filter2.frequency.setValueAtTime(baseCutoff, time);
        filter2.frequency.linearRampToValueAtTime(peakCutoff, time + filterAttack);
        filter2.frequency.exponentialRampToValueAtTime(Math.max(20, envSustainFreq), time + filterAttack + filterDecay);

        oscMixer.connect(filter1);
        filter1.connect(filter2);

        // VCA (amp envelope)
        const vca = this.context.createGain();
        const ampAttack = knobToTime(p.ampAttack * 100);
        const ampDecay = knobToTime(p.ampDecay * 100);
        const ampSustain = p.ampSustain;

        const peakLevel = accent ? 1.0 : 0.8;

        vca.gain.setValueAtTime(0, time);
        vca.gain.linearRampToValueAtTime(peakLevel, time + ampAttack);
        vca.gain.exponentialRampToValueAtTime(Math.max(0.001, ampSustain * peakLevel), time + ampAttack + ampDecay);

        filter2.connect(vca);
        vca.connect(this.getOutput());

        // Start oscillators
        osc1.start(time);
        osc2.start(time);

        return {
            osc1, osc2, osc1Gain, osc2Gain, filter1, filter2, vca,
            baseFreq, time
        };
    }

    releaseVoice(voice, time) {
        const p = this.parameters;
        const ampRelease = knobToTime(p.ampRelease * 100);
        const filterRelease = knobToTime(p.filterRelease * 100);

        // Release amp
        voice.vca.gain.cancelScheduledValues(time);
        voice.vca.gain.setValueAtTime(voice.vca.gain.value, time);
        voice.vca.gain.exponentialRampToValueAtTime(0.001, time + ampRelease);

        // Release filter
        const baseCutoff = 20 * Math.pow(800, p.filterCutoff);
        voice.filter1.frequency.cancelScheduledValues(time);
        voice.filter1.frequency.setValueAtTime(voice.filter1.frequency.value, time);
        voice.filter1.frequency.exponentialRampToValueAtTime(Math.max(20, baseCutoff * 0.5), time + filterRelease);
        voice.filter2.frequency.cancelScheduledValues(time);
        voice.filter2.frequency.setValueAtTime(voice.filter2.frequency.value, time);
        voice.filter2.frequency.exponentialRampToValueAtTime(Math.max(20, baseCutoff * 0.5), time + filterRelease);

        // Stop oscillators
        const stopTime = time + Math.max(ampRelease, filterRelease) + 0.1;
        voice.osc1.stop(stopTime);
        voice.osc2.stop(stopTime);
    }

    // ========================================
    // Sequencer
    // ========================================

    handleSequencerStep(step, stepData, nextStepData) {
        if (!stepData) return;

        const time = stepData.time;
        const baseFreq = stepData.frequency;
        const accent = stepData.accent;
        const slide = stepData.slide;
        const duration = stepData.duration;

        // Create voice
        const voice = this.createVoice(baseFreq, time, accent, slide);

        // Schedule release
        const releaseTime = time + duration * 0.9;
        setTimeout(() => {
            this.releaseVoice(voice, this.context.currentTime);
        }, (releaseTime - this.context.currentTime) * 1000);
    }

    startSequencer() {
        if (this.context.state === 'suspended') {
            this.context.resume();
        }
        this.sequencer.start();
    }

    stopSequencer() {
        this.sequencer.stop();
        if (this.activeVoice) {
            this.releaseVoice(this.activeVoice, this.context.currentTime);
            this.activeVoice = null;
        }
    }

    isPlaying() {
        return this.sequencer.isRunning();
    }

    setBpm(bpm) {
        this.currentBpm = bpm;
        this.sequencer.setBpm(bpm);
    }

    getBpm() {
        return this.currentBpm;
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

    // ========================================
    // Offline Rendering
    // ========================================

    async renderPattern(options = {}) {
        const { bars = 1 } = options;

        // Timing: prefer clock's stepDuration, fall back to BPM calculation
        // Clock provides timing directly - engines don't need to know BPM
        let stepDuration;
        if (options.stepDuration) {
            // Clock-provided timing (preferred)
            stepDuration = options.stepDuration;
        } else if (options.bpm) {
            // BPM provided (legacy/UI use)
            stepDuration = 60 / options.bpm / 4;
        } else {
            // Fallback to internal state (real-time UI)
            stepDuration = 60 / this.currentBpm / 4;
        }

        const stepsPerBar = 16;
        const duration = bars * stepsPerBar * stepDuration;

        const sampleRate = options.sampleRate ?? this.context.sampleRate ?? 44100;
        const totalSamples = Math.ceil((duration + 2) * sampleRate);
        const offlineContext = new OfflineAudioContext(2, totalSamples, sampleRate);

        // Master output
        const masterGain = offlineContext.createGain();
        masterGain.gain.value = this.parameters.level;
        masterGain.connect(offlineContext.destination);

        // Drive
        let output = masterGain;
        if (this.parameters.drive > 0.01) {
            const driveNode = makeDriveShaper(offlineContext, this.parameters.drive * 100);
            driveNode.connect(masterGain);
            output = driveNode;
        }

        // Get pattern
        const pattern = this.sequencer.getPattern();
        const patternLength = pattern.length || 16;
        const totalSteps = bars * 16;

        // Schedule notes (pattern loops to fill requested bars)
        for (let i = 0; i < totalSteps; i++) {
            const step = pattern[i % patternLength];
            if (!step.gate) continue;

            const time = i * stepDuration;
            const midi = noteToMidi(step.note);
            const baseFreq = midiToFreq(midi);

            this.renderNote(offlineContext, output, baseFreq, time, stepDuration, step.accent, step.slide);
        }

        return offlineContext.startRendering();
    }

    /**
     * Render a test tone for audio analysis
     * Pure waveform, flat envelope, no effects
     * @param {Object} options
     * @param {string} options.note - Note name (default 'A4' = 440Hz)
     * @param {number} options.duration - Duration in seconds (default 1.0)
     * @param {number} options.sampleRate - Sample rate (default 44100)
     */
    async renderTestTone(options = {}) {
        const { note = 'A4', duration = 1.0, sampleRate = 44100 } = options;

        const midi = noteToMidi(note);
        const freq = midiToFreq(midi);

        const totalSamples = Math.ceil(duration * sampleRate);
        const offlineContext = new OfflineAudioContext(2, totalSamples, sampleRate);

        // Single oscillator, no effects
        const osc = offlineContext.createOscillator();
        osc.type = this.parameters.osc1Waveform;
        osc.frequency.setValueAtTime(freq, 0);

        // Flat envelope (instant on/off)
        const gain = offlineContext.createGain();
        gain.gain.setValueAtTime(this.parameters.level, 0);

        osc.connect(gain);
        gain.connect(offlineContext.destination);

        osc.start(0);
        osc.stop(duration);

        return offlineContext.startRendering();
    }

    renderNote(context, output, baseFreq, time, duration, accent, slide) {
        const p = this.parameters;

        // Oscillator 1
        const osc1 = context.createOscillator();
        osc1.type = p.osc1Waveform;
        const osc1Freq = baseFreq * Math.pow(2, p.osc1Octave / 12);
        osc1.frequency.setValueAtTime(osc1Freq, time);
        osc1.detune.setValueAtTime((p.osc1Detune - 0.5) * 100, time);

        // Oscillator 2
        const osc2 = context.createOscillator();
        osc2.type = p.osc2Waveform;
        const osc2Freq = baseFreq * Math.pow(2, p.osc2Octave / 12);
        osc2.frequency.setValueAtTime(osc2Freq, time);
        osc2.detune.setValueAtTime((p.osc2Detune - 0.5) * 100, time);

        // Gains
        const osc1Gain = context.createGain();
        osc1Gain.gain.value = p.osc1Level;
        osc1.connect(osc1Gain);

        const osc2Gain = context.createGain();
        osc2Gain.gain.value = p.osc2Level;
        osc2.connect(osc2Gain);

        const oscMixer = context.createGain();
        oscMixer.gain.value = 0.5;
        osc1Gain.connect(oscMixer);
        osc2Gain.connect(oscMixer);

        // Filter
        const filter1 = context.createBiquadFilter();
        filter1.type = 'lowpass';
        const filter2 = context.createBiquadFilter();
        filter2.type = 'lowpass';

        const baseCutoff = 20 * Math.pow(800, p.filterCutoff);
        const resonance = knobToQ(p.filterResonance * 100);
        filter1.Q.value = resonance * 0.7;
        filter2.Q.value = resonance * 0.5;

        // Filter envelope
        const envAmount = (p.filterEnvAmount - 0.5) * 2;
        const filterAttack = knobToTime(p.filterAttack * 100);
        const filterDecay = knobToTime(p.filterDecay * 100);
        const filterSustain = p.filterSustain;
        const filterRelease = knobToTime(p.filterRelease * 100);

        const envPeakOffset = Math.abs(envAmount) * 8000;
        const envPeak = envAmount >= 0
            ? Math.min(16000, baseCutoff + envPeakOffset)
            : Math.max(20, baseCutoff - envPeakOffset);
        const envSustainFreq = baseCutoff + (envPeak - baseCutoff) * filterSustain;

        const accentBoost = accent ? 1.5 : 1;
        const peakCutoff = Math.min(16000, envPeak * accentBoost);

        filter1.frequency.setValueAtTime(baseCutoff, time);
        filter1.frequency.linearRampToValueAtTime(peakCutoff, time + filterAttack);
        filter1.frequency.exponentialRampToValueAtTime(Math.max(20, envSustainFreq), time + filterAttack + filterDecay);

        filter2.frequency.setValueAtTime(baseCutoff, time);
        filter2.frequency.linearRampToValueAtTime(peakCutoff, time + filterAttack);
        filter2.frequency.exponentialRampToValueAtTime(Math.max(20, envSustainFreq), time + filterAttack + filterDecay);

        // Release
        const releaseTime = time + duration * 0.9;
        filter1.frequency.setValueAtTime(Math.max(20, envSustainFreq), releaseTime);
        filter1.frequency.exponentialRampToValueAtTime(Math.max(20, baseCutoff * 0.5), releaseTime + filterRelease);
        filter2.frequency.setValueAtTime(Math.max(20, envSustainFreq), releaseTime);
        filter2.frequency.exponentialRampToValueAtTime(Math.max(20, baseCutoff * 0.5), releaseTime + filterRelease);

        oscMixer.connect(filter1);
        filter1.connect(filter2);

        // VCA
        const vca = context.createGain();
        const ampAttack = knobToTime(p.ampAttack * 100);
        const ampDecay = knobToTime(p.ampDecay * 100);
        const ampSustain = p.ampSustain;
        const ampRelease = knobToTime(p.ampRelease * 100);

        const peakLevel = accent ? 1.0 : 0.8;

        vca.gain.setValueAtTime(0, time);
        vca.gain.linearRampToValueAtTime(peakLevel, time + ampAttack);
        vca.gain.exponentialRampToValueAtTime(Math.max(0.001, ampSustain * peakLevel), time + ampAttack + ampDecay);
        vca.gain.setValueAtTime(Math.max(0.001, ampSustain * peakLevel), releaseTime);
        vca.gain.exponentialRampToValueAtTime(0.001, releaseTime + ampRelease);

        filter2.connect(vca);
        vca.connect(output);

        // Schedule
        osc1.start(time);
        osc2.start(time);
        const stopTime = releaseTime + Math.max(ampRelease, filterRelease) + 0.1;
        osc1.stop(stopTime);
        osc2.stop(stopTime);
    }
}

export default JB200Engine;
