/**
 * SH-101 Synthesizer Engine
 *
 * Main engine class that combines:
 * - VCO (saw + pulse + PWM)
 * - Sub-oscillator (3 modes)
 * - IR3109 filter
 * - ADSR envelope
 * - LFO modulation
 * - VCA
 *
 * Extends base SynthEngine for infrastructure.
 */

import { SynthEngine } from '../../core/engine.js';
import { Oscillator } from './oscillator.js';
import { SubOscillator } from './sub-oscillator.js';
import { IR3109Filter, IR3109FilterE1 } from './filter/ir3109.js';
import { ADSREnvelope } from './envelope.js';
import { LFO } from './lfo.js';
import { VCA } from './vca.js';

export class SH101Engine extends SynthEngine {
    constructor(options = {}) {
        super(options);

        this.engineVersion = options.engine ?? 'E1';

        // Create voice components
        this.initializeVoice();

        // Sequencer state
        this.pattern = this.createEmptyPattern();
        this.currentStep = 0;
        this.bpm = 120;
        this.playing = false;
        this.sequencerInterval = null;

        // Arpeggiator state
        this.arpMode = 'off'; // 'off', 'up', 'down', 'updown'
        this.arpHold = false;
        this.arpNotes = [];
        this.arpIndex = 0;
        this.arpDirection = 1; // 1 = up, -1 = down
        this.arpOctaves = 1;

        // Callbacks
        this.onStepChange = null;
        this.onNote = null;

        // Current note for glide
        this.currentNote = null;
        this.glideTime = 0.05; // 50ms default glide
    }

    /**
     * Initialize voice components
     */
    initializeVoice() {
        // VCO
        this.vco = new Oscillator(this.context);

        // Sub-oscillator
        this.subOsc = new SubOscillator(this.context);

        // Mixer for VCO + Sub
        this.mixer = this.context.createGain();
        this.mixer.gain.value = 1;

        this.vco.connect(this.mixer);
        this.subOsc.connect(this.mixer);

        // Filter (E1 or E2 based on engine version)
        if (this.engineVersion === 'E2') {
            this.filter = new IR3109Filter(this.context);
        } else {
            this.filter = new IR3109FilterE1(this.context);
        }
        this.mixer.connect(this.filter.input);

        // Envelopes
        this.ampEnvelope = new ADSREnvelope(this.context, {
            attack: 0.01,
            decay: 0.3,
            sustain: 0.7,
            release: 0.3,
        });

        this.filterEnvelope = new ADSREnvelope(this.context, {
            attack: 0.01,
            decay: 0.3,
            sustain: 0.3,
            release: 0.3,
        });

        // LFO
        this.lfo = new LFO(this.context);

        // VCA
        this.vca = new VCA(this.context);
        this.filter.connect(this.vca.input);

        // Connect VCA to output
        this.vca.connect(this.compressor);

        // Filter envelope modulation amount
        this.filterEnvAmount = 0.5;

        // Default parameters
        this.params = {
            vcoSaw: 0.5,
            vcoPulse: 0.5,
            pulseWidth: 0.5,
            subLevel: 0.3,
            subMode: 0,
            cutoff: 0.5,
            resonance: 0.3,
            envMod: 0.5,
            attack: 0.01,
            decay: 0.3,
            sustain: 0.7,
            release: 0.3,
            lfoRate: 0.3,
            lfoWaveform: 'triangle',
            lfoToPitch: 0,
            lfoToFilter: 0,
            lfoToPW: 0,
            volume: 0.8,
        };

        this.applyAllParameters();
    }

    /**
     * Apply all parameters to voice
     */
    applyAllParameters() {
        Object.entries(this.params).forEach(([key, value]) => {
            this.setParameter(key, value);
        });
    }

    /**
     * Set a synth parameter
     */
    setParameter(id, value) {
        this.params[id] = value;

        switch (id) {
            case 'vcoSaw':
                this.vco.setSawLevel(value);
                break;
            case 'vcoPulse':
                this.vco.setPulseLevel(value);
                break;
            case 'pulseWidth':
                this.vco.setPulseWidth(value);
                break;
            case 'subLevel':
                this.subOsc.setLevel(value);
                break;
            case 'subMode':
                this.subOsc.setMode(value);
                break;
            case 'cutoff':
                this.filter.setCutoff(value);
                break;
            case 'resonance':
                this.filter.setResonance(value);
                break;
            case 'envMod':
                this.filterEnvAmount = value;
                break;
            case 'attack':
                this.ampEnvelope.setAttack(value);
                this.filterEnvelope.setAttack(value);
                break;
            case 'decay':
                this.ampEnvelope.setDecay(value);
                this.filterEnvelope.setDecay(value);
                break;
            case 'sustain':
                this.ampEnvelope.setSustain(value);
                this.filterEnvelope.setSustain(value * 0.5); // Filter sustain lower
                break;
            case 'release':
                this.ampEnvelope.setRelease(value);
                this.filterEnvelope.setRelease(value);
                break;
            case 'lfoRate':
                this.lfo.setRate(value);
                break;
            case 'lfoWaveform':
                this.lfo.setWaveform(value);
                break;
            case 'lfoToPitch':
                this.lfo.setPitchDepth(value * 2); // 0-2 semitones
                break;
            case 'lfoToFilter':
                this.lfo.setFilterDepth(value * 2); // 0-2 octaves
                break;
            case 'lfoToPW':
                this.lfo.setPwmDepth(value * 0.4); // 0-40%
                break;
            case 'volume':
                this.vca.setVolume(value);
                break;
        }
    }

    /**
     * Get current parameter value
     */
    getParameter(id) {
        return this.params[id];
    }

    /**
     * Get all parameters
     */
    getParameters() {
        return { ...this.params };
    }

    /**
     * Play a note
     */
    playNote(note, velocity = 1, time) {
        const when = time ?? this.context.currentTime;

        // Ensure audio context is running
        if (this.context.state === 'suspended') {
            this.context.resume();
        }

        // Convert note name to MIDI if string
        let midiNote = note;
        if (typeof note === 'string') {
            midiNote = this.noteNameToMidi(note);
        }

        // Calculate frequency
        const freq = 440 * Math.pow(2, (midiNote - 69) / 12);

        // Glide if there's a current note
        if (this.currentNote !== null) {
            this.vco.glideToFrequency(freq, this.glideTime, when);
            this.subOsc.glideToFrequency(freq, this.glideTime, when);
        } else {
            this.vco.setFrequency(freq, when);
            this.subOsc.setFrequency(freq, when);
        }

        this.currentNote = midiNote;

        // Trigger envelopes
        this.ampEnvelope.trigger(when, true);
        this.filterEnvelope.trigger(when, true);

        // Apply amp envelope to VCA
        this.applyAmpEnvelope(when);

        // Apply filter envelope
        this.applyFilterEnvelope(when);

        // Update filter keyboard tracking
        if (this.filter.setNote) {
            this.filter.setNote(midiNote);
        }
    }

    /**
     * Apply amp envelope to VCA
     */
    applyAmpEnvelope(time) {
        const when = time ?? this.context.currentTime;
        const a = this.params.attack;
        const d = this.params.decay;
        const s = this.params.sustain;

        // Attack
        this.vca.amplifier.gain.cancelScheduledValues(when);
        this.vca.amplifier.gain.setValueAtTime(0, when);
        this.vca.amplifier.gain.linearRampToValueAtTime(1, when + a);

        // Decay to sustain
        this.vca.amplifier.gain.linearRampToValueAtTime(s, when + a + d);
    }

    /**
     * Apply filter envelope
     */
    applyFilterEnvelope(time) {
        const when = time ?? this.context.currentTime;
        const a = this.params.attack;
        const d = this.params.decay;
        const baseCutoff = this.params.cutoff;
        const amount = this.filterEnvAmount;

        // Calculate envelope target
        const peakCutoff = Math.min(1, baseCutoff + amount);
        const sustainCutoff = baseCutoff + (amount * this.params.sustain * 0.5);

        // Attack
        this.filter.setCutoff(baseCutoff, when);
        this.filter.rampCutoff(peakCutoff, a, when);

        // Decay to sustain
        setTimeout(() => {
            this.filter.rampCutoff(sustainCutoff, d);
        }, a * 1000);
    }

    /**
     * Release note
     */
    noteOff(time) {
        const when = time ?? this.context.currentTime;
        const r = this.params.release;

        // Release envelopes
        this.ampEnvelope.release(when);
        this.filterEnvelope.release(when);

        // Apply release to VCA
        this.vca.amplifier.gain.cancelScheduledValues(when);
        const currentGain = this.vca.amplifier.gain.value;
        this.vca.amplifier.gain.setValueAtTime(currentGain, when);
        this.vca.amplifier.gain.linearRampToValueAtTime(0, when + r);

        // Release filter
        this.filter.rampCutoff(this.params.cutoff, r, when);

        this.currentNote = null;
    }

    /**
     * Convert note name to MIDI number
     */
    noteNameToMidi(noteName) {
        const noteMap = { 'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11 };
        const match = noteName.match(/^([A-G])([#b]?)(\d+)$/);
        if (!match) return 60;

        let note = noteMap[match[1]];
        if (match[2] === '#') note += 1;
        if (match[2] === 'b') note -= 1;
        const octave = parseInt(match[3]);

        return note + (octave + 1) * 12;
    }

    /**
     * Create empty 16-step pattern
     */
    createEmptyPattern() {
        return Array(16).fill(null).map(() => ({
            note: 'C3',
            gate: false,
            accent: false,
            slide: false,
        }));
    }

    /**
     * Set pattern
     */
    setPattern(pattern) {
        this.pattern = pattern;
    }

    /**
     * Get current pattern
     */
    getPattern() {
        return this.pattern;
    }

    /**
     * Set a single step
     */
    setStep(index, data) {
        if (index >= 0 && index < 16) {
            this.pattern[index] = { ...this.pattern[index], ...data };
        }
    }

    /**
     * Get a single step
     */
    getStep(index) {
        return this.pattern[index];
    }

    /**
     * Set BPM
     */
    setBpm(bpm) {
        this.bpm = Math.max(30, Math.min(300, bpm));
        if (this.playing) {
            // Restart sequencer with new tempo
            this.stopSequencer();
            this.startSequencer();
        }
    }

    /**
     * Get BPM
     */
    getBpm() {
        return this.bpm;
    }

    /**
     * Start sequencer
     */
    startSequencer() {
        if (this.playing) return;

        this.playing = true;
        this.currentStep = 0;

        const stepDuration = (60 / this.bpm) / 4; // 16th notes
        const stepMs = stepDuration * 1000;

        this.sequencerInterval = setInterval(() => {
            this.triggerStep(this.currentStep);
            this.currentStep = (this.currentStep + 1) % 16;
        }, stepMs);
    }

    /**
     * Stop sequencer
     */
    stopSequencer() {
        if (!this.playing) return;

        this.playing = false;
        if (this.sequencerInterval) {
            clearInterval(this.sequencerInterval);
            this.sequencerInterval = null;
        }
        this.noteOff();
    }

    /**
     * Check if playing
     */
    isPlaying() {
        return this.playing;
    }

    /**
     * Trigger a sequencer step
     */
    triggerStep(stepIndex) {
        const step = this.pattern[stepIndex];
        const time = this.context.currentTime;

        if (this.onStepChange) {
            this.onStepChange(stepIndex);
        }

        if (step.gate) {
            const velocity = step.accent ? 1.0 : 0.7;

            // Check for slide
            if (step.slide && stepIndex > 0) {
                // Glide to this note
                const midiNote = this.noteNameToMidi(step.note);
                const freq = 440 * Math.pow(2, (midiNote - 69) / 12);
                this.vco.glideToFrequency(freq, this.glideTime, time);
                this.subOsc.glideToFrequency(freq, this.glideTime, time);
                this.currentNote = midiNote;
            } else {
                this.playNote(step.note, velocity, time);
            }

            if (this.onNote) {
                this.onNote(stepIndex, step);
            }
        } else {
            // Rest - release if not sliding
            const nextStep = this.pattern[(stepIndex + 1) % 16];
            if (!nextStep.slide) {
                this.noteOff(time);
            }
        }
    }

    /**
     * Set engine version (E1 or E2)
     */
    setEngine(version) {
        if (version === this.engineVersion) return;

        // Save current parameters
        const savedParams = this.getParameters();

        // Disconnect old filter
        this.mixer.disconnect();
        this.filter.disconnect();

        // Create new filter
        this.engineVersion = version;
        if (version === 'E2') {
            this.filter = new IR3109Filter(this.context);
        } else {
            this.filter = new IR3109FilterE1(this.context);
        }

        // Reconnect
        this.mixer.connect(this.filter.input);
        this.filter.connect(this.vca.input);

        // Restore parameters
        Object.entries(savedParams).forEach(([key, value]) => {
            this.setParameter(key, value);
        });
    }

    /**
     * Get current engine version
     */
    getEngine() {
        return this.engineVersion;
    }

    // --- Arpeggiator Methods ---

    /**
     * Set arpeggiator mode
     */
    setArpMode(mode) {
        this.arpMode = mode;
        this.arpIndex = 0;
        this.arpDirection = 1;
    }

    /**
     * Set arpeggiator hold
     */
    setArpHold(hold) {
        this.arpHold = hold;
        if (!hold) {
            this.arpNotes = [];
        }
    }

    /**
     * Add note to arpeggiator
     */
    addArpNote(note) {
        const midiNote = typeof note === 'string' ? this.noteNameToMidi(note) : note;
        if (!this.arpNotes.includes(midiNote)) {
            this.arpNotes.push(midiNote);
            this.arpNotes.sort((a, b) => a - b);
        }
    }

    /**
     * Remove note from arpeggiator
     */
    removeArpNote(note) {
        if (this.arpHold) return; // Don't remove in hold mode

        const midiNote = typeof note === 'string' ? this.noteNameToMidi(note) : note;
        this.arpNotes = this.arpNotes.filter(n => n !== midiNote);
    }

    /**
     * Clear all arp notes
     */
    clearArpNotes() {
        this.arpNotes = [];
    }

    /**
     * Set arp octave range
     */
    setArpOctaves(octaves) {
        this.arpOctaves = Math.max(1, Math.min(3, octaves));
    }

    /**
     * Get next arp note
     */
    getNextArpNote() {
        if (this.arpNotes.length === 0) return null;

        // Build full note list with octaves
        const fullNotes = [];
        for (let oct = 0; oct < this.arpOctaves; oct++) {
            this.arpNotes.forEach(note => {
                fullNotes.push(note + (oct * 12));
            });
        }

        let note;

        switch (this.arpMode) {
            case 'up':
                note = fullNotes[this.arpIndex % fullNotes.length];
                this.arpIndex = (this.arpIndex + 1) % fullNotes.length;
                break;

            case 'down':
                const downIndex = fullNotes.length - 1 - (this.arpIndex % fullNotes.length);
                note = fullNotes[downIndex];
                this.arpIndex = (this.arpIndex + 1) % fullNotes.length;
                break;

            case 'updown':
                note = fullNotes[this.arpIndex];
                this.arpIndex += this.arpDirection;

                if (this.arpIndex >= fullNotes.length - 1) {
                    this.arpDirection = -1;
                    this.arpIndex = fullNotes.length - 1;
                } else if (this.arpIndex <= 0) {
                    this.arpDirection = 1;
                    this.arpIndex = 0;
                }
                break;

            default:
                return null;
        }

        return note;
    }

    // --- Render Methods ---

    /**
     * Render pattern to AudioBuffer
     */
    async renderPattern(options = {}) {
        const bars = options.bars ?? 1;
        const bpm = options.bpm ?? this.bpm;

        const stepsPerBar = 16;
        const totalSteps = bars * stepsPerBar;
        const stepDuration = (60 / bpm) / 4;
        const totalDuration = totalSteps * stepDuration + 1; // +1 for release tail

        // Create offline context
        const offlineContext = new OfflineAudioContext(
            2,
            Math.ceil(totalDuration * 44100),
            44100
        );

        // Create a temporary engine in offline context
        const offlineEngine = new SH101Engine({
            context: offlineContext,
            engine: this.engineVersion,
        });

        // Copy parameters
        Object.entries(this.params).forEach(([key, value]) => {
            offlineEngine.setParameter(key, value);
        });

        // Copy pattern
        offlineEngine.setPattern([...this.pattern]);

        // Schedule all notes
        for (let step = 0; step < totalSteps; step++) {
            const patternStep = step % 16;
            const stepData = this.pattern[patternStep];
            const stepTime = step * stepDuration;

            if (stepData.gate) {
                const velocity = stepData.accent ? 1.0 : 0.7;
                offlineEngine.playNote(stepData.note, velocity, stepTime);

                // Check if next step is NOT a slide - release before it
                const nextPatternStep = (patternStep + 1) % 16;
                const nextStepData = this.pattern[nextPatternStep];
                if (!nextStepData.slide) {
                    offlineEngine.noteOff(stepTime + stepDuration * 0.9);
                }
            }
        }

        // Render
        const buffer = await offlineContext.startRendering();
        return buffer;
    }

    /**
     * Convert AudioBuffer to WAV ArrayBuffer
     */
    audioBufferToWav(buffer) {
        return this.outputManager.audioBufferToWav(buffer);
    }

    /**
     * Convert AudioBuffer to Blob
     */
    audioBufferToBlob(buffer) {
        return this.outputManager.audioBufferToBlob(buffer);
    }
}

export default SH101Engine;
