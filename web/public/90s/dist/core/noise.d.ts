export interface LFSRNoiseOptions {
    sampleRate?: number;
    seed?: number;
}
/**
  * Implements the 31-stage linear feedback shift register used in classic Roland drum machines.
  * Produces deterministic pseudo-noise suitable for snares, claps, and hi-hats.
  */
export declare class LFSRNoise {
    private readonly context;
    private register;
    private readonly sampleRate;
    constructor(context: BaseAudioContext, options?: LFSRNoiseOptions);
    reset(seed?: number): void;
    createBuffer(durationSeconds: number): AudioBuffer;
    /**
     * Returns an AudioBufferSourceNode that loops the generated noise.
     */
    createNode(durationSeconds?: number): AudioBufferSourceNode;
    /**
     * Generate an arbitrary length Float32Array of noise values.
     */
    generate(length: number): Float32Array;
    private nextValue;
}
