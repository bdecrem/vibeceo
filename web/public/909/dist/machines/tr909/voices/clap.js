import { Voice } from '../../../core/voice.js';
export class Clap909 extends Voice {
    constructor(id, context, noiseBuffer) {
        super(id, context);
        this.level = 1;
        this.spread = 0.015;
        this.noiseBuffer = noiseBuffer;
    }
    trigger(time, velocity) {
        const noiseSource = this.context.createBufferSource();
        noiseSource.buffer = this.noiseBuffer;
        const bandPass = this.context.createBiquadFilter();
        bandPass.type = 'bandpass';
        bandPass.frequency.value = 1000;
        bandPass.Q.value = 0.8;
        const gain = this.context.createGain();
        const level = Math.max(0, Math.min(1, velocity * this.level));
        const bursts = 4;
        const step = this.spread;
        for (let i = 0; i < bursts; i += 1) {
            const t = time + i * step;
            gain.gain.setValueAtTime(level, t);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
        }
        noiseSource.connect(bandPass);
        bandPass.connect(gain);
        gain.connect(this.output);
        noiseSource.start(time);
        noiseSource.stop(time + bursts * step + 0.2);
    }
    setParameter(id, value) {
        if (id === 'level') {
            this.level = Math.max(0, Math.min(1, value));
        }
        else if (id === 'spread') {
            this.spread = Math.max(0.005, Math.min(0.04, value));
        }
        else {
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
                id: 'spread',
                label: 'Spread',
                range: { min: 0.005, max: 0.04, step: 0.001, unit: 's' },
                defaultValue: 0.015,
            },
            ...super.parameterDescriptors,
        ];
    }
}
//# sourceMappingURL=clap.js.map