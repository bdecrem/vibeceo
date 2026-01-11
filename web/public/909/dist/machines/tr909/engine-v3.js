import { SynthEngine } from '../../core/engine.js';
import { StepSequencer } from '../../core/sequencer.js';
import { LFSRNoise } from '../../core/noise.js';
import { Kick909 } from './voices/kick-v3.js';
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
import { Cymbal909E1 } from './voices/cymbal-e1.js';
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
        // Per-voice engine tracking (each voice starts at its own default)
        this.voiceEngines = new Map();
        TR909Engine.ENGINE_CAPABLE_VOICES.forEach(id => {
            this.voiceEngines.set(id, TR909Engine.VOICE_DEFAULTS[id] ?? this.currentEngine);
        });
        // Mute/solo state: 'normal', 'muted', 'solo'
        this.voiceStates = new Map();
        // Voice parameter overrides (persists through render)
        this.voiceParams = new Map();
        this.setupVoices();
        this.sequencer.onStep = (step, events) => {
            // Notify UI of step change
            this.onStepChange?.(step);
            events.forEach((event) => {
                // Check mute/solo state
                if (!this.shouldVoicePlay(event.voice)) {
                    return;
                }
                // Get per-voice accent amount, scaled by global accent
                const voice = this.voices.get(event.voice);
                const globalAccentMult = event.globalAccent ?? 1;
                const accentMultiplier = event.accent && voice
                    ? 1 + (voice.getAccentAmount() - 1) * globalAccentMult
                    : 1;
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
    // Set a voice parameter that persists through render
    setVoiceParam(voiceId, paramId, value) {
        if (!this.voiceParams.has(voiceId)) {
            this.voiceParams.set(voiceId, new Map());
        }
        this.voiceParams.get(voiceId).set(paramId, value);
        // Also apply to current voice instance
        const voice = this.voices.get(voiceId);
        if (voice) {
            voice[paramId] = value;
        }
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
    /**
     * Get voice state: 'normal', 'muted', or 'solo'
     */
    getVoiceState(voiceId) {
        return this.voiceStates.get(voiceId) ?? 'normal';
    }
    /**
     * Cycle voice state: normal → muted → solo → normal
     * Returns the new state
     */
    cycleVoiceState(voiceId) {
        const current = this.getVoiceState(voiceId);
        let next;
        if (current === 'normal') {
            next = 'muted';
        } else if (current === 'muted') {
            // Going to solo: clear any other solos first
            this.voiceStates.forEach((_, id) => {
                if (this.voiceStates.get(id) === 'solo') {
                    this.voiceStates.set(id, 'normal');
                }
            });
            next = 'solo';
        } else {
            // From solo back to normal
            next = 'normal';
        }
        this.voiceStates.set(voiceId, next);
        this.onVoiceStateChange?.(voiceId, next);
        return next;
    }
    /**
     * Check if a voice should play based on mute/solo state
     */
    shouldVoicePlay(voiceId) {
        const state = this.getVoiceState(voiceId);
        // If this voice is muted, don't play
        if (state === 'muted') return false;
        // If any voice is solo'd, only that voice plays
        const hasSolo = [...this.voiceStates.values()].includes('solo');
        if (hasSolo) {
            return state === 'solo';
        }
        return true;
    }
    /**
     * Clear all mute/solo states
     */
    clearVoiceStates() {
        this.voiceStates.clear();
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
    // Pattern length: 1-16 steps
    setPatternLength(length) {
        this.sequencer.setPatternLength(length);
    }
    getPatternLength() {
        return this.sequencer.getPatternLength();
    }
    // Scale mode: '16th', '8th-triplet', '16th-triplet', '32nd'
    setScale(scale) {
        this.sequencer.setScale(scale);
    }
    getScale() {
        return this.sequencer.getScale();
    }
    getScaleModes() {
        return this.sequencer.getScaleModes();
    }
    // Global accent: 0-1 multiplier for all accented steps
    setGlobalAccent(amount) {
        this.sequencer.setGlobalAccent(amount);
    }
    getGlobalAccent() {
        return this.sequencer.getGlobalAccent();
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
     * Check if a voice supports engine toggle
     */
    isEngineCapable(voiceId) {
        return TR909Engine.ENGINE_CAPABLE_VOICES.includes(voiceId);
    }
    /**
     * Get engine version for a specific voice
     */
    getVoiceEngine(voiceId) {
        return this.voiceEngines.get(voiceId) ?? TR909Engine.VOICE_DEFAULTS[voiceId] ?? this.currentEngine;
    }
    /**
     * Get the default engine for a voice (used when presets don't specify)
     */
    getVoiceDefaultEngine(voiceId) {
        return TR909Engine.VOICE_DEFAULTS[voiceId] ?? 'E2';
    }
    /**
     * Reset a voice to its default engine
     */
    resetVoiceEngine(voiceId) {
        const defaultEngine = this.getVoiceDefaultEngine(voiceId);
        this.setVoiceEngine(voiceId, defaultEngine);
    }
    /**
     * Reset all voices to their default engines
     */
    resetAllVoiceEngines() {
        TR909Engine.ENGINE_CAPABLE_VOICES.forEach(id => {
            this.resetVoiceEngine(id);
        });
    }
    /**
     * Set engine version for a specific voice
     */
    setVoiceEngine(voiceId, version) {
        if (!TR909Engine.ENGINE_CAPABLE_VOICES.includes(voiceId)) {
            return;
        }
        if (!TR909Engine.ENGINE_VERSIONS.includes(version)) {
            return;
        }
        const currentVersion = this.voiceEngines.get(voiceId);
        if (currentVersion === version) {
            return;
        }
        this.voiceEngines.set(voiceId, version);
        // Swap the voice
        const noiseBuffer = new LFSRNoise(this.context).createBuffer(1);
        const oldVoice = this.voices.get(voiceId);
        if (oldVoice) oldVoice.disconnect();
        // Create the new voice based on type
        let newVoice;
        switch (voiceId) {
            case 'kick':
                newVoice = version === 'E1'
                    ? new Kick909E1('kick', this.context)
                    : new Kick909('kick', this.context);
                break;
            case 'snare':
                newVoice = version === 'E1'
                    ? new Snare909E1('snare', this.context, noiseBuffer)
                    : new Snare909('snare', this.context, noiseBuffer);
                break;
            case 'clap':
                newVoice = version === 'E1'
                    ? new Clap909E1('clap', this.context, noiseBuffer)
                    : new Clap909('clap', this.context, noiseBuffer);
                break;
            case 'rimshot':
                newVoice = version === 'E1'
                    ? new Rimshot909E1('rimshot', this.context)
                    : new Rimshot909('rimshot', this.context);
                break;
            case 'ltom':
                newVoice = version === 'E1'
                    ? new Tom909E1('ltom', this.context, 'low')
                    : new Tom909('ltom', this.context, 'low');
                break;
            case 'mtom':
                newVoice = version === 'E1'
                    ? new Tom909E1('mtom', this.context, 'mid')
                    : new Tom909('mtom', this.context, 'mid');
                break;
            case 'htom':
                newVoice = version === 'E1'
                    ? new Tom909E1('htom', this.context, 'high')
                    : new Tom909('htom', this.context, 'high');
                break;
            case 'ch':
                newVoice = version === 'E1'
                    ? new HiHat909E1('ch', this.context, this.sampleLibrary, 'closed')
                    : new HiHat909('ch', this.context, this.sampleLibrary, 'closed');
                break;
            case 'oh':
                newVoice = version === 'E1'
                    ? new HiHat909E1('oh', this.context, this.sampleLibrary, 'open')
                    : new HiHat909('oh', this.context, this.sampleLibrary, 'open');
                break;
            case 'crash':
                newVoice = version === 'E1'
                    ? new Cymbal909E1('crash', this.context, this.sampleLibrary, 'crash')
                    : new Cymbal909('crash', this.context, this.sampleLibrary, 'crash');
                break;
            case 'ride':
                newVoice = version === 'E1'
                    ? new Cymbal909E1('ride', this.context, this.sampleLibrary, 'ride')
                    : new Cymbal909('ride', this.context, this.sampleLibrary, 'ride');
                break;
        }
        if (newVoice) {
            this.registerVoice(voiceId, newVoice);
        }
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

        // Swap cymbals (crash and ride)
        const CymbalClass = version === 'E1' ? Cymbal909E1 : Cymbal909;
        const oldCrash = this.voices.get('crash');
        if (oldCrash) oldCrash.disconnect();
        this.registerVoice('crash', new CymbalClass('crash', this.context, this.sampleLibrary, 'crash'));

        const oldRide = this.voices.get('ride');
        if (oldRide) oldRide.disconnect();
        this.registerVoice('ride', new CymbalClass('ride', this.context, this.sampleLibrary, 'ride'));
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
    /**
     * Render a pattern to an AudioBuffer.
     * Supports two signatures for Session API compatibility:
     *   renderPattern({ bars, bpm })           - uses stored pattern
     *   renderPattern(pattern, { bars, bpm })  - explicit pattern
     */
    async renderPattern(patternOrOptions = {}, options = {}) {
        // Detect which signature was used
        let pattern;
        let opts;
        if (patternOrOptions &&
            ('bars' in patternOrOptions ||
                'bpm' in patternOrOptions ||
                Object.keys(patternOrOptions).length === 0)) {
            // Called as renderPattern({ bars, bpm }) - use stored pattern
            const storedPattern = this.sequencer.getCurrentPattern();
            if (!storedPattern) {
                throw new Error('No pattern available. Call setPattern() first or pass pattern as argument.');
            }
            pattern = storedPattern;
            opts = patternOrOptions;
        }
        else {
            // Called as renderPattern(pattern, options) - explicit pattern
            pattern = patternOrOptions;
            opts = options;
        }
        const bpm = opts.bpm ?? this.currentBpm;
        const bars = opts.bars ?? 1;
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
                swing: opts.swing ?? this.swingAmount,
            });
        }, {
            sampleRate: opts.sampleRate,
            numberOfChannels: opts.numberOfChannels,
        });
    }
    createVoiceMap(context) {
        const noiseBuffer = new LFSRNoise(context).createBuffer(1);
        // Helper to get engine for a voice (from voiceEngines map or defaults)
        const getEngine = (id) => this.voiceEngines.get(id) ?? TR909Engine.VOICE_DEFAULTS[id] ?? 'E2';
        // Select voice classes based on per-voice engine settings
        const KickClass = getEngine('kick') === 'E1' ? Kick909E1 : Kick909;
        const SnareClass = getEngine('snare') === 'E1' ? Snare909E1 : Snare909;
        const ClapClass = getEngine('clap') === 'E1' ? Clap909E1 : Clap909;
        const RimshotClass = getEngine('rimshot') === 'E1' ? Rimshot909E1 : Rimshot909;
        const LTomClass = getEngine('ltom') === 'E1' ? Tom909E1 : Tom909;
        const MTomClass = getEngine('mtom') === 'E1' ? Tom909E1 : Tom909;
        const HTomClass = getEngine('htom') === 'E1' ? Tom909E1 : Tom909;
        const CHClass = getEngine('ch') === 'E1' ? HiHat909E1 : HiHat909;
        const OHClass = getEngine('oh') === 'E1' ? HiHat909E1 : HiHat909;
        const CrashClass = getEngine('crash') === 'E1' ? Cymbal909E1 : Cymbal909;
        const RideClass = getEngine('ride') === 'E1' ? Cymbal909E1 : Cymbal909;
        const voices = new Map([
            ['kick', new KickClass('kick', context)],
            ['snare', new SnareClass('snare', context, noiseBuffer)],
            ['clap', new ClapClass('clap', context, noiseBuffer)],
            ['rimshot', new RimshotClass('rimshot', context)],
            ['ltom', new LTomClass('ltom', context, 'low')],
            ['mtom', new MTomClass('mtom', context, 'mid')],
            ['htom', new HTomClass('htom', context, 'high')],
            ['ch', new CHClass('ch', context, this.sampleLibrary, 'closed')],
            ['oh', new OHClass('oh', context, this.sampleLibrary, 'open')],
            ['crash', new CrashClass('crash', context, this.sampleLibrary, 'crash')],
            ['ride', new RideClass('ride', context, this.sampleLibrary, 'ride')],
        ]);
        // Apply stored voice parameters
        this.voiceParams.forEach((params, voiceId) => {
            const voice = voices.get(voiceId);
            if (voice) {
                params.forEach((value, paramId) => {
                    voice[paramId] = value;
                });
            }
        });
        return voices;
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
/** Voice IDs that support E1/E2 engine toggle */
TR909Engine.ENGINE_CAPABLE_VOICES = ['kick', 'snare', 'clap', 'rimshot', 'ltom', 'mtom', 'htom', 'ch', 'oh', 'crash', 'ride'];
/** Available engine versions */
TR909Engine.ENGINE_VERSIONS = ['E1', 'E2'];
/** Default engine per voice - used on init and when presets don't specify */
TR909Engine.VOICE_DEFAULTS = {
    kick: 'E1',
    snare: 'E2',
    clap: 'E1',
    rimshot: 'E2',
    ltom: 'E2',
    mtom: 'E2',
    htom: 'E2',
    ch: 'E1',
    oh: 'E1',
    crash: 'E2',
    ride: 'E2',
};
//# sourceMappingURL=engine.js.map