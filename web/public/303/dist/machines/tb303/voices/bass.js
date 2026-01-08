/**
 * TB-303 Bass Voice E2 — Authentic Implementation
 * Uses diode ladder filter emulation with proper accent and slide behavior
 */

import { Voice } from '../../../core/voice.js';
import { DiodeLadderFilter } from '../filter/diode-ladder.js';

export class Bass303 extends Voice {
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
        this.targetFrequency = 130.81;

        // Active nodes
        this.activeOsc = null;
        this.activeFilter = null;
        this.activeEnvGain = null;
        this.activeOutputGain = null;
        this.isSliding = false;
        this.slideTimeout = null;
    }

    trigger(time, velocity, frequency, accent = false, slide = false, nextFrequency = null) {
        const when = time ?? this.context.currentTime;
        const freq = frequency ?? this.currentFrequency;

        // Handle slide: don't retrigger, just glide
        if (slide && this.activeOsc && nextFrequency) {
            this.handleSlide(when, nextFrequency, accent);
            return;
        }

        // Stop previous voice (unless we're sliding into this note)
        if (!this.isSliding) {
            this.stopVoice(when);
        }
        this.isSliding = false;

        this.currentFrequency = freq;

        // Create oscillator with slight detuning for thickness
        const osc = this.context.createOscillator();
        osc.type = this.waveform;
        osc.frequency.setValueAtTime(freq, when);

        // Create diode ladder filter
        const filter = new DiodeLadderFilter(this.context);
        filter.setResonance(this.resonance);

        // Calculate filter frequencies
        const minFreq = 80;
        const maxFreq = 10000;
        const baseFilterFreq = minFreq * Math.pow(maxFreq / minFreq, this.cutoff);

        // Envelope modulation - accent increases this dramatically
        const accentMult = accent ? 1.5 + this.accent * 0.5 : 1;
        const envModAmount = this.envMod * 6000 * accentMult;
        const peakFilterFreq = Math.min(baseFilterFreq + envModAmount, 12000);

        // Decay time - accent shortens it slightly for punchier sound
        const baseDecay = 0.1 + this.decay * 1.5;
        const decayTime = accent ? baseDecay * 0.8 : baseDecay;

        // Filter envelope: peak → base
        filter.setFrequency(peakFilterFreq, when);
        filter.exponentialRampToFrequency(Math.max(baseFilterFreq, 40), when + decayTime);

        // Amplitude envelope
        const envGain = this.context.createGain();
        const accentLevel = accent ? 1 + this.accent * 0.7 : 1;
        const peakLevel = velocity * this.level * accentLevel * 0.7;

        envGain.gain.setValueAtTime(0.001, when);
        envGain.gain.exponentialRampToValueAtTime(peakLevel, when + 0.003); // Very fast attack
        envGain.gain.setValueAtTime(peakLevel, when + 0.003);
        envGain.gain.exponentialRampToValueAtTime(peakLevel * 0.6, when + decayTime * 0.4);
        envGain.gain.exponentialRampToValueAtTime(0.001, when + decayTime + 0.15);

        // Output gain
        const outputGain = this.context.createGain();
        outputGain.gain.setValueAtTime(0.8, when);

        // Connect chain
        osc.connect(filter.input);
        filter.connect(envGain);
        envGain.connect(outputGain);
        outputGain.connect(this.output);

        // Start oscillator
        osc.start(when);
        osc.stop(when + decayTime + 0.25);

        // Store references
        this.activeOsc = osc;
        this.activeFilter = filter;
        this.activeEnvGain = envGain;
        this.activeOutputGain = outputGain;

        // Cleanup on end
        osc.onended = () => {
            if (this.activeOsc === osc) {
                this.cleanup();
            }
        };
    }

    handleSlide(time, targetFreq, accent) {
        if (!this.activeOsc) return;

        this.isSliding = true;
        this.targetFrequency = targetFreq;

        // Exponential glide over ~60ms (authentic 303 behavior)
        const glideTime = 0.06;
        this.activeOsc.frequency.exponentialRampToValueAtTime(targetFreq, time + glideTime);

        // Also slightly adjust filter if accented
        if (accent && this.activeFilter) {
            const boost = this.cutoff * 10000 * 0.2;
            // Quick filter bump on accent during slide
            const currentFreq = this.activeFilter.getFrequency();
            this.activeFilter.setFrequency(currentFreq + boost, time);
            this.activeFilter.exponentialRampToFrequency(currentFreq, time + 0.1);
        }

        // Update current frequency after glide
        this.currentFrequency = targetFreq;

        // Clear slide flag after glide completes
        if (this.slideTimeout) clearTimeout(this.slideTimeout);
        this.slideTimeout = setTimeout(() => {
            this.isSliding = false;
        }, glideTime * 1000 + 10);
    }

    stopVoice(time) {
        if (this.activeOsc) {
            try {
                const when = time ?? this.context.currentTime;
                // Quick fade out
                if (this.activeEnvGain) {
                    this.activeEnvGain.gain.cancelScheduledValues(when);
                    this.activeEnvGain.gain.setValueAtTime(this.activeEnvGain.gain.value, when);
                    this.activeEnvGain.gain.exponentialRampToValueAtTime(0.001, when + 0.01);
                }
                this.activeOsc.stop(when + 0.02);
            } catch (e) {
                // Already stopped
            }
        }
        this.cleanup();
    }

    cleanup() {
        if (this.activeFilter) {
            this.activeFilter.disconnect();
        }
        this.activeOsc = null;
        this.activeFilter = null;
        this.activeEnvGain = null;
        this.activeOutputGain = null;
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
                if (this.activeFilter) {
                    this.activeFilter.setResonance(this.resonance);
                }
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

export default Bass303;
