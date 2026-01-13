#!/usr/bin/env npx ts-node
/**
 * Render single kicks from E1 and E2 engines for analysis comparison.
 *
 * Usage:
 *   npx ts-node tools/render-kick.ts
 *   # Outputs: kick-e1.wav, kick-e2.wav
 */

import { writeFileSync } from 'fs';
import { join } from 'path';

const SAMPLE_RATE = 44100;
const DURATION = 0.5; // 500ms - enough for full decay

interface KickParams {
  tune: number;      // cents offset
  decay: number;     // 0-1
  attack: number;    // 0-1 (click intensity)
  level: number;     // 0-1
}

const DEFAULT_PARAMS: KickParams = {
  tune: 0,
  decay: 0.8,
  attack: 0.5,
  level: 1,
};

/**
 * E1 Kick: Pure sine with soft-clip warmth
 */
function renderKickE1(params: KickParams = DEFAULT_PARAMS): Float32Array {
  const length = Math.floor(DURATION * SAMPLE_RATE);
  const samples = new Float32Array(length);
  const tuneMultiplier = Math.pow(2, params.tune / 1200);
  const baseFreq = 55 * tuneMultiplier;
  const peakFreq = baseFreq * 2.5;
  const decayTime = 0.2 + (params.decay * 0.6);

  // Soft-clip function (tanh-like)
  const softClip = (x: number) => Math.tanh(x * 1.5) * 0.9;

  for (let i = 0; i < length; i++) {
    const t = i / SAMPLE_RATE;
    let sample = 0;

    // === MAIN BODY: Sine with two-stage pitch sweep ===
    let freq: number;
    if (t < 0.03) {
      // Fast initial drop: peakFreq -> baseFreq*1.2
      freq = peakFreq * Math.pow(baseFreq * 1.2 / peakFreq, t / 0.03);
    } else if (t < 0.12) {
      // Slower settle: baseFreq*1.2 -> baseFreq
      const localT = (t - 0.03) / 0.09;
      freq = baseFreq * 1.2 * Math.pow(baseFreq / (baseFreq * 1.2), localT);
    } else {
      freq = baseFreq;
    }

    // Integrate frequency for phase (simple approximation)
    const phase = 2 * Math.PI * freq * t;
    const osc = Math.sin(phase);

    // Amplitude envelope
    let amp: number;
    if (t < 0.003) {
      amp = params.level * (t / 0.003); // 3ms attack
    } else {
      amp = params.level * Math.exp(-(t - 0.01) / (decayTime * 0.15));
    }

    sample += softClip(osc) * amp;

    // === CLICK: High sine burst ===
    if (params.attack > 0.01 && t < 0.07) {
      const clickBaseFreq = 80 * tuneMultiplier;
      const clickPeakFreq = clickBaseFreq * 3;
      const clickDecay = 0.02 + (params.decay * 0.03);

      let clickFreq: number;
      if (t < 0.015) {
        clickFreq = clickPeakFreq * Math.pow(clickBaseFreq / clickPeakFreq, t / 0.015);
      } else {
        clickFreq = clickBaseFreq;
      }

      const clickPhase = 2 * Math.PI * clickFreq * t;
      const clickOsc = Math.sin(clickPhase);
      const clickAmp = params.level * params.attack * 0.6 * Math.exp(-t / (clickDecay * 0.3));

      sample += clickOsc * clickAmp;
    }

    samples[i] = sample;
  }

  return samples;
}

/**
 * E2 Kick: Triangle with diode-like waveshaper (authentic 909)
 */
function renderKickE2(params: KickParams = DEFAULT_PARAMS): Float32Array {
  const length = Math.floor(DURATION * SAMPLE_RATE);
  const samples = new Float32Array(length);
  const tuneMultiplier = Math.pow(2, params.tune / 1200);
  const baseFreq = 55 * tuneMultiplier;
  const peakFreq = baseFreq * 2;
  const sweepTime = 0.03 + (1 - params.attack) * 0.09;
  const decayTime = 0.15 + (params.decay * 0.85);

  // Diode-like soft clipping
  const diodeClip = (x: number) => {
    const threshold = 0.6;
    if (Math.abs(x) < threshold) {
      return x;
    } else {
      const sign = x > 0 ? 1 : -1;
      const excess = Math.abs(x) - threshold;
      return sign * (threshold + excess * 0.3);
    }
  };

  // Triangle wave
  const triangle = (phase: number) => {
    const p = ((phase % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    if (p < Math.PI) {
      return -1 + (2 * p / Math.PI);
    } else {
      return 1 - (2 * (p - Math.PI) / Math.PI);
    }
  };

  for (let i = 0; i < length; i++) {
    const t = i / SAMPLE_RATE;
    let sample = 0;

    // === MAIN BODY: Triangle with pitch sweep ===
    let freq: number;
    if (t < sweepTime) {
      freq = peakFreq * Math.pow(baseFreq / peakFreq, t / sweepTime);
    } else {
      freq = baseFreq;
    }

    const phase = 2 * Math.PI * freq * t;
    const osc = triangle(phase);

    // Amplitude envelope
    const amp = params.level * Math.exp(-(t - 0.005) / (decayTime * 0.2));

    sample += diodeClip(osc) * amp;

    // === CLICK: Impulse + filtered noise ===
    if (params.level > 0.1 && t < 0.01) {
      // Impulse
      const impulseAmp = params.level * 0.5 * Math.exp(-t * 500);
      sample += (t < 0.0002 ? impulseAmp : 0);

      // Filtered noise burst
      const noiseAmp = params.level * 0.3 * Math.exp(-t / 0.0005);
      sample += (Math.random() * 2 - 1) * noiseAmp;
    }

    samples[i] = sample;
  }

  return samples;
}

/**
 * Convert samples to WAV
 */
function samplesToWav(samples: Float32Array, sampleRate: number): Buffer {
  const numChannels = 1; // Mono
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * numChannels * bytesPerSample;
  const fileSize = 44 + dataSize;

  const buffer = Buffer.alloc(fileSize);
  let offset = 0;

  // RIFF header
  buffer.write('RIFF', offset); offset += 4;
  buffer.writeUInt32LE(fileSize - 8, offset); offset += 4;
  buffer.write('WAVE', offset); offset += 4;

  // fmt chunk
  buffer.write('fmt ', offset); offset += 4;
  buffer.writeUInt32LE(16, offset); offset += 4;
  buffer.writeUInt16LE(1, offset); offset += 2; // PCM
  buffer.writeUInt16LE(numChannels, offset); offset += 2;
  buffer.writeUInt32LE(sampleRate, offset); offset += 4;
  buffer.writeUInt32LE(byteRate, offset); offset += 4;
  buffer.writeUInt16LE(blockAlign, offset); offset += 2;
  buffer.writeUInt16LE(bitsPerSample, offset); offset += 2;

  // data chunk
  buffer.write('data', offset); offset += 4;
  buffer.writeUInt32LE(dataSize, offset); offset += 4;

  // Normalize first
  let maxAbs = 0;
  for (let i = 0; i < samples.length; i++) {
    maxAbs = Math.max(maxAbs, Math.abs(samples[i]));
  }
  const scale = maxAbs > 0.99 ? 0.99 / maxAbs : 1;

  // Write samples
  for (let i = 0; i < samples.length; i++) {
    const sample = Math.max(-1, Math.min(1, samples[i] * scale));
    const intSample = Math.floor(sample * 32767);
    buffer.writeInt16LE(intSample, offset);
    offset += 2;
  }

  return buffer;
}

// Main
const outputDir = process.argv[2] || '.';

console.log('Rendering kicks...');

// Render E1 with default params
const e1Samples = renderKickE1();
const e1Wav = samplesToWav(e1Samples, SAMPLE_RATE);
const e1Path = join(outputDir, 'kick-e1.wav');
writeFileSync(e1Path, e1Wav);
console.log(`E1 kick: ${e1Path}`);

// Render E2 with default params
const e2Samples = renderKickE2();
const e2Wav = samplesToWav(e2Samples, SAMPLE_RATE);
const e2Path = join(outputDir, 'kick-e2.wav');
writeFileSync(e2Path, e2Wav);
console.log(`E2 kick: ${e2Path}`);

// Also render with low attack (less click) to compare to Bart Deep's subby character
const lowClickParams = { ...DEFAULT_PARAMS, attack: 0.1 };

const e1LowClickSamples = renderKickE1(lowClickParams);
const e1LowClickWav = samplesToWav(e1LowClickSamples, SAMPLE_RATE);
const e1LowClickPath = join(outputDir, 'kick-e1-lowclick.wav');
writeFileSync(e1LowClickPath, e1LowClickWav);
console.log(`E1 kick (low click): ${e1LowClickPath}`);

const e2LowClickSamples = renderKickE2(lowClickParams);
const e2LowClickWav = samplesToWav(e2LowClickSamples, SAMPLE_RATE);
const e2LowClickPath = join(outputDir, 'kick-e2-lowclick.wav');
writeFileSync(e2LowClickPath, e2LowClickWav);
console.log(`E2 kick (low click): ${e2LowClickPath}`);

console.log('\nDone! Run analyze-track.ts on each to compare.');
