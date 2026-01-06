import { Voice } from '../../../core/voice.js';
const BASE_FREQUENCIES = {
    low: 110,
    mid: 164,
    high: 220,
};
export class Tom909 extends Voice {
    constructor(id, context, type) {
        super(id, context);
        this.type = type;
        this.tune = 0;
        this.decay = 0.5;
        this.level = 1;
    }
    trigger(time, velocity) {
        const osc = this.context.createOscillator();
        osc.type = 'sine';
        const frequency = BASE_FREQUENCIES[this.type] * Math.pow(2, this.tune / 1200);
        osc.frequency.setValueAtTime(frequency * 1.4, time);
        osc.frequency.exponentialRampToValueAtTime(frequency, time + this.decay * 0.5);
        const gain = this.context.createGain();
        const level = Math.max(0, Math.min(1, velocity * this.level));
        gain.gain.setValueAtTime(level, time);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + this.decay);
        osc.connect(gain);
        gain.connect(this.output);
        osc.start(time);
        osc.stop(time + this.decay + 0.2);
    }
    setParameter(id, value) {
        if (id === 'tune') {
            this.tune = value;
        }
        else if (id === 'decay') {
            this.decay = Math.max(0.1, Math.min(2, value));
        }
        else if (id === 'level') {
            this.level = Math.max(0, Math.min(1, value));
        }
        else {
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
//# sourceMappingURL=tom.js.map