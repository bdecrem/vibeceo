import type { VoiceParameterDescriptor, VoiceId } from '../../../core/types.js';
import type { SampleLibrary } from '../samples/library.js';
import { SampleVoice } from './sample-voice.js';

export type HiHatType = 'closed' | 'open';

export class HiHat909 extends SampleVoice {
  private decay: number;

  constructor(
    id: VoiceId,
    context: BaseAudioContext,
    library: SampleLibrary,
    private readonly type: HiHatType
  ) {
    super(
      id,
      context,
      library,
      type === 'closed' ? 'closed-hat' : 'open-hat'
    );
    this.decay = type === 'closed' ? 0.2 : 0.6;
  }

  override setParameter(id: string, value: number): void {
    if (id === 'decay') {
      this.decay = Math.max(0.05, Math.min(2, value));
      return;
    }
    super.setParameter(id, value);
  }

  override get parameterDescriptors(): VoiceParameterDescriptor[] {
    return [
      {
        id: 'decay',
        label: 'Decay',
        range: { min: 0.05, max: 2, step: 0.01, unit: 's' },
        defaultValue: this.type === 'closed' ? 0.2 : 0.6,
      },
      ...super.parameterDescriptors,
    ];
  }

  protected triggerSynthesis(
    source: AudioBufferSourceNode,
    time: number,
    velocity: number
  ): void {
    const highPass = this.context.createBiquadFilter();
    highPass.type = 'highpass';
    highPass.frequency.value = this.type === 'closed' ? 7000 : 5000;

    const gain = this.context.createGain();
    const level = Math.max(0, Math.min(1, velocity));
    gain.gain.setValueAtTime(level, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + this.decay);

    source.connect(highPass);
    highPass.connect(gain);
    gain.connect(this.output);
    source.start(time);
    source.stop(time + this.decay + 0.1);
  }
}
