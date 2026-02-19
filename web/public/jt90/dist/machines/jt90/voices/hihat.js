/**
 * JT90 Hi-Hat Voice
 *
 * 909-style hi-hat (purist synthesis, no samples):
 * - 6 square wave oscillators at inharmonic frequencies
 * - Ring modulation between oscillator pairs (metallic clang)
 * - 6-bit bitcrushing (909 lo-fi ROM grit)
 * - Per-oscillator decay stagger (shimmer)
 * - SVF bandpass (6-10kHz based on tone)
 * - Highpass: 5kHz closed, 500Hz open (lets body through)
 * - White noise "air" layer
 * - Closed hat chokes open hat
 */

import { clamp, fastTanh } from '../../../../../jb202/dist/dsp/utils/math.js';
import { Noise } from '../../../../../jb202/dist/dsp/generators/index.js';

// Inharmonic frequencies — dense non-musical spectrum
const HIHAT_FREQUENCIES = [
  205.3,
  304.4,
  369.6,
  522.7,
  800.0,
  1204.4
];

// Bitcrush to n-bit depth
function bitcrush(sample, bits) {
  const steps = Math.pow(2, bits);
  return Math.round(sample * steps) / steps;
}

export class HiHatVoice {
  constructor(sampleRate = 44100, type = 'closed') {
    this.sampleRate = sampleRate;
    this.type = type;

    // Parameters
    this.tune = 0;
    this.decay = type === 'closed' ? 0.3 : 0.7;
    this.tone = 0.5;
    this.level = 1.0;

    // 6 oscillator phases + per-oscillator envelopes
    this.phases = [0, 0, 0, 0, 0, 0];
    this.oscEnvelopes = [0, 0, 0, 0, 0, 0];
    this.frequencies = [...HIHAT_FREQUENCIES];

    // Noise
    this.noise = new Noise(33333);
    this.noiseEnvelope = 0;

    // SVF bandpass state
    this.bpLow = 0;
    this.bpBand = 0;

    // Highpass state
    this.hpState = 0;

    // Master envelope
    this.envelope = 0;

    // State
    this.active = false;
    this.choking = false;
    this.sampleCount = 0;
  }

  trigger(velocity = 1.0) {
    this.phases = [0, 0, 0, 0, 0, 0];
    this.sampleCount = 0;
    this.active = true;
    this.choking = false;

    const vel = velocity * this.level;
    this.envelope = vel;
    this.noiseEnvelope = vel;

    // Per-oscillator envelopes all start at full
    for (let i = 0; i < 6; i++) {
      this.oscEnvelopes[i] = vel;
    }

    // Update frequencies based on tune
    const tuneMultiplier = Math.pow(2, this.tune / 1200);
    this.frequencies = HIHAT_FREQUENCIES.map(f => f * tuneMultiplier);

    // Reset filter state
    this.noise.reset();
    this.bpLow = 0;
    this.bpBand = 0;
    this.hpState = 0;
  }

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

    // --- Decay time ---
    const decayTime = this.type === 'closed'
      ? 0.02 + this.decay * 0.28    // 20-300ms
      : 0.1 + this.decay * 0.9;     // 100ms-1s

    // --- 6 square wave oscillators ---
    const squares = [];
    for (let i = 0; i < 6; i++) {
      this.phases[i] += this.frequencies[i] / this.sampleRate;
      if (this.phases[i] >= 1) this.phases[i] -= 1;
      squares[i] = this.phases[i] < 0.5 ? 1 : -1;

      // Per-oscillator staggered decay
      const oscDecayTime = decayTime * (1 - i * 0.05);
      const oscDecayRate = 1 - Math.exp(-4.6 / (oscDecayTime * this.sampleRate));
      this.oscEnvelopes[i] *= (1 - oscDecayRate);
    }

    // --- Ring modulation: multiply oscillator pairs for metallic clang ---
    const ring0 = squares[0] * squares[1];  // 205 x 304
    const ring1 = squares[2] * squares[3];  // 370 x 523
    const ring2 = squares[4] * squares[5];  // 800 x 1204

    // Mix: raw squares + ring mod products
    let metallic = 0;
    for (let i = 0; i < 6; i++) {
      metallic += squares[i] * this.oscEnvelopes[i] / 12;
    }
    // Ring mod adds the dense clangorous spectrum
    const ringEnv = (this.oscEnvelopes[0] + this.oscEnvelopes[2] + this.oscEnvelopes[4]) / 3;
    metallic += (ring0 + ring1 + ring2) * ringEnv / 6;

    // --- 6-bit bitcrushing (909 lo-fi ROM character) ---
    metallic = bitcrush(metallic, 6);

    // --- White noise "air" layer ---
    let noiseSample = this.noise.nextSample();
    const noiseDecayRate = 1 - Math.exp(-4.6 / (decayTime * 0.5 * this.sampleRate));
    this.noiseEnvelope *= (1 - noiseDecayRate);
    const noiseLevel = 0.15 + this.tone * 0.25;
    noiseSample *= this.noiseEnvelope * noiseLevel;

    // --- Mix metallic + noise ---
    let sample = metallic * 0.2 + noiseSample;

    // --- SVF bandpass at 6-10kHz based on tone (clamped for stability) ---
    const bpFreq = 6000 + this.tone * 4000;
    const f = Math.min(2 * Math.sin(Math.PI * bpFreq / this.sampleRate), 1.2);
    const q = 0.5;

    this.bpLow += f * this.bpBand;
    const high = sample - this.bpLow - q * this.bpBand;
    this.bpBand += f * high;
    sample = this.bpBand;

    // --- Highpass: 5kHz closed (tight), 500Hz open (lets body through) ---
    const hpFreq = this.type === 'closed' ? 5000 : 500;
    const hpCut = hpFreq / this.sampleRate;
    this.hpState += hpCut * (sample - this.hpState);
    sample = sample - this.hpState;

    // --- Master envelope ---
    if (this.type === 'open' && !this.choking) {
      // Linear decay for open hat (that "shhhhh" tail)
      const linearRate = this.envelope / (decayTime * this.sampleRate);
      this.envelope -= linearRate;
      if (this.envelope < 0) this.envelope = 0;
    } else {
      // Exponential decay for closed hat
      const masterDecayRate = 1 - Math.exp(-4.6 / (decayTime * this.sampleRate));
      this.envelope *= (1 - masterDecayRate);
    }

    // Soft saturation
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
