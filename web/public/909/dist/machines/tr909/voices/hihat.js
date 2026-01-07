import { SampleVoice } from './sample-voice.js';

// E2: Authentic metallic hi-hat synthesis
// Uses 6 square wave oscillators at inharmonic frequencies (TR-808-style)
// Real 909 used 6-bit samples, but this provides better synthesis
const HIHAT_FREQUENCIES = [
    205.3,  // Fundamental
    304.4,  // Inharmonic
    369.6,  // Inharmonic
    522.7,  // Roughly 2.5x fundamental
    800.0,  // High metallic
    1204.4  // Highest component
];

export class HiHat909 extends SampleVoice {
    constructor(id, context, library, type) {
        super(id, context, library, type === 'closed' ? 'closed-hat' : 'open-hat');
        this.type = type;
        this.decay = type === 'closed' ? 0.08 : 0.4;
        this.tone = 0.5; // Controls highpass filter
    }

    setParameter(id, value) {
        if (id === 'decay') {
            this.decay = Math.max(0.02, Math.min(2, value));
            return;
        }
        if (id === 'tone') {
            this.tone = Math.max(0, Math.min(1, value));
            return;
        }
        super.setParameter(id, value);
    }

    get parameterDescriptors() {
        return [
            {
                id: 'decay',
                label: 'Decay',
                range: { min: 0.02, max: 2, step: 0.01, unit: 's' },
                defaultValue: this.type === 'closed' ? 0.08 : 0.4,
            },
            {
                id: 'tone',
                label: 'Tone',
                range: { min: 0, max: 1, step: 0.01 },
                defaultValue: 0.5,
            },
            ...super.parameterDescriptors,
        ];
    }

    triggerSynthesis(source, time, velocity) {
        // E2: 6 square oscillator metallic synthesis
        const level = Math.max(0, Math.min(1, velocity * this.level));
        const tuneMultiplier = this.semitonesToPlaybackRate(this.tune);

        // Master output chain
        const masterGain = this.context.createGain();
        masterGain.gain.value = level * 0.5;

        // Bandpass filter for metallic character
        const bandpass = this.context.createBiquadFilter();
        bandpass.type = 'bandpass';
        bandpass.frequency.value = 8000 + this.tone * 4000; // 8-12kHz
        bandpass.Q.value = 1.5;

        // Highpass to remove low rumble
        const highpass = this.context.createBiquadFilter();
        highpass.type = 'highpass';
        highpass.frequency.value = this.type === 'closed' ? 7000 : 5000;

        // Create 6 square wave oscillators at metallic frequencies
        const oscillatorGain = this.context.createGain();
        oscillatorGain.gain.value = 0.15; // Keep each osc quiet, sum is loud

        HIHAT_FREQUENCIES.forEach((freq, i) => {
            const osc = this.context.createOscillator();
            osc.type = 'square';
            osc.frequency.value = freq * tuneMultiplier;

            // Each oscillator gets its own envelope with slightly different decay
            const oscEnv = this.context.createGain();
            const oscDecay = this.decay * (1 - i * 0.05); // Higher freqs decay faster
            oscEnv.gain.setValueAtTime(1, time);
            oscEnv.gain.exponentialRampToValueAtTime(0.001, time + oscDecay);

            osc.connect(oscEnv);
            oscEnv.connect(oscillatorGain);

            osc.start(time);
            osc.stop(time + this.decay + 0.1);
        });

        // Add noise component for shimmer
        const noiseGain = this.context.createGain();
        noiseGain.gain.setValueAtTime(0.3, time);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, time + this.decay * 0.5);

        // Connect noise source (passed in from SampleVoice)
        source.connect(noiseGain);
        source.start(time);
        source.stop(time + this.decay + 0.1);

        // Mix oscillators and noise
        oscillatorGain.connect(bandpass);
        noiseGain.connect(bandpass);
        bandpass.connect(highpass);
        highpass.connect(masterGain);
        masterGain.connect(this.output);
    }
}
