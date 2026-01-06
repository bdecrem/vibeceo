import type { VoiceId, VoiceParameterDescriptor } from './types.js';
export interface VoiceOptions {
    /**
     * Initial gain applied to the voice output (0-1 range)
     */
    outputGain?: number;
}
/**
 * Base class for every synth voice (drum, oscillator, etc.)
 * Owns a gain node so derived classes can focus on sound generation.
 */
export declare abstract class Voice {
    protected readonly context: BaseAudioContext;
    protected readonly output: GainNode;
    private readonly voiceId;
    protected accentAmount: number;
    constructor(id: VoiceId, context: BaseAudioContext, options?: VoiceOptions);
    getAccentAmount(): number;
    setAccentAmount(amount: number): void;
    get id(): VoiceId;
    connect(destination: AudioNode): void;
    disconnect(): void;
    /**
     * Trigger the voice. `time` should be in AudioContext time coordinates.
     */
    abstract trigger(time: number, velocity: number): void;
    /**
     * Update any exposed parameter (tune, decay, etc.)
     * Base class handles 'accent' parameter.
     */
    setParameter(paramId: string, value: number): void;
    /**
     * Provide metadata so UIs/CLIs can expose available controls.
     * Includes base accent parameter.
     */
    get parameterDescriptors(): VoiceParameterDescriptor[];
}
