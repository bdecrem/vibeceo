import { OutputManager } from './output.js';
import type { RenderOptions, SynthEngineOptions, VoiceId, VoiceParameterDescriptor } from './types.js';
import { Voice } from './voice.js';
export declare abstract class SynthEngine {
    protected readonly context: AudioContext;
    protected readonly masterGain: GainNode;
    protected readonly analyser: AnalyserNode;
    protected readonly compressor: DynamicsCompressorNode;
    protected readonly voices: Map<string, Voice>;
    protected readonly outputManager: OutputManager;
    private started;
    constructor(options?: SynthEngineOptions);
    protected abstract setupVoices(): void;
    protected registerVoice(id: VoiceId, voice: Voice): void;
    getVoices(): VoiceId[];
    getVoiceParameterDescriptors(): Record<VoiceId, VoiceParameterDescriptor[]>;
    start(): Promise<void>;
    stop(): void;
    isRunning(): boolean;
    trigger(voiceId: VoiceId, velocity?: number, time?: number): void;
    setVoiceParameter(voiceId: VoiceId, parameterId: string, value: number): void;
    connectOutput(destination: AudioNode): void;
    audioBufferToWav(buffer: AudioBuffer): ArrayBuffer;
    audioBufferToBlob(buffer: AudioBuffer): Promise<Blob>;
    renderToBuffer(options: RenderOptions): Promise<AudioBuffer>;
    protected abstract prepareOfflineRender(context: OfflineAudioContext, options: RenderOptions): void | Promise<void>;
}
