/**
 * EffectSend Class
 *
 * Wraps any Effect with parallel dry/wet routing and step-based automation.
 * Enables turning effects on/off at specific sequencer steps.
 * Works with both real-time AudioContext and offline OfflineAudioContext.
 *
 * Signal flow:
 *   input ─┬─► dryGain ────────────────┐
 *          │                           ↓
 *          └─► effect → wetGain ───► output
 *
 * Usage:
 *   const reverb = new Reverb(context);
 *   const send = new EffectSend(context, { effect: reverb, defaultWet: 0 });
 *
 *   // Step automation: reverb on at steps 0, 4, 8, 12
 *   send.setAutomationPattern([1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0]);
 *
 *   // For offline rendering, call before startRendering():
 *   send.scheduleAutomation(128, 4, 16); // 128 BPM, 4 bars, 16 steps/bar
 */

export class EffectSend {
  /**
   * @param {BaseAudioContext} context - AudioContext or OfflineAudioContext
   * @param {Object} options
   * @param {Effect} options.effect - The effect to wrap
   * @param {number} [options.defaultWet=1] - Default wet level (0-1)
   * @param {number} [options.fadeTime=0.005] - Crossfade time in seconds
   */
  constructor(context, options) {
    this.context = context;
    this.effect = options.effect;
    this._defaultWet = options.defaultWet ?? 1;
    this._fadeTime = options.fadeTime ?? 0.005;
    this._automations = [];

    // Create routing nodes
    this._input = context.createGain();
    this._output = context.createGain();
    this._dryGain = context.createGain();
    this._wetGain = context.createGain();

    // Set initial levels
    this._wetGain.gain.value = this._defaultWet;
    this._dryGain.gain.value = 1 - this._defaultWet;

    // Wire parallel paths (NEVER disconnect these during playback/render)
    this._input.connect(this._dryGain);
    this._dryGain.connect(this._output);

    this._input.connect(this.effect.input);
    this.effect.output.connect(this._wetGain);
    this._wetGain.connect(this._output);
  }

  /**
   * Input node - connect source here
   */
  get input() {
    return this._input;
  }

  /**
   * Output node - connect to destination
   */
  get output() {
    return this._output;
  }

  /**
   * The wrapped effect instance
   */
  get wrappedEffect() {
    return this.effect;
  }

  /**
   * Default wet level
   */
  get defaultWet() {
    return this._defaultWet;
  }

  /**
   * Crossfade time in seconds
   */
  get fadeTime() {
    return this._fadeTime;
  }

  /**
   * Set wet level immediately (0=dry, 1=wet)
   * @param {number} level - Wet level (0-1)
   */
  setWetLevel(level) {
    const wet = Math.max(0, Math.min(1, level));
    this._wetGain.gain.value = wet;
    this._dryGain.gain.value = 1 - wet;
  }

  /**
   * Set wet level at a specific time (for manual time-based automation)
   * @param {number} level - Wet level (0-1)
   * @param {number} time - Time in seconds
   */
  setWetLevelAtTime(level, time) {
    const wet = Math.max(0, Math.min(1, level));
    const fadeEnd = time + this._fadeTime;

    // Set current value first, then ramp
    this._wetGain.gain.setValueAtTime(this._wetGain.gain.value, time);
    this._wetGain.gain.linearRampToValueAtTime(wet, fadeEnd);

    this._dryGain.gain.setValueAtTime(this._dryGain.gain.value, time);
    this._dryGain.gain.linearRampToValueAtTime(1 - wet, fadeEnd);
  }

  /**
   * Clear all step automations
   */
  clearAutomation() {
    this._automations = [];
  }

  /**
   * Add step-based automation
   * @param {number} step - Step number (0-based, can exceed 16 for multi-bar patterns)
   * @param {number} wetLevel - Wet level at this step (0=off, 1=fully on)
   */
  setStepAutomation(step, wetLevel) {
    // Remove existing automation for this step
    this._automations = this._automations.filter(a => a.step !== step);
    this._automations.push({
      step,
      wetLevel: Math.max(0, Math.min(1, wetLevel))
    });
    // Keep sorted by step
    this._automations.sort((a, b) => a.step - b.step);
  }

  /**
   * Set automation from a pattern array
   * @param {number[]} pattern - Array of wet levels per step (e.g., [1, 0, 0, 0, 1, 0, 0, 0, ...])
   */
  setAutomationPattern(pattern) {
    this.clearAutomation();
    pattern.forEach((wetLevel, step) => {
      this._automations.push({
        step,
        wetLevel: Math.max(0, Math.min(1, wetLevel))
      });
    });
  }

  /**
   * Get all automations
   * @returns {Array<{step: number, wetLevel: number}>}
   */
  getAutomation() {
    return [...this._automations];
  }

  /**
   * Schedule all automations for offline rendering.
   * MUST be called BEFORE startRendering().
   *
   * @param {number} bpm - Beats per minute
   * @param {number} bars - Number of bars to render
   * @param {number} [stepsPerBar=16] - Steps per bar (default: 16 for 16th notes)
   * @param {number} [startTime=0] - Start time offset in seconds
   */
  scheduleAutomation(bpm, bars, stepsPerBar = 16, startTime = 0) {
    const stepDuration = 60 / bpm / 4; // 16th note duration at 4/4
    const totalSteps = stepsPerBar * bars;

    // Cancel any existing automation
    this._wetGain.gain.cancelScheduledValues(startTime);
    this._dryGain.gain.cancelScheduledValues(startTime);

    // Set initial values
    const initialWet = this._automations.length > 0 && this._automations[0].step === 0
      ? this._automations[0].wetLevel
      : this._defaultWet;

    this._wetGain.gain.setValueAtTime(initialWet, startTime);
    this._dryGain.gain.setValueAtTime(1 - initialWet, startTime);

    // If no automations, keep default level
    if (this._automations.length === 0) return;

    // Build a map of step -> wetLevel for the full pattern
    const patternLength = Math.max(...this._automations.map(a => a.step)) + 1;

    // Schedule for each step in the total duration
    let lastWet = initialWet;

    for (let globalStep = 0; globalStep < totalSteps; globalStep++) {
      const patternStep = globalStep % patternLength;
      const automation = this._automations.find(a => a.step === patternStep);

      if (automation && automation.wetLevel !== lastWet) {
        const time = startTime + globalStep * stepDuration;
        const wet = automation.wetLevel;

        // Schedule crossfade
        this._wetGain.gain.setValueAtTime(lastWet, time);
        this._wetGain.gain.linearRampToValueAtTime(wet, time + this._fadeTime);

        this._dryGain.gain.setValueAtTime(1 - lastWet, time);
        this._dryGain.gain.linearRampToValueAtTime(1 - wet, time + this._fadeTime);

        lastWet = wet;
      }
    }
  }

  /**
   * Create an EffectSend for offline rendering with pre-scheduled automation.
   *
   * @param {OfflineAudioContext} offlineContext
   * @param {function(BaseAudioContext): Effect} effectFactory - Factory to create effect
   * @param {Object} options
   * @param {number} [options.defaultWet=1] - Default wet level
   * @param {number} [options.fadeTime=0.005] - Crossfade time
   * @param {Array<{step: number, wetLevel: number}>} [options.automations] - Step automations
   * @param {number} options.bpm - BPM for scheduling
   * @param {number} options.bars - Number of bars
   * @param {number} [options.stepsPerBar=16] - Steps per bar
   * @returns {EffectSend}
   */
  static createForOffline(offlineContext, effectFactory, options) {
    const effect = effectFactory(offlineContext);
    const send = new EffectSend(offlineContext, {
      effect,
      defaultWet: options.defaultWet,
      fadeTime: options.fadeTime,
    });

    if (options.automations) {
      send._automations = [...options.automations];
    }

    // Pre-schedule all automation BEFORE startRendering() is called
    send.scheduleAutomation(
      options.bpm,
      options.bars,
      options.stepsPerBar ?? 16
    );

    return send;
  }

  /**
   * Clean up audio nodes
   */
  dispose() {
    this._input.disconnect();
    this._output.disconnect();
    this._dryGain.disconnect();
    this._wetGain.disconnect();
    if (this.effect.dispose) {
      this.effect.dispose();
    }
  }
}

export default EffectSend;
