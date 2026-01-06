import { Voice } from '../../../core/voice.js';
import { LFSRNoise } from '../../../core/noise.js';
export class SampleVoice extends Voice {
    constructor(id, context, sampleLibrary, sampleId, options = {}) {
        super(id, context, options);
        this.sampleLibrary = sampleLibrary;
        this.sampleId = sampleId;
        this.tune = 0;
        this.level = 1;
        this.noise = new LFSRNoise(this.context);
        this._useSample = false; // Default to synthesized
    }
    get useSample() {
        return this._useSample;
    }
    setUseSample(value) {
        this._useSample = value;
    }
    trigger(time, velocity) {
        // Use sample if enabled AND sample is loaded
        if (this._useSample) {
            const buffer = this.sampleLibrary.getBuffer(this.context, this.sampleId);
            if (buffer) {
                const source = this.context.createBufferSource();
                source.buffer = buffer;
                source.playbackRate.value = this.semitonesToPlaybackRate(this.tune);
                const gain = this.context.createGain();
                gain.gain.value = Math.max(0, Math.min(1, velocity * this.level));
                source.connect(gain);
                gain.connect(this.output);
                source.start(time);
                source.stop(time + buffer.duration / source.playbackRate.value);
                return;
            }
        }
        // Use synthesis (default behavior)
        const fallbackBuffer = this.noise.createBuffer(0.5);
        const fallbackSource = this.context.createBufferSource();
        fallbackSource.buffer = fallbackBuffer;
        fallbackSource.loop = false;
        this.triggerSynthesis(fallbackSource, time, velocity);
    }
    setParameter(paramId, value) {
        if (paramId === 'tune') {
            this.tune = value;
            return;
        }
        if (paramId === 'level') {
            this.level = value;
            return;
        }
        super.setParameter(paramId, value);
    }
    get parameterDescriptors() {
        return [
            {
                id: 'tune',
                label: 'Tune',
                range: { min: -12, max: 12, step: 0.1, unit: 'semitones' },
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
    semitonesToPlaybackRate(semitones) {
        return Math.pow(2, semitones / 12);
    }
}
//# sourceMappingURL=sample-voice.js.map