/**
 * JT90 Cymbal Voice (Crash / Ride)
 *
 * 909-style cymbal — no-sample synthesis with 6-bit bitcrushing.
 *
 * CRASH: explosive, wide, sizzling
 *   - HP noise (2kHz) is the primary body
 *   - Brief 20ms metallic shimmer at impact
 *   - Phase mod "shatter" transient
 *
 * RIDE: bell-like "ping", rhythmic, driving
 *   - Metallic ping is the primary character (sustained)
 *   - Less noise, more focused bell tones
 *   - Velocity → brightness (harder = brighter)
 *   - HP at 400Hz to stay out of kick/bass
 */

import { clamp, fastTanh } from '../../../../../jb202/dist/dsp/utils/math.js';
import { Noise } from '../../../../../jb202/dist/dsp/generators/index.js';

// Crash: wide spread for "shatter"
// Ride: tighter bell-like cluster
const CYMBAL_FREQUENCIES = {
  crash: [4210, 5890, 7130, 9340],
  ride:  [2830, 3760, 5140, 6950]
};

// Bitcrush to n-bit depth
function bitcrush(sample, bits) {
  const steps = Math.pow(2, bits);
  return Math.round(sample * steps) / steps;
}

export class CymbalVoice {
  constructor(sampleRate = 44100, type = 'crash') {
    this.sampleRate = sampleRate;
    this.type = type;

    // Parameters
    this.tune = 0;
    this.decay = type === 'crash' ? 0.7 : 0.5;
    this.tone = 0.5;
    this.level = 1.0;

    // Crash: 4 metallic sine oscillators
    // Ride: FM carrier + modulator (single pair, no beating)
    this.phases = [0, 0, 0, 0];
    this.frequencies = [...(CYMBAL_FREQUENCIES[type] || CYMBAL_FREQUENCIES.crash)];

    // Ride FM state
    this.carrierPhase = 0;
    this.modPhase = 0;
    this.fmIndex = 0;  // FM index (decays for bright→mellow)

    // Noise
    this.noise = new Noise(type === 'crash' ? 77777 : 99999);
    this.hpState = 0;

    // Phase mod noise (crash impact transient)
    this.modNoise = new Noise(88888);
    this.modEnvelope = 0;

    // Envelopes
    this.envelope = 0;
    this.metalEnvelope = 0;
    this.velocity = 1.0;

    // State
    this.active = false;
    this.sampleCount = 0;
  }

  trigger(velocity = 1.0) {
    this.phases = [0, 0, 0, 0];
    this.sampleCount = 0;
    this.active = true;
    this.velocity = velocity;

    const vel = velocity * this.level;
    this.envelope = vel;
    this.metalEnvelope = vel;
    this.modEnvelope = vel;

    // Ride FM: reset phases, set initial brightness
    this.carrierPhase = 0;
    this.modPhase = 0;
    this.fmIndex = 3.0 + this.velocity * 2.0;  // Harder hit = brighter

    // Update frequencies based on tune
    const tuneMultiplier = Math.pow(2, this.tune / 1200);
    const baseFreqs = CYMBAL_FREQUENCIES[this.type] || CYMBAL_FREQUENCIES.crash;
    this.frequencies = baseFreqs.map(f => f * tuneMultiplier);

    // Reset
    this.noise.reset();
    this.modNoise.reset();
    this.hpState = 0;
  }

  processSample() {
    if (!this.active) return 0;

    this.sampleCount++;

    if (this.type === 'ride') {
      return this._processRide();
    } else {
      return this._processCrash();
    }
  }

  _processCrash() {
    // --- HP-filtered white noise (primary body, 2kHz cutoff) ---
    let noiseSample = this.noise.nextSample();
    const hpCut = 2000 / this.sampleRate;
    this.hpState += hpCut * (noiseSample - this.hpState);
    noiseSample = noiseSample - this.hpState;

    // --- Phase modulation burst ("shatter" transient, ~10ms) ---
    const modDecayRate = 1 - Math.exp(-4.6 / (0.01 * this.sampleRate));
    this.modEnvelope *= (1 - modDecayRate);
    const phaseMod = this.modNoise.nextSample() * this.modEnvelope * 0.5;

    // --- 4 metallic sine oscillators ---
    let metallic = 0;
    for (let i = 0; i < 4; i++) {
      this.phases[i] += this.frequencies[i] / this.sampleRate;
      if (this.phases[i] >= 1) this.phases[i] -= 1;
      const phase = this.phases[i] + phaseMod;
      metallic += Math.sin(phase * 2 * Math.PI) / 4;
    }

    // --- Metallic envelope: brief 20ms shimmer ---
    const metalDecayRate = 1 - Math.exp(-4.6 / (0.02 * this.sampleRate));
    this.metalEnvelope *= (1 - metalDecayRate);

    // --- Mix: noise body + brief metallic shimmer ---
    const metalLevel = 0.15 + this.tone * 0.25;
    let sample = noiseSample * 0.6 + metallic * this.metalEnvelope * metalLevel;

    // --- 6-bit bitcrushing ---
    sample = bitcrush(sample, 6);

    // --- Main envelope ---
    const decayTime = 0.5 + this.decay * 2.5;  // 500ms - 3s
    const decayRate = 1 - Math.exp(-4.6 / (decayTime * this.sampleRate));
    this.envelope *= (1 - decayRate);
    sample *= this.envelope;

    // --- Dusty VCA tail ---
    if (this.envelope > 0.001) {
      sample += this.noise.nextSample() * 0.008;
    }

    sample = fastTanh(sample * 1.5) / fastTanh(1.5);

    if (this.envelope < 0.0001) this.active = false;
    return sample;
  }

  _processRide() {
    // --- FM bell synthesis (single carrier/mod pair = no beating) ---
    // Carrier ~3.5kHz, modulator at golden ratio (inharmonic = metallic)
    const tuneMultiplier = Math.pow(2, this.tune / 1200);
    const carrierFreq = 3500 * tuneMultiplier;
    const modRatio = 1.6180339;  // Golden ratio — maximally inharmonic
    const modFreq = carrierFreq * modRatio;

    // FM index decays: bright "ping" attack → mellow sustain
    const indexDecayRate = 1 - Math.exp(-4.6 / (0.08 * this.sampleRate));
    this.fmIndex *= (1 - indexDecayRate);
    // Tone adds sustained brightness
    const fmIndex = this.fmIndex + this.tone * 1.5;

    // Modulator
    this.modPhase += modFreq / this.sampleRate;
    if (this.modPhase >= 1) this.modPhase -= 1;
    const modSignal = Math.sin(this.modPhase * 2 * Math.PI) * fmIndex;

    // Carrier (frequency-modulated by modulator)
    this.carrierPhase += (carrierFreq + modSignal * carrierFreq) / this.sampleRate;
    if (this.carrierPhase >= 1) this.carrierPhase -= 1;
    let bell = Math.sin(this.carrierPhase * 2 * Math.PI);

    // --- Noise "air" layer ---
    let noiseSample = this.noise.nextSample();
    const hpCut = 400 / this.sampleRate;
    this.hpState += hpCut * (noiseSample - this.hpState);
    noiseSample = noiseSample - this.hpState;
    noiseSample = bitcrush(noiseSample, 6);

    // --- Mix: FM bell + noise air ---
    const noiseMix = 0.1 + this.velocity * 0.15;
    let sample = bell * 0.5 + noiseSample * noiseMix;

    // --- Main envelope ---
    const decayTime = 0.3 + this.decay * 1.2;  // 300ms - 1.5s
    const decayRate = 1 - Math.exp(-4.6 / (decayTime * this.sampleRate));
    this.envelope *= (1 - decayRate);
    sample *= this.envelope;

    // --- Dusty VCA tail ---
    if (this.envelope > 0.001) {
      sample += this.noise.nextSample() * 0.005;
    }

    sample = fastTanh(sample * 1.5) / fastTanh(1.5);

    if (this.envelope < 0.0001) this.active = false;
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

export default CymbalVoice;
