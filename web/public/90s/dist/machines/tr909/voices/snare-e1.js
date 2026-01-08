import { Voice } from '../../../core/voice.js';
// E1: Original snare (single triangle oscillator)
export class Snare909E1 extends Voice {
    constructor(id, context, noiseBuffer) {
        super(id, context);
        this.tone = 0.5;
        this.snappy = 0.5;
        this.level = 1;
        this.noiseBuffer = noiseBuffer;
    }
    trigger(time, velocity) {
        const bodyOsc = this.context.createOscillator();
        bodyOsc.type = 'triangle';
        bodyOsc.frequency.setValueAtTime(180, time);
        bodyOsc.frequency.linearRampToValueAtTime(330, time + 0.02);
        const bodyGain = this.context.createGain();
        const bodyLevel = Math.max(0, Math.min(1, velocity * this.level * (1 - this.snappy)));
        bodyGain.gain.setValueAtTime(bodyLevel, time);
        bodyGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.3);
        bodyOsc.connect(bodyGain);
        bodyGain.connect(this.output);
        bodyOsc.start(time);
        bodyOsc.stop(time + 0.4);
        const noiseSource = this.context.createBufferSource();
        noiseSource.buffer = this.noiseBuffer;
        const highPass = this.context.createBiquadFilter();
        highPass.type = 'highpass';
        highPass.frequency.value = 1200 + this.tone * 4000;
        const noiseGain = this.context.createGain();
        const snappyLevel = Math.max(0, Math.min(1, velocity * this.level * this.snappy));
        noiseGain.gain.setValueAtTime(snappyLevel, time);
        noiseGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.2);
        noiseSource.connect(highPass);
        highPass.connect(noiseGain);
        noiseGain.connect(this.output);
        noiseSource.start(time);
        noiseSource.stop(time + 0.3);
    }
    setParameter(id, value) {
        switch (id) {
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
