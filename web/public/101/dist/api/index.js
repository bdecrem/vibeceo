/**
 * SH-101 Programmatic API
 *
 * For creative agents and programmatic music creation.
 */

import { SH101Engine } from '../machines/sh101/engine.js';
import { getPreset, getPresetNames, getAllPresets } from '../machines/sh101/presets.js';

/**
 * Render an SH-101 pattern to WAV
 *
 * @param {Object} config - Pattern configuration
 * @param {Array} config.pattern - 16-step pattern array
 * @param {Object} config.parameters - Synth parameters
 * @param {number} config.bpm - Tempo in BPM
 * @param {Object} options - Render options
 * @param {number} options.bars - Number of bars to render (default: 1)
 * @param {string} options.engine - Engine version 'E1' or 'E2' (default: 'E1')
 * @returns {Promise<{buffer: AudioBuffer, wav: ArrayBuffer}>}
 */
export async function renderSh101PatternToWav(config, options = {}) {
    const engine = new SH101Engine({ engine: options.engine ?? 'E1' });

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

    // Apply BPM
    if (config.bpm) {
        engine.setBpm(config.bpm);
    }

    // Render
    const buffer = await engine.renderPattern({
        bars: options.bars ?? 1,
        bpm: config.bpm ?? 120,
    });

    const wav = engine.audioBufferToWav(buffer);

    return { buffer, wav };
}

/**
 * Render a preset to WAV
 *
 * @param {string} presetId - Preset ID (e.g., 'classicLead', 'fatBass')
 * @param {Object} options - Render options
 * @returns {Promise<{buffer: AudioBuffer, wav: ArrayBuffer}>}
 */
export async function renderPresetToWav(presetId, options = {}) {
    const preset = getPreset(presetId);
    if (!preset) {
        throw new Error(`Unknown preset: ${presetId}. Available: ${getPresetNames().map(p => p.id).join(', ')}`);
    }

    return renderSh101PatternToWav({
        pattern: preset.pattern,
        parameters: preset.parameters,
        bpm: preset.bpm,
    }, options);
}

/**
 * SH-101 Controller for real-time playback and manipulation
 */
export class SH101Controller {
    constructor(options = {}) {
        this.engine = new SH101Engine({ engine: options.engine ?? 'E1' });
        this.currentPresetId = null;
    }

    // --- Presets ---

    /**
     * Load a preset by ID
     */
    loadPreset(presetId) {
        const preset = getPreset(presetId);
        if (!preset) {
            throw new Error(`Unknown preset: ${presetId}`);
        }

        this.currentPresetId = presetId;

        // Apply parameters
        if (preset.parameters) {
            Object.entries(preset.parameters).forEach(([id, value]) => {
                this.engine.setParameter(id, value);
            });
        }

        // Apply pattern if present
        if (preset.pattern) {
            this.engine.setPattern(preset.pattern);
        }

        // Apply BPM
        if (preset.bpm) {
            this.engine.setBpm(preset.bpm);
        }

        // Apply arp settings if present
        if (preset.arp) {
            this.setArpMode(preset.arp.mode || 'off');
            this.setArpHold(preset.arp.hold || false);
            this.setArpOctaves(preset.arp.octaves || 1);
        }

        return preset;
    }

    /**
     * Get available preset names
     */
    static getPresets() {
        return getPresetNames();
    }

    // --- Parameters ---

    /**
     * Set a synth parameter (0-1)
     */
    setParameter(id, value) {
        this.engine.setParameter(id, value);
    }

    /**
     * Get a parameter value
     */
    getParameter(id) {
        return this.engine.getParameter(id);
    }

    /**
     * Get all parameters
     */
    getParameters() {
        return this.engine.getParameters();
    }

    // --- Oscillator shortcuts ---

    setVcoSaw(level) { this.setParameter('vcoSaw', level); }
    setVcoPulse(level) { this.setParameter('vcoPulse', level); }
    setPulseWidth(width) { this.setParameter('pulseWidth', width); }
    setSubLevel(level) { this.setParameter('subLevel', level); }
    setSubMode(mode) { this.setParameter('subMode', mode); }

    // --- Filter & Envelope shortcuts ---

    setCutoff(value) { this.setParameter('cutoff', value); }
    setResonance(value) { this.setParameter('resonance', value); }
    setEnvMod(value) { this.setParameter('envMod', value); }
    setAttack(value) { this.setParameter('attack', value); }
    setDecay(value) { this.setParameter('decay', value); }
    setSustain(value) { this.setParameter('sustain', value); }
    setRelease(value) { this.setParameter('release', value); }

    // --- LFO shortcuts ---

    setLfoRate(rate) { this.setParameter('lfoRate', rate); }
    setLfoWaveform(waveform) { this.setParameter('lfoWaveform', waveform); }
    setLfoToPitch(amount) { this.setParameter('lfoToPitch', amount); }
    setLfoToFilter(amount) { this.setParameter('lfoToFilter', amount); }
    setLfoToPW(amount) { this.setParameter('lfoToPW', amount); }

    // --- Pattern ---

    /**
     * Set a custom pattern
     */
    setPattern(pattern) {
        this.currentPresetId = null;
        this.engine.setPattern(pattern);
    }

    /**
     * Get current pattern
     */
    getPattern() {
        return this.engine.getPattern();
    }

    /**
     * Set a single step
     */
    setStep(index, data) {
        this.engine.setStep(index, data);
    }

    /**
     * Get a single step
     */
    getStep(index) {
        return this.engine.getStep(index);
    }

    // --- Arpeggiator ---

    /**
     * Set arpeggiator mode
     */
    setArpMode(mode) {
        this.engine.setArpMode(mode);
    }

    /**
     * Set arpeggiator hold
     */
    setArpHold(hold) {
        this.engine.setArpHold(hold);
    }

    /**
     * Set arpeggiator octave range
     */
    setArpOctaves(octaves) {
        this.engine.setArpOctaves(octaves);
    }

    /**
     * Add note to arpeggiator
     */
    addArpNote(note) {
        this.engine.addArpNote(note);
    }

    /**
     * Remove note from arpeggiator
     */
    removeArpNote(note) {
        this.engine.removeArpNote(note);
    }

    /**
     * Clear all arp notes
     */
    clearArpNotes() {
        this.engine.clearArpNotes();
    }

    // --- Playback ---

    /**
     * Set tempo
     */
    setBpm(bpm) {
        this.engine.setBpm(bpm);
    }

    /**
     * Get tempo
     */
    getBpm() {
        return this.engine.getBpm();
    }

    /**
     * Start sequencer playback
     */
    play() {
        this.engine.startSequencer();
    }

    /**
     * Stop sequencer playback
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
    playNote(note, velocity = 1) {
        this.engine.playNote(note, velocity);
    }

    /**
     * Release current note
     */
    noteOff() {
        this.engine.noteOff();
    }

    // --- Engine ---

    /**
     * Set engine version ('E1' or 'E2')
     */
    setEngine(version) {
        this.engine.setEngine(version);
    }

    /**
     * Get current engine version
     */
    getEngine() {
        return this.engine.getEngine();
    }

    // --- Rendering ---

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

    // --- Callbacks ---

    /**
     * Set step change callback
     */
    onStepChange(callback) {
        this.engine.onStepChange = callback;
    }

    /**
     * Set note trigger callback
     */
    onNote(callback) {
        this.engine.onNote = callback;
    }
}

// Export everything
export { getPreset, getPresetNames, getAllPresets };
export default SH101Controller;
