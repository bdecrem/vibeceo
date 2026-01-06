import { Voice } from '../../../core/voice.js';
import type {
  VoiceId,
  VoiceParameterDescriptor,
} from '../../../core/types.js';

export class Kick909 extends Voice {
  private tune = 0; // cents (±1200 = ±1 octave)
  private decay = 0.8;
  private attack = 0.5; // click intensity 0-1
  private level = 1;

  constructor(id: VoiceId, context: BaseAudioContext) {
    super(id, context);
  }

  // Creates a soft-clip curve that shapes sawtooth into rounded pseudo-sine
  // This mimics the 909's sawtooth→waveshaper→sine circuit
  private createSoftClipCurve(): Float32Array {
    const samples = 8192;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1; // -1 to 1
      // Soft saturation: tanh-like curve that rounds harsh edges
      curve[i] = Math.tanh(x * 1.5) * 0.9;
    }
    return curve;
  }

  override trigger(time: number, velocity: number): void {
    const peak = Math.max(0, Math.min(1, velocity * this.level));
    const tuneMultiplier = Math.pow(2, this.tune / 1200);

    // === MAIN BODY: Sawtooth → Waveshaper, 165Hz (E3) → 30Hz ===
    const mainOsc = this.context.createOscillator();
    mainOsc.type = 'sawtooth'; // Real 909 uses sawtooth, shaped into sine
    const mainStartFreq = 165 * tuneMultiplier; // E3 = 164.81Hz, the authentic 909 tuning
    const mainEndFreq = 30 * tuneMultiplier;
    mainOsc.frequency.setValueAtTime(mainStartFreq, time);
    mainOsc.frequency.exponentialRampToValueAtTime(mainEndFreq, time + 0.08);

    // Waveshaper rounds the sawtooth into pseudo-sine
    const shaper = this.context.createWaveShaper();
    shaper.curve = this.createSoftClipCurve() as unknown as Float32Array<ArrayBuffer>;
    shaper.oversample = '2x';

    const mainGain = this.context.createGain();
    mainGain.gain.setValueAtTime(peak, time);
    mainGain.gain.setTargetAtTime(0, time + 0.02, this.decay * 0.3);

    mainOsc.connect(shaper);
    shaper.connect(mainGain);
    mainGain.connect(this.output);
    mainOsc.start(time);
    mainOsc.stop(time + this.decay + 0.5);

    // === SUB LAYER: Sine 50Hz → 35Hz for sub weight ===
    const subOsc = this.context.createOscillator();
    subOsc.type = 'sine'; // Sub stays pure sine for clean low end
    const subStartFreq = 50 * tuneMultiplier;
    const subEndFreq = 35 * tuneMultiplier;
    subOsc.frequency.setValueAtTime(subStartFreq, time);
    subOsc.frequency.exponentialRampToValueAtTime(subEndFreq, time + 0.15);

    const subGain = this.context.createGain();
    subGain.gain.setValueAtTime(peak * 0.8, time);
    subGain.gain.setTargetAtTime(0, time + 0.05, this.decay * 0.4);

    subOsc.connect(subGain);
    subGain.connect(this.output);
    subOsc.start(time);
    subOsc.stop(time + this.decay + 0.5);

    // === CLICK TRANSIENT: Impulse + LP filtered noise (authentic 909 attack) ===
    if (this.attack > 0.01) {
      // Part 1: Short impulse (beater contact simulation)
      const impulseLength = 64; // Very short ~1.5ms at 44.1kHz
      const impulseBuffer = this.context.createBuffer(1, impulseLength, this.context.sampleRate);
      const impulseData = impulseBuffer.getChannelData(0);
      // Sharp impulse with fast decay
      for (let i = 0; i < impulseLength; i++) {
        impulseData[i] = Math.exp(-i / 8) * (i < 4 ? 1 : 0.5);
      }

      const impulseSource = this.context.createBufferSource();
      impulseSource.buffer = impulseBuffer;

      const impulseGain = this.context.createGain();
      impulseGain.gain.setValueAtTime(peak * this.attack * 0.8, time);

      impulseSource.connect(impulseGain);
      impulseGain.connect(this.output);
      impulseSource.start(time);

      // Part 2: LP filtered noise (adds texture to the click)
      const noiseLength = 256;
      const noiseBuffer = this.context.createBuffer(1, noiseLength, this.context.sampleRate);
      const noiseData = noiseBuffer.getChannelData(0);
      for (let i = 0; i < noiseLength; i++) {
        noiseData[i] = (Math.random() * 2 - 1) * Math.exp(-i / 30);
      }

      const noiseSource = this.context.createBufferSource();
      noiseSource.buffer = noiseBuffer;

      const noiseFilter = this.context.createBiquadFilter();
      noiseFilter.type = 'lowpass'; // LP filter, not bandpass (more authentic)
      noiseFilter.frequency.value = 2000;
      noiseFilter.Q.value = 1;

      const noiseGain = this.context.createGain();
      noiseGain.gain.setValueAtTime(peak * this.attack * 0.4, time);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.01);

      noiseSource.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.output);
      noiseSource.start(time);
    }
  }

  override setParameter(id: string, value: number): void {
    switch (id) {
      case 'tune':
        this.tune = value;
        break;
      case 'decay':
        this.decay = Math.max(0.05, value);
        break;
      case 'attack':
        this.attack = Math.max(0, Math.min(1, value));
        break;
      case 'level':
        this.level = Math.max(0, Math.min(1, value));
        break;
      default:
        super.setParameter(id, value);
    }
  }

  override get parameterDescriptors(): VoiceParameterDescriptor[] {
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
        range: { min: 0.05, max: 2, step: 0.01, unit: 's' },
        defaultValue: 0.8,
      },
      {
        id: 'attack',
        label: 'Attack',
        range: { min: 0, max: 1, step: 0.01 },
        defaultValue: 0.5,
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
