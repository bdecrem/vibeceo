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
export abstract class Voice {
  protected readonly context: BaseAudioContext;
  protected readonly output: GainNode;
  private readonly voiceId: VoiceId;

  constructor(id: VoiceId, context: BaseAudioContext, options: VoiceOptions = {}) {
    this.voiceId = id;
    this.context = context;
    this.output = context.createGain();
    this.output.gain.value = options.outputGain ?? 1;
  }

  get id(): VoiceId {
    return this.voiceId;
  }

  connect(destination: AudioNode): void {
    this.output.connect(destination);
  }

  disconnect(): void {
    this.output.disconnect();
  }

  /**
   * Trigger the voice. `time` should be in AudioContext time coordinates.
   */
  abstract trigger(time: number, velocity: number): void;

  /**
   * Update any exposed parameter (tune, decay, etc.)
   */
  abstract setParameter(paramId: string, value: number): void;

  /**
   * Provide metadata so UIs/CLIs can expose available controls.
   */
  get parameterDescriptors(): VoiceParameterDescriptor[] {
    return [];
  }
}
