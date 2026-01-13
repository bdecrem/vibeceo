#!/usr/bin/env npx ts-node
/**
 * Render tuned kicks trying to match Bart Deep
 */

import { writeFileSync } from 'fs';
import { join } from 'path';

const SAMPLE_RATE = 44100;

interface KickParams {
  tune: number;
  decay: number;
  attack: number;
  level: number;
}

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

function renderKickE2(params: KickParams, duration: number): Float32Array {
  const length = Math.floor(duration * SAMPLE_RATE);
  const samples = new Float32Array(length);
  const tuneMultiplier = Math.pow(2, params.tune / 1200);
  const baseFreq = 55 * tuneMultiplier;
  const peakFreq = baseFreq * 2;
  const sweepTime = 0.03 + (1 - params.attack) * 0.09;
  const decayTime = 0.15 + (params.decay * 0.85);

  for (let i = 0; i < length; i++) {
    const t = i / SAMPLE_RATE;
    let sample = 0;

    // Pitch sweep
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

    // Click
    if (params.attack > 0.05 && t < 0.01) {
      const impulseAmp = params.level * params.attack * 0.5 * Math.exp(-t * 500);
      sample += (t < 0.0002 ? impulseAmp : 0);
      const noiseAmp = params.level * params.attack * 0.3 * Math.exp(-t / 0.0005);
      sample += (Math.random() * 2 - 1) * noiseAmp;
    }

    samples[i] = sample;
  }

  return samples;
}

function samplesToWav(samples: Float32Array, sampleRate: number): Buffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * numChannels * bytesPerSample;
  const fileSize = 44 + dataSize;

  const buffer = Buffer.alloc(fileSize);
  let offset = 0;

  buffer.write('RIFF', offset); offset += 4;
  buffer.writeUInt32LE(fileSize - 8, offset); offset += 4;
  buffer.write('WAVE', offset); offset += 4;
  buffer.write('fmt ', offset); offset += 4;
  buffer.writeUInt32LE(16, offset); offset += 4;
  buffer.writeUInt16LE(1, offset); offset += 2;
  buffer.writeUInt16LE(numChannels, offset); offset += 2;
  buffer.writeUInt32LE(sampleRate, offset); offset += 4;
  buffer.writeUInt32LE(byteRate, offset); offset += 4;
  buffer.writeUInt16LE(blockAlign, offset); offset += 2;
  buffer.writeUInt16LE(bitsPerSample, offset); offset += 2;
  buffer.write('data', offset); offset += 4;
  buffer.writeUInt32LE(dataSize, offset); offset += 4;

  // Normalize to 0 dB peak (like Bart Deep)
  let maxAbs = 0;
  for (let i = 0; i < samples.length; i++) {
    maxAbs = Math.max(maxAbs, Math.abs(samples[i]));
  }
  const scale = maxAbs > 0 ? 0.99 / maxAbs : 1;

  for (let i = 0; i < samples.length; i++) {
    const sample = Math.max(-1, Math.min(1, samples[i] * scale));
    const intSample = Math.floor(sample * 32767);
    buffer.writeInt16LE(intSample, offset);
    offset += 2;
  }

  return buffer;
}

const outputDir = process.argv[2] || '/tmp';

// Bart Deep: 140ms, -6dB RMS, low dominant, minimal click
// Try several E2 variations

const variations = [
  { name: 'e2-short', decay: 0.1, attack: 0.2, duration: 0.2 },
  { name: 'e2-vshort', decay: 0.05, attack: 0.1, duration: 0.15 },
  { name: 'e2-punch', decay: 0.15, attack: 0.3, duration: 0.2 },
  { name: 'e2-sub', decay: 0.08, attack: 0.05, duration: 0.15 },
];

console.log('Rendering tuned E2 kicks...\n');

for (const v of variations) {
  const params: KickParams = {
    tune: 0,
    decay: v.decay,
    attack: v.attack,
    level: 1,
  };

  const samples = renderKickE2(params, v.duration);
  const wav = samplesToWav(samples, SAMPLE_RATE);
  const path = join(outputDir, `kick-${v.name}.wav`);
  writeFileSync(path, wav);
  console.log(`${v.name}: decay=${v.decay}, attack=${v.attack}, dur=${v.duration}s -> ${path}`);
}

console.log('\nDone!');
