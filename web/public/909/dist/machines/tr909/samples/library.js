export class SampleLibrary {
    constructor() {
        this.data = new Map();
        this.bufferCache = new WeakMap();
    }
    setFromBuffer(id, buffer) {
        const channels = [];
        for (let i = 0; i < buffer.numberOfChannels; i += 1) {
            const channelData = new Float32Array(buffer.length);
            buffer.copyFromChannel(channelData, i);
            channels.push(channelData);
        }
        this.data.set(id, { sampleRate: buffer.sampleRate, channels });
        this.bufferCache = new WeakMap();
    }
    setFromData(id, sampleData) {
        this.data.set(id, sampleData);
        this.bufferCache = new WeakMap();
    }
    async loadFromManifest(context, manifest) {
        if (typeof fetch === 'undefined') {
            console.warn('Sample loading skipped: fetch API unavailable in this runtime');
            return;
        }
        await Promise.all(manifest.map(async (entry) => {
            const response = await fetch(entry.url.toString());
            if (!response.ok) {
                throw new Error(`Failed to fetch sample ${entry.id}: ${response.statusText}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            const decoded = await context.decodeAudioData(arrayBuffer.slice(0));
            this.setFromBuffer(entry.id, decoded);
        }));
    }
    has(id) {
        return this.data.has(id);
    }
    size() {
        return this.data.size;
    }
    getBuffer(context, id) {
        const sampleData = this.data.get(id);
        if (!sampleData) {
            return undefined;
        }
        let contextCache = this.bufferCache.get(context);
        if (!contextCache) {
            contextCache = new Map();
            this.bufferCache.set(context, contextCache);
        }
        const cached = contextCache.get(id);
        if (cached) {
            return cached;
        }
        const buffer = context.createBuffer(sampleData.channels.length, sampleData.channels[0].length, sampleData.sampleRate);
        sampleData.channels.forEach((channel, index) => {
            const destination = buffer.getChannelData(index);
            destination.set(channel);
        });
        contextCache.set(id, buffer);
        return buffer;
    }
}
export function createDefaultTr909SampleLibrary() {
    const library = new SampleLibrary();
    library.setFromData('closed-hat', createHatSample('closed'));
    library.setFromData('open-hat', createHatSample('open'));
    library.setFromData('crash', createCymbalSample('crash'));
    library.setFromData('ride', createCymbalSample('ride'));
    return library;
}
function createHatSample(type, sampleRate = 44100) {
    const duration = type === 'closed' ? 0.3 : 0.9;
    const length = Math.floor(duration * sampleRate);
    const data = new Float32Array(length);
    const cutoff = type === 'closed' ? 8000 : 6000;
    let lastValue = Math.random() * 2 - 1;
    for (let i = 0; i < length; i += 1) {
        const noise = Math.random() * 2 - 1;
        const filtered = noise - lastValue + 0.99 * (lastValue - noise / 2); // crude HP
        lastValue = filtered;
        const envelope = Math.exp((-5 * i) / length);
        const tone = Math.sin((2 * Math.PI * cutoff * i) / sampleRate);
        data[i] = (filtered + tone * 0.2) * envelope * (type === 'open' ? 0.6 : 1);
    }
    return { sampleRate, channels: [data] };
}
function createCymbalSample(type, sampleRate = 44100) {
    const duration = type === 'crash' ? 1.6 : 2.8;
    const length = Math.floor(duration * sampleRate);
    const data = new Float32Array(length);
    const partials = type === 'crash' ? [410, 620, 830, 1200] : [320, 480, 650];
    for (let i = 0; i < length; i += 1) {
        let sample = 0;
        partials.forEach((freq, idx) => {
            const phase = (2 * Math.PI * freq * i) / sampleRate;
            sample += Math.sin(phase + idx * 0.2) * (1 / (idx + 1));
        });
        const envelope = Math.exp((-3 * i) / length);
        data[i] = sample * envelope * 0.7;
    }
    return { sampleRate, channels: [data] };
}
//# sourceMappingURL=library.js.map