/**
 * JB01 Engine - Reference Drum Machine
 *
 * 8-voice drum machine with:
 * - kick, snare, clap, ch, oh, lowtom, hitom, cymbal
 * - Hi-hat choke (ch cuts oh)
 * - Pattern rendering
 */
import { SynthEngine } from '../../core/engine.js';
import { LFSRNoise } from '../../core/noise.js';
import { KickVoice } from './voices/kick.js';
import { SnareVoice } from './voices/snare.js';
import { ClapVoice } from './voices/clap.js';
import { HiHatVoice } from './voices/hihat.js';
import { LowTomVoice } from './voices/lowtom.js';
import { HiTomVoice } from './voices/hitom.js';
import { CymbalVoice } from './voices/cymbal.js';

export class JB01Engine extends SynthEngine {
  constructor(options = {}) {
    super(options);
    this.currentBpm = options.bpm ?? 128;
    this.swingAmount = 0;
    this.flamAmount = 0;

    // Hi-hat choke tracking
    this.openHatVoice = null;

    // Voice parameter storage
    this.voiceParams = new Map();

    // Initialize voices
    this.setupVoices();
  }

  setupVoices() {
    const noiseBuffer = new LFSRNoise(this.context).createBuffer(1);

    // Create all 8 voices
    const kick = new KickVoice('kick', this.context);
    const snare = new SnareVoice('snare', this.context, noiseBuffer);
    const clap = new ClapVoice('clap', this.context, noiseBuffer);
    const ch = new HiHatVoice('ch', this.context, noiseBuffer, 'closed');
    const oh = new HiHatVoice('oh', this.context, noiseBuffer, 'open');
    const lowtom = new LowTomVoice('lowtom', this.context);
    const hitom = new HiTomVoice('hitom', this.context);
    const cymbal = new CymbalVoice('cymbal', this.context, noiseBuffer);

    // Register voices
    this.registerVoice('kick', kick);
    this.registerVoice('snare', snare);
    this.registerVoice('clap', clap);
    this.registerVoice('ch', ch);
    this.registerVoice('oh', oh);
    this.registerVoice('lowtom', lowtom);
    this.registerVoice('hitom', hitom);
    this.registerVoice('cymbal', cymbal);

    // Track open hat for choke
    this.openHatVoice = oh;
  }

  /**
   * Trigger a voice with hi-hat choke handling
   */
  trigger(voiceId, velocity = 1, time) {
    // Hi-hat choke: closed hat cuts open hat
    if (voiceId === 'ch' && this.openHatVoice) {
      this.openHatVoice.choke();
    }

    // Apply flam if enabled
    if (this.flamAmount > 0 && velocity > 0.5) {
      const flamDelay = this.flamAmount * 0.03;
      super.trigger(voiceId, velocity * 0.4, time);
      setTimeout(() => {
        super.trigger(voiceId, velocity, time);
      }, flamDelay * 1000);
    } else {
      super.trigger(voiceId, velocity, time);
    }
  }

  /**
   * Set a voice parameter
   */
  setVoiceParam(voiceId, paramId, value) {
    if (!this.voiceParams.has(voiceId)) {
      this.voiceParams.set(voiceId, new Map());
    }
    this.voiceParams.get(voiceId).set(paramId, value);

    const voice = this.voices.get(voiceId);
    if (voice) {
      voice.setParameter(paramId, value);
    }
  }

  /**
   * Get a voice parameter
   */
  getVoiceParam(voiceId, paramId) {
    return this.voiceParams.get(voiceId)?.get(paramId);
  }

  setBpm(bpm) {
    this.currentBpm = bpm;
  }

  setSwing(amount) {
    this.swingAmount = Math.max(0, Math.min(1, amount));
  }

  setFlam(amount) {
    this.flamAmount = Math.max(0, Math.min(1, amount));
  }

  /**
   * Render a pattern to an AudioBuffer
   *
   * @param {Object} pattern - { kick: [...], snare: [...], ... }
   * @param {Object} options - { bars, stepDuration, bpm, swing, sampleRate }
   *   - stepDuration: from clock (preferred)
   *   - bpm: legacy/UI fallback
   * @returns {Promise<AudioBuffer>}
   */
  async renderPattern(pattern, options = {}) {
    const bars = options.bars ?? 1;
    const swing = options.swing ?? this.swingAmount;
    const stepsPerBar = 16;
    const totalSteps = stepsPerBar * bars;

    // Timing: prefer clock's stepDuration, fall back to BPM calculation
    let stepDuration;
    if (options.stepDuration) {
      // Clock-provided timing (preferred)
      stepDuration = options.stepDuration;
    } else if (options.bpm) {
      // BPM provided (legacy/UI use)
      stepDuration = 60 / options.bpm / 4;
    } else {
      // Fallback to internal state (real-time UI)
      stepDuration = 60 / this.currentBpm / 4;
    }

    const duration = stepDuration * totalSteps;

    return this.outputManager.renderOffline(duration, (offlineContext) => {
      this.schedulePatternInContext({
        context: offlineContext,
        pattern,
        stepDuration,
        bars,
        stepsPerBar,
        swing,
      });
    }, {
      sampleRate: options.sampleRate,
      numberOfChannels: options.numberOfChannels,
    });
  }

  /**
   * Create voices for offline rendering
   */
  createVoiceMap(context) {
    const noiseBuffer = new LFSRNoise(context).createBuffer(1);

    const voices = new Map([
      ['kick', new KickVoice('kick', context)],
      ['snare', new SnareVoice('snare', context, noiseBuffer)],
      ['clap', new ClapVoice('clap', context, noiseBuffer)],
      ['ch', new HiHatVoice('ch', context, noiseBuffer, 'closed')],
      ['oh', new HiHatVoice('oh', context, noiseBuffer, 'open')],
      ['lowtom', new LowTomVoice('lowtom', context)],
      ['hitom', new HiTomVoice('hitom', context)],
      ['cymbal', new CymbalVoice('cymbal', context, noiseBuffer)],
    ]);

    // Apply stored voice parameters
    this.voiceParams.forEach((params, voiceId) => {
      const voice = voices.get(voiceId);
      if (voice) {
        params.forEach((value, paramId) => {
          voice.setParameter(paramId, value);
        });
      }
    });

    return voices;
  }

  /**
   * Schedule pattern in an offline context
   */
  schedulePatternInContext({ context, pattern, stepDuration, bars, stepsPerBar, swing }) {
    const voices = this.createVoiceMap(context);

    // Build audio graph
    const compressor = context.createDynamicsCompressor();
    const masterGain = context.createGain();
    masterGain.gain.value = 0.9;

    voices.forEach((voice) => voice.connect(compressor));
    compressor.connect(masterGain);
    masterGain.connect(context.destination);

    // Schedule events using stepDuration from clock
    const baseStepDuration = stepDuration;
    const swingFactor = swing * 0.5;
    let currentTime = 0;
    const totalSteps = bars * stepsPerBar;

    // Hi-hat choke tracking for offline render
    const openHat = voices.get('oh');

    for (let step = 0; step < totalSteps; step++) {
      const events = this.collectEventsForStep(pattern, step);

      // Check if we need to choke open hat
      const hasCH = events.some(e => e.voice === 'ch');
      if (hasCH && openHat) {
        // In offline context, we can't actually choke, but we can track
      }

      events.forEach((event) => {
        const voice = voices.get(event.voice);
        if (!voice) return;

        const velocity = Math.min(1, event.velocity * (event.accent ? 1.1 : 1));
        voice.trigger(currentTime, velocity);
      });

      // Calculate next step time with swing
      const interval = swing > 0
        ? baseStepDuration * (step % 2 === 1 ? 1 + swingFactor : 1 - swingFactor)
        : baseStepDuration;
      currentTime += interval;
    }
  }

  /**
   * Collect events for a step from pattern
   */
  collectEventsForStep(pattern, step) {
    const events = [];

    for (const [voiceId, track] of Object.entries(pattern)) {
      const patternStep = this.getPatternStep(track, step);
      if (!patternStep) continue;

      events.push({
        voice: voiceId,
        step,
        velocity: patternStep.velocity,
        accent: patternStep.accent,
      });
    }

    return events;
  }

  /**
   * Get pattern step data
   */
  getPatternStep(track, step) {
    if (!track.length) return undefined;

    const normalizedIndex = step % track.length;
    const data = track[normalizedIndex];

    if (!data || data.velocity <= 0) return undefined;
    return data;
  }
}

export const STEPS_PER_BAR = 16;
export const VOICES = ['kick', 'snare', 'clap', 'ch', 'oh', 'lowtom', 'hitom', 'cymbal'];
