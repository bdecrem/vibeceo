#!/usr/bin/env npx ts-node
/**
 * Render E2 kick tuned to match Bart Deep's characteristics:
 * - 140ms duration
 * - Hold-then-decay envelope (compressed character)
 * - Strong sub presence
 */

import { writeFileSync } from 'fs';

const SAMPLE_RATE = 44100;
const DURATION = 0.14; // Match Bart Deep exactly

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

function renderBartDeepStyle(): Float32Array {
  const length = Math.floor(DURATION * SAMPLE_RATE);
  const samples = new Float32Array(length);

  const baseFreq = 55;
  const peakFreq = baseFreq * 2;
  const sweepTime = 0.025; // Fast pitch sweep

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

    // HOLD-THEN-DECAY envelope (key difference from standard exponential)
    // This mimics a compressed/limited kick
    let amp: number;
    const holdTime = 0.04;  // Hold at full volume for 40ms
    const decayStart = holdTime;

    if (t < 0.002) {
      // 2ms attack
      amp = t / 0.002;
    } else if (t < holdTime) {
      // Hold at max
      amp = 1.0;
    } else {
      // Fast decay after hold
      const decayT = t - decayStart;
      amp = Math.exp(-decayT * 25); // Fast decay
    }

    sample += diodeClip(osc * 1.2) * amp; // Drive into clipper slightly

    // Minimal click - Bart Deep is subby, not clicky
    if (t < 0.003) {
      const clickAmp = 0.15 * Math.exp(-t * 800);
      sample += (Math.random() * 2 - 1) * clickAmp;
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

  // Normalize to 0 dB peak
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

console.log('Rendering Bart Deep style kick...');

const samples = renderBartDeepStyle();
const wav = samplesToWav(samples, SAMPLE_RATE);
const path = '/tmp/kick-bartdeep-style.wav';
writeFileSync(path, wav);

console.log(`Output: ${path}`);
console.log('Duration: 140ms, hold-then-decay envelope, minimal click');
