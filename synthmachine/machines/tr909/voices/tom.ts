import { Voice } from '../../../core/voice.js';
import type {
  VoiceId,
  VoiceParameterDescriptor,
} from '../../../core/types.js';

export type TomType = 'low' | 'mid' | 'high';

const BASE_FREQUENCIES: Record<TomType, number> = {
  low: 110,
  mid: 164,
  high: 220,
};

export class Tom909 extends Voice {
  private tune = 0;
  private decay = 0.5;
  private level = 1;

  constructor(
    id: VoiceId,
    context: BaseAudioContext,
    private readonly type: TomType
  ) {
    super(id, context);
  }

  override trigger(time: number, velocity: number): void {
    const osc = this.context.createOscillator();
    osc.type = 'sine';
    const frequency =
      BASE_FREQUENCIES[this.type] * Math.pow(2, this.tune / 1200);
    osc.frequency.setValueAtTime(frequency * 1.4, time);
    osc.frequency.exponentialRampToValueAtTime(
      frequency,
      time + this.decay * 0.5
    );

    const gain = this.context.createGain();
    const level = Math.max(0, Math.min(1, velocity * this.level));
    gain.gain.setValueAtTime(level, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + this.decay);

    osc.connect(gain);
    gain.connect(this.output);
    osc.start(time);
    osc.stop(time + this.decay + 0.2);
  }

  override setParameter(id: string, value: number): void {
    if (id === 'tune') {
      this.tune = value;
    } else if (id === 'decay') {
      this.decay = Math.max(0.1, Math.min(2, value));
    } else if (id === 'level') {
      this.level = Math.max(0, Math.min(1, value));
    } else {
      super.setParameter(id, value);
    }
  }

  override get parameterDescriptors(): VoiceParameterDescriptor[] {
    return [
      {
        id: 'tune',
        label: 'Tune',
        range: { min: -120, max: 120, step: 1, unit: 'cents' },
        defaultValue: 0,
      },
      {
        id: 'decay',
        label: 'Decay',
        range: { min: 0.1, max: 2, step: 0.01, unit: 's' },
        defaultValue: 0.5,
      },
      {
        id: 'level',
        label: 'Level',
        range: { min: 0, max: 1, step: 0.01 },
        defaultValue: 1,
      },
      ...super.parameterDescriptors,
    ];
  }
}
