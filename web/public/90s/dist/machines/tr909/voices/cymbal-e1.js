import { SampleVoice } from './sample-voice.js';

// E1: Original cymbal (simple bandpass-filtered noise)
export class Cymbal909E1 extends SampleVoice {
    constructor(id, context, library, type) {
        super(id, context, library, type === 'crash' ? 'crash' : 'ride');
        this.type = type;
        this.decay = type === 'crash' ? 1.5 : 2.5;
    }

    setParameter(id, value) {
        if (id === 'decay') {
            this.decay = Math.max(0.3, Math.min(4, value));
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
        ];
    }

    triggerSynthesis(source, time, velocity) {
        const bandPass = this.context.createBiquadFilter();
        bandPass.type = 'bandpass';
        bandPass.frequency.value = this.type === 'crash' ? 8000 : 5000;
        bandPass.Q.value = 0.6;

        const gain = this.context.createGain();
        const level = Math.max(0, Math.min(1, velocity * this.level));
        gain.gain.setValueAtTime(level, time);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + this.decay);

        source.connect(bandPass);
        bandPass.connect(gain);
        gain.connect(this.output);

        source.start(time);
        source.stop(time + this.decay + 0.2);
    }
}
