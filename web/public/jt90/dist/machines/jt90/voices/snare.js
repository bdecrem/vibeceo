/**
 * JT90 Snare Voice
 *
 * 909-style snare drum with:
 * - Two tuned oscillators (body)
 * - Filtered noise (snare wires)
 * - Pitch envelope on body
 * - Independent envelopes for body and noise
 */

import { clamp, fastTanh } from '../../../../../jb202/dist/dsp/utils/math.js';
import { Noise } from '../../../../../jb202/dist/dsp/generators/index.js';

function triangleToSine(phase) {
  const tri = phase < 0.5 ? (phase * 4 - 1) : (3 - phase * 4);
  return fastTanh(tri * 1.2) / fastTanh(1.2);
}

export class SnareVoice {
  constructor(sampleRate = 44100) {
    this.sampleRate = sampleRate;

    // Parameters
    this.tune = 0;        // Tune in cents
    this.decay = 0.5;     // Overall decay
    this.tone = 0.5;      // Body vs noise mix (0 = more noise, 1 = more body)
    this.snappy = 0.5;    // Noise brightness
    this.level = 1.0;

    // Body oscillators (two slightly detuned)
    this.osc1Phase = 0;
    this.osc2Phase = 0;
    this.osc1Freq = 180;
    this.osc2Freq = 330;

    // Envelopes
    this.bodyEnvelope = 0;
    this.noiseEnvelope = 0;

    // Noise
    this.noise = new Noise(98765);
    this.noiseFilter = 0;
    this.noiseHP = 0;  // High-pass state

    // State
    this.active = false;
    this.sampleCount = 0;
  }

  trigger(velocity = 1.0) {
    this.osc1Phase = 0;
    this.osc2Phase = 0;
    this.sampleCount = 0;
    this.active = true;

    const v = velocity * this.level;
    this.bodyEnvelope = v;
    this.noiseEnvelope = v;

    // Set frequencies based on tune
    const tuneMultiplier = Math.pow(2, this.tune / 1200);
    this.osc1Freq = 180 * tuneMultiplier;
    this.osc2Freq = 330 * tuneMultiplier;

    // Reset noise
    this.noise.reset();
    this.noiseFilter = 0;
    this.noiseHP = 0;
  }

  processSample() {
    if (!this.active) return 0;

    this.sampleCount++;

    // Body oscillators with pitch envelope
    const pitchEnvTime = 0.02;  // 20ms
    const pitchDecay = Math.exp(-this.sampleCount / (pitchEnvTime * this.sampleRate));
    const freq1 = this.osc1Freq * (1 + pitchDecay * 0.5);
    const freq2 = this.osc2Freq * (1 + pitchDecay * 0.3);

    this.osc1Phase += freq1 / this.sampleRate;
    this.osc2Phase += freq2 / this.sampleRate;
    if (this.osc1Phase >= 1) this.osc1Phase -= 1;
    if (this.osc2Phase >= 1) this.osc2Phase -= 1;

    let body = triangleToSine(this.osc1Phase) * 0.6 + triangleToSine(this.osc2Phase) * 0.4;

    // Body envelope (fast decay)
    const bodyDecayTime = 0.05 + this.decay * 0.15;  // 50-200ms
    const bodyDecayRate = 1 - Math.exp(-4.6 / (bodyDecayTime * this.sampleRate));
    this.bodyEnvelope *= (1 - bodyDecayRate);

    body *= this.bodyEnvelope;

    // Noise component (filtered)
    let noiseSample = this.noise.nextSample();

    // Lowpass filter for noise
    const lpCutoff = 0.1 + this.snappy * 0.4;
    this.noiseFilter += lpCutoff * (noiseSample - this.noiseFilter);

    // Highpass filter to remove sub frequencies
    const hpCutoff = 0.05 + this.snappy * 0.1;
    const hpInput = this.noiseFilter;
    this.noiseHP += hpCutoff * (hpInput - this.noiseHP);
    noiseSample = hpInput - this.noiseHP;

    // Noise envelope (longer decay than body)
    const noiseDecayTime = 0.1 + this.decay * 0.3;  // 100-400ms
    const noiseDecayRate = 1 - Math.exp(-4.6 / (noiseDecayTime * this.sampleRate));
    this.noiseEnvelope *= (1 - noiseDecayRate);

    noiseSample *= this.noiseEnvelope;

    // Mix body and noise based on tone parameter
    const bodyMix = 0.3 + this.tone * 0.4;
    const noiseMix = 0.7 - this.tone * 0.4;
    let sample = body * bodyMix + noiseSample * noiseMix;

    // Soft saturation
    sample = fastTanh(sample * 1.3) / fastTanh(1.3);

    // Deactivate when quiet
    if (this.bodyEnvelope < 0.0001 && this.noiseEnvelope < 0.0001) {
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
      case 'snappy':
        this.snappy = clamp(value, 0, 1);
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

export default SnareVoice;
