import type {
  Pattern,
  PatternStep,
  SequencerOptions,
  TriggerEvent,
  VoiceId,
} from './types.js';

export type StepCallback = (step: number, events: TriggerEvent[]) => void;

/**
 * Lightweight TypeScript step sequencer.
 * Timing is handled via `setTimeout` for now; higher accuracy transports
 * (Tone.Transport, Web Workers, etc.) can plug in later.
 */
export class StepSequencer {
  private readonly patterns = new Map<string, Pattern>();
  private currentPattern?: Pattern;
  private currentPatternId?: string;
  private steps: number;
  private bpm: number;
  private swing: number;
  private currentStep = 0;
  private timer?: ReturnType<typeof setTimeout>;
  private running = false;

  public onStep?: StepCallback;

  constructor(options: SequencerOptions = {}) {
    this.steps = options.steps ?? 16;
    this.bpm = options.bpm ?? 120;
    this.swing = options.swing ?? 0;
  }

  setBpm(bpm: number): void {
    this.bpm = bpm;
    if (this.running) {
      this.restart();
    }
  }

  setSwing(amount: number): void {
    this.swing = Math.max(0, Math.min(1, amount));
  }

  getSwing(): number {
    return this.swing;
  }

  getBpm(): number {
    return this.bpm;
  }

  setSteps(steps: number): void {
    this.steps = Math.max(1, Math.floor(steps));
    this.currentStep = 0;
  }

  addPattern(id: string, pattern: Pattern): void {
    this.patterns.set(id, pattern);
    if (!this.currentPatternId) {
      this.loadPattern(id);
    }
  }

  loadPattern(id: string): void {
    const pattern = this.patterns.get(id);
    if (!pattern) {
      throw new Error(`Pattern "${id}" not found`);
    }

    this.currentPatternId = id;
    this.currentPattern = pattern;
    this.currentStep = 0;
  }

  start(): void {
    if (!this.currentPattern) {
      throw new Error('No pattern selected for sequencer');
    }
    if (this.running) {
      return;
    }
    this.running = true;
    this.scheduleNextStep();
  }

  stop(): void {
    this.running = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
    this.currentStep = 0;
  }

  isRunning(): boolean {
    return this.running;
  }

  getCurrentStep(): number {
    return this.currentStep;
  }

  getCurrentPatternId(): string | undefined {
    return this.currentPatternId;
  }

  getCurrentPattern(): Pattern | undefined {
    return this.currentPattern;
  }

  chain(patternIds: string[]): void {
    patternIds.forEach((id) => {
      if (!this.patterns.has(id)) {
        throw new Error(`Cannot chain missing pattern "${id}"`);
      }
    });
    // Simple chaining strategy for now: replace existing map iteration order
    patternIds.forEach((id, index) => {
      const pattern = this.patterns.get(id)!;
      this.patterns.delete(id);
      this.patterns.set(`${index}-${id}`, pattern);
    });
  }

  private restart(): void {
    this.stop();
    this.start();
  }

  private scheduleNextStep(): void {
    if (!this.running) {
      return;
    }

    const intervalMs = this.computeIntervalMs(this.currentStep);
    this.timer = setTimeout(() => {
      const events = this.collectEventsForStep(this.currentStep);
      this.onStep?.(this.currentStep, events);

      this.currentStep = (this.currentStep + 1) % this.steps;
      this.scheduleNextStep();
    }, intervalMs);
  }

  private computeIntervalMs(step: number): number {
    const base = (60 / this.bpm / 4) * 1000; // 16th note
    if (this.swing <= 0.0001) {
      return base;
    }

    const swingFactor = this.swing * 0.5;
    const isOddStep = step % 2 === 1;
    return base * (isOddStep ? 1 + swingFactor : 1 - swingFactor);
  }

  private collectEventsForStep(step: number): TriggerEvent[] {
    if (!this.currentPattern) {
      return [];
    }

    const events: TriggerEvent[] = [];

    for (const [voiceId, track] of Object.entries(this.currentPattern)) {
      const patternStep = this.getPatternStep(track, step);
      if (!patternStep) continue;

      if (
        typeof patternStep.probability === 'number' &&
        Math.random() > patternStep.probability
      ) {
        continue;
      }

      events.push({
        voice: voiceId as VoiceId,
        step,
        velocity: patternStep.velocity,
        accent: patternStep.accent,
      });
    }

    return events;
  }

  private getPatternStep(
    track: PatternStep[],
    step: number
  ): PatternStep | undefined {
    const normalizedIndex = step % track.length;
    const data = track[normalizedIndex];
    if (!data || data.velocity <= 0) {
      return undefined;
    }
    return data;
  }
}
