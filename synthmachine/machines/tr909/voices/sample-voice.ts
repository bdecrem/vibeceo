import { Voice, type VoiceOptions } from '../../../core/voice.js';
import type {
  VoiceId,
  VoiceParameterDescriptor,
} from '../../../core/types.js';
import type { SampleLibrary, Tr909SampleId } from '../samples/library.js';
import { LFSRNoise } from '../../../core/noise.js';

export abstract class SampleVoice extends Voice {
  protected tune = 0;
  protected level = 1;
  private readonly noise = new LFSRNoise(this.context);

  constructor(
    id: VoiceId,
    context: BaseAudioContext,
    private readonly sampleLibrary: SampleLibrary,
    private readonly sampleId: Tr909SampleId,
    options: VoiceOptions = {}
  ) {
    super(id, context, options);
  }

  override trigger(time: number, velocity: number): void {
    const buffer = this.sampleLibrary.getBuffer(this.context, this.sampleId);
    if (buffer) {
      const source = this.context.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = this.semitonesToPlaybackRate(this.tune);

      const gain = this.context.createGain();
      gain.gain.value = Math.max(0, Math.min(1, velocity * this.level));

      source.connect(gain);
      gain.connect(this.output);
      source.start(time);
      source.stop(time + buffer.duration / source.playbackRate.value);
      return;
    }

    // fallback to noise so the UI still provides auditory feedback
    const fallbackBuffer = this.noise.createBuffer(0.5);
    const fallbackSource = this.context.createBufferSource();
    fallbackSource.buffer = fallbackBuffer;
    fallbackSource.loop = false;
    this.triggerFallbackNoise(fallbackSource, time, velocity);
  }

  protected abstract triggerFallbackNoise(
    source: AudioBufferSourceNode,
    time: number,
    velocity: number
  ): void;

  override setParameter(paramId: string, value: number): void {
    if (paramId === 'tune') {
      this.tune = value;
      return;
    }
    if (paramId === 'level') {
      this.level = value;
      return;
    }
  }

  override get parameterDescriptors(): VoiceParameterDescriptor[] {
    return [
      {
        id: 'tune',
        label: 'Tune',
        range: { min: -12, max: 12, step: 0.1, unit: 'semitones' },
        defaultValue: 0,
      },
      {
        id: 'level',
        label: 'Level',
        range: { min: 0, max: 1, step: 0.01 },
        defaultValue: 1,
      },
    ];
  }

  private semitonesToPlaybackRate(semitones: number): number {
    return Math.pow(2, semitones / 12);
  }
}
