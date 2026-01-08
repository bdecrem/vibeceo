/**
 * SH-101 Sub-Oscillator
 *
 * Emulates the CD4013 dual flip-flop sub-oscillator circuit:
 * - Mode 1: Square wave at -1 octave
 * - Mode 2: Square wave at -2 octaves
 * - Mode 3: 25% pulse at -2 octaves (strongest 2nd harmonic)
 */

export class SubOscillator {
    constructor(context) {
        this.context = context;

        // Create oscillators for different modes
        this.subOsc1 = context.createOscillator(); // -1 octave square
        this.subOsc1.type = 'square';

        this.subOsc2 = context.createOscillator(); // -2 octave square
        this.subOsc2.type = 'square';

        // For 25% pulse, we use a sawtooth through a waveshaper
        this.subOsc3Saw = context.createOscillator();
        this.subOsc3Saw.type = 'sawtooth';
        this.pulseShaper = context.createWaveShaper();
        this.createPulse25Curve();

        // Individual gains for mode selection
        this.gain1 = context.createGain();
        this.gain1.gain.value = 0;

        this.gain2 = context.createGain();
        this.gain2.gain.value = 0;

        this.gain3 = context.createGain();
        this.gain3.gain.value = 0;

        // Master output with level control
        this.levelGain = context.createGain();
        this.levelGain.gain.value = 0.5;

        this.output = context.createGain();
        this.output.gain.value = 1;

        // Connect paths
        this.subOsc1.connect(this.gain1);
        this.subOsc2.connect(this.gain2);
        this.subOsc3Saw.connect(this.pulseShaper);
        this.pulseShaper.connect(this.gain3);

        this.gain1.connect(this.levelGain);
        this.gain2.connect(this.levelGain);
        this.gain3.connect(this.levelGain);
        this.levelGain.connect(this.output);

        // Current state
        this.baseFrequency = 261.63; // C4
        this.mode = 0; // 0=off, 1=-1oct, 2=-2oct, 3=25%pulse

        // Start oscillators
        this.subOsc1.start();
        this.subOsc2.start();
        this.subOsc3Saw.start();

        this.updateFrequencies();
        this.updateMode();
    }

    /**
     * Create 25% pulse waveshaper curve
     * 25% duty cycle has strong 2nd harmonic, sounds like -1 octave
     */
    createPulse25Curve() {
        const samples = 256;
        const curve = new Float32Array(samples);

        // 25% pulse: high for 25% of the time
        // threshold at -0.5 means output is high when input > -0.5
        // which is 75% of the sawtooth cycle (since saw goes -1 to 1)
        // We want 25% high, so threshold at 0.5
        const threshold = 0.5;

        for (let i = 0; i < samples; i++) {
            const x = (i / (samples - 1)) * 2 - 1; // -1 to 1
            curve[i] = x > threshold ? 1 : -1;
        }

        this.pulseShaper.curve = curve;
    }

    /**
     * Set the base frequency (from main VCO)
     */
    setFrequency(freq, time) {
        this.baseFrequency = freq;
        this.updateFrequencies(time);
    }

    /**
     * Update all sub-oscillator frequencies
     */
    updateFrequencies(time) {
        const when = time ?? this.context.currentTime;

        // -1 octave
        this.subOsc1.frequency.setValueAtTime(this.baseFrequency / 2, when);

        // -2 octaves
        this.subOsc2.frequency.setValueAtTime(this.baseFrequency / 4, when);
        this.subOsc3Saw.frequency.setValueAtTime(this.baseFrequency / 4, when);
    }

    /**
     * Set sub-oscillator mode
     * @param {number} mode - 0=off, 1=-1oct square, 2=-2oct square, 3=-2oct 25% pulse
     */
    setMode(mode) {
        this.mode = Math.max(0, Math.min(3, Math.floor(mode)));
        this.updateMode();
    }

    /**
     * Update gains based on mode
     */
    updateMode() {
        const time = this.context.currentTime;

        this.gain1.gain.setValueAtTime(this.mode === 1 ? 1 : 0, time);
        this.gain2.gain.setValueAtTime(this.mode === 2 ? 1 : 0, time);
        this.gain3.gain.setValueAtTime(this.mode === 3 ? 1 : 0, time);
    }

    /**
     * Set sub-oscillator level (0-1)
     */
    setLevel(level, time) {
        const when = time ?? this.context.currentTime;
        this.levelGain.gain.setValueAtTime(Math.max(0, Math.min(1, level)), when);
    }

    /**
     * Glide to a new frequency (synced with main VCO)
     */
    glideToFrequency(freq, duration, time) {
        const when = time ?? this.context.currentTime;
        this.baseFrequency = freq;

        this.subOsc1.frequency.exponentialRampToValueAtTime(freq / 2, when + duration);
        this.subOsc2.frequency.exponentialRampToValueAtTime(freq / 4, when + duration);
        this.subOsc3Saw.frequency.exponentialRampToValueAtTime(freq / 4, when + duration);
    }

    /**
     * Connect to destination
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

    /**
     * Stop oscillators (cleanup)
     */
    stop() {
        this.subOsc1.stop();
        this.subOsc2.stop();
        this.subOsc3Saw.stop();
    }

    /**
     * Get current mode
     */
    getMode() {
        return this.mode;
    }

    /**
     * Get mode name
     */
    getModeName() {
        const names = ['Off', '-1 Oct', '-2 Oct', '25% Pulse'];
        return names[this.mode] || 'Off';
    }
}

export default SubOscillator;
