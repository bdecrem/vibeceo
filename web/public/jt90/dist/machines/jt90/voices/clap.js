/**
 * JT90 Clap Voice
 *
 * 909-style hand clap with:
 * - Multiple filtered noise bursts (simulating multiple hands)
 * - Band-pass filtered noise
 * - Reverb-like tail
 */

import { clamp, fastTanh } from '../../../../jb202/dist/dsp/utils/math.js';
import { Noise } from './noise.js';

export class ClapVoice {
  constructor(sampleRate = 44100) {
    this.sampleRate = sampleRate;

    // Parameters
    this.tone = 0.5;      // Filter frequency (brightness)
    this.decay = 0.5;     // Tail length
    this.level = 1.0;

    // Noise
    this.noise = new Noise(11111);
    this.bpFilter1 = 0;
    this.bpFilter2 = 0;

    // Burst state
    this.burstIndex = 0;
    this.burstEnvelopes = [0, 0, 0, 0];  // 4 bursts
    this.tailEnvelope = 0;

    // State
    this.active = false;
    this.sampleCount = 0;
  }

  trigger(velocity = 1.0) {
    this.sampleCount = 0;
    this.burstIndex = 0;
    this.active = true;

    const v = velocity * this.level;

    // Initialize burst envelopes (staggered start times)
    this.burstEnvelopes = [v, 0, 0, 0];
    this.tailEnvelope = v * 0.7;

    // Reset noise and filters
    this.noise.reset();
    this.bpFilter1 = 0;
    this.bpFilter2 = 0;
  }

  processSample() {
    if (!this.active) return 0;

    const time = this.sampleCount / this.sampleRate;
    this.sampleCount++;

    // Generate filtered noise
    let noiseSample = this.noise.nextSample();

    // Band-pass filtering (two cascaded lowpass stages)
    const centerFreq = 800 + this.tone * 1200;  // 800-2000 Hz
    const cutoff = centerFreq / this.sampleRate * 2;
    this.bpFilter1 += cutoff * (noiseSample - this.bpFilter1);
    this.bpFilter2 += cutoff * (this.bpFilter1 - this.bpFilter2);

    // Subtract lowpass for highpass effect (creates bandpass)
    const filtered = this.bpFilter1 - this.bpFilter2 * 0.8;

    // Burst timing (4 bursts at ~5ms intervals, like multiple claps)
    const burstInterval = 0.005;  // 5ms between bursts
    const burstDuration = 0.003;  // 3ms per burst

    // Trigger new bursts
    for (let i = 0; i < 4; i++) {
      const burstStart = i * burstInterval;
      if (time >= burstStart && time < burstStart + 0.001 && this.burstEnvelopes[i] === 0) {
        this.burstEnvelopes[i] = this.level * (1 - i * 0.15);  // Slightly decreasing
      }
    }

    // Process burst envelopes
    let burstSum = 0;
    for (let i = 0; i < 4; i++) {
      if (this.burstEnvelopes[i] > 0) {
        const burstDecay = 1 - Math.exp(-4.6 / (burstDuration * this.sampleRate));
        this.burstEnvelopes[i] *= (1 - burstDecay);
        burstSum += this.burstEnvelopes[i];
      }
    }

    // Tail envelope (longer reverb-like decay)
    const tailTime = 0.1 + this.decay * 0.4;  // 100-500ms
    const tailDecay = 1 - Math.exp(-4.6 / (tailTime * this.sampleRate));
    this.tailEnvelope *= (1 - tailDecay);

    // Combine bursts and tail
    let sample = filtered * (burstSum * 0.6 + this.tailEnvelope * 0.4);

    // Soft saturation
    sample = fastTanh(sample * 1.5) / fastTanh(1.5);

    // Deactivate
    if (this.tailEnvelope < 0.0001 && burstSum < 0.0001) {
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
