import type { Pattern } from '../core/types.js';
import { type Tr909RenderOptions } from '../machines/tr909/engine.js';
import type { SampleManifestEntry } from '../machines/tr909/samples/library.js';
export interface RenderResult {
    buffer: AudioBuffer;
    wav: ArrayBuffer;
}
export declare function renderTr909PatternToWav(pattern: Pattern, options?: Tr909RenderOptions): Promise<RenderResult>;
export declare class TR909Controller {
    private readonly engine;
    private readonly patternId;
    private currentPattern?;
    constructor(initialPattern?: Pattern);
    loadSamples(manifest?: SampleManifestEntry[]): Promise<void>;
    setPattern(pattern: Pattern): void;
    play(): void;
    stop(): void;
    setBpm(bpm: number): void;
    setSwing(amount: number): void;
    renderCurrentPattern(options?: Tr909RenderOptions): Promise<AudioBuffer>;
    exportCurrentPatternToWav(options?: Tr909RenderOptions): Promise<RenderResult>;
}
