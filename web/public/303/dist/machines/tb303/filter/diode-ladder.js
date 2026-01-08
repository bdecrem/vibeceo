/**
 * TB-303 Diode Ladder Filter Emulation
 *
 * The TB-303 uses a 4-pole diode ladder filter with ~18dB/octave slope.
 * This implementation uses cascaded biquad filters with saturation to
 * approximate the character of the original.
 *
 * Key characteristics:
 * - Self-oscillation at high resonance
 * - Soft saturation on input
 * - Slightly lower slope than Moog ladder (18dB vs 24dB)
 */

export class DiodeLadderFilter {
    constructor(context) {
        this.context = context;

        // Create filter chain: 3 cascaded lowpass filters (6dB each = 18dB total)
        this.filters = [];
        for (let i = 0; i < 3; i++) {
            const filter = context.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 1000;
            filter.Q.value = 0.5;
            this.filters.push(filter);
        }

        // Input gain (for saturation simulation)
        this.inputGain = context.createGain();
        this.inputGain.gain.value = 1;

        // Resonance feedback path using a waveshaper for saturation
        this.feedbackGain = context.createGain();
        this.feedbackGain.gain.value = 0;

        // Output waveshaper for soft saturation
        this.waveshaper = context.createWaveShaper();
        this.waveshaper.curve = this.createSaturationCurve(1.5);
        this.waveshaper.oversample = '2x';

        // Output gain
        this.outputGain = context.createGain();
        this.outputGain.gain.value = 1;

        // Connect chain
        this.inputGain.connect(this.filters[0]);
        for (let i = 0; i < this.filters.length - 1; i++) {
            this.filters[i].connect(this.filters[i + 1]);
        }
        this.filters[this.filters.length - 1].connect(this.waveshaper);
        this.waveshaper.connect(this.outputGain);

        // Feedback path (for self-oscillation)
        this.outputGain.connect(this.feedbackGain);
        this.feedbackGain.connect(this.inputGain);

        // Store current values
        this._frequency = 1000;
        this._resonance = 0;
    }

    createSaturationCurve(amount) {
        const samples = 256;
        const curve = new Float32Array(samples);
        for (let i = 0; i < samples; i++) {
            const x = (i * 2) / samples - 1;
            // Soft clipping using tanh
            curve[i] = Math.tanh(x * amount);
        }
        return curve;
    }

    get input() {
        return this.inputGain;
    }

    get output() {
        return this.outputGain;
    }

    connect(destination) {
        this.outputGain.connect(destination);
        return destination;
    }

    disconnect() {
        this.outputGain.disconnect();
    }

    setFrequency(value, time) {
        const when = time ?? this.context.currentTime;
        const freq = Math.max(20, Math.min(20000, value));
        this._frequency = freq;

        // Set all filters to same frequency with slight detuning for character
        this.filters.forEach((filter, i) => {
            const detune = 1 + (i - 1) * 0.02; // Slight detune
            filter.frequency.setValueAtTime(freq * detune, when);
        });
    }

    setFrequencyAtTime(value, time) {
        this.setFrequency(value, time);
    }

    exponentialRampToFrequency(value, time) {
        const freq = Math.max(20, Math.min(20000, value));
        this._frequency = freq;

        this.filters.forEach((filter, i) => {
            const detune = 1 + (i - 1) * 0.02;
            filter.frequency.exponentialRampToValueAtTime(freq * detune, time);
        });
    }

    setResonance(value) {
        // Value 0-1, maps to filter Q and feedback
        // Normalized so full range is usable (75% ≈ old 24%)
        this._resonance = Math.max(0, Math.min(1, value));

        // Q increases with resonance (reduced from *15 to *5)
        const q = 0.5 + this._resonance * 5;
        this.filters.forEach(filter => {
            filter.Q.value = q;
        });

        // Feedback for self-oscillation (reduced from *0.85 to *0.27)
        const feedback = this._resonance * 0.27;
        this.feedbackGain.gain.value = feedback;

        // Adjust output gain to compensate for resonance boost
        this.outputGain.gain.value = 1 - this._resonance * 0.1;
    }

    getFrequency() {
        return this._frequency;
    }

    getResonance() {
        return this._resonance;
    }
}

export default DiodeLadderFilter;
