import audioBufferToWav from 'audiobuffer-to-wav';
import type { OfflineRenderCallback, RenderOptions } from './types.js';

export class OutputManager {
  private destination: AudioNode;

  constructor(
    private readonly context: AudioContext,
    destination?: AudioNode
  ) {
    this.destination = destination ?? context.destination;
  }

  setDestination(node: AudioNode): void {
    this.destination = node;
  }

  getDestination(): AudioNode {
    return this.destination;
  }

  renderOffline(
    duration: number,
    setupGraph: OfflineRenderCallback,
    options: Partial<Omit<RenderOptions, 'duration'>> = {}
  ): Promise<AudioBuffer> {
    const sampleRate = options.sampleRate ?? this.context.sampleRate ?? 44100;
    const channels = options.numberOfChannels ?? 2;
    const frameCount = Math.ceil(duration * sampleRate);
    const offlineContext = new OfflineAudioContext(channels, frameCount, sampleRate);

    return Promise.resolve(setupGraph(offlineContext)).then(() =>
      offlineContext.startRendering()
    );
  }

  audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
    return audioBufferToWav(buffer);
  }

  async audioBufferToBlob(buffer: AudioBuffer): Promise<Blob> {
    const wavArray = this.audioBufferToWav(buffer);
    return new Blob([wavArray], { type: 'audio/wav' });
  }
}
