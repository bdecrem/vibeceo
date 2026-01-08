/**
 * Reverb Effect
 *
 * Convolution reverb with dry/wet mix control.
 * Uses short impulse responses (<1s) for mobile performance.
 * Can load IR files or generate synthetic IRs.
 *
 * Usage:
 *   const reverb = new Reverb(audioContext);
 *   await reverb.init(); // Generate synthetic IRs
 *   reverb.setPreset('plate');
 *   reverb.setParameter('mix', 0.2);
 *
 *   source.connect(reverb.input);
 *   reverb.output.connect(destination);
 */

import { Effect } from './base.js';

export class Reverb extends Effect {
  static PRESETS = {
    plate: { ir: 'plate', mix: 0.15, decay: 0.6 },
    room: { ir: 'room', mix: 0.2, decay: 0.4 },
  };

  constructor(context) {
    super(context);

    // Convolver for wet signal
    this._convolver = context.createConvolver();

    // Dry/wet mix
    this._dryGain = context.createGain();
    this._wetGain = context.createGain();

    this._dryGain.gain.value = 0.8;
    this._wetGain.gain.value = 0.2;

    // Wire parallel dry/wet paths
    // Input -> dry -> output
    // Input -> convolver -> wet -> output
    this._input.connect(this._dryGain);
    this._dryGain.connect(this._output);

    this._input.connect(this._convolver);
    this._convolver.connect(this._wetGain);
    this._wetGain.connect(this._output);

    // IR cache
    this._irCache = new Map();
    this._currentIR = null;

    // Parameters
    this._mix = 0.2;
  }

  /**
   * Initialize with synthetic IRs (call before use)
   */
  async init() {
    // Generate synthetic plate and room IRs
    this._irCache.set('plate', this._generatePlateIR());
    this._irCache.set('room', this._generateRoomIR());

    // Default to plate
    this._setIR('plate');
  }

  /**
   * Load an impulse response from URL
   * @param {string} url - URL to IR file
   * @param {string} name - Name to cache as
   */
  async loadIR(url, name) {
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
      this._irCache.set(name, audioBuffer);
      return audioBuffer;
    } catch (e) {
      console.error(`Failed to load IR from ${url}:`, e);
      return null;
    }
  }

  /**
   * Set the active IR
   */
  _setIR(name) {
    const ir = this._irCache.get(name);
    if (ir) {
      this._convolver.buffer = ir;
      this._currentIR = name;
    }
  }

  /**
   * Generate synthetic plate reverb IR
   * Bright, dense, EMT-style
   */
  _generatePlateIR() {
    const sampleRate = this.context.sampleRate;
    const duration = 0.8; // 800ms
    const length = Math.floor(sampleRate * duration);
    const buffer = this.context.createBuffer(2, length, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);

      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;

        // Exponential decay
        const decay = Math.exp(-3 * t / duration);

        // Dense noise with high frequency content (plate character)
        const noise = (Math.random() * 2 - 1);

        // Add some early reflections
        let early = 0;
        if (i < sampleRate * 0.05) {
          const earlyIdx = Math.floor(i / (sampleRate * 0.01));
          if (earlyIdx < 5 && i % Math.floor(sampleRate * 0.01) < 10) {
            early = (Math.random() * 2 - 1) * 0.3;
          }
        }

        // Slight stereo variation
        const stereoOffset = channel === 0 ? 1 : 0.95;

        data[i] = (noise * decay + early) * 0.5 * stereoOffset;
      }
    }

    return buffer;
  }

  /**
   * Generate synthetic room reverb IR
   * Natural small space
   */
  _generateRoomIR() {
    const sampleRate = this.context.sampleRate;
    const duration = 0.5; // 500ms
    const length = Math.floor(sampleRate * duration);
    const buffer = this.context.createBuffer(2, length, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);

      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;

        // Faster decay than plate
        const decay = Math.exp(-5 * t / duration);

        // Noise with filtered character (room is darker)
        let noise = (Math.random() * 2 - 1);

        // Simple lowpass effect - average with neighbors
        if (i > 0 && i < length - 1) {
          noise = noise * 0.5 + (Math.random() * 2 - 1) * 0.25 + (Math.random() * 2 - 1) * 0.25;
        }

        // Distinct early reflections (room walls)
        let early = 0;
        const earlyTimes = [0.01, 0.018, 0.027, 0.035, 0.042];
        const earlyGains = [0.5, 0.35, 0.25, 0.18, 0.12];

        for (let j = 0; j < earlyTimes.length; j++) {
          const reflectSample = Math.floor(earlyTimes[j] * sampleRate);
          if (Math.abs(i - reflectSample) < 3) {
            early += earlyGains[j] * (channel === 0 ? 1 : 0.9);
          }
        }

        // Stereo width
        const stereoOffset = channel === 0 ? 1 : 0.92;

        data[i] = (noise * decay * 0.3 + early) * stereoOffset;
      }
    }

    return buffer;
  }

  /**
   * Set parameter
   */
  setParameter(name, value) {
    switch (name) {
      case 'mix':
        this._mix = Math.max(0, Math.min(1, value));
        this._wetGain.gain.value = this._mix;
        this._dryGain.gain.value = 1 - this._mix;
        break;

      case 'ir':
        if (this._irCache.has(value)) {
          this._setIR(value);
        } else {
          console.warn(`Reverb: unknown IR "${value}"`);
        }
        break;

      default:
        console.warn(`Reverb: unknown parameter ${name}`);
    }
  }

  /**
   * Load preset - override to handle IR
   */
  setPreset(presetId) {
    const preset = Reverb.PRESETS[presetId];
    if (!preset) {
      console.warn(`Reverb: unknown preset ${presetId}`);
      return;
    }

    if (preset.ir) {
      this._setIR(preset.ir);
    }
    if (preset.mix !== undefined) {
      this.setParameter('mix', preset.mix);
    }
  }

  /**
   * Get all parameters
   */
  getParameters() {
    return {
      mix: this._mix,
      ir: this._currentIR,
    };
  }

  /**
   * Set bypass
   */
  set bypass(value) {
    this._bypass = value;
    if (value) {
      this._wetGain.gain.value = 0;
      this._dryGain.gain.value = 1;
    } else {
      this._wetGain.gain.value = this._mix;
      this._dryGain.gain.value = 1 - this._mix;
    }
  }

  /**
   * Clean up
   */
  dispose() {
    this._convolver.disconnect();
    this._dryGain.disconnect();
    this._wetGain.disconnect();
    super.dispose();
  }
}

export default Reverb;
