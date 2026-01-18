import { SampleVoice } from './sample-voice.js';

// E2: Authentic metallic cymbal synthesis
// Uses 6 square wave oscillators at inharmonic frequencies
// Crash: brighter, shorter attack; Ride: darker, longer sustain
const CYMBAL_FREQUENCIES = {
    crash: [
        245.0,   // Low fundamental
        367.5,   // Inharmonic
        489.0,   // Inharmonic
        612.5,   // Inharmonic
        857.5,   // Mid metallic
        1225.0   // High shimmer
    ],
    ride: [
        180.0,   // Lower fundamental for darker tone
        270.0,   // Inharmonic
        360.0,   // Inharmonic
        480.0,   // Inharmonic
        720.0,   // Mid metallic
        1080.0   // High shimmer
    ]
};

export class Cymbal909 extends SampleVoice {
    constructor(id, context, library, type) {
        super(id, context, library, type === 'crash' ? 'crash' : 'ride');
        this.type = type;
        this.decay = type === 'crash' ? 1.2 : 2.0;
        this.tone = 0.5;
    }

    setParameter(id, value) {
        if (id === 'decay') {
            this.decay = Math.max(0.3, Math.min(4, value));
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
            ...super.parameterDescriptors,
            {
                id: 'decay',
                label: 'Decay',
                range: { min: 0.3, max: 4, step: 0.05, unit: 's' },
                defaultValue: this.decay,
            },
            {
                id: 'tone',
                label: 'Tone',
                range: { min: 0, max: 1, step: 0.01 },
                defaultValue: 0.5,
            },
        ];
    }

    triggerSynthesis(source, time, velocity) {
        // E2: 6 square oscillator metallic synthesis
        const level = Math.max(0, Math.min(1, velocity * this.level));
        const tuneMultiplier = this.semitonesToPlaybackRate(this.tune);
        const frequencies = CYMBAL_FREQUENCIES[this.type];

        // Master output chain
        const masterGain = this.context.createGain();
        masterGain.gain.value = level * 0.4;

        // Bandpass for cymbal character
        const bandpass = this.context.createBiquadFilter();
        bandpass.type = 'bandpass';
        // Crash is brighter, ride is darker
        const baseFreq = this.type === 'crash' ? 6000 : 4000;
        bandpass.frequency.value = baseFreq + this.tone * 4000;
        bandpass.Q.value = 0.8;

        // Highpass to remove low rumble
        const highpass = this.context.createBiquadFilter();
        highpass.type = 'highpass';
        highpass.frequency.value = this.type === 'crash' ? 3000 : 2000;

        // Create 6 square wave oscillators
        const oscillatorGain = this.context.createGain();
        oscillatorGain.gain.value = 0.12;

        frequencies.forEach((freq, i) => {
            const osc = this.context.createOscillator();
            osc.type = 'square';
            osc.frequency.value = freq * tuneMultiplier;

            // Each oscillator gets envelope with different decay
            const oscEnv = this.context.createGain();
            // Lower frequencies sustain longer for body
            const oscDecay = this.decay * (1 - i * 0.08);
            oscEnv.gain.setValueAtTime(1, time);
            oscEnv.gain.exponentialRampToValueAtTime(0.001, time + oscDecay);

            osc.connect(oscEnv);
            oscEnv.connect(oscillatorGain);

            osc.start(time);
            osc.stop(time + this.decay + 0.2);
        });

        // Noise component for shimmer (more prominent in crash)
        const noiseGain = this.context.createGain();
        const noiseLevel = this.type === 'crash' ? 0.4 : 0.25;
        noiseGain.gain.setValueAtTime(noiseLevel, time);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, time + this.decay * 0.7);

        // IMPORTANT: Build the full audio graph BEFORE starting any sources
        // Otherwise noise plays unfiltered causing a low buzz on init
        source.connect(noiseGain);
        oscillatorGain.connect(bandpass);
        noiseGain.connect(bandpass);
        bandpass.connect(highpass);
        highpass.connect(masterGain);
        masterGain.connect(this.output);

        // Now start sources after graph is fully connected
        source.start(time);
        source.stop(time + this.decay + 0.2);
    }
}
