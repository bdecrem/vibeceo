#!/usr/bin/env npx ts-node
/**
 * Render kick-e1.js with specified parameters
 * Usage: npx ts-node render-kick-e1.ts [sweep=0]
 */

import { writeFileSync } from 'fs';

const SAMPLE_RATE = 44100;

// Parameters (matching Bart Deep kit -> Kick Sub)
const tune = 0;
const decay = 0.7;
const attack = 0.05;
const sweep = parseFloat(process.argv[2]?.split('=')[1] || '0');
const level = 1;

const holdTime = 0.025 + (decay * 0.12);
const releaseTime = 0.06 + (decay * 0.5);
const DURATION = holdTime + releaseTime + 0.1; // Match new envelope

function createSoftClipCurve(): (x: number) => number {
  return (x: number) => {
    return Math.tanh(x * 1.5) * 0.9;
  };
}

// Triangle wave
function triangle(phase: number): number {
  const p = ((phase % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  if (p < Math.PI) {
    return -1 + (2 * p / Math.PI);
  } else {
    return 1 - (2 * (p - Math.PI) / Math.PI);
  }
}

function renderKickE1(): Float32Array {
  const length = Math.floor(DURATION * SAMPLE_RATE);
  const samples = new Float32Array(length);
  const softClip = createSoftClipCurve();

  const tuneMultiplier = Math.pow(2, tune / 1200);
  const peak = level;

  for (let i = 0; i < length; i++) {
    const t = i / SAMPLE_RATE;
    let sample = 0;

    // === MAIN BODY: Triangle with pitch sweep ===
    const baseFreq = 55 * tuneMultiplier;
    const sweepAmount = 1.5 + (sweep * 2.5); // Always some sweep
    const peakFreq = baseFreq * sweepAmount;

    let freq: number;
    if (t < 0.025) {
      freq = peakFreq * Math.pow((baseFreq * 1.1) / peakFreq, t / 0.025);
    } else if (t < 0.08) {
      freq = (baseFreq * 1.1) * Math.pow(baseFreq / (baseFreq * 1.1), (t - 0.025) / 0.055);
    } else {
      freq = baseFreq;
    }

    // Triangle oscillator
    const phase = 2 * Math.PI * freq * t;
    const osc = triangle(phase);

    // Drive into saturation
    const driven = osc * 2.5;
    const shaped = softClip(driven);

    // Amplitude envelope: HOLD-THEN-DECAY
    const holdT = 0.025 + (decay * 0.12);
    const releaseT = 0.06 + (decay * 0.5);
    let amp: number;
    if (t < 0.002) {
      amp = t / 0.002;
    } else if (t < holdT) {
      amp = 0.8;
    } else {
      const decayT = t - holdT;
      amp = 0.75 * Math.exp(-decayT / (releaseT * 0.25));
    }

    sample += shaped * amp * peak;

    // === CLICK: Noise burst + high sine ===
    if (attack > 0.01 && t < 0.04) {
      // Noise burst
      const noiseAmp = peak * attack * 0.4 * Math.exp(-t / 0.008);
      sample += (Math.random() * 2 - 1) * noiseAmp;

      // High pitched click
      const clickPeakFreq = 400 * tuneMultiplier;
      const clickBaseFreq = 100 * tuneMultiplier;
      let clickFreq: number;
      if (t < 0.02) {
        clickFreq = clickPeakFreq * Math.pow(clickBaseFreq / clickPeakFreq, t / 0.02);
      } else {
        clickFreq = clickBaseFreq;
      }
      const clickPhase = 2 * Math.PI * clickFreq * t;
      const clickAmp = peak * attack * 0.5 * Math.exp(-t / 0.01);
      sample += Math.sin(clickPhase) * clickAmp;
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

  // Normalize
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

console.log(`Rendering kick-e1 with sweep=${sweep}...`);

const samples = renderKickE1();
const wav = samplesToWav(samples, SAMPLE_RATE);
const path = `/tmp/kick-e1-sweep${sweep}.wav`;
writeFileSync(path, wav);

console.log(`Output: ${path}`);
console.log(`Settings: tune=${tune}, decay=${decay}, attack=${attack}, sweep=${sweep}, level=${level}`);
