/**
 * JB202 Step Sequencer
 *
 * 16-step sequencer with per-step note, gate, accent, and slide.
 * Compatible with JB200 pattern format.
 */

import { noteToMidi, midiToNote, midiToFreq } from '../../dsp/utils/note.js';

export { noteToMidi, midiToNote, midiToFreq };

export class JB202Sequencer {
  constructor(options = {}) {
    this.steps = options.steps ?? 16;
    this.bpm = options.bpm ?? 120;
    this.running = false;
    this.currentStep = -1;
    this.nextStepTime = 0;
    this.scheduleAheadTime = 0.1; // seconds
    this.lookahead = 25; // ms

    // Pattern data
    this.pattern = this.createEmptyPattern();

    // Callbacks
    this.onStep = null;       // (step, stepData, nextStepData) => void
    this.onStepChange = null; // (step) => void

    // Internal
    this.timerID = null;
    this.audioContext = null;
  }

  createEmptyPattern() {
    const pattern = [];
    for (let i = 0; i < this.steps; i++) {
      pattern.push({
        note: 'C2',
        gate: i === 0,
        accent: false,
        slide: false,
      });
    }
    return pattern;
  }

  setContext(context) {
    this.audioContext = context;
  }

  setBpm(bpm) {
    this.bpm = Math.max(30, Math.min(300, bpm));
  }

  getBpm() {
    return this.bpm;
  }

  getStepDuration() {
    return 60 / this.bpm / 4;
  }

  setPattern(pattern) {
    if (Array.isArray(pattern)) {
      // Resize if needed
      if (pattern.length !== this.steps) {
        this.steps = pattern.length;
      }
      this.pattern = pattern.map(step => ({
        note: step.note ?? 'C2',
        gate: step.gate ?? false,
        accent: step.accent ?? false,
        slide: step.slide ?? false,
      }));
    }
  }

  getPattern() {
    return this.pattern.map(step => ({ ...step }));
  }

  setStep(index, data) {
    if (index >= 0 && index < this.steps) {
      Object.assign(this.pattern[index], data);
    }
  }

  getStep(index) {
    if (index >= 0 && index < this.steps) {
      return { ...this.pattern[index] };
    }
    return null;
  }

  start() {
    if (this.running) return;
    if (!this.audioContext) {
      console.warn('JB202Sequencer: No audio context set');
      return;
    }

    this.running = true;
    this.currentStep = -1;
    this.nextStepTime = this.audioContext.currentTime;
    this.scheduler();
  }

  stop() {
    this.running = false;
    if (this.timerID) {
      clearTimeout(this.timerID);
      this.timerID = null;
    }
    this.currentStep = -1;
    this.onStepChange?.(-1);
  }

  isRunning() {
    return this.running;
  }

  getCurrentStep() {
    return this.currentStep;
  }

  scheduler() {
    if (!this.running) return;

    const currentTime = this.audioContext.currentTime;

    while (this.nextStepTime < currentTime + this.scheduleAheadTime) {
      this.scheduleStep(this.nextStepTime);
      this.advanceStep();
    }

    this.timerID = setTimeout(() => this.scheduler(), this.lookahead);
  }

  scheduleStep(time) {
    const step = (this.currentStep + 1) % this.steps;
    const stepData = this.pattern[step];
    const nextStep = (step + 1) % this.steps;
    const nextStepData = this.pattern[nextStep];

    if (this.onStep && stepData.gate) {
      this.onStep(step, {
        ...stepData,
        midi: noteToMidi(stepData.note),
        frequency: midiToFreq(noteToMidi(stepData.note)),
        time,
        duration: this.getStepDuration(),
      }, {
        ...nextStepData,
        midi: noteToMidi(nextStepData.note),
        frequency: midiToFreq(noteToMidi(nextStepData.note)),
      });
    }

    this.onStepChange?.(step);
  }

  advanceStep() {
    this.currentStep = (this.currentStep + 1) % this.steps;
    this.nextStepTime += this.getStepDuration();
  }

  static cycleNote(currentNote, direction = 1) {
    const midi = noteToMidi(currentNote);
    const minMidi = 24;
    const maxMidi = 60;

    let newMidi = midi + direction;
    if (newMidi > maxMidi) newMidi = minMidi;
    if (newMidi < minMidi) newMidi = maxMidi;

    return midiToNote(newMidi);
  }
}

export default JB202Sequencer;
