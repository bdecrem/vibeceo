import { SynthEngine } from '../../core/engine.js';
import { StepSequencer } from '../../core/sequencer.js';
import type {
  Pattern,
  PatternStep,
  SynthEngineOptions,
  TriggerEvent,
} from '../../core/types.js';
import { LFSRNoise } from '../../core/noise.js';
import type { Voice } from '../../core/voice.js';
import { Kick909 } from './voices/kick.js';
import { Snare909 } from './voices/snare.js';
import { Clap909 } from './voices/clap.js';
import { Tom909 } from './voices/tom.js';
import { Rimshot909 } from './voices/rimshot.js';
import { HiHat909 } from './voices/hihat.js';
import { Cymbal909 } from './voices/cymbal.js';
import {
  SampleLibrary,
  type SampleManifestEntry,
  createDefaultTr909SampleLibrary,
} from './samples/library.js';

export type TR909VoiceId =
  | 'kick'
  | 'snare'
  | 'clap'
  | 'rimshot'
  | 'ltom'
  | 'mtom'
  | 'htom'
  | 'ch'
  | 'oh'
  | 'crash'
  | 'ride';

export interface Tr909RenderOptions {
  bars?: number;
  bpm?: number;
  swing?: number;
  sampleRate?: number;
  numberOfChannels?: number;
}

export type StepChangeCallback = (step: number) => void;

export class TR909Engine extends SynthEngine {
  private readonly sequencer = new StepSequencer({ steps: 16, bpm: 125 });
  private readonly sampleLibrary: SampleLibrary;
  private currentBpm = 125;
  private swingAmount = 0;
  private flamAmount = 0;
  private static readonly STEPS_PER_BAR = 16;

  // Hi-hat choke: track active open hi-hat for cutoff
  private activeOpenHat: { source: AudioBufferSourceNode; gain: GainNode } | null = null;

  // Step callback for UI visualization
  public onStepChange?: StepChangeCallback;

  constructor(options: SynthEngineOptions = {}) {
    super(options);
    this.sampleLibrary = createDefaultTr909SampleLibrary();
    this.setupVoices();
    this.sequencer.onStep = (step, events) => {
      // Notify UI of step change
      this.onStepChange?.(step);

      events.forEach((event) => {
        // Get per-voice accent amount
        const voice = this.voices.get(event.voice as TR909VoiceId);
        const accentMultiplier = event.accent && voice ? voice.getAccentAmount() : 1;
        const velocity = Math.min(1, event.velocity * accentMultiplier);

        // Hi-hat choke: closed hat cuts open hat
        if (event.voice === 'ch' && this.activeOpenHat) {
          this.chokeOpenHat();
        }

        // Apply flam if enabled (slight delay for doubled hit)
        if (this.flamAmount > 0 && velocity > 0.5) {
          // Trigger a quiet ghost note slightly before
          const flamDelay = this.flamAmount * 0.03; // max 30ms flam
          this.trigger(event.voice, velocity * 0.4);
          setTimeout(() => {
            this.trigger(event.voice, velocity);
          }, flamDelay * 1000);
        } else {
          this.trigger(event.voice, velocity);
        }
      });
    };
  }

  private chokeOpenHat(): void {
    if (this.activeOpenHat) {
      const { gain } = this.activeOpenHat;
      const now = this.context.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
      this.activeOpenHat = null;
    }
  }

  // Called by HiHat909 to register active open hat for choke
  registerOpenHat(source: AudioBufferSourceNode, gain: GainNode): void {
    this.activeOpenHat = { source, gain };
  }

  clearOpenHat(): void {
    this.activeOpenHat = null;
  }

  protected setupVoices(): void {
    const voices = this.createVoiceMap(this.context);
    voices.forEach((voice, id) => this.registerVoice(id, voice));
  }

  async loadSamples(manifest?: SampleManifestEntry[]): Promise<void> {
    if (!manifest?.length) {
      return;
    }
    await this.sampleLibrary.loadFromManifest(this.context, manifest);
  }

  setPattern(id: string, pattern: Pattern): void {
    this.sequencer.addPattern(id, pattern);
    this.sequencer.loadPattern(id);
  }

  startSequencer(): void {
    void this.start();
    this.sequencer.start();
  }

  stopSequencer(): void {
    this.sequencer.stop();
    this.stop();
    // Clear step indicator
    this.onStepChange?.(-1);
    // Clear any active open hat
    this.activeOpenHat = null;
  }

  setBpm(bpm: number): void {
    this.currentBpm = bpm;
    this.sequencer.setBpm(bpm);
  }

  setSwing(amount: number): void {
    this.swingAmount = Math.max(0, Math.min(1, amount));
    this.sequencer.setSwing(this.swingAmount);
  }

  getSwing(): number {
    return this.swingAmount;
  }

  setFlam(amount: number): void {
    this.flamAmount = Math.max(0, Math.min(1, amount));
  }

  getFlam(): number {
    return this.flamAmount;
  }

  getCurrentStep(): number {
    return this.sequencer.getCurrentStep();
  }

  isPlaying(): boolean {
    return this.sequencer.isRunning();
  }

  async renderPattern(
    pattern: Pattern,
    options: Tr909RenderOptions = {}
  ): Promise<AudioBuffer> {
    const bpm = options.bpm ?? this.currentBpm;
    const bars = options.bars ?? 1;
    const stepsPerBar = TR909Engine.STEPS_PER_BAR;
    const totalSteps = stepsPerBar * bars;
    const baseStepDuration = 60 / bpm / 4;
    const duration = baseStepDuration * totalSteps;

    return this.outputManager.renderOffline(
      duration,
      (offlineContext) => {
        this.schedulePatternInContext({
          context: offlineContext,
          pattern,
          bpm,
          bars,
          stepsPerBar,
          swing: options.swing ?? this.swingAmount,
        });
      },
      {
        sampleRate: options.sampleRate,
        numberOfChannels: options.numberOfChannels,
      }
    );
  }

  private createVoiceMap(context: BaseAudioContext): Map<TR909VoiceId, Voice> {
    const noiseBuffer = new LFSRNoise(context).createBuffer(1);
    return new Map<TR909VoiceId, Voice>([
      ['kick', new Kick909('kick', context)],
      ['snare', new Snare909('snare', context, noiseBuffer)],
      ['clap', new Clap909('clap', context, noiseBuffer)],
      ['rimshot', new Rimshot909('rimshot', context)],
      ['ltom', new Tom909('ltom', context, 'low')],
      ['mtom', new Tom909('mtom', context, 'mid')],
      ['htom', new Tom909('htom', context, 'high')],
      ['ch', new HiHat909('ch', context, this.sampleLibrary, 'closed')],
      ['oh', new HiHat909('oh', context, this.sampleLibrary, 'open')],
      ['crash', new Cymbal909('crash', context, this.sampleLibrary, 'crash')],
      ['ride', new Cymbal909('ride', context, this.sampleLibrary, 'ride')],
    ]);
  }

  private schedulePatternInContext({
    context,
    pattern,
    bpm,
    bars,
    stepsPerBar,
    swing,
  }: {
    context: OfflineAudioContext;
    pattern: Pattern;
    bpm: number;
    bars: number;
    stepsPerBar: number;
    swing: number;
  }): void {
    const voices = this.createVoiceMap(context);
    const compressor = context.createDynamicsCompressor();
    const masterGain = context.createGain();
    masterGain.gain.value = 0.9;

    voices.forEach((voice) => voice.connect(compressor));
    compressor.connect(masterGain);
    masterGain.connect(context.destination);

    const baseStepDuration = 60 / bpm / 4;
    const swingFactor = swing * 0.5;
    let currentTime = 0;
    const totalSteps = bars * stepsPerBar;

    for (let step = 0; step < totalSteps; step += 1) {
      const events = this.collectEventsForStep(pattern, step);
      events.forEach((event) => {
        const voice = voices.get(event.voice as TR909VoiceId);
        if (!voice) return;
        const velocity = Math.min(
          1,
          event.velocity * (event.accent ? 1.1 : 1)
        );
        voice.trigger(currentTime, velocity);
      });

      const interval =
        swing > 0
          ? baseStepDuration * (step % 2 === 1 ? 1 + swingFactor : 1 - swingFactor)
          : baseStepDuration;
      currentTime += interval;
    }
  }

  private collectEventsForStep(pattern: Pattern, step: number): TriggerEvent[] {
    const events: TriggerEvent[] = [];
    for (const [voiceId, track] of Object.entries(pattern)) {
      const patternStep = this.getPatternStep(track, step);
      if (!patternStep) continue;
      events.push({
        voice: voiceId as TR909VoiceId,
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
    if (!track.length) {
      return undefined;
    }
    const normalizedIndex = step % track.length;
    const data = track[normalizedIndex];
    if (!data || data.velocity <= 0) {
      return undefined;
    }
    return data;
  }

  protected prepareOfflineRender(): void {
    throw new Error(
      'Use TR909Engine.renderPattern() to export audio for this machine.'
    );
  }
}
