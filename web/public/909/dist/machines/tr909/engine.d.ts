import { SynthEngine } from '../../core/engine.js';
import type { Pattern, SynthEngineOptions } from '../../core/types.js';
import { type SampleManifestEntry } from './samples/library.js';
export type TR909VoiceId = 'kick' | 'snare' | 'clap' | 'rimshot' | 'ltom' | 'mtom' | 'htom' | 'ch' | 'oh' | 'crash' | 'ride';
export interface Tr909RenderOptions {
    bars?: number;
    bpm?: number;
    swing?: number;
    sampleRate?: number;
    numberOfChannels?: number;
}
export type StepChangeCallback = (step: number) => void;
export declare class TR909Engine extends SynthEngine {
    private readonly sequencer;
    private readonly sampleLibrary;
    private currentBpm;
    private swingAmount;
    private flamAmount;
    private static readonly STEPS_PER_BAR;
    private activeOpenHat;
    onStepChange?: StepChangeCallback;
    constructor(options?: SynthEngineOptions);
    private chokeOpenHat;
    registerOpenHat(source: AudioBufferSourceNode, gain: GainNode): void;
    clearOpenHat(): void;
    protected setupVoices(): void;
    loadSamples(manifest?: SampleManifestEntry[]): Promise<void>;
    setPattern(id: string, pattern: Pattern): void;
    startSequencer(): void;
    stopSequencer(): void;
    setBpm(bpm: number): void;
    setSwing(amount: number): void;
    getSwing(): number;
    setFlam(amount: number): void;
    getFlam(): number;
    getCurrentStep(): number;
    isPlaying(): boolean;
    renderPattern(pattern: Pattern, options?: Tr909RenderOptions): Promise<AudioBuffer>;
    private createVoiceMap;
    private schedulePatternInContext;
    private collectEventsForStep;
    private getPatternStep;
    protected prepareOfflineRender(): void;
}
