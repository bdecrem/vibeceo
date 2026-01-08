import { Voice } from '../../../core/voice.js';

// E2: Authentic 909 tom - multiple oscillators at frequency ratios
// Based on research: 9 triangle oscillators, saturated to hexagonal then filtered to sine
// Frequency ratios: 1:1.5:2.77 (three oscillators per tom)
// Pitch envelope sweeps from high to low

const BASE_FREQUENCIES = {
    low: 100,   // ~100Hz for low tom
    mid: 150,   // ~150Hz for mid tom
    high: 200,  // ~200Hz for high tom
};

// Frequency ratios for the three oscillators (from circuit analysis)
const FREQ_RATIOS = [1, 1.5, 2.77];
const OSC_GAINS = [1.0, 0.5, 0.25]; // Fundamental loudest, harmonics quieter

export class Tom909 extends Voice {
    constructor(id, context, type) {
        super(id, context);
        this.type = type;
        this.tune = 0;
        this.decay = 0.5;
        this.level = 1;
    }

    trigger(time, velocity) {
        const level = Math.max(0, Math.min(1, velocity * this.level));
        const baseFreq = BASE_FREQUENCIES[this.type] * Math.pow(2, this.tune / 1200);

        // Pitch envelope parameters (60% pitch mod like ds909)
        const pitchMod = 0.6;
        const pitchEnvTime = 0.05; // 50ms pitch sweep

        const masterGain = this.context.createGain();
        masterGain.gain.value = level * 0.7;
        masterGain.connect(this.output);

        // Create three oscillators at frequency ratios
        FREQ_RATIOS.forEach((ratio, i) => {
            const osc = this.context.createOscillator();
            osc.type = 'sine';

            const targetFreq = baseFreq * ratio;
            const startFreq = targetFreq * (1 + pitchMod);

            // Pitch envelope: start high, sweep down
            osc.frequency.setValueAtTime(startFreq, time);
            osc.frequency.exponentialRampToValueAtTime(targetFreq, time + pitchEnvTime);

            // Slight waveshaping for warmth (simulate triangle->saturated->sine)
            const waveshaper = this.context.createWaveShaper();
            waveshaper.curve = this.createSoftClipCurve();
            waveshaper.oversample = '2x';

            // Individual gain for this oscillator
            const oscGain = this.context.createGain();
            oscGain.gain.setValueAtTime(OSC_GAINS[i], time);
            // Decay envelope - higher harmonics decay faster
            const decayTime = this.decay * (1 - i * 0.15);
            oscGain.gain.exponentialRampToValueAtTime(0.001, time + decayTime);

            osc.connect(waveshaper);
            waveshaper.connect(oscGain);
            oscGain.connect(masterGain);

            osc.start(time);
            osc.stop(time + this.decay + 0.2);
        });

        // Add subtle click transient
        const clickOsc = this.context.createOscillator();
        clickOsc.type = 'sine';
        clickOsc.frequency.value = baseFreq * 4;

        const clickGain = this.context.createGain();
        clickGain.gain.setValueAtTime(0.15, time);
        clickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.01);

        clickOsc.connect(clickGain);
        clickGain.connect(masterGain);
        clickOsc.start(time);
        clickOsc.stop(time + 0.02);
    }

    createSoftClipCurve() {
        const samples = 256;
        const curve = new Float32Array(samples);
        for (let i = 0; i < samples; i++) {
            const x = (i * 2) / samples - 1;
            // Soft saturation curve
            curve[i] = Math.tanh(x * 1.5);
        }
        return curve;
    }

    setParameter(id, value) {
        if (id === 'tune') {
            this.tune = value;
        } else if (id === 'decay') {
            this.decay = Math.max(0.1, Math.min(2, value));
        } else if (id === 'level') {
            this.level = Math.max(0, Math.min(1, value));
        } else {
            super.setParameter(id, value);
        }
    }

    get parameterDescriptors() {
        return [
            {
                id: 'tune',
                label: 'Tune',
                range: { min: -120, max: 120, step: 1, unit: 'cents' },
                defaultValue: 0,
            },
            {
                id: 'decay',
                label: 'Decay',
                range: { min: 0.1, max: 2, step: 0.01, unit: 's' },
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
