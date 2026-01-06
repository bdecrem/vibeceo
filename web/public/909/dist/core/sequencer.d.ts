import type { Pattern, SequencerOptions, TriggerEvent } from './types.js';
export type StepCallback = (step: number, events: TriggerEvent[]) => void;
/**
 * Lightweight TypeScript step sequencer.
 * Timing is handled via `setTimeout` for now; higher accuracy transports
 * (Tone.Transport, Web Workers, etc.) can plug in later.
 */
export declare class StepSequencer {
    private readonly patterns;
    private currentPattern?;
    private currentPatternId?;
    private steps;
    private bpm;
    private swing;
    private currentStep;
    private timer?;
    private running;
    onStep?: StepCallback;
    constructor(options?: SequencerOptions);
    setBpm(bpm: number): void;
    setSwing(amount: number): void;
    getSwing(): number;
    getBpm(): number;
    setSteps(steps: number): void;
    addPattern(id: string, pattern: Pattern): void;
    loadPattern(id: string): void;
    start(): void;
    stop(): void;
    isRunning(): boolean;
    getCurrentStep(): number;
    getCurrentPatternId(): string | undefined;
    chain(patternIds: string[]): void;
    private restart;
    private scheduleNextStep;
    private computeIntervalMs;
    private collectEventsForStep;
    private getPatternStep;
}
