/**
 * SH-101 VCO (Voltage Controlled Oscillator)
 *
 * Emulates the CEM3340-based oscillator with:
 * - Sawtooth waveform
 * - Pulse waveform with variable width (PWM)
 * - Octave range switch (16', 8', 4', 2')
 * - Pitch modulation input
 */

export class Oscillator {
    constructor(context) {
        this.context = context;

        // Create oscillators
        this.sawOsc = context.createOscillator();
        this.sawOsc.type = 'sawtooth';

        this.pulseOsc = context.createOscillator();
        this.pulseOsc.type = 'sawtooth'; // We'll shape this into pulse

        // Pulse width modulation using waveshaper
        this.pulseShaper = context.createWaveShaper();
        this.pulseWidth = 0.5; // 0.05 to 0.95
        this.updatePulseWidth();

        // Level controls (0-1)
        this.sawGain = context.createGain();
        this.sawGain.gain.value = 0.5;

        this.pulseGain = context.createGain();
        this.pulseGain.gain.value = 0.5;

        // Mix output
        this.output = context.createGain();
        this.output.gain.value = 1;

        // Connect saw path
        this.sawOsc.connect(this.sawGain);
        this.sawGain.connect(this.output);

        // Connect pulse path (saw -> shaper -> gain)
        this.pulseOsc.connect(this.pulseShaper);
        this.pulseShaper.connect(this.pulseGain);
        this.pulseGain.connect(this.output);

        // Base frequency and octave
        this.baseFrequency = 261.63; // C4
        this.octaveShift = 0; // 0 = 8', -1 = 16', +1 = 4', +2 = 2'

        // PWM LFO input
        this.pwmDepth = 0;
        this.pwmLfoGain = context.createGain();
        this.pwmLfoGain.gain.value = 0;

        // Start oscillators
        this.sawOsc.start();
        this.pulseOsc.start();

        this.updateFrequency();
    }

    /**
     * Update pulse width waveshaper curve
     * Converts sawtooth (-1 to 1) to pulse based on width
     */
    updatePulseWidth() {
        const samples = 256;
        const curve = new Float32Array(samples);
        const threshold = (this.pulseWidth * 2) - 1; // Map 0-1 to -1 to 1

        for (let i = 0; i < samples; i++) {
            const x = (i / (samples - 1)) * 2 - 1; // -1 to 1
            curve[i] = x > threshold ? 1 : -1;
        }

        // In some Web Audio implementations (especially offline contexts),
        // you can't reassign curve once set. Create a new shaper if needed.
        if (this.pulseShaper.curve !== null) {
            // Create new waveshaper and reconnect
            const newShaper = this.context.createWaveShaper();
            newShaper.curve = curve;

            // Reconnect: pulseOsc -> newShaper -> pulseGain
            this.pulseOsc.disconnect(this.pulseShaper);
            this.pulseOsc.connect(newShaper);
            newShaper.connect(this.pulseGain);

            this.pulseShaper = newShaper;
        } else {
            this.pulseShaper.curve = curve;
        }
    }

    /**
     * Set the base note frequency
     */
    setFrequency(freq, time) {
        this.baseFrequency = freq;
        this.updateFrequency(time);
    }

    /**
     * Set frequency from MIDI note number
     */
    setNote(noteNumber, time) {
        const freq = 440 * Math.pow(2, (noteNumber - 69) / 12);
        this.setFrequency(freq, time);
    }

    /**
     * Set frequency from note name (e.g., 'C4', 'F#3')
     */
    setNoteName(noteName, time) {
        const noteNumber = this.noteNameToMidi(noteName);
        this.setNote(noteNumber, time);
    }

    /**
     * Convert note name to MIDI number
     */
    noteNameToMidi(noteName) {
        const noteMap = { 'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11 };
        const match = noteName.match(/^([A-G])([#b]?)(\d+)$/);
        if (!match) return 60; // Default to C4

        let note = noteMap[match[1]];
        if (match[2] === '#') note += 1;
        if (match[2] === 'b') note -= 1;
        const octave = parseInt(match[3]);

        return note + (octave + 1) * 12;
    }

    /**
     * Update oscillator frequencies based on base freq and octave
     */
    updateFrequency(time) {
        const when = time ?? this.context.currentTime;
        const octaveMultiplier = Math.pow(2, this.octaveShift);
        const freq = this.baseFrequency * octaveMultiplier;

        this.sawOsc.frequency.setValueAtTime(freq, when);
        this.pulseOsc.frequency.setValueAtTime(freq, when);
    }

    /**
     * Set octave range
     * @param {string} range - '16', '8', '4', or '2'
     */
    setOctaveRange(range) {
        const shifts = { '16': -1, '8': 0, '4': 1, '2': 2 };
        this.octaveShift = shifts[range] ?? 0;
        this.updateFrequency();
    }

    /**
     * Set sawtooth level (0-1)
     */
    setSawLevel(level, time) {
        const when = time ?? this.context.currentTime;
        this.sawGain.gain.setValueAtTime(Math.max(0, Math.min(1, level)), when);
    }

    /**
     * Set pulse level (0-1)
     */
    setPulseLevel(level, time) {
        const when = time ?? this.context.currentTime;
        this.pulseGain.gain.setValueAtTime(Math.max(0, Math.min(1, level)), when);
    }

    /**
     * Set pulse width (0.05-0.95)
     * 0.5 = square wave
     */
    setPulseWidth(width, time) {
        this.pulseWidth = Math.max(0.05, Math.min(0.95, width));
        this.updatePulseWidth();
    }

    /**
     * Modulate pulse width from external source (LFO)
     * @param {number} depth - Modulation depth (0-1)
     */
    setPwmDepth(depth) {
        this.pwmDepth = Math.max(0, Math.min(1, depth));
    }

    /**
     * Apply pitch modulation (for LFO vibrato or pitch envelope)
     * @param {number} semitones - Pitch shift in semitones
     * @param {number} time - When to apply
     */
    modulatePitch(semitones, time) {
        const when = time ?? this.context.currentTime;
        const ratio = Math.pow(2, semitones / 12);
        const octaveMultiplier = Math.pow(2, this.octaveShift);
        const freq = this.baseFrequency * octaveMultiplier * ratio;

        this.sawOsc.frequency.setValueAtTime(freq, when);
        this.pulseOsc.frequency.setValueAtTime(freq, when);
    }

    /**
     * Glide to a new frequency
     */
    glideToFrequency(freq, duration, time) {
        const when = time ?? this.context.currentTime;
        const octaveMultiplier = Math.pow(2, this.octaveShift);
        const targetFreq = freq * octaveMultiplier;

        this.baseFrequency = freq;
        this.sawOsc.frequency.exponentialRampToValueAtTime(targetFreq, when + duration);
        this.pulseOsc.frequency.exponentialRampToValueAtTime(targetFreq, when + duration);
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
     * Get the frequency AudioParam for external modulation
     */
    get frequencyParam() {
        // Return saw osc frequency for modulation
        // (pulse follows via updateFrequency calls)
        return this.sawOsc.frequency;
    }

    /**
     * Stop oscillators (cleanup)
     */
    stop() {
        this.sawOsc.stop();
        this.pulseOsc.stop();
    }
}

export default Oscillator;
