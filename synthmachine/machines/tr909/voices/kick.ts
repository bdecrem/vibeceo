import { Voice } from '../../../core/voice.js';
import type {
  VoiceId,
  VoiceParameterDescriptor,
} from '../../../core/types.js';

export class Kick909 extends Voice {
  private tune = 0; // cents
  private decay = 0.8;
  private attack = 0.5; // click intensity 0-1
  private level = 1;

  constructor(id: VoiceId, context: BaseAudioContext) {
    super(id, context);
  }

  override trigger(time: number, velocity: number): void {
    const peak = Math.max(0, Math.min(1, velocity * this.level));
    const tuneMultiplier = Math.pow(2, this.tune / 1200);

    // === MAIN BODY: Sine 160Hz → 30Hz ===
    const mainOsc = this.context.createOscillator();
    mainOsc.type = 'sine';
    const mainStartFreq = 160 * tuneMultiplier;
    const mainEndFreq = 30 * tuneMultiplier;
    mainOsc.frequency.setValueAtTime(mainStartFreq, time);
    mainOsc.frequency.exponentialRampToValueAtTime(mainEndFreq, time + 0.08);

    const mainGain = this.context.createGain();
    mainGain.gain.setValueAtTime(peak, time);
    mainGain.gain.setTargetAtTime(0, time + 0.02, this.decay * 0.3);

    mainOsc.connect(mainGain);
    mainGain.connect(this.output);
    mainOsc.start(time);
    mainOsc.stop(time + this.decay + 0.5);

    // === SUB LAYER: Sine 50Hz → 35Hz for weight ===
    const subOsc = this.context.createOscillator();
    subOsc.type = 'sine';
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

    // === CLICK TRANSIENT: Filtered noise burst ===
    if (this.attack > 0.01) {
      const clickLength = 512;
      const clickBuffer = this.context.createBuffer(1, clickLength, this.context.sampleRate);
      const clickData = clickBuffer.getChannelData(0);
      for (let i = 0; i < clickLength; i++) {
        clickData[i] = (Math.random() * 2 - 1) * Math.exp(-i / 50);
      }

      const clickSource = this.context.createBufferSource();
      clickSource.buffer = clickBuffer;

      const clickFilter = this.context.createBiquadFilter();
      clickFilter.type = 'bandpass';
      clickFilter.frequency.value = 3500;
      clickFilter.Q.value = 2;

      const clickGain = this.context.createGain();
      clickGain.gain.setValueAtTime(peak * this.attack * 0.6, time);
      clickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.015);

      clickSource.connect(clickFilter);
      clickFilter.connect(clickGain);
      clickGain.connect(this.output);
      clickSource.start(time);
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
        range: { min: -50, max: 50, step: 1, unit: 'cents' },
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
