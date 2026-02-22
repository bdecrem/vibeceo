export type VoiceId = string;
export interface VoiceParameterRange {
    min: number;
    max: number;
    step?: number;
    curve?: 'linear' | 'log';
    unit?: string;
}
export interface VoiceParameterDescriptor {
    id: string;
    label: string;
    range: VoiceParameterRange;
    defaultValue: number;
}
export interface TriggerEvent {
    voice: VoiceId;
    step: number;
    velocity: number;
    accent?: boolean;
    time?: number;
}
export interface PatternStep {
    velocity: number;
    accent?: boolean;
    probability?: number;
    ratchet?: number;
}
export type PatternTrack = PatternStep[];
export type Pattern = Record<VoiceId, PatternTrack>;
export interface SequencerOptions {
    steps?: number;
    bpm?: number;
    swing?: number;
}
export interface SynthEngineOptions {
    /**
     * Inject an existing AudioContext (e.g. shared Web Audio graph)
     */
    context?: AudioContext;
    /**
     * Default volume for the master gain node (0-1 range)
     */
    masterVolume?: number;
}
export interface RenderOptions {
    duration: number;
    sampleRate?: number;
    numberOfChannels?: number;
}
export type OfflineRenderCallback = (context: OfflineAudioContext) => void | Promise<void>;
