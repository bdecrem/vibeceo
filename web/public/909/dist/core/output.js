/**
 * Output Manager with inline WAV encoder
 * (No npm dependencies - works directly in browser)
 */

// Inline WAV encoder (from audiobuffer-to-wav logic)
function audioBufferToWav(buffer) {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;

    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;

    // Interleave channels
    const length = buffer.length;
    const interleavedLength = length * numChannels;
    const interleaved = new Float32Array(interleavedLength);

    for (let i = 0; i < length; i++) {
        for (let ch = 0; ch < numChannels; ch++) {
            interleaved[i * numChannels + ch] = buffer.getChannelData(ch)[i];
        }
    }

    // Create WAV buffer
    const dataLength = interleavedLength * bytesPerSample;
    const wavBuffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(wavBuffer);

    // RIFF header
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeString(view, 8, 'WAVE');

    // fmt chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // chunk size
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true); // byte rate
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);

    // data chunk
    writeString(view, 36, 'data');
    view.setUint32(40, dataLength, true);

    // Write samples
    let offset = 44;
    for (let i = 0; i < interleavedLength; i++) {
        const sample = Math.max(-1, Math.min(1, interleaved[i]));
        const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        view.setInt16(offset, int16, true);
        offset += 2;
    }

    return wavBuffer;
}

function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

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

export default OutputManager;
