import { Voice } from '../../../core/voice.js';
import type { VoiceId, VoiceParameterDescriptor } from '../../../core/types.js';
export declare class Kick909 extends Voice {
    private tune;
    private decay;
    private attack;
    private sweep;
    private level;
    constructor(id: VoiceId, context: BaseAudioContext);
    private createSoftClipCurve;
    trigger(time: number, velocity: number): void;
    setParameter(id: string, value: number): void;
    get parameterDescriptors(): VoiceParameterDescriptor[];
}
