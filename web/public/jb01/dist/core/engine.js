import { OutputManager } from './output.js';
export class SynthEngine {
    constructor(options = {}) {
        this.voices = new Map();
        this.started = false;
        this.context = options.context ?? new AudioContext();
        this.masterGain = this.context.createGain();
        this.masterGain.gain.value = options.masterVolume ?? 0.8;
        this.compressor = this.context.createDynamicsCompressor();
        this.analyser = this.context.createAnalyser();
        this.compressor.connect(this.analyser);
        this.analyser.connect(this.masterGain);
        this.masterGain.connect(this.context.destination);
        this.outputManager = new OutputManager(this.context, this.masterGain);
    }
    registerVoice(id, voice) {
        voice.connect(this.compressor);
        this.voices.set(id, voice);
    }
    getVoices() {
        return [...this.voices.keys()];
    }
    getVoiceParameterDescriptors() {
        const descriptors = {};
        for (const [id, voice] of this.voices.entries()) {
            descriptors[id] = voice.parameterDescriptors;
        }
        return descriptors;
    }
    async start() {
        if (this.context.state === 'suspended') {
            await this.context.resume();
        }
        this.started = true;
    }
    stop() {
        this.started = false;
    }
    isRunning() {
        return this.started;
    }
    trigger(voiceId, velocity = 1, time) {
        const voice = this.voices.get(voiceId);
        if (!voice) {
            throw new Error(`Unknown voice "${voiceId}"`);
        }
        const when = time ?? this.context.currentTime;
        voice.trigger(when, velocity);
    }
    setVoiceParameter(voiceId, parameterId, value) {
        const voice = this.voices.get(voiceId);
        if (!voice) {
            throw new Error(`Unknown voice "${voiceId}"`);
        }
        voice.setParameter(parameterId, value);
    }
    connectOutput(destination) {
        this.masterGain.disconnect();
        this.masterGain.connect(destination);
        this.outputManager.setDestination(destination);
    }
    audioBufferToWav(buffer) {
        return this.outputManager.audioBufferToWav(buffer);
    }
    audioBufferToBlob(buffer) {
        return this.outputManager.audioBufferToBlob(buffer);
    }
    async renderToBuffer(options) {
        return this.outputManager.renderOffline(options.duration, (offlineContext) => this.prepareOfflineRender(offlineContext, options), {
            sampleRate: options.sampleRate,
            numberOfChannels: options.numberOfChannels,
        });
    }
}
//# sourceMappingURL=engine.js.map