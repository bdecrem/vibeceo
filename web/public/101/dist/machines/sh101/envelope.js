/**
 * ADSR Envelope Generator
 *
 * Full Attack-Decay-Sustain-Release envelope with:
 * - Exponential curves (analog-style)
 * - Retrigger and legato modes
 * - Modulatable parameters
 */

export class ADSREnvelope {
    constructor(context, options = {}) {
        this.context = context;

        // Create constant source for envelope value
        this.envelope = context.createConstantSource();
        this.envelope.offset.value = 0;
        this.envelope.start();

        // Output gain for routing
        this.output = context.createGain();
        this.output.gain.value = 1;
        this.envelope.connect(this.output);

        // ADSR parameters (in seconds for A/D/R, 0-1 for S)
        this.attack = options.attack ?? 0.01;
        this.decay = options.decay ?? 0.3;
        this.sustain = options.sustain ?? 0.7;
        this.release = options.release ?? 0.3;

        // State
        this.isGateOn = false;
        this.currentValue = 0;
        this.gateOnTime = 0;

        // Time range limits
        this.minTime = 0.001; // 1ms
        this.maxTime = 10.0;  // 10s
    }

    /**
     * Set attack time (0-1 normalized to time range)
     */
    setAttack(value) {
        const normalized = Math.max(0, Math.min(1, value));
        // Exponential mapping for more control at low values
        this.attack = this.minTime * Math.pow(this.maxTime / this.minTime, normalized);
    }

    /**
     * Set decay time (0-1 normalized)
     */
    setDecay(value) {
        const normalized = Math.max(0, Math.min(1, value));
        this.decay = this.minTime * Math.pow(this.maxTime / this.minTime, normalized);
    }

    /**
     * Set sustain level (0-1)
     */
    setSustain(value) {
        this.sustain = Math.max(0, Math.min(1, value));
    }

    /**
     * Set release time (0-1 normalized)
     */
    setRelease(value) {
        const normalized = Math.max(0, Math.min(1, value));
        this.release = this.minTime * Math.pow(this.maxTime / this.minTime, normalized);
    }

    /**
     * Set all ADSR values at once (normalized 0-1)
     */
    setADSR(a, d, s, r) {
        this.setAttack(a);
        this.setDecay(d);
        this.setSustain(s);
        this.setRelease(r);
    }

    /**
     * Trigger the envelope (gate on)
     * @param {number} time - Start time (defaults to now)
     * @param {boolean} retrigger - Force retrigger from 0
     */
    trigger(time, retrigger = true) {
        const when = time ?? this.context.currentTime;
        this.isGateOn = true;
        this.gateOnTime = when;

        // Cancel any scheduled changes
        this.envelope.offset.cancelScheduledValues(when);

        if (retrigger) {
            // Start from 0
            this.envelope.offset.setValueAtTime(0, when);
        } else {
            // Legato: continue from current value
            this.envelope.offset.setValueAtTime(this.envelope.offset.value, when);
        }

        // Attack phase: ramp to peak (1.0)
        // Using setTargetAtTime for exponential curve
        // Time constant = attack / 3 gets to ~95% in attack time
        this.envelope.offset.setTargetAtTime(1.0, when, this.attack / 3);

        // Decay phase: ramp to sustain
        const decayStart = when + this.attack;
        this.envelope.offset.setTargetAtTime(this.sustain, decayStart, this.decay / 3);
    }

    /**
     * Release the envelope (gate off)
     * @param {number} time - Release start time
     */
    release(time) {
        if (!this.isGateOn) return;

        const when = time ?? this.context.currentTime;
        this.isGateOn = false;

        // Cancel scheduled changes and start release from current value
        this.envelope.offset.cancelScheduledValues(when);

        // Get current value (approximate)
        const currentVal = this.getCurrentValue(when);
        this.envelope.offset.setValueAtTime(currentVal, when);

        // Release to 0
        this.envelope.offset.setTargetAtTime(0, when, this.release / 3);
    }

    /**
     * Get approximate current envelope value
     */
    getCurrentValue(time) {
        const when = time ?? this.context.currentTime;

        if (!this.isGateOn) {
            // In release or idle
            return Math.max(0, this.envelope.offset.value);
        }

        const elapsed = when - this.gateOnTime;

        if (elapsed < this.attack) {
            // Attack phase
            const progress = elapsed / this.attack;
            return 1 - Math.exp(-3 * progress);
        } else {
            // Decay/sustain phase
            const decayElapsed = elapsed - this.attack;
            const decayProgress = decayElapsed / this.decay;
            const decayed = (1 - this.sustain) * Math.exp(-3 * decayProgress);
            return this.sustain + decayed;
        }
    }

    /**
     * Connect envelope output to a parameter
     * @param {AudioParam} param - The parameter to modulate
     * @param {number} amount - Modulation depth
     */
    connect(param, amount = 1) {
        if (amount === 1) {
            this.output.connect(param);
        } else {
            // Create a gain for scaling
            const scaler = this.context.createGain();
            scaler.gain.value = amount;
            this.output.connect(scaler);
            scaler.connect(param);
        }
    }

    /**
     * Get the envelope's constant source for direct connection
     */
    get source() {
        return this.envelope;
    }

    /**
     * Disconnect all
     */
    disconnect() {
        this.output.disconnect();
    }

    /**
     * Stop (cleanup)
     */
    stop() {
        this.envelope.stop();
    }
}

/**
 * Simple decay-only envelope (like TB-303)
 * For comparison and simpler sounds
 */
export class DecayEnvelope {
    constructor(context, options = {}) {
        this.context = context;

        this.envelope = context.createConstantSource();
        this.envelope.offset.value = 0;
        this.envelope.start();

        this.output = context.createGain();
        this.output.gain.value = 1;
        this.envelope.connect(this.output);

        this.decay = options.decay ?? 0.3;
        this.accent = options.accent ?? 1.0;
    }

    setDecay(value) {
        const normalized = Math.max(0, Math.min(1, value));
        this.decay = 0.01 + normalized * 2.0; // 10ms to 2s
    }

    trigger(time, velocity = 1) {
        const when = time ?? this.context.currentTime;
        const peak = velocity * this.accent;

        this.envelope.offset.cancelScheduledValues(when);
        this.envelope.offset.setValueAtTime(peak, when);
        this.envelope.offset.setTargetAtTime(0, when, this.decay / 3);
    }

    connect(param, amount = 1) {
        if (amount === 1) {
            this.output.connect(param);
        } else {
            const scaler = this.context.createGain();
            scaler.gain.value = amount;
            this.output.connect(scaler);
            scaler.connect(param);
        }
    }

    disconnect() {
        this.output.disconnect();
    }

    stop() {
        this.envelope.stop();
    }
}

export default ADSREnvelope;
