import { Voice } from '../../../core/voice.js';
// E2: Research-based 909 clap with 4 bursts + reverb tail
// Sources: ds909 reference, network-909.de, KVR forum
export class Clap909 extends Voice {
    constructor(id, context, noiseBuffer) {
        super(id, context);
        this.level = 1;
        this.tone = 0.5;
        this.decay = 0.5;
        this.noiseBuffer = noiseBuffer;
    }
    trigger(time, velocity) {
        const peak = Math.max(0, Math.min(1, velocity * this.level));

        // Filter frequency based on tone (300-2000Hz range per ds909)
        const filterFreq = 300 + this.tone * 1700;

        // === BURST SECTION: 4 rapid noise bursts ===
        // Real 909: 4 VCA triggers ~10-12ms apart, varying levels
        // ds909: delays 0, 12, 24, 36ms; gains 0.8, 1.0, 0.7, 0.4
        const burstTimings = [0, 0.012, 0.024, 0.036];
        const burstGains = [0.8, 1.0, 0.7, 0.4];
        const burstDecays = [0.010, 0.010, 0.010, 0.040];

        for (let i = 0; i < 4; i++) {
            const burstSource = this.context.createBufferSource();
            burstSource.buffer = this.noiseBuffer;

            const bandPass = this.context.createBiquadFilter();
            bandPass.type = 'bandpass';
            bandPass.frequency.value = filterFreq;
            bandPass.Q.value = 2;

            const burstGain = this.context.createGain();
            const t = time + burstTimings[i];
            burstGain.gain.setValueAtTime(peak * burstGains[i], t);
            burstGain.gain.exponentialRampToValueAtTime(0.001, t + burstDecays[i]);

            burstSource.connect(bandPass);
            bandPass.connect(burstGain);
            burstGain.connect(this.output);
            burstSource.start(t);
            burstSource.stop(t + burstDecays[i] + 0.05);
        }

        // === REVERB TAIL: Longer decay noise (the "room" sound) ===
        // ds909: delay 44ms, decay 30-400ms based on decay param
        const tailSource = this.context.createBufferSource();
        tailSource.buffer = this.noiseBuffer;

        // Lower frequency filter for tail (warmer sound)
        const tailFilter = this.context.createBiquadFilter();
        tailFilter.type = 'bandpass';
        tailFilter.frequency.value = 750;
        tailFilter.Q.value = 3;

        const tailGain = this.context.createGain();
        const tailTime = time + 0.044;
        const tailDecay = 0.03 + this.decay * 0.37; // 30-400ms
        tailGain.gain.setValueAtTime(peak * 0.3, tailTime);
        tailGain.gain.exponentialRampToValueAtTime(0.001, tailTime + tailDecay);

        tailSource.connect(tailFilter);
        tailFilter.connect(tailGain);
        tailGain.connect(this.output);
        tailSource.start(tailTime);
        tailSource.stop(tailTime + tailDecay + 0.1);
    }
    setParameter(id, value) {
        switch (id) {
            case 'tone':
                this.tone = Math.max(0, Math.min(1, value));
                break;
            case 'decay':
                this.decay = Math.max(0, Math.min(1, value));
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
                id: 'decay',
                label: 'Decay',
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
//# sourceMappingURL=clap.js.map