import { Voice } from '../../../core/voice.js';
// E1: Pure sine oscillator kick with soft-clip warmth (committed 2e8740db0)
export class Kick909E1 extends Voice {
    constructor(id, context) {
        super(id, context);
        this.tune = 0; // cents (±1200 = ±1 octave)
        this.decay = 0.8;
        this.attack = 0.5; // click intensity 0-1
        this.level = 1;
    }
    // Creates a soft-clip curve that shapes sawtooth into rounded pseudo-sine
    // This mimics the 909's sawtooth→waveshaper→sine circuit
    createSoftClipCurve() {
        const samples = 8192;
        const curve = new Float32Array(samples);
        for (let i = 0; i < samples; i++) {
            const x = (i * 2) / samples - 1; // -1 to 1
            // Soft saturation: tanh-like curve that rounds harsh edges
            curve[i] = Math.tanh(x * 1.5) * 0.9;
        }
        return curve;
    }
    trigger(time, velocity) {
        const peak = Math.max(0, Math.min(1, velocity * this.level));
        const tuneMultiplier = Math.pow(2, this.tune / 1200);

        // === MAIN BODY: Sine with pitch sweep ===
        // Real 909: bridged-T oscillator creates damped sine
        // Base frequency 50-60Hz, pitch sweep adds punch
        const mainOsc = this.context.createOscillator();
        mainOsc.type = 'sine';

        // Frequency sweep: start high, drop to base
        // ds909 uses 30-70Hz base range; we start higher for the "punch" then settle
        const baseFreq = 55 * tuneMultiplier;  // ~A1, the 909's sweet spot
        const peakFreq = baseFreq * 2.5;       // Start 2.5x higher for punch

        mainOsc.frequency.setValueAtTime(peakFreq, time);
        // Two-stage envelope: fast initial drop, then slower settle
        mainOsc.frequency.exponentialRampToValueAtTime(baseFreq * 1.2, time + 0.03);
        mainOsc.frequency.exponentialRampToValueAtTime(baseFreq, time + 0.12);

        // Soft saturation for warmth (like the 909's analog distortion)
        const shaper = this.context.createWaveShaper();
        shaper.curve = this.createSoftClipCurve();
        shaper.oversample = '2x';

        // Amplitude envelope: punchy attack, smooth decay
        const mainGain = this.context.createGain();
        const decayTime = 0.2 + (this.decay * 0.6); // 200-800ms range (like ds909)
        mainGain.gain.setValueAtTime(0, time);
        mainGain.gain.linearRampToValueAtTime(peak, time + 0.003); // 3ms attack
        mainGain.gain.setTargetAtTime(0, time + 0.01, decayTime * 0.15);

        mainOsc.connect(shaper);
        shaper.connect(mainGain);
        mainGain.connect(this.output);
        mainOsc.start(time);
        mainOsc.stop(time + decayTime + 0.5);

        // === CLICK: Pitched oscillator (not noise) ===
        // ds909 uses a separate drum synth for click - we use a high sine burst
        if (this.attack > 0.01) {
            const clickOsc = this.context.createOscillator();
            clickOsc.type = 'sine';

            // Click frequency: higher than body, with its own pitch sweep
            // ds909: clickFrequency = map(pitch, 0, 255, 30, 70) + extraFreq
            const clickBaseFreq = 80 * tuneMultiplier;
            const clickPeakFreq = clickBaseFreq * 3; // Start 3x higher

            clickOsc.frequency.setValueAtTime(clickPeakFreq, time);
            clickOsc.frequency.exponentialRampToValueAtTime(clickBaseFreq, time + 0.015);

            const clickGain = this.context.createGain();
            const clickDecay = 0.02 + (this.decay * 0.03); // 20-50ms
            clickGain.gain.setValueAtTime(peak * this.attack * 0.6, time);
            clickGain.gain.exponentialRampToValueAtTime(0.001, time + clickDecay);

            clickOsc.connect(clickGain);
            clickGain.connect(this.output);
            clickOsc.start(time);
            clickOsc.stop(time + clickDecay + 0.05);
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
                id: 'level',
                label: 'Level',
                range: { min: 0, max: 1, step: 0.01 },
                defaultValue: 1,
            },
            ...super.parameterDescriptors,
        ];
    }
}
