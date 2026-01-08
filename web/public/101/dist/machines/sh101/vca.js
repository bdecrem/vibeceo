/**
 * SH-101 VCA (Voltage Controlled Amplifier)
 *
 * Controls the output amplitude with envelope modulation.
 */

export class VCA {
    constructor(context) {
        this.context = context;

        // Main amplifier
        this.amplifier = context.createGain();
        this.amplifier.gain.value = 0; // Start silent

        // Master volume
        this.masterGain = context.createGain();
        this.masterGain.gain.value = 0.8;

        // Connect
        this.amplifier.connect(this.masterGain);

        // Input/output references
        this.input = this.amplifier;
        this.output = this.masterGain;
    }

    /**
     * Get the gain AudioParam for envelope connection
     */
    get gainParam() {
        return this.amplifier.gain;
    }

    /**
     * Set master volume (0-1)
     */
    setVolume(value, time) {
        const when = time ?? this.context.currentTime;
        this.masterGain.gain.setValueAtTime(Math.max(0, Math.min(1, value)), when);
    }

    /**
     * Set gain directly (for manual control)
     */
    setGain(value, time) {
        const when = time ?? this.context.currentTime;
        this.amplifier.gain.setValueAtTime(Math.max(0, Math.min(1, value)), when);
    }

    /**
     * Ramp gain (for envelope-like control)
     */
    rampGain(value, duration, time) {
        const when = time ?? this.context.currentTime;
        this.amplifier.gain.linearRampToValueAtTime(
            Math.max(0, Math.min(1, value)),
            when + duration
        );
    }

    /**
     * Connect input source to VCA
     */
    connectInput(source) {
        source.connect(this.input);
    }

    /**
     * Connect VCA output to destination
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

export default VCA;
