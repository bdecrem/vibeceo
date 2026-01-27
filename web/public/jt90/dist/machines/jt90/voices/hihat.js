/**
 * JT90 Hi-Hat Voice
 *
 * 909-style hi-hat with:
 * - 6 square wave oscillators at metallic frequencies
 * - High-pass filtered noise
 * - Short (closed) or long (open) decay
 */

import { clamp, fastTanh } from '../../../../../jb202/dist/dsp/utils/math.js';
import { Noise } from '../../../../../jb202/dist/dsp/generators/index.js';

// Classic 909 hi-hat frequencies (Hz) - metallic ring
const HIHAT_FREQUENCIES = [
  263.0,  // Fundamental frequencies create
  400.0,  // metallic, bell-like tones
  421.0,
  474.0,
  587.0,
  845.0
];

export class HiHatVoice {
  constructor(sampleRate = 44100, type = 'closed') {
    this.sampleRate = sampleRate;
    this.type = type;  // 'closed' or 'open'

    // Parameters
    this.tune = 0;
    this.decay = type === 'closed' ? 0.3 : 0.7;
    this.tone = 0.5;  // Metal vs noise mix
    this.level = 1.0;

    // Oscillator phases (6 metallic oscillators)
    this.phases = [0, 0, 0, 0, 0, 0];
    this.frequencies = [...HIHAT_FREQUENCIES];

    // Noise
    this.noise = new Noise(33333);
    this.hpFilter = 0;
    this.lpFilter = 0;

    // Envelope
    this.envelope = 0;

    // State
    this.active = false;
    this.sampleCount = 0;

    // Choke callback (for closed hat cutting open hat)
    this.onChoke = null;
  }

  trigger(velocity = 1.0) {
    this.phases = [0, 0, 0, 0, 0, 0];
    this.sampleCount = 0;
    this.active = true;

    this.envelope = velocity * this.level;

    // Update frequencies based on tune
    const tuneMultiplier = Math.pow(2, this.tune / 1200);
    this.frequencies = HIHAT_FREQUENCIES.map(f => f * tuneMultiplier);

    // Reset noise
    this.noise.reset();
    this.hpFilter = 0;
    this.lpFilter = 0;
  }

  /**
   * Choke the hi-hat (used when closed hat cuts open hat)
   */
  choke() {
    if (this.active) {
      this.choking = true;
    }
  }

  processSample() {
    if (!this.active) return 0;

    this.sampleCount++;

    // Handle choke (rapid fadeout)
    if (this.choking) {
      this.envelope *= 0.95;
      if (this.envelope < 0.001) {
        this.active = false;
        this.choking = false;
        return 0;
      }
    }

    // Generate metallic oscillators (square waves at inharmonic frequencies)
    let metallic = 0;
    for (let i = 0; i < 6; i++) {
      this.phases[i] += this.frequencies[i] / this.sampleRate;
      if (this.phases[i] >= 1) this.phases[i] -= 1;

      // Square wave with slight filtering
      const square = this.phases[i] < 0.5 ? 1 : -1;
      metallic += square / 6;  // Equal mix
    }

    // Generate noise component
    let noiseSample = this.noise.nextSample();

    // High-pass filter on noise (remove low frequencies)
    const hpCutoff = 0.3;
    this.hpFilter += hpCutoff * (noiseSample - this.hpFilter);
    noiseSample = noiseSample - this.hpFilter;

    // Low-pass to tame harshness
    const lpCutoff = 0.2 + this.tone * 0.3;
    this.lpFilter += lpCutoff * (noiseSample - this.lpFilter);
    noiseSample = this.lpFilter;

    // Mix metallic and noise based on tone
    const metallicMix = 0.3 + this.tone * 0.4;
    const noiseMix = 0.7 - this.tone * 0.4;
    let sample = metallic * metallicMix + noiseSample * noiseMix;

    // Envelope decay
    const decayTime = this.type === 'closed'
      ? 0.02 + this.decay * 0.08    // 20-100ms for closed
      : 0.1 + this.decay * 0.9;     // 100ms-1s for open

    const decayRate = 1 - Math.exp(-4.6 / (decayTime * this.sampleRate));
    this.envelope *= (1 - decayRate);

    sample *= this.envelope;

    // High-frequency boost for crispness
    sample = fastTanh(sample * 2) / fastTanh(2);

    // Deactivate
    if (this.envelope < 0.0001) {
      this.active = false;
    }

    return sample;
  }

  setParameter(id, value) {
    switch (id) {
      case 'tune':
        this.tune = clamp(value, -1200, 1200);
        break;
      case 'decay':
        this.decay = clamp(value, 0, 1);
        break;
      case 'tone':
        this.tone = clamp(value, 0, 1);
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

export default HiHatVoice;
