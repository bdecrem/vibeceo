/**
 * Ducker Effect
 *
 * Sidechain-style gain ducking. When trigger signal exceeds threshold,
 * reduces gain on the input signal. Lighter than a real compressor.
 *
 * Usage:
 *   const ducker = new Ducker(audioContext);
 *   ducker.setTrigger(kickNode);
 *   ducker.setPreset('tight');
 *
 *   bass.connect(ducker.input);
 *   ducker.output.connect(master);
 */

import { Effect } from './base.js';

export class Ducker extends Effect {
  static PRESETS = {
    tight: { amount: 0.5, attack: 5, release: 100, threshold: 0.1 },
    pump: { amount: 0.7, attack: 10, release: 250, threshold: 0.1 },
  };

  constructor(context) {
    super(context);

    // Ducking gain node
    this._duckGain = context.createGain();
    this._duckGain.gain.value = 1;

    // Wire: input -> duckGain -> output
    this._input.connect(this._duckGain);
    this._duckGain.connect(this._output);

    // Trigger detection
    this._analyser = context.createAnalyser();
    this._analyser.fftSize = 256;
    this._analyserData = new Float32Array(this._analyser.fftSize);
    this._triggerConnected = false;

    // Parameters
    this._amount = 0.5;      // 0-1, how much to duck
    this._attack = 5;        // ms
    this._release = 150;     // ms
    this._threshold = 0.1;   // 0-1, trigger sensitivity

    // State
    this._isducking = false;
    this._rafId = null;
  }

  /**
   * Connect a trigger source (e.g., kick drum output)
   * @param {AudioNode} sourceNode - The audio node to use as trigger
   */
  setTrigger(sourceNode) {
    if (this._triggerConnected) {
      // Disconnect previous trigger
      this._analyser.disconnect();
    }
    sourceNode.connect(this._analyser);
    this._triggerConnected = true;

    // Start monitoring
    this._startMonitoring();
  }

  /**
   * Start the trigger monitoring loop
   */
  _startMonitoring() {
    if (this._rafId) return;

    const monitor = () => {
      this._analyser.getFloatTimeDomainData(this._analyserData);

      // Find peak amplitude
      let peak = 0;
      for (let i = 0; i < this._analyserData.length; i++) {
        const abs = Math.abs(this._analyserData[i]);
        if (abs > peak) peak = abs;
      }

      // Trigger ducking if above threshold
      if (peak > this._threshold && !this._isDocumentHidden()) {
        this._duck();
      }

      this._rafId = requestAnimationFrame(monitor);
    };

    monitor();
  }

  /**
   * Stop monitoring
   */
  _stopMonitoring() {
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  /**
   * Check if document is hidden (for power saving)
   */
  _isDocumentHidden() {
    return typeof document !== 'undefined' && document.hidden;
  }

  /**
   * Apply ducking
   */
  _duck() {
    if (this._isDocking) return;
    this._isDocking = true;

    const now = this.context.currentTime;
    const attackTime = this._attack / 1000;
    const releaseTime = this._release / 1000;
    const targetGain = 1 - this._amount;

    // Cancel any scheduled changes
    this._duckGain.gain.cancelScheduledValues(now);

    // Duck down
    this._duckGain.gain.setValueAtTime(this._duckGain.gain.value, now);
    this._duckGain.gain.linearRampToValueAtTime(targetGain, now + attackTime);

    // Release back up
    this._duckGain.gain.linearRampToValueAtTime(1, now + attackTime + releaseTime);

    // Reset state after release
    setTimeout(() => {
      this._isDocking = false;
    }, (attackTime + releaseTime) * 1000);
  }

  /**
   * Set parameter
   */
  setParameter(name, value) {
    switch (name) {
      case 'amount':
        this._amount = Math.max(0, Math.min(1, value));
        break;
      case 'attack':
        this._attack = Math.max(1, Math.min(50, value));
        break;
      case 'release':
        this._release = Math.max(50, Math.min(500, value));
        break;
      case 'threshold':
        this._threshold = Math.max(0, Math.min(1, value));
        break;
      default:
        console.warn(`Ducker: unknown parameter ${name}`);
    }
  }

  /**
   * Get all parameters
   */
  getParameters() {
    return {
      amount: this._amount,
      attack: this._attack,
      release: this._release,
      threshold: this._threshold,
    };
  }

  /**
   * Clean up
   */
  dispose() {
    this._stopMonitoring();
    this._duckGain.disconnect();
    this._analyser.disconnect();
    super.dispose();
  }
}

export default Ducker;
