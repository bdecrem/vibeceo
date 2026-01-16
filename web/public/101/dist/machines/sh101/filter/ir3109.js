/**
 * IR3109 Filter Emulation
 *
 * The IR3109 is Roland's proprietary 4-pole (24dB/oct) lowpass filter
 * used in the SH-101, Juno-60, Juno-106, Jupiter-6, and Jupiter-8.
 *
 * Characteristics:
 * - Smooth, musical resonance
 * - Self-oscillation at high Q
 * - Warmer than the TB-303's diode ladder
 *
 * This implementation uses cascaded state-variable filters for stability
 * and musical character.
 */

export class IR3109Filter {
    constructor(context) {
        this.context = context;

        // Create 4-pole filter using cascaded biquads
        // Two 2-pole stages = 4-pole (24dB/oct)
        this.stage1 = context.createBiquadFilter();
        this.stage1.type = 'lowpass';
        this.stage1.frequency.value = 2000;
        this.stage1.Q.value = 0.7071; // Butterworth

        this.stage2 = context.createBiquadFilter();
        this.stage2.type = 'lowpass';
        this.stage2.frequency.value = 2000;
        this.stage2.Q.value = 0.7071;

        // Resonance feedback path (for self-oscillation)
        this.feedbackGain = context.createGain();
        this.feedbackGain.gain.value = 0;

        // Soft saturation for warmth
        this.saturator = context.createWaveShaper();
        this.createSaturationCurve();

        // Input and output
        this.input = context.createGain();
        this.input.gain.value = 1;

        this.output = context.createGain();
        this.output.gain.value = 1;

        // Connect main signal path
        this.input.connect(this.saturator);
        this.saturator.connect(this.stage1);
        this.stage1.connect(this.stage2);
        this.stage2.connect(this.output);

        // Resonance feedback (from output back to input)
        this.stage2.connect(this.feedbackGain);
        this.feedbackGain.connect(this.input);

        // Current settings
        this.cutoffHz = 2000;
        this.resonance = 0; // 0-1
        this.keyboardTracking = 0; // 0-1
        this.baseNote = 60; // C4

        // Frequency range (Hz)
        this.minFreq = 20;
        this.maxFreq = 20000;
    }

    /**
     * Create soft saturation curve (tanh-like)
     * Adds warmth and prevents harsh clipping
     */
    createSaturationCurve() {
        const samples = 256;
        const curve = new Float32Array(samples);

        for (let i = 0; i < samples; i++) {
            const x = (i / (samples - 1)) * 2 - 1; // -1 to 1
            // Soft saturation using tanh approximation
            curve[i] = Math.tanh(x * 1.5) / Math.tanh(1.5);
        }

        this.saturator.curve = curve;
    }

    /**
     * Set cutoff frequency (normalized 0-1)
     * Uses exponential scaling for musical response
     */
    setCutoff(value, time) {
        const when = time ?? this.context.currentTime;
        const normalized = Math.max(0, Math.min(1, value));

        // Exponential frequency mapping
        this.cutoffHz = this.minFreq * Math.pow(this.maxFreq / this.minFreq, normalized);

        this.updateFilterFrequency(when);
    }

    /**
     * Set cutoff frequency in Hz directly
     */
    setCutoffHz(hz, time) {
        const when = time ?? this.context.currentTime;
        this.cutoffHz = Math.max(this.minFreq, Math.min(this.maxFreq, hz));
        this.updateFilterFrequency(when);
    }

    /**
     * Update filter frequency with keyboard tracking
     */
    updateFilterFrequency(time) {
        const when = time ?? this.context.currentTime;

        // Apply keyboard tracking
        let finalFreq = this.cutoffHz;
        if (this.keyboardTracking > 0) {
            // Calculate tracking offset from C4 (MIDI 60)
            const semitones = this.currentNote - this.baseNote;
            const trackingRatio = Math.pow(2, (semitones * this.keyboardTracking) / 12);
            finalFreq *= trackingRatio;
        }

        // Clamp to valid range
        finalFreq = Math.max(this.minFreq, Math.min(this.maxFreq, finalFreq));

        this.stage1.frequency.setValueAtTime(finalFreq, when);
        this.stage2.frequency.setValueAtTime(finalFreq, when);
    }

    /**
     * Set resonance (0-1)
     * High values cause self-oscillation
     */
    setResonance(value, time) {
        const when = time ?? this.context.currentTime;
        this.resonance = Math.max(0, Math.min(1, value));

        // Map resonance to Q and feedback
        // Q range: 0.7071 (Butterworth) to 20 (near oscillation)
        const q = 0.7071 + (this.resonance * 19);

        this.stage1.Q.setValueAtTime(q * 0.7, when); // First stage slightly lower
        this.stage2.Q.setValueAtTime(q, when);

        // Feedback for self-oscillation at high resonance
        // Careful: too much feedback = unstable
        const feedback = this.resonance > 0.8 ? (this.resonance - 0.8) * 2 : 0;
        this.feedbackGain.gain.setValueAtTime(feedback * 0.3, when);
    }

    /**
     * Set keyboard tracking amount (0-1)
     * 0 = filter doesn't follow pitch
     * 1 = filter tracks pitch 1:1
     */
    setKeyboardTracking(amount) {
        this.keyboardTracking = Math.max(0, Math.min(1, amount));
    }

    /**
     * Set current note for keyboard tracking
     */
    setNote(midiNote) {
        this.currentNote = midiNote;
        this.updateFilterFrequency();
    }

    /**
     * Modulate cutoff frequency (for envelope/LFO)
     * @param {number} amount - Modulation amount in octaves
     * @param {number} time - When to apply
     */
    modulateCutoff(amount, time) {
        const when = time ?? this.context.currentTime;
        const modFreq = this.cutoffHz * Math.pow(2, amount);
        const finalFreq = Math.max(this.minFreq, Math.min(this.maxFreq, modFreq));

        this.stage1.frequency.setValueAtTime(finalFreq, when);
        this.stage2.frequency.setValueAtTime(finalFreq, when);
    }

    /**
     * Ramp cutoff to new value (for envelope)
     */
    rampCutoff(targetValue, duration, time) {
        const when = time ?? this.context.currentTime;
        const normalized = Math.max(0, Math.min(1, targetValue));
        const targetHz = this.minFreq * Math.pow(this.maxFreq / this.minFreq, normalized);

        // Cancel any scheduled values first to avoid "cannot assign curve twice" errors
        this.stage1.frequency.cancelScheduledValues(when);
        this.stage2.frequency.cancelScheduledValues(when);

        // Set current value at the start time (required before ramp)
        const currentHz = this.cutoffHz || this.minFreq;
        this.stage1.frequency.setValueAtTime(currentHz, when);
        this.stage2.frequency.setValueAtTime(currentHz, when);

        this.stage1.frequency.exponentialRampToValueAtTime(targetHz, when + duration);
        this.stage2.frequency.exponentialRampToValueAtTime(targetHz, when + duration);

        this.cutoffHz = targetHz;
    }

    /**
     * Get the frequency AudioParam for direct modulation
     */
    get frequencyParam() {
        return this.stage1.frequency;
    }

    /**
     * Connect input
     */
    connectInput(source) {
        source.connect(this.input);
    }

    /**
     * Connect output
     */
    connect(destination) {
        this.output.connect(destination);
    }

    /**
     * Disconnect
     */
    disconnect() {
        this.output.disconnect();
    }
}

/**
 * E1 (Simple) version - just cascaded biquads
 */
export class IR3109FilterE1 {
    constructor(context) {
        this.context = context;

        // Simple 2-pole lowpass (12dB/oct, less CPU)
        this.filter = context.createBiquadFilter();
        this.filter.type = 'lowpass';
        this.filter.frequency.value = 2000;
        this.filter.Q.value = 1;

        this.input = this.filter;
        this.output = this.filter;

        this.cutoffHz = 2000;
        this.resonance = 0;
        this.minFreq = 20;
        this.maxFreq = 20000;
    }

    setCutoff(value, time) {
        const when = time ?? this.context.currentTime;
        const normalized = Math.max(0, Math.min(1, value));
        this.cutoffHz = this.minFreq * Math.pow(this.maxFreq / this.minFreq, normalized);
        this.filter.frequency.setValueAtTime(this.cutoffHz, when);
    }

    setCutoffHz(hz, time) {
        const when = time ?? this.context.currentTime;
        this.cutoffHz = Math.max(this.minFreq, Math.min(this.maxFreq, hz));
        this.filter.frequency.setValueAtTime(this.cutoffHz, when);
    }

    setResonance(value, time) {
        const when = time ?? this.context.currentTime;
        this.resonance = Math.max(0, Math.min(1, value));
        const q = 0.7071 + (this.resonance * 15);
        this.filter.Q.setValueAtTime(q, when);
    }

    setKeyboardTracking(amount) {
        // Not implemented in E1
    }

    setNote(midiNote) {
        // Not implemented in E1
    }

    modulateCutoff(amount, time) {
        const when = time ?? this.context.currentTime;
        const modFreq = this.cutoffHz * Math.pow(2, amount);
        const finalFreq = Math.max(this.minFreq, Math.min(this.maxFreq, modFreq));
        this.filter.frequency.setValueAtTime(finalFreq, when);
    }

    rampCutoff(targetValue, duration, time) {
        const when = time ?? this.context.currentTime;
        const normalized = Math.max(0, Math.min(1, targetValue));
        const targetHz = this.minFreq * Math.pow(this.maxFreq / this.minFreq, normalized);

        // Cancel any scheduled values first to avoid "cannot assign curve twice" errors
        this.filter.frequency.cancelScheduledValues(when);

        // Set current value at the start time (required before ramp)
        const currentHz = this.cutoffHz || this.minFreq;
        this.filter.frequency.setValueAtTime(currentHz, when);

        this.filter.frequency.exponentialRampToValueAtTime(targetHz, when + duration);
        this.cutoffHz = targetHz;
    }

    get frequencyParam() {
        return this.filter.frequency;
    }

    connectInput(source) {
        source.connect(this.input);
    }

    connect(destination) {
        this.output.connect(destination);
    }

    disconnect() {
        this.output.disconnect();
    }
}

export default IR3109Filter;
