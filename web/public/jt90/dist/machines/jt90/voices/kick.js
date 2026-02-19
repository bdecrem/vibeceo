/**
 * JT90 Kick Voice
 *
 * 909-style kick drum based on TR-909 circuit analysis:
 * - Triangle VCO → diode-clipper waveshaper (tanh soft-clip)
 * - Pitch envelope: 150-400Hz → ~55Hz, 3-10ms exponential decay
 * - Dual-exponential amplitude envelope (0.7*fast + 0.3*slow) for punch + sustain
 * - Click transient: bandpass-filtered impulse + lowpass-filtered noise, ~3ms EG2
 *
 * All processing is pure JS - identical output on web and Node.js.
 */

import { clamp, fastTanh } from '../../../../../jb202/dist/dsp/utils/math.js';
import { Noise } from '../../../../../jb202/dist/dsp/generators/index.js';

/**
 * Triangle → quasi-sine via soft saturation
 * Matches 909's diode-clipper waveshaping of triangle VCO
 */
function triangleToSine(phase) {
  const tri = phase < 0.5 ? (phase * 4 - 1) : (3 - phase * 4);
  return fastTanh(tri * 1.2) / fastTanh(1.2);
}

export class KickVoice {
  constructor(sampleRate = 44100) {
    this.sampleRate = sampleRate;

    // Parameters (0-1 engine scale unless noted)
    this.tune = 0;        // Cents offset (-1200 to +1200) on base frequency
    this.decay = 0.5;     // Amplitude envelope duration (0-1)
    this.attack = 0.5;    // Click/transient level (0-1), NOT attack time
    this.sweep = 0.5;     // Pitch envelope sweep depth (0-1)
    this.level = 1.0;     // Output level (0-1)

    // State
    this.phase = 0;
    this.frequency = 55;
    this.baseFreq = 55;
    this.startFreq = 200;
    this.active = false;
    this.sampleCount = 0;

    // Dual-exponential amplitude envelope state
    this.envFast = 0;
    this.envSlow = 0;

    // Pitch envelope
    this.pitchEnv = 0;

    // Click transient state
    this.clickEnv = 0;
    this.clickBpfX1 = 0;
    this.clickBpfX2 = 0;
    this.clickBpfY1 = 0;
    this.clickBpfY2 = 0;

    // Precompute click BPF coefficients (resonant BPF at ~5kHz, Q=3)
    const w0 = 2 * Math.PI * 5000 / sampleRate;
    const sinW0 = Math.sin(w0);
    const cosW0 = Math.cos(w0);
    const alpha = sinW0 / (2 * 3);
    const a0 = 1 + alpha;
    this.bpfB0 = alpha / a0;
    this.bpfB2 = -alpha / a0;
    this.bpfA1 = (-2 * cosW0) / a0;
    this.bpfA2 = (1 - alpha) / a0;

    // Noise for click
    this.noise = new Noise(54321);
    this.noiseFilter = 0;
  }

  /**
   * Trigger the kick drum
   */
  trigger(velocity = 1.0) {
    this.phase = 0;
    this.sampleCount = 0;
    this.active = true;

    const vel = velocity * this.level;

    // Dual-exponential amplitude: both components start at peak
    this.envFast = vel;
    this.envSlow = vel;

    // Pitch envelope starts at 1.0
    this.pitchEnv = 1.0;

    // Base frequency: ~55Hz with tune offset
    const tuneMultiplier = Math.pow(2, this.tune / 1200);
    this.baseFreq = 55 * tuneMultiplier;

    // Sweep depth: 150-400Hz start frequency (909 spec)
    this.startFreq = this.baseFreq + 95 + this.sweep * 250;
    this.frequency = this.startFreq;

    // Click envelope
    this.clickEnv = vel * this.attack;

    // Reset click BPF state
    this.clickBpfX1 = 0;
    this.clickBpfX2 = 0;
    this.clickBpfY1 = 0;
    this.clickBpfY2 = 0;

    // Reset noise
    this.noise.reset();
    this.noiseFilter = 0;
  }

  /**
   * Generate one audio sample
   */
  processSample() {
    if (!this.active) return 0;

    this.sampleCount++;
    const dt = 1 / this.sampleRate;

    // --- Pitch envelope: 3-10ms exponential decay (909 spec) ---
    const pitchTC = 0.003 + this.sweep * 0.007;
    this.pitchEnv *= Math.exp(-dt / pitchTC);
    this.frequency = this.baseFreq + (this.startFreq - this.baseFreq) * this.pitchEnv;

    // --- Main body: triangle-to-sine oscillator ---
    this.phase += this.frequency / this.sampleRate;
    if (this.phase >= 1) this.phase -= 1;
    let sample = triangleToSine(this.phase);

    // --- Dual-exponential amplitude envelope (909 signature shape) ---
    // 0.7 * fast-decay + 0.3 * slow-decay = convex punch-then-sustain
    const fastTC = 0.05 + this.decay * 0.05;
    const slowTC = 0.2 + this.decay * 0.6;
    this.envFast *= Math.exp(-dt / fastTC);
    this.envSlow *= Math.exp(-dt / slowTC);
    const amp = 0.7 * this.envFast + 0.3 * this.envSlow;

    sample *= amp;

    // --- Click transient (EG2: ~3ms decay) ---
    if (this.attack > 0.05 && this.sampleCount < this.sampleRate * 0.01) {
      const clickDecay = Math.exp(-this.sampleCount * dt / 0.003);

      // Bandpass-filtered impulse (resonant BPF ~5kHz)
      const impulse = this.sampleCount <= 2 ? 1.0 : 0.0;
      const bpfOut = this.bpfB0 * impulse + this.bpfB2 * this.clickBpfX2
                   - this.bpfA1 * this.clickBpfY1 - this.bpfA2 * this.clickBpfY2;
      this.clickBpfX2 = this.clickBpfX1;
      this.clickBpfX1 = impulse;
      this.clickBpfY2 = this.clickBpfY1;
      this.clickBpfY1 = bpfOut;

      // Lowpass-filtered noise burst (~3kHz cutoff)
      const noiseSample = this.noise.nextSample();
      this.noiseFilter += 0.3 * (noiseSample - this.noiseFilter);

      sample += (bpfOut + this.noiseFilter * 0.5) * clickDecay * this.clickEnv;
    }

    // Soft saturation for warmth
    sample = fastTanh(sample * 1.5) / fastTanh(1.5);

    // NaN guard — protect AudioContext from corruption
    if (sample !== sample) {
      this.active = false;
      return 0;
    }

    // Deactivate: envelope negligible OR hard 2s cutoff
    if ((amp < 0.001 && this.sampleCount > this.sampleRate * 0.1) ||
        this.sampleCount > this.sampleRate * 2) {
      this.active = false;
    }

    return sample;
  }

  /**
   * Set parameter
   */
  setParameter(id, value) {
    switch (id) {
      case 'tune':
        this.tune = clamp(value, -1200, 1200);
        break;
      case 'decay':
        this.decay = clamp(value, 0, 1);
        break;
      case 'attack':
        this.attack = clamp(value, 0, 1);
        break;
      case 'sweep':
        this.sweep = clamp(value, 0, 1);
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

export default KickVoice;
