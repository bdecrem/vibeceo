import { SynthEngine } from '../../core/engine.js';
import { StepSequencer } from '../../core/sequencer.js';
import { LFSRNoise } from '../../core/noise.js';
import { Kick909 } from './voices/kick.js';
import { Kick909E1 } from './voices/kick-e1.js';
import { Snare909 } from './voices/snare.js';
import { Snare909E1 } from './voices/snare-e1.js';
import { Clap909 } from './voices/clap.js';
import { Clap909E1 } from './voices/clap-e1.js';
import { Tom909 } from './voices/tom.js';
import { Tom909E1 } from './voices/tom-e1.js';
import { Rimshot909 } from './voices/rimshot.js';
import { Rimshot909E1 } from './voices/rimshot-e1.js';
import { HiHat909 } from './voices/hihat.js';
import { HiHat909E1 } from './voices/hihat-e1.js';
import { Cymbal909 } from './voices/cymbal.js';
import { SampleVoice } from './voices/sample-voice.js';
import { createDefaultTr909SampleLibrary, DEFAULT_909_SAMPLE_MANIFEST, } from './samples/library.js';
export class TR909Engine extends SynthEngine {
    constructor(options = {}) {
        super(options);
        this.sequencer = new StepSequencer({ steps: 16, bpm: 125 });
        this.currentBpm = 125;
        this.swingAmount = 0;
        this.flamAmount = 0;
        // Hi-hat choke: track active open hi-hat for cutoff
        this.activeOpenHat = null;
        this.sampleLibrary = createDefaultTr909SampleLibrary();
        // Engine version: E1 (sine+softclip), E2 (triangle+waveshaper)
        this.currentEngine = 'E2';
        this.setupVoices();
        this.sequencer.onStep = (step, events) => {
            // Notify UI of step change
            this.onStepChange?.(step);
            events.forEach((event) => {
                // Get per-voice accent amount
                const voice = this.voices.get(event.voice);
                const accentMultiplier = event.accent && voice ? voice.getAccentAmount() : 1;
                const velocity = Math.min(1, event.velocity * accentMultiplier);
                // Hi-hat choke: closed hat cuts open hat
                if (event.voice === 'ch' && this.activeOpenHat) {
                    this.chokeOpenHat();
                }
                // Apply flam if enabled (slight delay for doubled hit)
                if (this.flamAmount > 0 && velocity > 0.5) {
                    // Trigger a quiet ghost note slightly before
                    const flamDelay = this.flamAmount * 0.03; // max 30ms flam
                    this.trigger(event.voice, velocity * 0.4);
                    setTimeout(() => {
                        this.trigger(event.voice, velocity);
                    }, flamDelay * 1000);
                }
                else {
                    this.trigger(event.voice, velocity);
                }
            });
        };
    }
    chokeOpenHat() {
        if (this.activeOpenHat) {
            const { gain } = this.activeOpenHat;
            const now = this.context.currentTime;
            gain.gain.cancelScheduledValues(now);
            gain.gain.setValueAtTime(gain.gain.value, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
            this.activeOpenHat = null;
        }
    }
    // Called by HiHat909 to register active open hat for choke
    registerOpenHat(source, gain) {
        this.activeOpenHat = { source, gain };
    }
    clearOpenHat() {
        this.activeOpenHat = null;
    }
    setupVoices() {
        const voices = this.createVoiceMap(this.context);
        voices.forEach((voice, id) => this.registerVoice(id, voice));
    }
    async loadSamples(manifest) {
        if (!manifest?.length) {
            return;
        }
        await this.sampleLibrary.loadFromManifest(this.context, manifest);
    }
    /**
     * Load real 909 samples (hi-hats and cymbals) from the default location.
     * This replaces the synthesized versions with authentic samples from a real TR-909.
     * Call this before starting playback if you want the real samples.
     */
    async loadRealSamples() {
        await this.sampleLibrary.loadFromManifest(this.context, DEFAULT_909_SAMPLE_MANIFEST);
    }
    setPattern(id, pattern) {
        this.sequencer.addPattern(id, pattern);
        this.sequencer.loadPattern(id);
    }
    startSequencer() {
        void this.start();
        this.sequencer.start();
    }
    stopSequencer() {
        this.sequencer.stop();
        this.stop();
        // Clear step indicator
        this.onStepChange?.(-1);
        // Clear any active open hat
        this.activeOpenHat = null;
    }
    setBpm(bpm) {
        this.currentBpm = bpm;
        this.sequencer.setBpm(bpm);
    }
    setSwing(amount) {
        this.swingAmount = Math.max(0, Math.min(1, amount));
        this.sequencer.setSwing(this.swingAmount);
    }
    getSwing() {
        return this.swingAmount;
    }
    setFlam(amount) {
        this.flamAmount = Math.max(0, Math.min(1, amount));
    }
    getFlam() {
        return this.flamAmount;
    }
    /**
     * Get the current engine version
     */
    getEngine() {
        return this.currentEngine;
    }
    /**
     * Get available engine versions
     */
    getEngineVersions() {
        return TR909Engine.ENGINE_VERSIONS;
    }
    /**
     * Switch engine version for kick, snare, and clap
     * E1: Original voices (simpler synthesis)
     * E2: Research-based voices (authentic 909 circuit emulation)
     */
    setEngine(version) {
        if (!TR909Engine.ENGINE_VERSIONS.includes(version)) {
            console.warn(`Unknown engine version: ${version}`);
            return;
        }
        if (version === this.currentEngine) {
            return;
        }
        this.currentEngine = version;

        // Need noise buffer for snare and clap
        const noiseBuffer = new LFSRNoise(this.context).createBuffer(1);

        // Swap kick
        const oldKick = this.voices.get('kick');
        if (oldKick) oldKick.disconnect();
        const KickClass = version === 'E1' ? Kick909E1 : Kick909;
        this.registerVoice('kick', new KickClass('kick', this.context));

        // Swap snare
        const oldSnare = this.voices.get('snare');
        if (oldSnare) oldSnare.disconnect();
        const SnareClass = version === 'E1' ? Snare909E1 : Snare909;
        this.registerVoice('snare', new SnareClass('snare', this.context, noiseBuffer));

        // Swap clap
        const oldClap = this.voices.get('clap');
        if (oldClap) oldClap.disconnect();
        const ClapClass = version === 'E1' ? Clap909E1 : Clap909;
        this.registerVoice('clap', new ClapClass('clap', this.context, noiseBuffer));

        // Swap rimshot
        const oldRimshot = this.voices.get('rimshot');
        if (oldRimshot) oldRimshot.disconnect();
        const RimshotClass = version === 'E1' ? Rimshot909E1 : Rimshot909;
        this.registerVoice('rimshot', new RimshotClass('rimshot', this.context));

        // Swap toms (low, mid, high)
        const TomClass = version === 'E1' ? Tom909E1 : Tom909;
        ['ltom', 'mtom', 'htom'].forEach((tomId, i) => {
            const types = ['low', 'mid', 'high'];
            const oldTom = this.voices.get(tomId);
            if (oldTom) oldTom.disconnect();
            this.registerVoice(tomId, new TomClass(tomId, this.context, types[i]));
        });

        // Swap hi-hats (closed and open)
        const HiHatClass = version === 'E1' ? HiHat909E1 : HiHat909;
        const oldCH = this.voices.get('ch');
        if (oldCH) oldCH.disconnect();
        this.registerVoice('ch', new HiHatClass('ch', this.context, this.sampleLibrary, 'closed'));

        const oldOH = this.voices.get('oh');
        if (oldOH) oldOH.disconnect();
        this.registerVoice('oh', new HiHatClass('oh', this.context, this.sampleLibrary, 'open'));
    }
    /**
     * Check if a voice supports sample mode toggle
     */
    isSampleCapable(voiceId) {
        return TR909Engine.SAMPLE_CAPABLE_VOICES.includes(voiceId);
    }
    /**
     * Toggle between sample and synthesis mode for a voice
     */
    setVoiceUseSample(voiceId, useSample) {
        const voice = this.voices.get(voiceId);
        if (voice && voice instanceof SampleVoice) {
            voice.setUseSample(useSample);
        }
    }
    /**
     * Get whether a voice is using samples
     */
    getVoiceUseSample(voiceId) {
        const voice = this.voices.get(voiceId);
        if (voice && voice instanceof SampleVoice) {
            return voice.useSample;
        }
        return false;
    }
    getCurrentStep() {
        return this.sequencer.getCurrentStep();
    }
    isPlaying() {
        return this.sequencer.isRunning();
    }
    async renderPattern(pattern, options = {}) {
        const bpm = options.bpm ?? this.currentBpm;
        const bars = options.bars ?? 1;
        const stepsPerBar = TR909Engine.STEPS_PER_BAR;
        const totalSteps = stepsPerBar * bars;
        const baseStepDuration = 60 / bpm / 4;
        const duration = baseStepDuration * totalSteps;
        return this.outputManager.renderOffline(duration, (offlineContext) => {
            this.schedulePatternInContext({
                context: offlineContext,
                pattern,
                bpm,
                bars,
                stepsPerBar,
                swing: options.swing ?? this.swingAmount,
            });
        }, {
            sampleRate: options.sampleRate,
            numberOfChannels: options.numberOfChannels,
        });
    }
    createVoiceMap(context) {
        const noiseBuffer = new LFSRNoise(context).createBuffer(1);
        // Select voice classes based on current engine
        const KickClass = this.currentEngine === 'E1' ? Kick909E1 : Kick909;
        const SnareClass = this.currentEngine === 'E1' ? Snare909E1 : Snare909;
        const ClapClass = this.currentEngine === 'E1' ? Clap909E1 : Clap909;
        const RimshotClass = this.currentEngine === 'E1' ? Rimshot909E1 : Rimshot909;
        const TomClass = this.currentEngine === 'E1' ? Tom909E1 : Tom909;
        const HiHatClass = this.currentEngine === 'E1' ? HiHat909E1 : HiHat909;
        return new Map([
            ['kick', new KickClass('kick', context)],
            ['snare', new SnareClass('snare', context, noiseBuffer)],
            ['clap', new ClapClass('clap', context, noiseBuffer)],
            ['rimshot', new RimshotClass('rimshot', context)],
            ['ltom', new TomClass('ltom', context, 'low')],
            ['mtom', new TomClass('mtom', context, 'mid')],
            ['htom', new TomClass('htom', context, 'high')],
            ['ch', new HiHatClass('ch', context, this.sampleLibrary, 'closed')],
            ['oh', new HiHatClass('oh', context, this.sampleLibrary, 'open')],
            ['crash', new Cymbal909('crash', context, this.sampleLibrary, 'crash')],
            ['ride', new Cymbal909('ride', context, this.sampleLibrary, 'ride')],
        ]);
    }
    schedulePatternInContext({ context, pattern, bpm, bars, stepsPerBar, swing, }) {
        const voices = this.createVoiceMap(context);
        const compressor = context.createDynamicsCompressor();
        const masterGain = context.createGain();
        masterGain.gain.value = 0.9;
        voices.forEach((voice) => voice.connect(compressor));
        compressor.connect(masterGain);
        masterGain.connect(context.destination);
        const baseStepDuration = 60 / bpm / 4;
        const swingFactor = swing * 0.5;
        let currentTime = 0;
        const totalSteps = bars * stepsPerBar;
        for (let step = 0; step < totalSteps; step += 1) {
            const events = this.collectEventsForStep(pattern, step);
            events.forEach((event) => {
                const voice = voices.get(event.voice);
                if (!voice)
                    return;
                const velocity = Math.min(1, event.velocity * (event.accent ? 1.1 : 1));
                voice.trigger(currentTime, velocity);
            });
            const interval = swing > 0
                ? baseStepDuration * (step % 2 === 1 ? 1 + swingFactor : 1 - swingFactor)
                : baseStepDuration;
            currentTime += interval;
        }
    }
    collectEventsForStep(pattern, step) {
        const events = [];
        for (const [voiceId, track] of Object.entries(pattern)) {
            const patternStep = this.getPatternStep(track, step);
            if (!patternStep)
                continue;
            events.push({
                voice: voiceId,
                step,
                velocity: patternStep.velocity,
                accent: patternStep.accent,
            });
        }
        return events;
    }
    getPatternStep(track, step) {
        if (!track.length) {
            return undefined;
        }
        const normalizedIndex = step % track.length;
        const data = track[normalizedIndex];
        if (!data || data.velocity <= 0) {
            return undefined;
        }
        return data;
    }
    prepareOfflineRender() {
        throw new Error('Use TR909Engine.renderPattern() to export audio for this machine.');
    }
}
TR909Engine.STEPS_PER_BAR = 16;
/** Voice IDs that support sample/synth toggle */
TR909Engine.SAMPLE_CAPABLE_VOICES = ['ch', 'oh', 'crash', 'ride'];
/** Available engine versions for kick drum */
TR909Engine.ENGINE_VERSIONS = ['E1', 'E2'];
//# sourceMappingURL=engine.js.map