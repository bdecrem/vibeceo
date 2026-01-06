import { Voice } from '../../../core/voice.js';
import type { VoiceId, VoiceParameterDescriptor } from '../../../core/types.js';
export type TomType = 'low' | 'mid' | 'high';
export declare class Tom909 extends Voice {
    private readonly type;
    private tune;
    private decay;
    private level;
    constructor(id: VoiceId, context: BaseAudioContext, type: TomType);
    trigger(time: number, velocity: number): void;
    setParameter(id: string, value: number): void;
    get parameterDescriptors(): VoiceParameterDescriptor[];
}
