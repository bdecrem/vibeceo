import { Voice } from '../../../core/voice.js';
import type { VoiceId, VoiceParameterDescriptor } from '../../../core/types.js';
export declare class Clap909 extends Voice {
    private level;
    private spread;
    private readonly noiseBuffer;
    constructor(id: VoiceId, context: BaseAudioContext, noiseBuffer: AudioBuffer);
    trigger(time: number, velocity: number): void;
    setParameter(id: string, value: number): void;
    get parameterDescriptors(): VoiceParameterDescriptor[];
}
