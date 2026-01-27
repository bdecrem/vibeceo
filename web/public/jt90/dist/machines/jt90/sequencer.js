/**
 * JT90 Sequencer
 *
 * 16-step drum sequencer with multiple voice tracks.
 * Each track has: velocity, accent per step.
 */

// Voice IDs
const VOICE_IDS = ['kick', 'snare', 'clap', 'rimshot', 'ch', 'oh', 'ltom', 'mtom', 'htom', 'crash', 'ride'];

// Create empty pattern (all voices, 16 steps)
function createEmptyPattern() {
  const pattern = {};
  VOICE_IDS.forEach(voiceId => {
    pattern[voiceId] = Array(16).fill(null).map(() => ({
      velocity: 0,
      accent: false
    }));
  });
  return pattern;
}

// Scale modes: how to interpret 16 steps
const SCALE_DIVISORS = {
  '16th': 4,        // 4 steps per beat (default)
  '8th-triplet': 3, // 3 steps per beat (triplet feel)
  '16th-triplet': 6,// 6 steps per beat
  '32nd': 8         // 8 steps per beat (double speed)
};

export class JT90Sequencer {
  constructor(options = {}) {
    this.steps = options.steps ?? 16;
    this.patternLength = options.patternLength ?? 16;
    this.bpm = options.bpm ?? 125;
    this.swing = 0;
    this.scale = '16th';
    this.pattern = createEmptyPattern();

    // Playback state
    this.context = null;
    this.currentStep = 0;
    this.running = false;
    this.nextStepTime = 0;
    this.schedulerInterval = null;

    // Callback
    this.onStep = null;
    this.onStepChange = null;
  }

  setContext(context) {
    this.context = context;
  }

  setBpm(bpm) {
    this.bpm = Math.max(30, Math.min(300, bpm));
  }

  getBpm() {
    return this.bpm;
  }

  setSwing(amount) {
    this.swing = Math.max(0, Math.min(1, amount));
  }

  getSwing() {
    return this.swing;
  }

  setPatternLength(length) {
    this.patternLength = Math.max(1, Math.min(16, length));
  }

  getPatternLength() {
    return this.patternLength;
  }

  setScale(scale) {
    if (SCALE_DIVISORS[scale]) {
      this.scale = scale;
    }
  }

  getScale() {
    return this.scale;
  }

  setPattern(pattern) {
    this.pattern = pattern;
  }

  getPattern() {
    return this.pattern;
  }

  setStep(voiceId, step, data) {
    if (!this.pattern[voiceId]) return;
    if (step >= 0 && step < 16) {
      this.pattern[voiceId][step] = { ...this.pattern[voiceId][step], ...data };
    }
  }

  getStep(voiceId, step) {
    return this.pattern[voiceId]?.[step];
  }

  getCurrentStep() {
    return this.currentStep;
  }

  isRunning() {
    return this.running;
  }

  start() {
    if (this.running || !this.context) return;

    this.running = true;
    this.currentStep = 0;
    this.nextStepTime = this.context.currentTime + 0.05;

    this._scheduleLoop();
  }

  stop() {
    this.running = false;
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
    }
    this.currentStep = 0;
    this.onStepChange?.(-1);
  }

  _scheduleLoop() {
    const lookahead = 0.1;
    const scheduleInterval = 25;

    this.schedulerInterval = setInterval(() => {
      if (!this.running || !this.context) return;

      const currentTime = this.context.currentTime;
      const divisor = SCALE_DIVISORS[this.scale] ?? 4;
      const baseStepDuration = 60 / this.bpm / divisor;

      while (this.nextStepTime < currentTime + lookahead) {
        this._triggerStep(this.currentStep, this.nextStepTime);

        // Calculate step duration with swing
        const swingFactor = this.swing * 0.5;
        const stepDuration = this.swing > 0
          ? baseStepDuration * (this.currentStep % 2 === 1 ? 1 + swingFactor : 1 - swingFactor)
          : baseStepDuration;

        this.nextStepTime += stepDuration;
        this.currentStep = (this.currentStep + 1) % this.patternLength;
      }
    }, scheduleInterval);
  }

  _triggerStep(step, time) {
    // Collect events for all voices
    const events = [];

    VOICE_IDS.forEach(voiceId => {
      const track = this.pattern[voiceId];
      if (!track || !track[step]) return;

      const stepData = track[step];
      if (stepData.velocity > 0) {
        events.push({
          voice: voiceId,
          velocity: stepData.velocity,
          accent: stepData.accent,
          time
        });
      }
    });

    // Notify UI
    this.onStepChange?.(step);

    // Call step handler
    if (events.length > 0 && this.onStep) {
      this.onStep(step, events);
    }
  }
}

export default JT90Sequencer;
