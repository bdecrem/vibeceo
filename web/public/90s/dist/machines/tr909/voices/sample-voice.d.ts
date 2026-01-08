import { Voice, type VoiceOptions } from '../../../core/voice.js';
import type { VoiceId, VoiceParameterDescriptor } from '../../../core/types.js';
import type { SampleLibrary, Tr909SampleId } from '../samples/library.js';
export declare abstract class SampleVoice extends Voice {
    private readonly sampleLibrary;
    private readonly sampleId;
    protected tune: number;
    protected level: number;
    private readonly noise;
    private _useSample;
    constructor(id: VoiceId, context: BaseAudioContext, sampleLibrary: SampleLibrary, sampleId: Tr909SampleId, options?: VoiceOptions);
    get useSample(): boolean;
    setUseSample(value: boolean): void;
    trigger(time: number, velocity: number): void;
    protected abstract triggerSynthesis(source: AudioBufferSourceNode, time: number, velocity: number): void;
    setParameter(paramId: string, value: number): void;
    get parameterDescriptors(): VoiceParameterDescriptor[];
    private semitonesToPlaybackRate;
}
