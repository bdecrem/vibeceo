/**
 * TB-303 Programmatic API
 *
 * For creative agents and programmatic music creation.
 */

import { TB303Engine } from '../machines/tb303/engine.js';
import { getPreset, getPresetNames } from '../machines/tb303/presets.js';

/**
 * Render a TB-303 pattern to WAV
 *
 * @param {Object} config - Pattern configuration
 * @param {Array} config.pattern - 16-step pattern array
 * @param {Object} config.parameters - Synth parameters (cutoff, resonance, etc.)
 * @param {string} config.waveform - 'sawtooth' or 'square'
 * @param {number} config.bpm - Tempo in BPM
 * @param {Object} options - Render options
 * @param {number} options.bars - Number of bars to render (default: 1)
 * @param {string} options.engine - Engine version 'E1' or 'E2' (default: 'E1')
 * @returns {Promise<{buffer: AudioBuffer, wav: ArrayBuffer}>}
 */
export async function renderTb303PatternToWav(config, options = {}) {
    const engine = new TB303Engine({ engine: options.engine ?? 'E1' });

    // Apply pattern
    if (config.pattern) {
        engine.setPattern(config.pattern);
    }

    // Apply parameters
    if (config.parameters) {
        Object.entries(config.parameters).forEach(([id, value]) => {
            engine.setParameter(id, value);
        });
    }

    // Apply waveform
    if (config.waveform) {
        engine.setWaveform(config.waveform);
    }

    // Apply BPM
    if (config.bpm) {
        engine.setBpm(config.bpm);
    }

    // Render
    const buffer = await engine.renderPattern({
        bars: options.bars ?? 1,
        bpm: config.bpm ?? 130,
    });

    const wav = engine.audioBufferToWav(buffer);

    return { buffer, wav };
}

/**
 * Render a preset to WAV
 *
 * @param {string} presetId - Preset ID (e.g., 'acidLine1', 'phuture')
 * @param {Object} options - Render options
 * @returns {Promise<{buffer: AudioBuffer, wav: ArrayBuffer}>}
 */
export async function renderPresetToWav(presetId, options = {}) {
    const preset = getPreset(presetId);
    if (!preset) {
        throw new Error(`Unknown preset: ${presetId}. Available: ${getPresetNames().map(p => p.id).join(', ')}`);
    }

    return renderTb303PatternToWav({
        pattern: preset.pattern,
        parameters: preset.parameters,
        waveform: preset.waveform,
        bpm: preset.bpm,
    }, options);
}

/**
 * TB-303 Controller for real-time playback and manipulation
 */
export class TB303Controller {
    constructor(options = {}) {
        this.engine = new TB303Engine({ engine: options.engine ?? 'E1' });
        this.currentPresetId = null;
    }

    /**
     * Load a preset by ID
     */
    loadPreset(presetId) {
        const preset = getPreset(presetId);
        if (!preset) {
            throw new Error(`Unknown preset: ${presetId}`);
        }

        this.currentPresetId = presetId;
        this.engine.setPattern(preset.pattern);
        this.engine.setBpm(preset.bpm);
        this.engine.setWaveform(preset.waveform);

        Object.entries(preset.parameters).forEach(([id, value]) => {
            this.engine.setParameter(id, value);
        });

        return preset;
    }

    /**
     * Set a custom pattern
     */
    setPattern(pattern) {
        this.currentPresetId = null;
        this.engine.setPattern(pattern);
    }

    /**
     * Set synth parameter (0-1)
     */
    setParameter(id, value) {
        this.engine.setParameter(id, value);
    }

    /**
     * Set waveform ('sawtooth' or 'square')
     */
    setWaveform(waveform) {
        this.engine.setWaveform(waveform);
    }

    /**
     * Set engine version ('E1' or 'E2')
     */
    setEngine(version) {
        this.engine.setEngine(version);
    }

    /**
     * Set tempo
     */
    setBpm(bpm) {
        this.engine.setBpm(bpm);
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
     * Check if playing
     */
    isPlaying() {
        return this.engine.isPlaying();
    }

    /**
     * Play a single note (for preview)
     */
    playNote(note, accent = false) {
        this.engine.playNote(note, accent);
    }

    /**
     * Render current pattern to AudioBuffer
     */
    async renderToBuffer(options = {}) {
        return this.engine.renderPattern(options);
    }

    /**
     * Render current pattern to WAV ArrayBuffer
     */
    async renderToWav(options = {}) {
        const buffer = await this.renderToBuffer(options);
        return {
            buffer,
            wav: this.engine.audioBufferToWav(buffer),
        };
    }

    /**
     * Get current pattern
     */
    getPattern() {
        return this.engine.getPattern();
    }

    /**
     * Get current parameters
     */
    getParameters() {
        return this.engine.getParameters();
    }

    /**
     * Get available preset names
     */
    static getPresets() {
        return getPresetNames();
    }
}

export default TB303Controller;
