/**
 * R9DS Sampler Engine
 *
 * A sample-based drum machine with:
 * - 10 sample slots
 * - 5 parameters per slot (level, tune, attack, decay, pan)
 * - Kit loading system
 * - 16-step sequencer (inherited from 909 core)
 */

import { SampleVoice } from './sample-voice.js';
import { KitLoader } from './kit-loader.js?v=20260110';
import { StepSequencer } from '../core/sequencer.js';
import { OutputManager } from '../core/output.js';

export class R9DSEngine {
  constructor(options = {}) {
    this.context = options.context ?? new AudioContext();

    // Audio routing
    this.masterGain = this.context.createGain();
    this.masterGain.gain.value = options.masterVolume ?? 0.8;
    this.compressor = this.context.createDynamicsCompressor();
    this.analyser = this.context.createAnalyser();

    this.compressor.connect(this.analyser);
    this.analyser.connect(this.masterGain);
    this.masterGain.connect(this.context.destination);

    // Output manager for rendering
    this.outputManager = new OutputManager(this.context, this.masterGain);

    // Voices (10 sample slots)
    this.voices = new Map();
    this.voiceIds = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10'];

    // Create empty voices
    this.voiceIds.forEach(id => {
      const voice = new SampleVoice(id, this.context);
      voice.connect(this.compressor);
      this.voices.set(id, voice);
    });

    // Kit loader
    this.kitLoader = new KitLoader(this.context);
    this.currentKit = null;

    // Sequencer
    this.sequencer = new StepSequencer({ steps: 16, bpm: 120 });
    this.currentBpm = 120;
    this.swingAmount = 0;

    // Mute/solo state
    this.voiceStates = new Map();

    // Callbacks
    this.onStepChange = null;
    this.onKitLoaded = null;

    // Setup sequencer callback
    this.sequencer.onStep = (step, events) => {
      this.onStepChange?.(step);

      events.forEach((event) => {
        if (!this.shouldVoicePlay(event.voice)) return;

        const velocity = event.accent ? 1.0 : event.velocity;
        this.trigger(event.voice, velocity);
      });
    };
  }

  /**
   * Get available kits (async - fetches from manifest)
   */
  async getAvailableKits() {
    return this.kitLoader.getAvailableKits();
  }

  /**
   * Load a kit by ID
   */
  async loadKit(kitId) {
    try {
      const kit = await this.kitLoader.loadKit(kitId);
      this.applyKit(kit);
      this.currentKit = kitId;
      this.onKitLoaded?.(kit);
      return kit;
    } catch (e) {
      console.error('Failed to load kit:', e);
      throw e;
    }
  }

  /**
   * Apply loaded kit to voices
   */
  applyKit(kit) {
    kit.slots.forEach((slot, index) => {
      const voiceId = this.voiceIds[index];
      const voice = this.voices.get(voiceId);
      if (voice) {
        voice.setBuffer(slot.buffer);
        voice.setMeta(slot.name, slot.short);
      }
    });
  }

  /**
   * Get voice metadata (names)
   */
  getVoiceMeta() {
    const meta = {};
    this.voices.forEach((voice, id) => {
      meta[id] = {
        name: voice.name || id,
        short: voice.shortName || id.toUpperCase()
      };
    });
    return meta;
  }

  /**
   * Trigger a voice
   */
  trigger(voiceId, velocity = 1, time) {
    const voice = this.voices.get(voiceId);
    if (!voice) return;

    const when = time ?? this.context.currentTime;
    voice.trigger(when, velocity);
  }

  /**
   * Set voice parameter
   */
  setVoiceParameter(voiceId, param, value) {
    const voice = this.voices.get(voiceId);
    if (voice) {
      voice.setParameter(param, value);
    }
  }

  /**
   * Get voice parameter
   */
  getVoiceParameter(voiceId, param) {
    const voice = this.voices.get(voiceId);
    return voice ? voice.getParameter(param) : null;
  }

  /**
   * Get all parameter descriptors
   */
  getVoiceParameterDescriptors() {
    const descriptors = {};
    this.voices.forEach((voice, id) => {
      descriptors[id] = voice.parameterDescriptors;
    });
    return descriptors;
  }

  // === Sequencer Methods ===

  setPattern(id, pattern) {
    this.sequencer.addPattern(id, pattern);
    this.sequencer.loadPattern(id);
  }

  startSequencer() {
    if (this.context.state === 'suspended') {
      this.context.resume();
    }
    this.sequencer.start();
  }

  stopSequencer() {
    this.sequencer.stop();
    this.onStepChange?.(-1);
  }

  isPlaying() {
    return this.sequencer.isRunning();
  }

  getCurrentStep() {
    return this.sequencer.getCurrentStep();
  }

  setBpm(bpm) {
    this.currentBpm = bpm;
    this.sequencer.setBpm(bpm);
  }

  setSwing(amount) {
    this.swingAmount = Math.max(0, Math.min(1, amount));
    this.sequencer.setSwing(this.swingAmount);
  }

  getSwing() {
    return this.swingAmount;
  }

  setPatternLength(length) {
    this.sequencer.setPatternLength(length);
  }

  getPatternLength() {
    return this.sequencer.getPatternLength();
  }

  // === Mute/Solo ===

  getVoiceState(voiceId) {
    return this.voiceStates.get(voiceId) ?? 'normal';
  }

  cycleVoiceState(voiceId) {
    const current = this.getVoiceState(voiceId);
    let next;

    if (current === 'normal') {
      next = 'muted';
    } else if (current === 'muted') {
      this.voiceStates.forEach((_, id) => {
        if (this.voiceStates.get(id) === 'solo') {
          this.voiceStates.set(id, 'normal');
        }
      });
      next = 'solo';
    } else {
      next = 'normal';
    }

    this.voiceStates.set(voiceId, next);
    return next;
  }

  shouldVoicePlay(voiceId) {
    const state = this.getVoiceState(voiceId);
    if (state === 'muted') return false;

    const hasSolo = [...this.voiceStates.values()].includes('solo');
    if (hasSolo) return state === 'solo';

    return true;
  }

  clearVoiceStates() {
    this.voiceStates.clear();
  }

  // === Audio Output ===

  async start() {
    if (this.context.state === 'suspended') {
      await this.context.resume();
    }
  }

  stop() {
    // Nothing to do
  }

  getVoices() {
    return this.voiceIds;
  }

  // === Offline Rendering ===

  /**
   * Render a pattern to an AudioBuffer (for WAV export)
   * Supports both signatures for Session API compatibility:
   *   renderPattern({ bars, bpm })           - uses stored pattern
   *   renderPattern(pattern, { bars, bpm })  - explicit pattern
   */
  async renderPattern(patternOrOptions = {}, options = {}) {
    // Detect which signature was used
    let pattern, opts;
    if (patternOrOptions && (patternOrOptions.bars !== undefined || patternOrOptions.bpm !== undefined || patternOrOptions.steps !== undefined || Object.keys(patternOrOptions).length === 0)) {
      // Called as renderPattern({ bars, bpm }) - use stored pattern
      pattern = this.sequencer.getCurrentPattern();
      opts = patternOrOptions;
      if (!pattern) {
        throw new Error('No pattern available. Call setPattern() first or pass pattern as argument.');
      }
    } else {
      // Called as renderPattern(pattern, options) - explicit pattern
      pattern = patternOrOptions;
      opts = options;
    }

    const bpm = opts.bpm ?? this.currentBpm ?? 120;
    const bars = opts.bars ?? 1;
    const steps = opts.steps ?? 16;
    const swing = opts.swing ?? this.swingAmount ?? 0;

    // Calculate duration
    const secondsPerBeat = 60 / bpm;
    const secondsPerStep = secondsPerBeat / 4; // 16th notes
    const duration = steps * secondsPerStep * bars + 0.5; // Extra time for tails

    // Render offline
    const buffer = await this.outputManager.renderOffline(duration, async (offlineContext) => {
      // Create offline voices
      const offlineVoices = new Map();
      const offlineMaster = offlineContext.createGain();
      offlineMaster.gain.value = 0.8;

      const offlineCompressor = offlineContext.createDynamicsCompressor();
      offlineCompressor.connect(offlineMaster);
      offlineMaster.connect(offlineContext.destination);

      // Create sample voices for offline context
      for (const voiceId of this.voiceIds) {
        const originalVoice = this.voices.get(voiceId);
        if (!originalVoice || !originalVoice.buffer) continue;

        const offlineVoice = new SampleVoice(voiceId, offlineContext);
        offlineVoice.setBuffer(originalVoice.buffer);
        // Copy parameters
        const params = originalVoice.getParameters();
        for (const [key, value] of Object.entries(params)) {
          offlineVoice.setParameter(key, value);
        }
        offlineVoice.connect(offlineCompressor);
        offlineVoices.set(voiceId, offlineVoice);
      }

      // Schedule all events
      for (let bar = 0; bar < bars; bar++) {
        for (let step = 0; step < steps; step++) {
          const absoluteStep = bar * steps + step;

          // Apply swing to odd steps
          let stepTime = absoluteStep * secondsPerStep;
          if (step % 2 === 1 && swing > 0) {
            stepTime += secondsPerStep * swing * 0.5;
          }

          // Trigger voices that have hits on this step
          for (const [voiceId, track] of Object.entries(pattern)) {
            const stepData = track[step];
            if (stepData && stepData.velocity > 0) {
              const voice = offlineVoices.get(voiceId);
              if (voice) {
                const velocity = stepData.accent ? 1.0 : stepData.velocity;
                voice.trigger(stepTime, velocity);
              }
            }
          }
        }
      }
    });

    return buffer;
  }

  /**
   * Convert AudioBuffer to WAV ArrayBuffer
   */
  audioBufferToWav(buffer) {
    return this.outputManager.audioBufferToWav(buffer);
  }
}

export default R9DSEngine;
