export type Tr909SampleId = 'closed-hat' | 'open-hat' | 'crash' | 'ride';
export interface SampleManifestEntry {
    id: Tr909SampleId;
    url: string | URL;
}
/**
 * Default manifest for loading real 909 samples.
 * These are authentic samples from a real TR-909 (Rob Roy Recordings, 1995).
 * Samples are hosted at /909/samples/ on kochi.to
 */
export declare const DEFAULT_909_SAMPLE_MANIFEST: SampleManifestEntry[];
interface SampleData {
    sampleRate: number;
    channels: Float32Array[];
}
export declare class SampleLibrary {
    private readonly data;
    private bufferCache;
    setFromBuffer(id: Tr909SampleId, buffer: AudioBuffer): void;
    setFromData(id: Tr909SampleId, sampleData: SampleData): void;
    loadFromManifest(context: BaseAudioContext, manifest: SampleManifestEntry[]): Promise<void>;
    has(id: Tr909SampleId): boolean;
    size(): number;
    getBuffer(context: BaseAudioContext, id: Tr909SampleId): AudioBuffer | undefined;
}
export declare function createDefaultTr909SampleLibrary(): SampleLibrary;
export {};
