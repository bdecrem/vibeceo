import { Voice } from '../../../core/voice.js';

// E2: Authentic 909 rimshot - three bridged T-network filters + noise click
// Based on network-909.de and ds909 reference
// Frequencies: ~220Hz, ~500Hz, ~1000Hz (metallic ratios)
export class Rimshot909 extends Voice {
    constructor(id, context) {
        super(id, context);
        this.level = 1;
        this.tone = 0.5; // Controls noise click amount
    }

    trigger(time, velocity) {
        const level = Math.max(0, Math.min(1, velocity * this.level));

        // Three resonant frequencies (bridged T-network simulation)
        const frequencies = [220, 500, 1000];
        const gains = [0.6, 1.0, 0.4]; // Relative mix levels
        const decays = [0.05, 0.04, 0.03]; // Higher frequencies decay faster

        const masterGain = this.context.createGain();
        masterGain.gain.value = level * 0.7;
        masterGain.connect(this.output);

        // Create three resonant "plinks" at different frequencies
        frequencies.forEach((freq, i) => {
            const osc = this.context.createOscillator();
            osc.type = 'sine';

            // Slight pitch drop on attack (characteristic of bridged-T)
            osc.frequency.setValueAtTime(freq * 1.2, time);
            osc.frequency.exponentialRampToValueAtTime(freq, time + 0.005);

            // Bandpass filter to emphasize resonance
            const filter = this.context.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = freq;
            filter.Q.value = 15; // High Q for metallic ring

            const gain = this.context.createGain();
            gain.gain.setValueAtTime(gains[i], time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + decays[i]);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(masterGain);

            osc.start(time);
            osc.stop(time + decays[i] + 0.01);
        });

        // Noise click (adds attack transient)
        if (this.tone > 0) {
            const bufferSize = this.context.sampleRate * 0.01; // 10ms
            const noiseBuffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
            const data = noiseBuffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }

            const noise = this.context.createBufferSource();
            noise.buffer = noiseBuffer;

            const noiseFilter = this.context.createBiquadFilter();
            noiseFilter.type = 'highpass';
            noiseFilter.frequency.value = 2000;

            const noiseGain = this.context.createGain();
            noiseGain.gain.setValueAtTime(this.tone * 0.3, time);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.008);

            noise.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(masterGain);

            noise.start(time);
            noise.stop(time + 0.01);
        }
    }

    setParameter(id, value) {
        if (id === 'level') {
            this.level = Math.max(0, Math.min(1, value));
        } else if (id === 'tone') {
            this.tone = Math.max(0, Math.min(1, value));
        } else {
            super.setParameter(id, value);
        }
    }

    get parameterDescriptors() {
        return [
            {
                id: 'level',
                label: 'Level',
                range: { min: 0, max: 1, step: 0.01 },
                defaultValue: 1,
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
}
