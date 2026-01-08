import { Voice } from '../../../core/voice.js';

// E1: Original rimshot (single square oscillator + bandpass)
export class Rimshot909E1 extends Voice {
    constructor(id, context) {
        super(id, context);
        this.level = 1;
    }

    trigger(time, velocity) {
        const osc = this.context.createOscillator();
        osc.type = 'square';
        const base = 400;
        osc.frequency.setValueAtTime(base, time);

        const gain = this.context.createGain();
        const level = Math.max(0, Math.min(1, velocity * this.level));
        gain.gain.setValueAtTime(level, time);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.1);

        const filter = this.context.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = base;
        filter.Q.value = 4;

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.output);

        osc.start(time);
        osc.stop(time + 0.15);
    }

    setParameter(id, value) {
        if (id === 'level') {
            this.level = Math.max(0, Math.min(1, value));
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
            ...super.parameterDescriptors,
        ];
    }
}
