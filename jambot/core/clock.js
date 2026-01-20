/**
 * Jambot Clock - Master Timing System
 *
 * The clock is the single source of truth for all timing in Jambot.
 * BPM is set here, and all synths/effects query the clock for timing.
 *
 * Producer interface: BPM (beats per minute)
 * Internal: derives stepDuration, barDuration, etc.
 *
 * Usage:
 *   const clock = new Clock({ bpm: 128 });
 *   clock.bpm = 140;  // Change tempo
 *
 *   // Engines query timing, never store BPM
 *   const stepDur = clock.stepDuration;
 *   const barDur = clock.barDuration;
 */

export class Clock {
  static MIN_BPM = 30;
  static MAX_BPM = 300;
  static DEFAULT_BPM = 120;

  constructor(options = {}) {
    this._bpm = this._clampBpm(options.bpm ?? Clock.DEFAULT_BPM);
    this._sampleRate = options.sampleRate ?? 44100;
    this._beatsPerBar = options.beatsPerBar ?? 4;
    this._stepsPerBeat = options.stepsPerBeat ?? 4;  // 16th notes
    this._swing = options.swing ?? 0;  // 0-1

    // Callbacks for tempo changes (UI updates, etc.)
    this._onTempoChange = null;
  }

  // ========================================
  // BPM (Producer Interface)
  // ========================================

  get bpm() {
    return this._bpm;
  }

  set bpm(value) {
    const newBpm = this._clampBpm(value);
    if (newBpm !== this._bpm) {
      this._bpm = newBpm;
      this._onTempoChange?.(newBpm);
    }
  }

  _clampBpm(bpm) {
    return Math.max(Clock.MIN_BPM, Math.min(Clock.MAX_BPM, bpm));
  }

  // ========================================
  // Derived Timing (Internal Use)
  // ========================================

  /** Seconds per beat */
  get secondsPerBeat() {
    return 60 / this._bpm;
  }

  /** Seconds per step (16th note by default) */
  get stepDuration() {
    return this.secondsPerBeat / this._stepsPerBeat;
  }

  /** Seconds per bar */
  get barDuration() {
    return this.secondsPerBeat * this._beatsPerBar;
  }

  /** Steps per bar (default: 16) */
  get stepsPerBar() {
    return this._beatsPerBar * this._stepsPerBeat;
  }

  /** Samples per step */
  get samplesPerStep() {
    return Math.round(this.stepDuration * this._sampleRate);
  }

  /** Samples per bar */
  get samplesPerBar() {
    return Math.round(this.barDuration * this._sampleRate);
  }

  // ========================================
  // Swing
  // ========================================

  get swing() {
    return this._swing;
  }

  set swing(value) {
    this._swing = Math.max(0, Math.min(1, value));
  }

  /**
   * Get step duration with swing applied
   * @param {number} stepIndex - The step number (0-15)
   * @returns {number} Duration in seconds
   */
  getSwungStepDuration(stepIndex) {
    if (this._swing <= 0.0001) {
      return this.stepDuration;
    }
    const swingFactor = this._swing * 0.5;
    const isOddStep = stepIndex % 2 === 1;
    return this.stepDuration * (isOddStep ? 1 + swingFactor : 1 - swingFactor);
  }

  /**
   * Get the time position for a given step
   * @param {number} stepIndex - Step number (0-based, can exceed stepsPerBar for multi-bar)
   * @param {boolean} withSwing - Apply swing timing
   * @returns {number} Time in seconds
   */
  getStepTime(stepIndex, withSwing = false) {
    if (!withSwing || this._swing <= 0.0001) {
      return stepIndex * this.stepDuration;
    }
    // Cumulative swing calculation
    let time = 0;
    for (let i = 0; i < stepIndex; i++) {
      time += this.getSwungStepDuration(i);
    }
    return time;
  }

  // ========================================
  // Sample Rate
  // ========================================

  get sampleRate() {
    return this._sampleRate;
  }

  set sampleRate(value) {
    this._sampleRate = value;
  }

  // ========================================
  // Time Signature (for future use)
  // ========================================

  get beatsPerBar() {
    return this._beatsPerBar;
  }

  set beatsPerBar(value) {
    this._beatsPerBar = Math.max(1, Math.min(16, Math.floor(value)));
  }

  get stepsPerBeat() {
    return this._stepsPerBeat;
  }

  set stepsPerBeat(value) {
    this._stepsPerBeat = Math.max(1, Math.min(8, Math.floor(value)));
  }

  // ========================================
  // Callbacks
  // ========================================

  onTempoChange(callback) {
    this._onTempoChange = callback;
  }

  // ========================================
  // Timing Info Object (for passing to engines)
  // ========================================

  /**
   * Get a timing info object for passing to render functions
   * This is what engines receive - they never see BPM directly
   */
  getTimingInfo() {
    return {
      bpm: this._bpm,  // Included for reference/display, but engines should use derived values
      stepDuration: this.stepDuration,
      barDuration: this.barDuration,
      stepsPerBar: this.stepsPerBar,
      samplesPerStep: this.samplesPerStep,
      samplesPerBar: this.samplesPerBar,
      sampleRate: this._sampleRate,
      swing: this._swing,
    };
  }

  // ========================================
  // Serialization
  // ========================================

  serialize() {
    return {
      bpm: this._bpm,
      swing: this._swing,
      beatsPerBar: this._beatsPerBar,
      stepsPerBeat: this._stepsPerBeat,
    };
  }

  static deserialize(data, options = {}) {
    return new Clock({
      bpm: data.bpm,
      swing: data.swing,
      beatsPerBar: data.beatsPerBar,
      stepsPerBeat: data.stepsPerBeat,
      sampleRate: options.sampleRate ?? 44100,
    });
  }
}

export default Clock;
