import type { Pattern } from '../core/types.js';
import {
  TR909Engine,
  type Tr909RenderOptions,
} from '../machines/tr909/engine.js';
import type { SampleManifestEntry } from '../machines/tr909/samples/library.js';

export interface RenderResult {
  buffer: AudioBuffer;
  wav: ArrayBuffer;
}

export async function renderTr909PatternToWav(
  pattern: Pattern,
  options: Tr909RenderOptions = {}
): Promise<RenderResult> {
  const engine = new TR909Engine();
  const buffer = await engine.renderPattern(pattern, options);
  const wav = engine.audioBufferToWav(buffer);
  return { buffer, wav };
}

export class TR909Controller {
  private readonly engine = new TR909Engine();
  private readonly patternId = 'controller-pattern';
  private currentPattern?: Pattern;

  constructor(initialPattern?: Pattern) {
    if (initialPattern) {
      this.setPattern(initialPattern);
    }
  }

  async loadSamples(manifest?: SampleManifestEntry[]): Promise<void> {
    await this.engine.loadSamples(manifest);
  }

  setPattern(pattern: Pattern): void {
    this.currentPattern = pattern;
    this.engine.setPattern(this.patternId, pattern);
  }

  play(): void {
    this.engine.startSequencer();
  }

  stop(): void {
    this.engine.stopSequencer();
  }

  setBpm(bpm: number): void {
    this.engine.setBpm(bpm);
  }

  setSwing(amount: number): void {
    this.engine.setSwing(amount);
  }

  async renderCurrentPattern(
    options: Tr909RenderOptions = {}
  ): Promise<AudioBuffer> {
    if (!this.currentPattern) {
      throw new Error('No pattern has been set for rendering');
    }
    return this.engine.renderPattern(this.currentPattern, options);
  }

  async exportCurrentPatternToWav(
    options: Tr909RenderOptions = {}
  ): Promise<RenderResult> {
    const buffer = await this.renderCurrentPattern(options);
    return {
      buffer,
      wav: this.engine.audioBufferToWav(buffer),
    };
  }
}
