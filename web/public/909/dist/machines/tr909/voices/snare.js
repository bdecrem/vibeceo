import { Voice } from '../../../core/voice.js';
// E2: Research-based 909 snare with dual oscillators and proper envelopes
// Sources: Sound on Sound "Practical Snare Drum Synthesis", ds909 reference
export class Snare909 extends Voice {
    constructor(id, context, noiseBuffer) {
        super(id, context);
        this.tone = 0.5;
        this.snappy = 0.5;
        this.tune = 0;
        this.level = 1;
        this.noiseBuffer = noiseBuffer;
    }
    trigger(time, velocity) {
        const peak = Math.max(0, Math.min(1, velocity * this.level));
        const tuneMultiplier = Math.pow(2, this.tune / 1200);
        const bodyMix = 1 - (this.snappy * 0.5);

        // === OSC 1: Low body (180Hz) ===
        const osc1 = this.context.createOscillator();
        osc1.type = 'sine';
        const osc1BaseFreq = 180 * tuneMultiplier;
        osc1.frequency.setValueAtTime(osc1BaseFreq * 1.5, time);
        osc1.frequency.exponentialRampToValueAtTime(osc1BaseFreq, time + 0.03);

        const osc1Gain = this.context.createGain();
        osc1Gain.gain.setValueAtTime(peak * bodyMix * 0.8, time);
        osc1Gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

        osc1.connect(osc1Gain);
        osc1Gain.connect(this.output);
        osc1.start(time);
        osc1.stop(time + 0.25);

        // === OSC 2: High body (330Hz) ===
        const osc2 = this.context.createOscillator();
        osc2.type = 'sine';
        const osc2BaseFreq = 330 * tuneMultiplier;
        osc2.frequency.setValueAtTime(osc2BaseFreq * 1.3, time);
        osc2.frequency.exponentialRampToValueAtTime(osc2BaseFreq, time + 0.02);

        const osc2Gain = this.context.createGain();
        osc2Gain.gain.setValueAtTime(peak * bodyMix * 0.5, time);
        osc2Gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

        osc2.connect(osc2Gain);
        osc2Gain.connect(this.output);
        osc2.start(time);
        osc2.stop(time + 0.18);

        // === NOISE: Snare wires ===
        const noiseSource = this.context.createBufferSource();
        noiseSource.buffer = this.noiseBuffer;

        const highPass = this.context.createBiquadFilter();
        highPass.type = 'highpass';
        highPass.frequency.value = 1500 + this.tone * 1500;

        const lowPass = this.context.createBiquadFilter();
        lowPass.type = 'lowpass';
        lowPass.frequency.value = 4000 + this.tone * 4000;

        const noiseGain = this.context.createGain();
        const snappyLevel = peak * (0.3 + this.snappy * 0.7);
        const noiseDecay = 0.15 + this.snappy * 0.1;
        noiseGain.gain.setValueAtTime(snappyLevel, time);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, time + noiseDecay);

        noiseSource.connect(highPass);
        highPass.connect(lowPass);
        lowPass.connect(noiseGain);
        noiseGain.connect(this.output);
        noiseSource.start(time);
        noiseSource.stop(time + noiseDecay + 0.1);
    }
    setParameter(id, value) {
        switch (id) {
            case 'tune':
                this.tune = value;
                break;
            case 'tone':
                this.tone = Math.max(0, Math.min(1, value));
                break;
            case 'snappy':
                this.snappy = Math.max(0, Math.min(1, value));
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
                id: 'tone',
                label: 'Tone',
                range: { min: 0, max: 1, step: 0.01 },
                defaultValue: 0.5,
            },
            {
                id: 'snappy',
                label: 'Snappy',
                range: { min: 0, max: 1, step: 0.01 },
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
//# sourceMappingURL=snare.js.map