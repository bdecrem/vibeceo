import { Voice } from '../../../core/voice.js';
export class Kick909 extends Voice {
    constructor(id, context) {
        super(id, context);
        this.tune = 0; // cents (±1200 = ±1 octave)
        this.decay = 0.8;
        this.attack = 0.5; // click intensity 0-1
        this.sweep = 1; // pitch envelope depth: 0 = flat, 1 = full octave sweep
        this.level = 1;
    }
    // Creates waveshaper curve: triangle → hexagonal → pseudo-sine
    // Real 909 uses back-to-back diodes that clip at ~0.5-0.6V
    createTriangleToSineCurve() {
        const samples = 8192;
        const curve = new Float32Array(samples);
        for (let i = 0; i < samples; i++) {
            const x = (i * 2) / samples - 1; // -1 to 1
            // Soft clipping similar to diode behavior
            // This transforms triangle into rounded hexagonal, approximating sine
            const threshold = 0.6;
            if (Math.abs(x) < threshold) {
                curve[i] = x;
            } else {
                // Soft knee saturation above threshold
                const sign = x > 0 ? 1 : -1;
                const excess = Math.abs(x) - threshold;
                curve[i] = sign * (threshold + excess * 0.3);
            }
        }
        return curve;
    }

    trigger(time, velocity) {
        const peak = Math.max(0, Math.min(1, velocity * this.level));
        const tuneMultiplier = Math.pow(2, this.tune / 1200);

        // === MAIN BODY: Triangle → waveshaper → sine ===
        // Real 909: Triangle saturated to hexagonal, filtered to sine
        // Tuned to 55Hz (A1) for punchy sub-bass
        const mainOsc = this.context.createOscillator();
        mainOsc.type = 'triangle';  // Real 909 starts with triangle

        // Base frequency at 55Hz (A1) - punchy sub-bass
        const baseFreq = 55 * tuneMultiplier;

        // Pitch envelope: instant attack, glissando down
        // Attack knob controls sweep RATE (30-120ms range)
        // Sweep knob controls sweep DEPTH (0 = flat, 1 = full octave)
        const sweepTime = 0.03 + (1 - this.attack) * 0.09; // 30-120ms based on attack
        const sweepMultiplier = 1 + this.sweep; // 1 = no sweep, 2 = full octave up
        const peakFreq = baseFreq * sweepMultiplier;

        mainOsc.frequency.setValueAtTime(peakFreq, time);
        if (this.sweep > 0.01) {
            mainOsc.frequency.exponentialRampToValueAtTime(baseFreq, time + sweepTime);
        }

        // Waveshaper: triangle → hexagonal → approx sine (like 909's diode clipper)
        const shaper = this.context.createWaveShaper();
        shaper.curve = this.createTriangleToSineCurve();
        shaper.oversample = '2x';

        // Amplitude envelope
        const mainGain = this.context.createGain();
        const decayTime = 0.15 + (this.decay * 0.85); // 150ms-1s range
        mainGain.gain.setValueAtTime(peak, time);
        mainGain.gain.setTargetAtTime(0, time + 0.005, decayTime * 0.2);

        mainOsc.connect(shaper);
        shaper.connect(mainGain);
        mainGain.connect(this.output);
        mainOsc.start(time);
        mainOsc.stop(time + decayTime + 0.5);

        // === CLICK: Pulse + filtered noise burst ===
        // Real 909 uses short pulse AND filtered noise, not just one
        // Level knob affects this (repurposing 'level' param for click amount)
        const clickAmount = this.level;  // Higher level = more click

        if (clickAmount > 0.1) {
            // Part 1: Short impulse (pulse generator)
            const impulseLength = 32; // ~0.7ms at 44.1kHz
            const impulseBuffer = this.context.createBuffer(1, impulseLength, this.context.sampleRate);
            const impulseData = impulseBuffer.getChannelData(0);
            for (let i = 0; i < impulseLength; i++) {
                impulseData[i] = (i < 8 ? 1 : 0) * Math.exp(-i / 6);
            }
            const impulseSource = this.context.createBufferSource();
            impulseSource.buffer = impulseBuffer;

            const impulseGain = this.context.createGain();
            impulseGain.gain.setValueAtTime(peak * clickAmount * 0.5, time);

            impulseSource.connect(impulseGain);
            impulseGain.connect(this.output);
            impulseSource.start(time);

            // Part 2: Short filtered noise burst
            const noiseLength = 128; // ~3ms
            const noiseBuffer = this.context.createBuffer(1, noiseLength, this.context.sampleRate);
            const noiseData = noiseBuffer.getChannelData(0);
            for (let i = 0; i < noiseLength; i++) {
                noiseData[i] = (Math.random() * 2 - 1) * Math.exp(-i / 20);
            }
            const noiseSource = this.context.createBufferSource();
            noiseSource.buffer = noiseBuffer;

            const noiseFilter = this.context.createBiquadFilter();
            noiseFilter.type = 'lowpass';
            noiseFilter.frequency.value = 3000;
            noiseFilter.Q.value = 0.7;

            const noiseGain = this.context.createGain();
            noiseGain.gain.setValueAtTime(peak * clickAmount * 0.3, time);

            noiseSource.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(this.output);
            noiseSource.start(time);
        }
    }
    setParameter(id, value) {
        switch (id) {
            case 'tune':
                this.tune = value;
                break;
            case 'decay':
                this.decay = Math.max(0.05, value);
                break;
            case 'attack':
                this.attack = Math.max(0, Math.min(1, value));
                break;
            case 'sweep':
                this.sweep = Math.max(0, Math.min(1, value));
                break;
            case 'level':
                this.level = Math.max(0, Math.min(1, value));
                break;
            default:
                super.setParameter(id, value);
        }
    }
    get parameterDescriptors() {
        return [
            {
                id: 'tune',
                label: 'Tune',
                range: { min: -1200, max: 1200, step: 10, unit: 'cents' },
                defaultValue: 0,
            },
            {
                id: 'decay',
                label: 'Decay',
                range: { min: 0.05, max: 2, step: 0.01, unit: 's' },
                defaultValue: 0.8,
            },
            {
                id: 'attack',
                label: 'Attack',
                range: { min: 0, max: 1, step: 0.01 },
                defaultValue: 0.5,
            },
            {
                id: 'sweep',
                label: 'Sweep',
                range: { min: 0, max: 1, step: 0.01 },
                defaultValue: 1,
            },
            {
                id: 'level',
                label: 'Level',
                range: { min: 0, max: 1, step: 0.01 },
                defaultValue: 1,
            },
            ...super.parameterDescriptors,
        ];
    }
}
//# sourceMappingURL=kick.js.map