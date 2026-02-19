/**
 * JT90 Clap Voice
 *
 * 909-style hand clap:
 * - 4 noise bursts (10-20ms) spaced ~10ms apart (multiple hands)
 * - Bandpass filtered noise tail (1-1.5kHz)
 * - Bitcrushing for the 909's low-res ROM grit
 * - Highpass at 200Hz to stay out of kick's way
 * - tone: filter brightness, decay: tail length
 */

import { clamp, fastTanh } from '../../../../../jb202/dist/dsp/utils/math.js';
import { Noise } from '../../../../../jb202/dist/dsp/generators/index.js';

// Bitcrush to n-bit depth
function bitcrush(sample, bits) {
  const steps = Math.pow(2, bits);
  return Math.round(sample * steps) / steps;
}

export class ClapVoice {
  constructor(sampleRate = 44100) {
    this.sampleRate = sampleRate;

    // Parameters
    this.tone = 0.13;
    this.decay = 0.03;
    this.level = 1.0;

    // Noise source
    this.noise = new Noise(11111);

    // Bandpass filter state (gentle SVF)
    this.svfBand = 0;
    this.svfLow = 0;

    // Highpass filter state (cut below 200Hz)
    this.hpState = 0;

    // State
    this.active = false;
    this.sampleCount = 0;
    this.velocity = 1.0;
  }

  trigger(velocity = 1.0) {
    this.sampleCount = 0;
    this.active = true;
    this.velocity = velocity * this.level;

    this.noise.reset();
    this.svfBand = 0;
    this.svfLow = 0;
    this.hpState = 0;
  }

  processSample() {
    if (!this.active) return 0;

    const time = this.sampleCount / this.sampleRate;
    this.sampleCount++;

    // --- Burst envelope: 4 bursts, ~15ms on, ~10ms gap ---
    const burstOn = 0.015;
    const burstGap = 0.010;
    const burstCycle = burstOn + burstGap;
    const burstCount = 4;
    const burstEnd = burstCycle * burstCount;

    let burstEnv = 0;
    if (time < burstEnd) {
      const posInCycle = time % burstCycle;
      if (posInCycle < burstOn) {
        // Fast attack, exponential decay within burst
        const progress = posInCycle / burstOn;
        burstEnv = Math.exp(-progress * 4);
      }
      // Each successive burst slightly quieter
      const burstIndex = Math.floor(time / burstCycle);
      burstEnv *= (1 - burstIndex * 0.1);
    }

    // --- Tail: 300-500ms filtered noise decay ---
    const tailDecayTime = 0.08 + this.decay * 0.4;  // 80-480ms
    let tailEnv = 0;
    if (time >= burstEnd * 0.6) {
      const tailAge = time - burstEnd * 0.6;
      tailEnv = 0.45 * Math.exp(-tailAge / tailDecayTime);
    }

    const envelope = this.velocity * (burstEnv + tailEnv);

    // --- Noise source ---
    let raw = this.noise.nextSample();

    // --- Bitcrush (12-bit: the 909 ROM grit) ---
    raw = bitcrush(raw, 12);

    // --- Bandpass filter (SVF, moderate resonance) ---
    // Center 1000-1500Hz based on tone
    const centerFreq = 1000 + this.tone * 500;
    const f = 2 * Math.sin(Math.PI * centerFreq / this.sampleRate);
    const q = 0.7;  // Moderate resonance — punchy, not piercing

    this.svfLow += f * this.svfBand;
    const high = raw - this.svfLow - q * this.svfBand;
    this.svfBand += f * high;

    let sample = this.svfBand;

    // --- Highpass at 200Hz (keep out of kick territory) ---
    const hpCut = 200 / this.sampleRate;
    this.hpState += hpCut * (sample - this.hpState);
    sample = sample - this.hpState;

    // Apply envelope
    sample *= envelope;

    // --- Mild saturation (glue the bursts) ---
    sample = fastTanh(sample * 1.5) / fastTanh(1.5);

    // Deactivate
    if (envelope < 0.0001 && time > burstEnd) {
      this.active = false;
    }

    return sample;
  }

  setParameter(id, value) {
    switch (id) {
      case 'tone':
        this.tone = clamp(value, 0, 1);
        break;
      case 'decay':
        this.decay = clamp(value, 0, 1);
        break;
      case 'level':
        this.level = clamp(value, 0, 1);
        break;
    }
  }

  isActive() {
    return this.active;
  }
}

export default ClapVoice;
