import type { VoiceParameterDescriptor, VoiceId } from '../../../core/types.js';
import type { SampleLibrary } from '../samples/library.js';
import { SampleVoice } from './sample-voice.js';
export type HiHatType = 'closed' | 'open';
export declare class HiHat909 extends SampleVoice {
    private readonly type;
    private decay;
    constructor(id: VoiceId, context: BaseAudioContext, library: SampleLibrary, type: HiHatType);
    setParameter(id: string, value: number): void;
    get parameterDescriptors(): VoiceParameterDescriptor[];
    protected triggerFallbackNoise(source: AudioBufferSourceNode, time: number, velocity: number): void;
}
