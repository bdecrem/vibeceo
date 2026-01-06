import { OutputManager } from './output.js';
import type {
  RenderOptions,
  SynthEngineOptions,
  VoiceId,
  VoiceParameterDescriptor,
} from './types.js';
import { Voice } from './voice.js';

export abstract class SynthEngine {
  protected readonly context: AudioContext;
  protected readonly masterGain: GainNode;
  protected readonly analyser: AnalyserNode;
  protected readonly compressor: DynamicsCompressorNode;
  protected readonly voices = new Map<VoiceId, Voice>();
  protected readonly outputManager: OutputManager;
  private started = false;

  constructor(options: SynthEngineOptions = {}) {
    this.context = options.context ?? new AudioContext();
    this.masterGain = this.context.createGain();
    this.masterGain.gain.value = options.masterVolume ?? 0.8;

    this.compressor = this.context.createDynamicsCompressor();
    this.analyser = this.context.createAnalyser();

    this.compressor.connect(this.analyser);
    this.analyser.connect(this.masterGain);
    this.masterGain.connect(this.context.destination);

    this.outputManager = new OutputManager(this.context, this.masterGain);
  }

  protected abstract setupVoices(): void;

  protected registerVoice(id: VoiceId, voice: Voice): void {
    voice.connect(this.compressor);
    this.voices.set(id, voice);
  }

  getVoices(): VoiceId[] {
    return [...this.voices.keys()];
  }

  getVoiceParameterDescriptors(): Record<VoiceId, VoiceParameterDescriptor[]> {
    const descriptors: Record<VoiceId, VoiceParameterDescriptor[]> = {};
    for (const [id, voice] of this.voices.entries()) {
      descriptors[id] = voice.parameterDescriptors;
    }
    return descriptors;
  }

  async start(): Promise<void> {
    if (this.context.state === 'suspended') {
      await this.context.resume();
    }
    this.started = true;
  }

  stop(): void {
    this.started = false;
  }

  isRunning(): boolean {
    return this.started;
  }

  trigger(voiceId: VoiceId, velocity = 1, time?: number): void {
    const voice = this.voices.get(voiceId);
    if (!voice) {
      throw new Error(`Unknown voice "${voiceId}"`);
    }
    const when = time ?? this.context.currentTime;
    voice.trigger(when, velocity);
  }

  setVoiceParameter(voiceId: VoiceId, parameterId: string, value: number): void {
    const voice = this.voices.get(voiceId);
    if (!voice) {
      throw new Error(`Unknown voice "${voiceId}"`);
    }
    voice.setParameter(parameterId, value);
  }

  connectOutput(destination: AudioNode): void {
    this.masterGain.disconnect();
    this.masterGain.connect(destination);
    this.outputManager.setDestination(destination);
  }

  audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
    return this.outputManager.audioBufferToWav(buffer);
  }

  audioBufferToBlob(buffer: AudioBuffer): Promise<Blob> {
    return this.outputManager.audioBufferToBlob(buffer);
  }

  async renderToBuffer(options: RenderOptions): Promise<AudioBuffer> {
    return this.outputManager.renderOffline(
      options.duration,
      (offlineContext) => this.prepareOfflineRender(offlineContext, options),
      {
        sampleRate: options.sampleRate,
        numberOfChannels: options.numberOfChannels,
      }
    );
  }

  protected abstract prepareOfflineRender(
    context: OfflineAudioContext,
    options: RenderOptions
  ): void | Promise<void>;
}
