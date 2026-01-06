import { Voice } from '../../../core/voice.js';
export class Rimshot909 extends Voice {
    constructor(id, context) {
        super(id, context);
        this.tune = 0;
        this.level = 1;
    }
    trigger(time, velocity) {
        const osc = this.context.createOscillator();
        osc.type = 'square';
        const base = 400 * Math.pow(2, this.tune / 1200);
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
        if (id === 'tune') {
            this.tune = value;
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
                range: { min: -200, max: 200, step: 1, unit: 'cents' },
                defaultValue: 0,
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
//# sourceMappingURL=rimshot.js.map