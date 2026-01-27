/**
 * JT30 Sequencer
 *
 * 16-step sequencer for acid bass patterns.
 * Each step has: note, gate, accent, slide
 */

// Default empty pattern
function createEmptyPattern() {
  return Array(16).fill(null).map(() => ({
    note: 'C2',
    gate: false,
    accent: false,
    slide: false
  }));
}

export class JT30Sequencer {
  constructor(options = {}) {
    this.steps = options.steps ?? 16;
    this.bpm = options.bpm ?? 130;
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

  setPattern(pattern) {
    this.pattern = pattern;
  }

  getPattern() {
    return this.pattern;
  }

  setStep(index, data) {
    if (index >= 0 && index < this.pattern.length) {
      this.pattern[index] = { ...this.pattern[index], ...data };
    }
  }

  getStep(index) {
    return this.pattern[index];
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
    this.nextStepTime = this.context.currentTime + 0.05; // Small buffer

    // Use lookahead scheduling
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
    const lookahead = 0.1;  // Schedule 100ms ahead
    const scheduleInterval = 25;  // Check every 25ms

    this.schedulerInterval = setInterval(() => {
      if (!this.running || !this.context) return;

      const currentTime = this.context.currentTime;
      const stepDuration = 60 / this.bpm / 4;

      while (this.nextStepTime < currentTime + lookahead) {
        this._triggerStep(this.currentStep, this.nextStepTime);
        this.nextStepTime += stepDuration;
        this.currentStep = (this.currentStep + 1) % this.pattern.length;
      }
    }, scheduleInterval);
  }

  _triggerStep(step, time) {
    const stepData = this.pattern[step];
    const nextStep = (step + 1) % this.pattern.length;
    const nextStepData = this.pattern[nextStep];

    // Notify UI
    this.onStepChange?.(step);

    // Call step handler if gate is on
    if (stepData.gate && this.onStep) {
      this.onStep(step, stepData, nextStepData);
    }
  }
}

export default JT30Sequencer;
