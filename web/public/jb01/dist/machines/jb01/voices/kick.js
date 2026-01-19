/**
 * JB01 Kick Voice
 *
 * 909-style kick drum with tunable parameters:
 * - tune: pitch adjustment in cents
 * - decay: body length
 * - attack: click intensity and pitch sweep rate
 * - sweep: pitch envelope depth
 * - level: output level
 *
 * Based on TR-909 circuit: triangle oscillator → waveshaper → sine-like output
 */
import { Voice } from '../../../core/voice.js';

export class KickVoice extends Voice {
  constructor(id, context) {
    super(id, context);
    this.tune = 0;      // cents (±1200 = ±1 octave)
    this.decay = 0.4;   // 0-1 (maps to 150ms-1s) - 909-style tight punch
    this.attack = 1.0;  // 0-1 (click intensity) - 909-style clicky
    this.sweep = 1;     // 0-1 (pitch envelope depth)
    this.level = 1;     // 0-1

    // Pre-render the complete kick sound for 100% consistent playback
    this._renderCompleteKick();
  }

  /**
   * Pre-render the COMPLETE kick sound (body + click + envelope) to a single buffer.
   * This guarantees 100% identical playback every time - no Web Audio timing quirks.
   */
  _renderCompleteKick() {
    const sampleRate = this.context.sampleRate;
    const duration = 1.5; // Max kick length
    const length = Math.ceil(sampleRate * duration);

    // Create output buffer
    this.kickBuffer = this.context.createBuffer(1, length, sampleRate);
    const output = this.kickBuffer.getChannelData(0);

    // Parameters for rendering
    const baseFreq = 55;
    const sweepMultiplier = 1 + this.sweep * 3;  // 1x to 4x
    const peakFreq = baseFreq * sweepMultiplier;
    const sweepTime = 0.01 + (1 - this.attack) * 0.04;  // 10-50ms
    const decayTime = 0.2 + (this.decay * 0.8);
    const decayTau = decayTime * 0.25;
    const clickAmount = this.attack;
    const twoPi = Math.PI * 2;

    // === RENDER KICK BODY (sine with pitch sweep + saturation + envelope) ===
    let phase = 0;
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;

      // Pitch envelope
      let freq;
      if (t < sweepTime && this.sweep > 0.01) {
        const progress = t / sweepTime;
        freq = peakFreq * Math.pow(baseFreq / peakFreq, progress);
      } else {
        freq = baseFreq;
      }
      phase += twoPi * freq / sampleRate;

      // Sine oscillator
      let sample = Math.sin(phase);

      // Soft saturation (tanh)
      sample = Math.tanh(sample * 1.5) / Math.tanh(1.5);

      // Amplitude envelope (exponential decay)
      const env = Math.exp(-Math.max(0, t - 0.001) / decayTau);
      sample *= env;

      output[i] = sample;
    }

    // === ADD CLICK TRANSIENT ===
    if (clickAmount > 0.1) {
      // Impulse (first ~32 samples)
      for (let i = 0; i < 32; i++) {
        const t = i / sampleRate;
        const impulse = (i < 8 ? 1 : 0) * Math.exp(-i / 6);
        output[i] += impulse * clickAmount * 0.5;
      }

      // Noise burst (first ~128 samples, lowpass filtered)
      // Pre-generate deterministic noise
      let seed = 12345;
      const noiseRaw = new Float32Array(128);
      for (let i = 0; i < 128; i++) {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        const rand = (seed / 0x7fffffff) * 2 - 1;
        noiseRaw[i] = rand * Math.exp(-i / 20);
      }

      // Simple 1-pole lowpass filter (approx 3kHz at 44.1kHz)
      const fc = 3000 / sampleRate;
      const alpha = fc / (fc + 1);
      let filtered = 0;
      for (let i = 0; i < 128; i++) {
        filtered = alpha * noiseRaw[i] + (1 - alpha) * filtered;
        output[i] += filtered * clickAmount * 0.3;
      }
    }

    // Store params so we know when to re-render
    this._renderedParams = { attack: this.attack, sweep: this.sweep, decay: this.decay };
  }

  /**
   * Re-render kick if parameters changed significantly
   */
  _maybeRerender() {
    if (!this._renderedParams) {
      this._renderCompleteKick();
      return;
    }
    const p = this._renderedParams;
    if (Math.abs(p.attack - this.attack) > 0.01 ||
        Math.abs(p.sweep - this.sweep) > 0.01 ||
        Math.abs(p.decay - this.decay) > 0.01) {
      this._renderCompleteKick();
    }
  }

  trigger(time, velocity) {
    // Re-render if params changed
    this._maybeRerender();

    const peak = Math.max(0, Math.min(1, velocity * this.level));
    const tuneMultiplier = Math.pow(2, this.tune / 1200);

    // Snap time to sample boundary for consistent playback
    const sampleRate = this.context.sampleRate;
    const sampleTime = Math.round(time * sampleRate) / sampleRate;

    // Play the pre-rendered kick buffer
    const source = this.context.createBufferSource();
    source.buffer = this.kickBuffer;
    source.playbackRate.value = tuneMultiplier;

    // Apply velocity/level scaling
    const gain = this.context.createGain();
    gain.gain.value = peak;

    source.connect(gain);
    gain.connect(this.output);
    source.start(sampleTime, 0);
  }

  setParameter(id, value) {
    switch (id) {
      case 'tune':
        this.tune = value;
        break;
      case 'decay':
        this.decay = Math.max(0.05, Math.min(1, value));
        break;
      case 'attack':
        this.attack = Math.max(0, Math.min(1, value));
        // Regenerate kick body when attack changes (affects sweep time)
        this._renderCompleteKick();
        break;
      case 'sweep':
        this.sweep = Math.max(0, Math.min(1, value));
        // Regenerate kick body when sweep changes (affects pitch envelope)
        this._renderCompleteKick();
        break;
      case 'level':
        this.level = Math.max(0, Math.min(1, value));
        break;
      default:
        super.setParameter(id, value);
    }
  }

  get parameterDescriptors() {
    return [
      {
        id: 'tune',
        label: 'Tune',
        range: { min: -1200, max: 1200, step: 10, unit: 'cents' },
        defaultValue: 0,
      },
      {
        id: 'decay',
        label: 'Decay',
        range: { min: 0.05, max: 1, step: 0.01 },
        defaultValue: 0.4,
      },
      {
        id: 'attack',
        label: 'Attack',
        range: { min: 0, max: 1, step: 0.01 },
        defaultValue: 1.0,
      },
      {
        id: 'sweep',
        label: 'Sweep',
        range: { min: 0, max: 1, step: 0.01 },
        defaultValue: 1,
      },
      {
        id: 'level',
        label: 'Level',
        range: { min: 0, max: 1, step: 0.01 },
        defaultValue: 1,
      },
      ...super.parameterDescriptors,
    ];
  }
}
