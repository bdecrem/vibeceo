import { Voice } from '../../../core/voice.js';
import type { VoiceId, VoiceParameterDescriptor } from '../../../core/types.js';
export declare class Rimshot909 extends Voice {
    private tune;
    private level;
    constructor(id: VoiceId, context: BaseAudioContext);
    trigger(time: number, velocity: number): void;
    setParameter(id: string, value: number): void;
    get parameterDescriptors(): VoiceParameterDescriptor[];
}
