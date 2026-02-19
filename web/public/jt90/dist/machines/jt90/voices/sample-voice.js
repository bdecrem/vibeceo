/**
 * JT90 Sample Voice
 *
 * Sample-based playback voice for the 4 ROM-based 909 sounds:
 * CH, OH, crash, ride.
 *
 * Features:
 * - Tune: pitch shift via playback rate (cents → 2^(cents/1200))
 * - Decay: exponential envelope that shapes sample duration
 * - Tone: one-pole lowpass filter for brightness (CH/OH only)
 * - Level: output gain
 * - Choke: rapid fadeout (OH choked by CH)
 * - Linear interpolation for pitch-shifted playback
 */

import { clamp } from '../../../../../jb202/dist/dsp/utils/math.js';

/**
 * Decode a 16-bit mono PCM WAV file from an ArrayBuffer → Float32Array.
 * Returns { sampleRate, samples }.
 */
export function decodeWav(arrayBuffer) {
  const view = new DataView(arrayBuffer);

  // Verify RIFF header
  const riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
  if (riff !== 'RIFF') throw new Error('Not a WAV file');

  const wave = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11));
  if (wave !== 'WAVE') throw new Error('Not a WAV file');

  // Find fmt chunk
  let offset = 12;
  let fmtFound = false;
  let numChannels = 1;
  let sampleRate = 44100;
  let bitsPerSample = 16;

  while (offset < view.byteLength - 8) {
    const chunkId = String.fromCharCode(
      view.getUint8(offset), view.getUint8(offset + 1),
      view.getUint8(offset + 2), view.getUint8(offset + 3)
    );
    const chunkSize = view.getUint32(offset + 4, true);

    if (chunkId === 'fmt ') {
      numChannels = view.getUint16(offset + 10, true);
      sampleRate = view.getUint32(offset + 12, true);
      bitsPerSample = view.getUint16(offset + 22, true);
      fmtFound = true;
    }

    if (chunkId === 'data') {
      if (!fmtFound) throw new Error('WAV: data chunk before fmt chunk');

      const dataOffset = offset + 8;
      const bytesPerSample = bitsPerSample / 8;
      const numSamples = Math.floor(chunkSize / (bytesPerSample * numChannels));
      const samples = new Float32Array(numSamples);

      for (let i = 0; i < numSamples; i++) {
        const bytePos = dataOffset + i * bytesPerSample * numChannels;
        // Read first channel only (mono or left of stereo)
        if (bitsPerSample === 16) {
          samples[i] = view.getInt16(bytePos, true) / 32768;
        } else if (bitsPerSample === 24) {
          const b0 = view.getUint8(bytePos);
          const b1 = view.getUint8(bytePos + 1);
          const b2 = view.getUint8(bytePos + 2);
          const val = (b2 << 24 | b1 << 16 | b0 << 8) >> 8;
          samples[i] = val / 8388608;
        }
      }

      // Peak-normalize to 1.0 so level knob has consistent range
      let peak = 0;
      for (let i = 0; i < numSamples; i++) {
        const abs = samples[i] < 0 ? -samples[i] : samples[i];
        if (abs > peak) peak = abs;
      }
      if (peak > 0 && peak < 0.99) {
        const gain = 1.0 / peak;
        for (let i = 0; i < numSamples; i++) {
          samples[i] *= gain;
        }
      }

      return { sampleRate, samples };
    }

    offset += 8 + chunkSize;
    // Chunks are 2-byte aligned
    if (chunkSize % 2 !== 0) offset++;
  }

  throw new Error('WAV: no data chunk found');
}

export class SampleVoice {
  /**
   * @param {number} sampleRate - Engine sample rate
   * @param {Float32Array} sampleData - Decoded sample data (-1 to +1)
   * @param {object} config
   * @param {number} config.sampleSampleRate - Original sample rate of the WAV
   * @param {number} config.minDecay - Minimum decay time in seconds
   * @param {number} config.maxDecay - Maximum decay time in seconds
   * @param {boolean} config.hasChoke - Whether this voice supports choke
   * @param {boolean} config.hasTone - Whether this voice has a tone (LP filter) param
   */
  constructor(sampleRate, sampleData, config = {}) {
    this.sampleRate = sampleRate;
    this.sampleData = sampleData;  // Already peak-normalized by decodeWav()
    this.sampleSampleRate = config.sampleSampleRate || 44100;

    // Decay range
    this.minDecay = config.minDecay || 0.05;
    this.maxDecay = config.maxDecay || 1.0;
    this.hasChoke = config.hasChoke || false;
    this.hasTone = config.hasTone || false;

    // Parameters
    this.tune = 0;        // Cents offset
    this.decay = 0.5;
    this.tone = 0.5;
    this.level = 1.0;

    // Playback state
    this.position = 0;
    this.playbackRate = 1.0;
    this.active = false;
    this.velocity = 1.0;

    // Envelope
    this.envelope = 0;
    this._decayRate = 0;

    // Choke
    this.choking = false;
    this._chokeRate = 0;

    // LP filter state (for tone)
    this.lpState = 0;
  }

  trigger(velocity = 1.0) {
    this.position = 0;
    this.active = true;
    this.choking = false;
    this.velocity = velocity * this.level;
    this.envelope = 1.0;
    this.lpState = 0;

    // Compute playback rate: tune (cents) + sample rate ratio
    const rateRatio = this.sampleSampleRate / this.sampleRate;
    this.playbackRate = Math.pow(2, this.tune / 1200) * rateRatio;

    // Precompute decay rate (zero Math.exp in processSample)
    // At decay=1: rate=1.0 → envelope stays at 1.0 → raw sample, no shaping
    if (this.decay >= 1.0) {
      this._decayRate = 1.0;
    } else {
      const decayTime = this.minDecay + this.decay * (this.maxDecay - this.minDecay);
      this._decayRate = Math.exp(-1 / (decayTime * this.sampleRate));
    }

    // Precompute choke rate (~5ms fadeout)
    this._chokeRate = Math.exp(-1 / (0.005 * this.sampleRate));
  }

  choke() {
    if (this.active) {
      this.choking = true;
    }
  }

  processSample() {
    if (!this.active) return 0;

    // Read sample with linear interpolation
    const pos = this.position;
    const index = pos | 0;  // Fast floor for positive numbers
    const frac = pos - index;
    const data = this.sampleData;

    if (index >= data.length - 1) {
      this.active = false;
      return 0;
    }

    let sample = data[index] + (data[index + 1] - data[index]) * frac;

    // Advance position
    this.position += this.playbackRate;

    // Decay envelope (precomputed rate — no Math.exp here)
    this.envelope *= this._decayRate;

    // Choke (rapid fadeout)
    if (this.choking) {
      this.envelope *= this._chokeRate;
    }

    // Apply envelope and velocity
    sample *= this.envelope * this.velocity;

    // Tone filter (one-pole LP)
    if (this.hasTone) {
      // tone=0 → dark (LP cutoff ~2kHz), tone=1 → bright (bypass)
      // Coefficient: lower = more filtering
      const lpCoeff = 0.05 + this.tone * 0.95;
      this.lpState += lpCoeff * (sample - this.lpState);
      sample = this.lpState;
    }

    // Deactivate when quiet
    if (this.envelope < 0.001) {
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

export default SampleVoice;
