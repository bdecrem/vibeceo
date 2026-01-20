/**
  * Implements the 31-stage linear feedback shift register used in classic Roland drum machines.
  * Produces deterministic pseudo-noise suitable for snares, claps, and hi-hats.
  */
export class LFSRNoise {
    constructor(context, options = {}) {
        this.context = context;
        this.sampleRate = options.sampleRate ?? context.sampleRate ?? 44100;
        this.register = options.seed ?? 0x7fffffff;
    }
    reset(seed) {
        this.register = seed ?? 0x7fffffff;
    }
    createBuffer(durationSeconds) {
        const frameCount = Math.ceil(durationSeconds * this.sampleRate);
        const buffer = this.context.createBuffer(1, frameCount, this.sampleRate);
        const channel = buffer.getChannelData(0);
        for (let i = 0; i < frameCount; i += 1) {
            channel[i] = this.nextValue();
        }
        return buffer;
    }
    /**
     * Returns an AudioBufferSourceNode that loops the generated noise.
     */
    createNode(durationSeconds = 1) {
        const node = this.context.createBufferSource();
        node.buffer = this.createBuffer(durationSeconds);
        node.loop = true;
        return node;
    }
    /**
     * Generate an arbitrary length Float32Array of noise values.
     */
    generate(length) {
        const values = new Float32Array(length);
        for (let i = 0; i < length; i += 1) {
            values[i] = this.nextValue();
        }
        return values;
    }
    nextValue() {
        // taps roughly matching TR-909 service manual references (bits 28 & 31)
        const bit = ((this.register >> 30) ^
            (this.register >> 27) ^
            (this.register >> 1) ^
            this.register) &
            1;
        this.register = ((this.register << 1) | bit) & 0x7fffffff;
        return (this.register / 0x7fffffff) * 2 - 1;
    }
}
//# sourceMappingURL=noise.js.map