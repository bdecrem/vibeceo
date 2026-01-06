import type { OfflineRenderCallback, RenderOptions } from './types.js';
export declare class OutputManager {
    private readonly context;
    private destination;
    constructor(context: AudioContext, destination?: AudioNode);
    setDestination(node: AudioNode): void;
    getDestination(): AudioNode;
    renderOffline(duration: number, setupGraph: OfflineRenderCallback, options?: Partial<Omit<RenderOptions, 'duration'>>): Promise<AudioBuffer>;
    audioBufferToWav(buffer: AudioBuffer): ArrayBuffer;
    audioBufferToBlob(buffer: AudioBuffer): Promise<Blob>;
}
