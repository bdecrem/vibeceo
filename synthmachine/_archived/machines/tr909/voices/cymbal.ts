import type { VoiceParameterDescriptor, VoiceId } from '../../../core/types.js';
import type { SampleLibrary } from '../samples/library.js';
import { SampleVoice } from './sample-voice.js';

export type CymbalType = 'crash' | 'ride';

export class Cymbal909 extends SampleVoice {
  private decay: number;

  constructor(
    id: VoiceId,
    context: BaseAudioContext,
    library: SampleLibrary,
    private readonly type: CymbalType
  ) {
    super(id, context, library, type === 'crash' ? 'crash' : 'ride');
    this.decay = type === 'crash' ? 1.5 : 2.5;
  }

  override setParameter(id: string, value: number): void {
    if (id === 'decay') {
      this.decay = Math.max(0.3, Math.min(4, value));
      return;
    }
    super.setParameter(id, value);
  }

  override get parameterDescriptors(): VoiceParameterDescriptor[] {
    return [
      ...super.parameterDescriptors,
      {
        id: 'decay',
        label: 'Decay',
        range: { min: 0.3, max: 4, step: 0.05, unit: 's' },
        defaultValue: this.decay,
      },
    ];
  }

  protected triggerSynthesis(
    source: AudioBufferSourceNode,
    time: number,
    velocity: number
  ): void {
    const bandPass = this.context.createBiquadFilter();
    bandPass.type = 'bandpass';
    bandPass.frequency.value = this.type === 'crash' ? 8000 : 5000;
    bandPass.Q.value = 0.6;

    const gain = this.context.createGain();
    const level = Math.max(0, Math.min(1, velocity));
    gain.gain.setValueAtTime(level, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + this.decay);

    source.connect(bandPass);
    bandPass.connect(gain);
    gain.connect(this.output);
    source.start(time);
    source.stop(time + this.decay + 0.2);
  }
}
