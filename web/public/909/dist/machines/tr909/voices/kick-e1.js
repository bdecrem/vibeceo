import { Voice } from '../../../core/voice.js';
// E1: Pure sine oscillator kick with soft-clip warmth (committed 2e8740db0)
export class Kick909E1 extends Voice {
    constructor(id, context) {
        super(id, context);
        this.tune = 0; // cents (±1200 = ±1 octave)
        this.decay = 0.8;
        this.attack = 0.5; // click intensity 0-1
        this.sweep = 1; // pitch envelope depth: 0 = flat, 1 = full sweep
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

        // === MAIN BODY: Triangle with pitch sweep + harmonics ===
        // Triangle wave through saturation creates rich harmonics like real 909
        const mainOsc = this.context.createOscillator();
        mainOsc.type = 'triangle'; // Triangle has odd harmonics, saturates nicely

        // Base frequency and pitch sweep
        const baseFreq = 55 * tuneMultiplier;
        // Always have SOME pitch sweep for punch (minimum 1.5x), sweep param adds more
        const sweepAmount = 1.5 + (this.sweep * 2.5); // 1.5x to 4x
        const peakFreq = baseFreq * sweepAmount;

        // Fast pitch sweep: 150Hz+ down to 55Hz in ~30ms
        mainOsc.frequency.setValueAtTime(peakFreq, time);
        mainOsc.frequency.exponentialRampToValueAtTime(baseFreq * 1.1, time + 0.025);
        mainOsc.frequency.exponentialRampToValueAtTime(baseFreq, time + 0.08);

        // Heavy saturation for harmonics (drive triangle into soft clip)
        const shaper = this.context.createWaveShaper();
        shaper.curve = this.createSoftClipCurve();
        shaper.oversample = '2x';

        // Pre-gain to drive into saturation
        const driveGain = this.context.createGain();
        driveGain.gain.value = 2.5; // Drive hard for harmonics

        // Amplitude envelope: HOLD-THEN-DECAY
        const mainGain = this.context.createGain();
        const holdTime = 0.025 + (this.decay * 0.12);
        const releaseTime = 0.06 + (this.decay * 0.5);
        const totalTime = holdTime + releaseTime + 0.1;

        mainGain.gain.setValueAtTime(0, time);
        mainGain.gain.linearRampToValueAtTime(peak * 0.8, time + 0.002);
        mainGain.gain.setValueAtTime(peak * 0.75, time + holdTime);
        mainGain.gain.exponentialRampToValueAtTime(0.001, time + holdTime + releaseTime);

        mainOsc.connect(driveGain);
        driveGain.connect(shaper);
        shaper.connect(mainGain);
        mainGain.connect(this.output);
        mainOsc.start(time);
        mainOsc.stop(time + totalTime);

        // === CLICK: Bright noise burst + high sine ===
        // Creates the snappy transient with high-frequency content
        if (this.attack > 0.01) {
            // Noise burst for brightness
            const noiseLength = 512; // ~12ms
            const noiseBuffer = this.context.createBuffer(1, noiseLength, this.context.sampleRate);
            const noiseData = noiseBuffer.getChannelData(0);
            for (let i = 0; i < noiseLength; i++) {
                noiseData[i] = (Math.random() * 2 - 1) * Math.exp(-i / 80);
            }
            const noiseSource = this.context.createBufferSource();
            noiseSource.buffer = noiseBuffer;

            // Highpass filter for brightness
            const noiseFilter = this.context.createBiquadFilter();
            noiseFilter.type = 'highpass';
            noiseFilter.frequency.value = 2000;
            noiseFilter.Q.value = 0.7;

            const noiseGain = this.context.createGain();
            noiseGain.gain.setValueAtTime(peak * this.attack * 0.4, time);

            noiseSource.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(this.output);
            noiseSource.start(time);

            // High pitched sine click
            const clickOsc = this.context.createOscillator();
            clickOsc.type = 'sine';
            const clickPeakFreq = 400 * tuneMultiplier;
            const clickBaseFreq = 100 * tuneMultiplier;

            clickOsc.frequency.setValueAtTime(clickPeakFreq, time);
            clickOsc.frequency.exponentialRampToValueAtTime(clickBaseFreq, time + 0.02);

            const clickGain = this.context.createGain();
            clickGain.gain.setValueAtTime(peak * this.attack * 0.5, time);
            clickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

            clickOsc.connect(clickGain);
            clickGain.connect(this.output);
            clickOsc.start(time);
            clickOsc.stop(time + 0.1);
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
