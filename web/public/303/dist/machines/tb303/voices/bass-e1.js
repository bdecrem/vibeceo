/**
 * TB-303 Bass Voice E1 — Simple Implementation
 * Uses standard Web Audio oscillator and biquad filter
 */

import { Voice } from '../../../core/voice.js';

export class Bass303E1 extends Voice {
    constructor(id, context) {
        super(id, context);

        // Parameters
        this.waveform = 'sawtooth';
        this.cutoff = 0.5;
        this.resonance = 0.5;
        this.envMod = 0.5;
        this.decay = 0.5;
        this.accent = 0.8;
        this.level = 1;

        // Current pitch
        this.currentFrequency = 130.81; // C3

        // Nodes (created per trigger)
        this.activeOsc = null;
        this.activeFilter = null;
        this.activeGain = null;
        this.activeEnvGain = null;
    }

    trigger(time, velocity, frequency, accent = false, slide = false, nextFrequency = null) {
        const when = time ?? this.context.currentTime;
        const freq = frequency ?? this.currentFrequency;
        this.currentFrequency = freq;

        // If sliding and we have an active oscillator, don't retrigger
        if (slide && this.activeOsc && nextFrequency) {
            this.slideToFrequency(when, nextFrequency);
            return;
        }

        // Stop previous voice
        this.stopVoice(when);

        // Create oscillator
        const osc = this.context.createOscillator();
        osc.type = this.waveform;
        osc.frequency.setValueAtTime(freq, when);

        // Create filter
        const filter = this.context.createBiquadFilter();
        filter.type = 'lowpass';

        // Calculate filter frequency from cutoff
        const minFreq = 60;
        const maxFreq = 8000;
        const baseFilterFreq = minFreq * Math.pow(maxFreq / minFreq, this.cutoff);

        // Envelope modulation range
        const envModRange = this.envMod * 4000;

        // Set filter Q from resonance
        filter.Q.setValueAtTime(this.resonance * 20, when);

        // Filter envelope: start high, decay to base
        const accentMult = accent ? 1.3 : 1;
        filter.frequency.setValueAtTime(baseFilterFreq + envModRange * accentMult, when);

        // Decay time (0.1s to 2s)
        const decayTime = 0.1 + this.decay * 1.9;
        filter.frequency.exponentialRampToValueAtTime(
            Math.max(baseFilterFreq, 30),
            when + decayTime
        );

        // Create gain nodes
        const envGain = this.context.createGain();
        const mainGain = this.context.createGain();

        // Amplitude envelope
        const accentLevel = accent ? 1 + this.accent * 0.5 : 1;
        const peakLevel = velocity * this.level * accentLevel;

        envGain.gain.setValueAtTime(0.001, when);
        envGain.gain.exponentialRampToValueAtTime(peakLevel, when + 0.005); // Fast attack
        envGain.gain.exponentialRampToValueAtTime(peakLevel * 0.7, when + decayTime * 0.5);
        envGain.gain.exponentialRampToValueAtTime(0.001, when + decayTime + 0.1);

        mainGain.gain.setValueAtTime(0.6, when); // Master level

        // Connect
        osc.connect(filter);
        filter.connect(envGain);
        envGain.connect(mainGain);
        mainGain.connect(this.output);

        // Start and schedule stop
        osc.start(when);
        osc.stop(when + decayTime + 0.2);

        // Store references
        this.activeOsc = osc;
        this.activeFilter = filter;
        this.activeGain = mainGain;
        this.activeEnvGain = envGain;

        // Cleanup
        osc.onended = () => {
            if (this.activeOsc === osc) {
                this.activeOsc = null;
                this.activeFilter = null;
                this.activeGain = null;
                this.activeEnvGain = null;
            }
        };
    }

    slideToFrequency(time, targetFreq) {
        if (!this.activeOsc) return;

        const glideTime = 0.06; // 60ms glide
        this.activeOsc.frequency.exponentialRampToValueAtTime(targetFreq, time + glideTime);
        this.currentFrequency = targetFreq;
    }

    stopVoice(time) {
        if (this.activeOsc) {
            try {
                this.activeOsc.stop(time);
            } catch (e) {
                // Already stopped
            }
            this.activeOsc = null;
        }
    }

    setWaveform(type) {
        if (type === 'sawtooth' || type === 'square') {
            this.waveform = type;
            if (this.activeOsc) {
                this.activeOsc.type = type;
            }
        }
    }

    setParameter(id, value) {
        switch (id) {
            case 'waveform':
                this.setWaveform(value);
                break;
            case 'cutoff':
                this.cutoff = Math.max(0, Math.min(1, value));
                break;
            case 'resonance':
                this.resonance = Math.max(0, Math.min(1, value));
                break;
            case 'envMod':
                this.envMod = Math.max(0, Math.min(1, value));
                break;
            case 'decay':
                this.decay = Math.max(0, Math.min(1, value));
                break;
            case 'accent':
                this.accent = Math.max(0, Math.min(1, value));
                break;
            case 'level':
                this.level = Math.max(0, Math.min(1, value));
                break;
            default:
                super.setParameter(id, value);
        }
    }

    get parameterDescriptors() {
        return [
            {
                id: 'cutoff',
                label: 'Cutoff',
                range: { min: 0, max: 1, step: 0.01 },
                defaultValue: 0.5,
            },
            {
                id: 'resonance',
                label: 'Reso',
                range: { min: 0, max: 1, step: 0.01 },
                defaultValue: 0.5,
            },
            {
                id: 'envMod',
                label: 'Env Mod',
                range: { min: 0, max: 1, step: 0.01 },
                defaultValue: 0.5,
            },
            {
                id: 'decay',
                label: 'Decay',
                range: { min: 0, max: 1, step: 0.01 },
                defaultValue: 0.5,
            },
            {
                id: 'accent',
                label: 'Accent',
                range: { min: 0, max: 1, step: 0.01 },
                defaultValue: 0.8,
            },
            ...super.parameterDescriptors,
        ];
    }
}

export default Bass303E1;
