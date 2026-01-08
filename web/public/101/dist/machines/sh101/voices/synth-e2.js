/**
 * SH-101 E2 Voice (Authentic)
 *
 * Uses IR3109 filter emulation and full ADSR for authentic sound.
 * Higher CPU usage, warmer analog character.
 */

import { Voice } from '../../../core/voice.js';
import { Oscillator } from '../oscillator.js';
import { SubOscillator } from '../sub-oscillator.js';
import { IR3109Filter } from '../filter/ir3109.js';
import { ADSREnvelope } from '../envelope.js';
import { LFO } from '../lfo.js';

export class SynthVoiceE2 extends Voice {
    constructor(context, options = {}) {
        super('sh101-e2', context, options);

        // Full-featured oscillator
        this.vco = new Oscillator(context);

        // Sub-oscillator
        this.subOsc = new SubOscillator(context);

        // Mixer
        this.mixer = context.createGain();
        this.mixer.gain.value = 1;

        this.vco.connect(this.mixer);
        this.subOsc.connect(this.mixer);

        // IR3109 filter
        this.filter = new IR3109Filter(context);
        this.mixer.connect(this.filter.input);

        // ADSR for VCA
        this.ampEnvelope = new ADSREnvelope(context);

        // ADSR for filter
        this.filterEnvelope = new ADSREnvelope(context);

        // LFO
        this.lfo = new LFO(context);

        // VCA
        this.vca = context.createGain();
        this.vca.gain.value = 0;
        this.filter.connect(this.vca);
        this.vca.connect(this.output);

        // State
        this.currentNote = null;
        this.filterEnvAmount = 0.5;

        this.params = {
            sawLevel: 0.5,
            pulseLevel: 0.5,
            pulseWidth: 0.5,
            subLevel: 0.3,
            subMode: 1,
            cutoff: 0.5,
            resonance: 0.3,
            envMod: 0.5,
            keyboardTracking: 0.5,
            attack: 0.01,
            decay: 0.3,
            sustain: 0.7,
            release: 0.3,
            lfoRate: 0.3,
            lfoWaveform: 'triangle',
            lfoToPitch: 0,
            lfoToFilter: 0,
            lfoToPW: 0,
        };

        this.applyAllParameters();
    }

    /**
     * Apply all parameters
     */
    applyAllParameters() {
        Object.entries(this.params).forEach(([key, value]) => {
            this.setParameter(key, value);
        });
    }

    /**
     * Set frequency
     */
    setFrequency(freq, time) {
        this.vco.setFrequency(freq, time);
        this.subOsc.setFrequency(freq, time);
    }

    /**
     * Glide to frequency
     */
    glideToFrequency(freq, duration, time) {
        this.vco.glideToFrequency(freq, duration, time);
        this.subOsc.glideToFrequency(freq, duration, time);
    }

    /**
     * Set note (MIDI or name)
     */
    setNote(note, time) {
        let midiNote = note;
        if (typeof note === 'string') {
            midiNote = this.noteNameToMidi(note);
        }

        const freq = 440 * Math.pow(2, (midiNote - 69) / 12);
        this.setFrequency(freq, time);
        this.currentNote = midiNote;

        if (this.filter.setNote) {
            this.filter.setNote(midiNote);
        }
    }

    /**
     * Convert note name to MIDI
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
     * Trigger note
     */
    trigger(time, velocity = 1) {
        const when = time ?? this.context.currentTime;

        // Trigger envelopes
        this.ampEnvelope.trigger(when);
        this.filterEnvelope.trigger(when);

        // Apply amp envelope
        const a = this.params.attack;
        const d = this.params.decay;
        const s = this.params.sustain;

        this.vca.gain.cancelScheduledValues(when);
        this.vca.gain.setValueAtTime(0, when);
        this.vca.gain.linearRampToValueAtTime(velocity, when + a);
        this.vca.gain.linearRampToValueAtTime(s * velocity, when + a + d);

        // Apply filter envelope
        const baseCutoff = this.params.cutoff;
        const amount = this.filterEnvAmount;
        const peakCutoff = Math.min(1, baseCutoff + amount);
        const sustainCutoff = baseCutoff + (amount * s * 0.5);

        this.filter.setCutoff(baseCutoff, when);
        this.filter.rampCutoff(peakCutoff, a, when);

        // Schedule decay
        setTimeout(() => {
            this.filter.rampCutoff(sustainCutoff, d);
        }, a * 1000);
    }

    /**
     * Release note
     */
    release(time) {
        const when = time ?? this.context.currentTime;
        const r = this.params.release;

        this.ampEnvelope.release(when);
        this.filterEnvelope.release(when);

        this.vca.gain.cancelScheduledValues(when);
        const currentGain = this.vca.gain.value;
        this.vca.gain.setValueAtTime(currentGain, when);
        this.vca.gain.linearRampToValueAtTime(0, when + r);

        this.filter.rampCutoff(this.params.cutoff, r, when);
    }

    /**
     * Set parameter
     */
    setParameter(id, value) {
        super.setParameter(id, value);
        this.params[id] = value;

        switch (id) {
            case 'sawLevel':
                this.vco.setSawLevel(value);
                break;
            case 'pulseLevel':
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
            case 'keyboardTracking':
                this.filter.setKeyboardTracking(value);
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
                this.filterEnvelope.setSustain(value * 0.5);
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
                this.lfo.setPitchDepth(value * 2);
                break;
            case 'lfoToFilter':
                this.lfo.setFilterDepth(value * 2);
                break;
            case 'lfoToPW':
                this.lfo.setPwmDepth(value * 0.4);
                break;
        }
    }

    /**
     * Get parameter
     */
    getParameter(id) {
        return this.params[id];
    }

    /**
     * Parameter descriptors
     */
    get parameterDescriptors() {
        return [
            ...super.parameterDescriptors,
            { id: 'sawLevel', label: 'Saw Level', range: { min: 0, max: 1 }, defaultValue: 0.5 },
            { id: 'pulseLevel', label: 'Pulse Level', range: { min: 0, max: 1 }, defaultValue: 0.5 },
            { id: 'pulseWidth', label: 'Pulse Width', range: { min: 0.05, max: 0.95 }, defaultValue: 0.5 },
            { id: 'subLevel', label: 'Sub Level', range: { min: 0, max: 1 }, defaultValue: 0.3 },
            { id: 'subMode', label: 'Sub Mode', range: { min: 0, max: 3, step: 1 }, defaultValue: 1 },
            { id: 'cutoff', label: 'Cutoff', range: { min: 0, max: 1 }, defaultValue: 0.5 },
            { id: 'resonance', label: 'Resonance', range: { min: 0, max: 1 }, defaultValue: 0.3 },
            { id: 'envMod', label: 'Env Mod', range: { min: 0, max: 1 }, defaultValue: 0.5 },
            { id: 'keyboardTracking', label: 'Kbd Track', range: { min: 0, max: 1 }, defaultValue: 0.5 },
            { id: 'attack', label: 'Attack', range: { min: 0, max: 1 }, defaultValue: 0.01 },
            { id: 'decay', label: 'Decay', range: { min: 0, max: 1 }, defaultValue: 0.3 },
            { id: 'sustain', label: 'Sustain', range: { min: 0, max: 1 }, defaultValue: 0.7 },
            { id: 'release', label: 'Release', range: { min: 0, max: 1 }, defaultValue: 0.3 },
            { id: 'lfoRate', label: 'LFO Rate', range: { min: 0, max: 1 }, defaultValue: 0.3 },
            { id: 'lfoToPitch', label: 'LFO→Pitch', range: { min: 0, max: 1 }, defaultValue: 0 },
            { id: 'lfoToFilter', label: 'LFO→Filter', range: { min: 0, max: 1 }, defaultValue: 0 },
            { id: 'lfoToPW', label: 'LFO→PW', range: { min: 0, max: 1 }, defaultValue: 0 },
        ];
    }

    /**
     * Stop
     */
    stop() {
        this.vco.stop();
        this.subOsc.stop();
        this.ampEnvelope.stop();
        this.filterEnvelope.stop();
        this.lfo.stop();
    }
}

export default SynthVoiceE2;
