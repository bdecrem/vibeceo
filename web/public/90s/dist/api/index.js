/**
 * R9-DS Sampler API
 *
 * Programmatic access to the R9-DS sampler for:
 * - Loading sample kits
 * - Setting patterns
 * - Rendering to WAV
 */

import { R9DSEngine } from '../sampler/engine.js';

/**
 * Render a pattern to WAV
 */
export async function renderR9DSPatternToWav(pattern, options = {}) {
    const engine = new R9DSEngine();

    // Load kit if specified
    if (options.kit) {
        await engine.loadKit(options.kit);
    }

    const buffer = await engine.renderPattern(pattern, options);
    const wav = engine.audioBufferToWav(buffer);
    return { buffer, wav };
}

/**
 * R9DS Controller for programmatic access
 */
export class R9DSController {
    constructor(initialPattern) {
        this.engine = new R9DSEngine();
        this.patternId = 'controller-pattern';
        if (initialPattern) {
            this.setPattern(initialPattern);
        }
    }

    /**
     * Load a sample kit by ID
     */
    async loadKit(kitId) {
        return this.engine.loadKit(kitId);
    }

    /**
     * Get available kits
     */
    async getAvailableKits() {
        return this.engine.getAvailableKits();
    }

    /**
     * Set the current pattern
     */
    setPattern(pattern) {
        this.currentPattern = pattern;
        this.engine.setPattern(this.patternId, pattern);
    }

    /**
     * Set a voice parameter
     */
    setVoiceParameter(voiceId, param, value) {
        this.engine.setVoiceParameter(voiceId, param, value);
    }

    /**
     * Get a voice parameter
     */
    getVoiceParameter(voiceId, param) {
        return this.engine.getVoiceParameter(voiceId, param);
    }

    /**
     * Start playback
     */
    play() {
        this.engine.startSequencer();
    }

    /**
     * Stop playback
     */
    stop() {
        this.engine.stopSequencer();
    }

    /**
     * Set BPM
     */
    setBpm(bpm) {
        this.engine.setBpm(bpm);
    }

    /**
     * Set swing amount (0-1)
     */
    setSwing(amount) {
        this.engine.setSwing(amount);
    }

    /**
     * Render current pattern to AudioBuffer
     */
    async renderCurrentPattern(options = {}) {
        if (!this.currentPattern) {
            throw new Error('No pattern has been set for rendering');
        }
        return this.engine.renderPattern(this.currentPattern, options);
    }

    /**
     * Export current pattern to WAV
     */
    async exportCurrentPatternToWav(options = {}) {
        const buffer = await this.renderCurrentPattern(options);
        return {
            buffer,
            wav: this.engine.audioBufferToWav(buffer),
        };
    }
}

// Also export the engine directly for advanced use
export { R9DSEngine } from '../sampler/engine.js';
