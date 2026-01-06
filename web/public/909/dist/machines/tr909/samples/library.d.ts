export type Tr909SampleId = 'closed-hat' | 'open-hat' | 'crash' | 'ride';
export interface SampleManifestEntry {
    id: Tr909SampleId;
    url: string | URL;
}
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
