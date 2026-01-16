/**
 * Reverb Effect
 *
 * Dattorro-style plate reverb with full parameter control.
 * Uses convolution with algorithmically generated impulse responses.
 *
 * Parameters:
 *   decay (0.5-10s) - Reverb tail length
 *   damping (0-1) - High-frequency rolloff (0=bright, 1=dark)
 *   predelay (0-100ms) - Gap before reverb starts
 *   modulation (0-1) - Subtle pitch wobble for shimmer
 *   lowcut (20-500Hz) - Remove low frequencies from tail
 *   highcut (2000-20000Hz) - Remove high frequencies
 *   width (0-1) - Stereo spread
 *   mix (0-1) - Wet/dry balance
 *
 * Usage:
 *   const reverb = new Reverb(audioContext);
 *   await reverb.init();
 *   reverb.setParameter('decay', 2.5);
 *   reverb.setParameter('damping', 0.4);
 *   reverb.setParameter('mix', 0.3);
 *
 *   source.connect(reverb.input);
 *   reverb.output.connect(destination);
 */

import { Effect } from './base.js';

export class Reverb extends Effect {
  // Genre-specific presets
  static PRESETS = {
    plate: { decay: 2, damping: 0.5, predelay: 20, modulation: 0.3, lowcut: 100, highcut: 8000, width: 1, mix: 0.3 },
    room: { decay: 0.8, damping: 0.6, predelay: 10, modulation: 0.1, lowcut: 80, highcut: 10000, width: 0.7, mix: 0.25 },
    hall: { decay: 3.5, damping: 0.4, predelay: 30, modulation: 0.4, lowcut: 60, highcut: 8000, width: 1, mix: 0.35 },
    tightDrums: { decay: 1, damping: 0.6, predelay: 10, modulation: 0.2, lowcut: 200, highcut: 8000, width: 0.8, mix: 0.2 },
    lushPads: { decay: 4, damping: 0.3, predelay: 40, modulation: 0.5, lowcut: 80, highcut: 10000, width: 1, mix: 0.4 },
    darkDub: { decay: 3, damping: 0.8, predelay: 50, modulation: 0.3, lowcut: 100, highcut: 4000, width: 1, mix: 0.35 },
    brightPop: { decay: 1.5, damping: 0.2, predelay: 15, modulation: 0.4, lowcut: 150, highcut: 12000, width: 0.9, mix: 0.2 },
    deepTechno: { decay: 2.5, damping: 0.5, predelay: 25, modulation: 0.3, lowcut: 100, highcut: 6000, width: 1, mix: 0.25 },
  };

  constructor(context) {
    super(context);

    // Convolver for wet signal
    this._convolver = context.createConvolver();

    // Dry/wet mix
    this._dryGain = context.createGain();
    this._wetGain = context.createGain();

    this._dryGain.gain.value = 0.7;
    this._wetGain.gain.value = 0.3;

    // Wire parallel dry/wet paths
    this._input.connect(this._dryGain);
    this._dryGain.connect(this._output);

    this._input.connect(this._convolver);
    this._convolver.connect(this._wetGain);
    this._wetGain.connect(this._output);

    // Default parameters
    this._params = {
      decay: 2,
      damping: 0.5,
      predelay: 20,
      modulation: 0.3,
      lowcut: 100,
      highcut: 8000,
      width: 1,
      mix: 0.3,
    };

    this._initialized = false;
  }

  /**
   * Initialize - generate default IR
   */
  async init() {
    this._regenerateIR();
    this._initialized = true;
  }

  /**
   * Generate Dattorro-style plate reverb impulse response
   */
  _regenerateIR() {
    const sampleRate = this.context.sampleRate;
    const p = this._params;

    // Clamp parameters
    const decay = Math.max(0.5, Math.min(10, p.decay));
    const damping = Math.max(0, Math.min(1, p.damping));
    const predelayMs = Math.max(0, Math.min(100, p.predelay));
    const modulation = Math.max(0, Math.min(1, p.modulation));
    const lowcut = Math.max(20, Math.min(500, p.lowcut));
    const highcut = Math.max(2000, Math.min(20000, p.highcut));
    const width = Math.max(0, Math.min(1, p.width));

    // Calculate buffer length
    const predelaySamples = Math.floor((predelayMs / 1000) * sampleRate);
    const tailSamples = Math.floor(decay * sampleRate * 1.5);
    const totalSamples = predelaySamples + tailSamples;

    const buffer = this.context.createBuffer(2, totalSamples, sampleRate);

    // Allpass diffusion delays (Dattorro-style prime numbers)
    const diffusionDelays = [142, 107, 379, 277, 419, 181, 521, 233];
    const diffusionCoeff = 0.625;

    // Generate reverb tail for each channel
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);

      // Predelay: silence
      for (let i = 0; i < predelaySamples; i++) {
        data[i] = 0;
      }

      const tailStart = predelaySamples;

      // Early reflections (first 50ms)
      const earlyEnd = tailStart + Math.floor(0.05 * sampleRate);
      const earlyReflections = [
        { delay: 0.007, gain: 0.8 },
        { delay: 0.011, gain: 0.7 },
        { delay: 0.019, gain: 0.6 },
        { delay: 0.027, gain: 0.5 },
        { delay: 0.031, gain: 0.45 },
        { delay: 0.041, gain: 0.35 },
      ];

      // Stereo offset for width
      const stereoPhase = ch === 0 ? 0 : Math.PI * 0.7 * width;
      const stereoMod = ch === 0 ? 1 : (1 - width * 0.5 + width * 0.5);

      for (const ref of earlyReflections) {
        const samplePos = tailStart + Math.floor(ref.delay * sampleRate);
        const stereoDelay = ch === 0 ? 0 : Math.floor(0.003 * sampleRate * width);
        if (samplePos + stereoDelay < data.length) {
          data[samplePos + stereoDelay] += ref.gain * (ch === 0 ? 1 : 0.95);
        }
      }

      // Late reverb tail - dense diffuse decay
      for (let i = earlyEnd; i < totalSamples; i++) {
        const t = (i - tailStart) / sampleRate;
        const tNorm = t / decay;

        // Multi-stage decay envelope
        const fastDecay = Math.exp(-4 * t / decay);
        const slowDecay = Math.exp(-2.5 * t / decay);
        const envelope = fastDecay * 0.6 + slowDecay * 0.4;

        // Damping: HF decay faster over time
        const dampingFactor = 1 - (damping * tNorm * 0.8);

        // Multi-frequency noise for density
        const phase1 = i * 0.0001 + stereoPhase;
        let noise = 0;
        noise += (Math.random() * 2 - 1) * 0.5;
        noise += Math.sin(i * 0.01 + ch * Math.PI) * (Math.random() * 0.3);
        noise += Math.sin(i * 0.003 + phase1) * (Math.random() * 0.2);

        // Modulation: subtle pitch wobble
        if (modulation > 0) {
          const modFreq = 0.5 + Math.random() * 1.5;
          const modDepth = modulation * 0.15;
          noise *= (1 + Math.sin(t * modFreq * Math.PI * 2 + ch * Math.PI * 0.5) * modDepth);
        }

        // Allpass diffusion
        for (const delay of diffusionDelays) {
          const sourceIdx = i - delay;
          if (sourceIdx >= tailStart && sourceIdx < i) {
            noise += (data[sourceIdx] || 0) * diffusionCoeff * 0.1;
          }
        }

        data[i] = noise * envelope * dampingFactor * 0.4 * stereoMod;
      }

      // Apply highcut (IIR lowpass)
      if (highcut < 15000) {
        const rc = 1 / (2 * Math.PI * highcut);
        const dt = 1 / sampleRate;
        const alpha = dt / (rc + dt);
        let prev = 0;
        for (let i = tailStart; i < totalSamples; i++) {
          prev = prev + alpha * (data[i] - prev);
          data[i] = prev;
        }
      }

      // Apply lowcut (IIR highpass)
      if (lowcut > 30) {
        const rc = 1 / (2 * Math.PI * lowcut);
        const dt = 1 / sampleRate;
        const alpha = rc / (rc + dt);
        let prevIn = 0;
        let prevOut = 0;
        for (let i = tailStart; i < totalSamples; i++) {
          const input = data[i];
          data[i] = alpha * (prevOut + input - prevIn);
          prevIn = input;
          prevOut = data[i];
        }
      }
    }

    // Normalize to prevent clipping
    let maxAmp = 0;
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < totalSamples; i++) {
        maxAmp = Math.max(maxAmp, Math.abs(data[i]));
      }
    }
    if (maxAmp > 0.5) {
      const normFactor = 0.5 / maxAmp;
      for (let ch = 0; ch < 2; ch++) {
        const data = buffer.getChannelData(ch);
        for (let i = 0; i < totalSamples; i++) {
          data[i] *= normFactor;
        }
      }
    }

    this._convolver.buffer = buffer;
  }

  /**
   * Set parameter
   */
  setParameter(name, value) {
    if (name === 'mix') {
      this._params.mix = Math.max(0, Math.min(1, value));
      this._wetGain.gain.value = this._params.mix;
      this._dryGain.gain.value = 1 - this._params.mix;
    } else if (name in this._params) {
      this._params[name] = value;
      // Regenerate IR when reverb params change (not mix)
      if (this._initialized) {
        this._regenerateIR();
      }
    } else {
      console.warn(`Reverb: unknown parameter ${name}`);
    }
  }

  /**
   * Get parameter value
   */
  getParameter(name) {
    return this._params[name];
  }

  /**
   * Load preset
   */
  setPreset(presetId) {
    const preset = Reverb.PRESETS[presetId];
    if (!preset) {
      console.warn(`Reverb: unknown preset ${presetId}`);
      return;
    }

    // Apply all preset parameters
    Object.entries(preset).forEach(([key, value]) => {
      this._params[key] = value;
    });

    // Update mix gains
    this._wetGain.gain.value = this._params.mix;
    this._dryGain.gain.value = 1 - this._params.mix;

    // Regenerate IR with new params
    if (this._initialized) {
      this._regenerateIR();
    }
  }

  /**
   * Get all parameters
   */
  getParameters() {
    return { ...this._params };
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
      this._wetGain.gain.value = this._params.mix;
      this._dryGain.gain.value = 1 - this._params.mix;
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
