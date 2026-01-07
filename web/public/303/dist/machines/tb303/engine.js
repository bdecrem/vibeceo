/**
 * TB-303 Bass Line Engine
 *
 * Monophonic acid bass synthesizer with:
 * - E1: Simple biquad filter implementation
 * - E2: Authentic diode ladder filter emulation
 * - 16-step pitched sequencer with accent/slide
 */

import { SynthEngine } from '../../core/engine.js';
import { TB303Sequencer, midiToFreq, noteToMidi } from './sequencer.js';
import { Bass303E1 } from './voices/bass-e1.js';
import { Bass303 } from './voices/bass.js';

export class TB303Engine extends SynthEngine {
    constructor(options = {}) {
        super(options);

        // Sequencer
        this.sequencer = new TB303Sequencer({ steps: 16, bpm: 130 });
        this.sequencer.setContext(this.context);
        this.currentBpm = 130;

        // Engine version: E1 (simple) or E2 (authentic)
        this.currentEngine = options.engine ?? 'E2'; // E2 is the good stuff

        // Waveform: sawtooth or square
        this.currentWaveform = 'sawtooth';

        // Global parameters (0-1)
        this.parameters = {
            cutoff: 0.5,
            resonance: 0.5,
            envMod: 0.5,
            decay: 0.5,
            accent: 0.8,
            level: 1,
        };

        // Setup voice
        this.setupVoice();

        // Sequencer callback
        this.sequencer.onStep = (step, stepData, nextStepData) => {
            this.handleSequencerStep(step, stepData, nextStepData);
        };

        // UI callback for step indicator
        this.sequencer.onStepChange = (step) => {
            this.onStepChange?.(step);
        };
    }

    setupVoice() {
        const VoiceClass = this.currentEngine === 'E1' ? Bass303E1 : Bass303;
        const voice = new VoiceClass('bass', this.context);

        // Apply current parameters
        voice.setWaveform(this.currentWaveform);
        Object.entries(this.parameters).forEach(([id, value]) => {
            voice.setParameter(id, value);
        });

        this.registerVoice('bass', voice);
    }

    handleSequencerStep(step, stepData, nextStepData) {
        if (!stepData) return;

        const voice = this.voices.get('bass');
        if (!voice) return;

        // Determine if this note should slide to the next
        const shouldSlide = stepData.slide && nextStepData?.gate;
        const nextFreq = shouldSlide ? nextStepData.frequency : null;

        // Trigger the voice
        voice.trigger(
            stepData.time,
            0.8, // base velocity
            stepData.frequency,
            stepData.accent,
            shouldSlide,
            nextFreq
        );

        // Notify UI
        this.onNote?.(step, stepData);
    }

    /**
     * Play a single note (for keyboard/preview)
     */
    playNote(note, accent = false) {
        const voice = this.voices.get('bass');
        if (!voice) return;

        const midi = typeof note === 'string' ? noteToMidi(note) : note;
        const frequency = midiToFreq(midi);

        voice.trigger(this.context.currentTime, 0.8, frequency, accent, false, null);
    }

    /**
     * Get the current engine version
     */
    getEngine() {
        return this.currentEngine;
    }

    /**
     * Set engine version (E1 or E2)
     */
    setEngine(version) {
        if (!TB303Engine.ENGINE_VERSIONS.includes(version)) {
            console.warn(`Unknown engine version: ${version}`);
            return;
        }

        if (version === this.currentEngine) return;

        this.currentEngine = version;

        // Disconnect old voice
        const oldVoice = this.voices.get('bass');
        if (oldVoice) {
            oldVoice.disconnect?.();
        }

        // Create new voice
        this.setupVoice();
    }

    /**
     * Get available engine versions
     */
    getEngineVersions() {
        return TB303Engine.ENGINE_VERSIONS;
    }

    /**
     * Get current waveform
     */
    getWaveform() {
        return this.currentWaveform;
    }

    /**
     * Set waveform (sawtooth or square)
     */
    setWaveform(type) {
        if (type !== 'sawtooth' && type !== 'square') return;

        this.currentWaveform = type;
        const voice = this.voices.get('bass');
        if (voice) {
            voice.setWaveform(type);
        }
    }

    /**
     * Toggle waveform
     */
    toggleWaveform() {
        const next = this.currentWaveform === 'sawtooth' ? 'square' : 'sawtooth';
        this.setWaveform(next);
        return next;
    }

    /**
     * Set a synth parameter
     */
    setParameter(id, value) {
        const clamped = Math.max(0, Math.min(1, value));
        this.parameters[id] = clamped;

        const voice = this.voices.get('bass');
        if (voice) {
            voice.setParameter(id, clamped);
        }
    }

    /**
     * Get a synth parameter
     */
    getParameter(id) {
        return this.parameters[id] ?? 0;
    }

    /**
     * Get all parameters
     */
    getParameters() {
        return { ...this.parameters };
    }

    /**
     * Set BPM
     */
    setBpm(bpm) {
        this.currentBpm = Math.max(30, Math.min(300, bpm));
        this.sequencer.setBpm(this.currentBpm);
    }

    /**
     * Get BPM
     */
    getBpm() {
        return this.currentBpm;
    }

    /**
     * Set pattern
     */
    setPattern(pattern) {
        this.sequencer.setPattern(pattern);
    }

    /**
     * Get pattern
     */
    getPattern() {
        return this.sequencer.getPattern();
    }

    /**
     * Set a single step
     */
    setStep(index, data) {
        this.sequencer.setStep(index, data);
    }

    /**
     * Get a single step
     */
    getStep(index) {
        return this.sequencer.getStep(index);
    }

    /**
     * Start sequencer
     */
    startSequencer() {
        void this.start();
        this.sequencer.start();
    }

    /**
     * Stop sequencer
     */
    stopSequencer() {
        this.sequencer.stop();
        this.stop();

        // Stop any active notes
        const voice = this.voices.get('bass');
        if (voice?.stopVoice) {
            voice.stopVoice();
        }
    }

    /**
     * Check if playing
     */
    isPlaying() {
        return this.sequencer.isRunning();
    }

    /**
     * Get current step
     */
    getCurrentStep() {
        return this.sequencer.getCurrentStep();
    }

    /**
     * Render pattern to audio buffer
     */
    async renderPattern(options = {}) {
        const bpm = options.bpm ?? this.currentBpm;
        const bars = options.bars ?? 1;
        const stepsPerBar = 16;
        const totalSteps = stepsPerBar * bars;
        const stepDuration = 60 / bpm / 4;
        const duration = stepDuration * totalSteps + 0.5; // Add tail for decay

        return this.outputManager.renderOffline(duration, (offlineContext) => {
            this.schedulePatternInContext({
                context: offlineContext,
                pattern: this.getPattern(),
                bpm,
                bars,
            });
        }, {
            sampleRate: options.sampleRate ?? 44100,
            numberOfChannels: options.numberOfChannels ?? 2,
        });
    }

    schedulePatternInContext({ context, pattern, bpm, bars }) {
        // Create voice for offline context
        const VoiceClass = this.currentEngine === 'E1' ? Bass303E1 : Bass303;
        const voice = new VoiceClass('bass', context);

        // Apply current parameters
        voice.setWaveform(this.currentWaveform);
        Object.entries(this.parameters).forEach(([id, value]) => {
            voice.setParameter(id, value);
        });

        // Create audio chain
        const compressor = context.createDynamicsCompressor();
        const masterGain = context.createGain();
        masterGain.gain.value = 0.9;

        voice.connect(compressor);
        compressor.connect(masterGain);
        masterGain.connect(context.destination);

        // Schedule notes
        const stepDuration = 60 / bpm / 4;
        const totalSteps = 16 * bars;

        for (let i = 0; i < totalSteps; i++) {
            const step = i % 16;
            const stepData = pattern[step];
            const nextStep = (step + 1) % 16;
            const nextStepData = pattern[nextStep];

            if (!stepData.gate) continue;

            const time = i * stepDuration;
            const midi = noteToMidi(stepData.note);
            const frequency = midiToFreq(midi);

            const shouldSlide = stepData.slide && nextStepData.gate;
            const nextFreq = shouldSlide ? midiToFreq(noteToMidi(nextStepData.note)) : null;

            voice.trigger(time, 0.8, frequency, stepData.accent, shouldSlide, nextFreq);
        }
    }
}

// Static properties
TB303Engine.ENGINE_VERSIONS = ['E1', 'E2'];
TB303Engine.WAVEFORMS = ['sawtooth', 'square'];

// Engine info for UI
TB303Engine.ENGINE_INFO = {
    E1: {
        name: 'E1 — Simple',
        description: 'Standard Web Audio biquad filter. Clean, CPU-efficient. Good for layering.',
        characteristics: [
            '24dB/oct lowpass filter',
            'Linear filter envelope',
            'Basic slide implementation',
        ],
    },
    E2: {
        name: 'E2 — Authentic',
        description: 'Diode ladder filter emulation with saturation. The squelchy acid sound.',
        characteristics: [
            '18dB/oct diode ladder filter',
            'Self-oscillation at high resonance',
            'Soft saturation for warmth',
            'Authentic 60ms exponential slide',
            'Accent affects both VCA and VCF',
        ],
    },
};

export default TB303Engine;
