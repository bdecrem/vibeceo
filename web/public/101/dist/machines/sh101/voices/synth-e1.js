/**
 * SH-101 E1 Voice (Simple)
 *
 * Uses basic Web Audio nodes for lower CPU usage.
 * Clean, digital sound.
 */

import { Voice } from '../../../core/voice.js';

export class SynthVoiceE1 extends Voice {
    constructor(context, options = {}) {
        super('sh101-e1', context, options);

        // Simple oscillators
        this.sawOsc = context.createOscillator();
        this.sawOsc.type = 'sawtooth';

        this.pulseOsc = context.createOscillator();
        this.pulseOsc.type = 'square';

        this.subOsc = context.createOscillator();
        this.subOsc.type = 'square';

        // Mixer
        this.sawGain = context.createGain();
        this.sawGain.gain.value = 0.5;

        this.pulseGain = context.createGain();
        this.pulseGain.gain.value = 0.5;

        this.subGain = context.createGain();
        this.subGain.gain.value = 0.3;

        // Filter (simple biquad)
        this.filter = context.createBiquadFilter();
        this.filter.type = 'lowpass';
        this.filter.frequency.value = 2000;
        this.filter.Q.value = 5;

        // VCA
        this.vca = context.createGain();
        this.vca.gain.value = 0;

        // Connect
        this.sawOsc.connect(this.sawGain);
        this.pulseOsc.connect(this.pulseGain);
        this.subOsc.connect(this.subGain);

        this.sawGain.connect(this.filter);
        this.pulseGain.connect(this.filter);
        this.subGain.connect(this.filter);

        this.filter.connect(this.vca);
        this.vca.connect(this.output);

        // Start oscillators
        this.sawOsc.start();
        this.pulseOsc.start();
        this.subOsc.start();

        // State
        this.currentFreq = 261.63;
        this.params = {
            sawLevel: 0.5,
            pulseLevel: 0.5,
            subLevel: 0.3,
            cutoff: 0.5,
            resonance: 0.3,
            attack: 0.01,
            decay: 0.3,
            sustain: 0.7,
            release: 0.3,
        };
    }

    /**
     * Set frequency
     */
    setFrequency(freq, time) {
        const when = time ?? this.context.currentTime;
        this.currentFreq = freq;
        this.sawOsc.frequency.setValueAtTime(freq, when);
        this.pulseOsc.frequency.setValueAtTime(freq, when);
        this.subOsc.frequency.setValueAtTime(freq / 2, when);
    }

    /**
     * Trigger note
     */
    trigger(time, velocity = 1) {
        const when = time ?? this.context.currentTime;
        const a = this.params.attack;
        const d = this.params.decay;
        const s = this.params.sustain;

        this.vca.gain.cancelScheduledValues(when);
        this.vca.gain.setValueAtTime(0, when);
        this.vca.gain.linearRampToValueAtTime(velocity, when + a);
        this.vca.gain.linearRampToValueAtTime(s * velocity, when + a + d);
    }

    /**
     * Release note
     */
    release(time) {
        const when = time ?? this.context.currentTime;
        const r = this.params.release;

        this.vca.gain.cancelScheduledValues(when);
        const currentGain = this.vca.gain.value;
        this.vca.gain.setValueAtTime(currentGain, when);
        this.vca.gain.linearRampToValueAtTime(0, when + r);
    }

    /**
     * Set parameter
     */
    setParameter(id, value) {
        super.setParameter(id, value);
        this.params[id] = value;

        switch (id) {
            case 'sawLevel':
                this.sawGain.gain.value = value;
                break;
            case 'pulseLevel':
                this.pulseGain.gain.value = value;
                break;
            case 'subLevel':
                this.subGain.gain.value = value;
                break;
            case 'cutoff':
                const freq = 20 * Math.pow(1000, value);
                this.filter.frequency.value = freq;
                break;
            case 'resonance':
                this.filter.Q.value = 0.7 + value * 15;
                break;
        }
    }

    /**
     * Parameter descriptors
     */
    get parameterDescriptors() {
        return [
            ...super.parameterDescriptors,
            { id: 'sawLevel', label: 'Saw Level', range: { min: 0, max: 1 }, defaultValue: 0.5 },
            { id: 'pulseLevel', label: 'Pulse Level', range: { min: 0, max: 1 }, defaultValue: 0.5 },
            { id: 'subLevel', label: 'Sub Level', range: { min: 0, max: 1 }, defaultValue: 0.3 },
            { id: 'cutoff', label: 'Cutoff', range: { min: 0, max: 1 }, defaultValue: 0.5 },
            { id: 'resonance', label: 'Resonance', range: { min: 0, max: 1 }, defaultValue: 0.3 },
            { id: 'attack', label: 'Attack', range: { min: 0, max: 1 }, defaultValue: 0.01 },
            { id: 'decay', label: 'Decay', range: { min: 0, max: 1 }, defaultValue: 0.3 },
            { id: 'sustain', label: 'Sustain', range: { min: 0, max: 1 }, defaultValue: 0.7 },
            { id: 'release', label: 'Release', range: { min: 0, max: 1 }, defaultValue: 0.3 },
        ];
    }

    /**
     * Stop
     */
    stop() {
        this.sawOsc.stop();
        this.pulseOsc.stop();
        this.subOsc.stop();
    }
}

export default SynthVoiceE1;
