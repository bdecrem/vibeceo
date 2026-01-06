import audioBufferToWav from 'audiobuffer-to-wav';
export class OutputManager {
    constructor(context, destination) {
        this.context = context;
        this.destination = destination ?? context.destination;
    }
    setDestination(node) {
        this.destination = node;
    }
    getDestination() {
        return this.destination;
    }
    renderOffline(duration, setupGraph, options = {}) {
        const sampleRate = options.sampleRate ?? this.context.sampleRate ?? 44100;
        const channels = options.numberOfChannels ?? 2;
        const frameCount = Math.ceil(duration * sampleRate);
        const offlineContext = new OfflineAudioContext(channels, frameCount, sampleRate);
        return Promise.resolve(setupGraph(offlineContext)).then(() => offlineContext.startRendering());
    }
    audioBufferToWav(buffer) {
        return audioBufferToWav(buffer);
    }
    async audioBufferToBlob(buffer) {
        const wavArray = this.audioBufferToWav(buffer);
        return new Blob([wavArray], { type: 'audio/wav' });
    }
}
//# sourceMappingURL=output.js.map