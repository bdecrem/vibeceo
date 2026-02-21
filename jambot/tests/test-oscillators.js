#!/usr/bin/env node
/**
 * Oscillator Shape Verification Tests
 *
 * Tests all 4 oscillator waveforms IN ISOLATION (pure DSP, no JB202 signal chain).
 * For each waveform:
 *   1. Creates oscillator via createOscillatorSync()
 *   2. Generates 4096 samples at 440Hz
 *   3. Writes to temp WAV file
 *   4. Uses AnalyzeNode.detectWaveform() to verify correct detection
 *   5. Verifies expected characteristics (RMS, crest factor)
 *
 * All 4 must pass with high confidence (>0.7) and correct detection.
 */
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createOscillatorSync } from '../../web/public/jb202/dist/dsp/oscillators/index.js';
import { audioBufferToWav } from '../core/wav.js';
import { AnalyzeNode } from '../effects/analyze-node.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const tmpDir = join(__dirname, '.tmp-test-oscillators');

if (!existsSync(tmpDir)) mkdirSync(tmpDir);

const analyzeNode = new AnalyzeNode('analyze');

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    passed++;
    console.log(`  \u2713 ${msg}`);
  } else {
    failed++;
    console.error(`  \u2717 ${msg}`);
  }
}

/**
 * Generate a WAV file from a DSP oscillator
 */
function generateOscWav(waveform, freq, sampleRate, durationSec) {
  const osc = createOscillatorSync(waveform, sampleRate);
  osc.setFrequency(freq);

  const totalSamples = Math.ceil(durationSec * sampleRate);
  const samples = osc.generate(totalSamples);

  // Scale to 0.8 amplitude (same as test_tone tool)
  for (let i = 0; i < totalSamples; i++) {
    samples[i] *= 0.8;
  }

  const buffer = {
    sampleRate,
    length: totalSamples,
    duration: durationSec,
    numberOfChannels: 1,
    getChannelData: (ch) => ch === 0 ? samples : null,
  };

  const wavData = audioBufferToWav(buffer);
  const filepath = join(tmpDir, `osc-${waveform}-${freq}hz.wav`);
  writeFileSync(filepath, Buffer.from(wavData));
  return { filepath, samples };
}

// Expected characteristics for each waveform (approximate ranges)
const EXPECTED = {
  sawtooth: {
    rmsRange: [0.45, 0.65],      // ~0.577 theoretical (scaled by 0.8 → ~0.462)
    crestRange: [1.3, 1.9],       // ~1.73 theoretical
  },
  square: {
    rmsRange: [0.70, 0.90],      // ~0.8 (flat at amplitude)
    crestRange: [0.9, 1.15],      // ~1.0 (peak == RMS)
  },
  triangle: {
    rmsRange: [0.40, 0.55],      // ~0.577 theoretical (scaled by 0.8 → ~0.462)
    crestRange: [1.5, 2.0],       // ~1.73 theoretical
  },
  sine: {
    rmsRange: [0.50, 0.65],      // ~0.707 * 0.8 = ~0.566
    crestRange: [1.3, 1.5],       // ~1.414 theoretical
  },
};

console.log('Oscillator Shape Verification Tests');
console.log('===================================\n');

const waveforms = ['sawtooth', 'square', 'triangle', 'sine'];
const sampleRate = 44100;
const freq = 440;
const duration = 1.0;

for (const waveform of waveforms) {
  console.log(`\n--- ${waveform.toUpperCase()} ---`);

  // 1. Generate WAV
  const { filepath, samples } = generateOscWav(waveform, freq, sampleRate, duration);
  assert(existsSync(filepath), `${waveform} WAV file created`);

  // 2. Basic sample checks
  let hasNaN = false;
  let max = -Infinity;
  let min = Infinity;
  let sumSq = 0;
  for (let i = 0; i < samples.length; i++) {
    if (isNaN(samples[i])) { hasNaN = true; break; }
    if (samples[i] > max) max = samples[i];
    if (samples[i] < min) min = samples[i];
    sumSq += samples[i] * samples[i];
  }
  const rms = Math.sqrt(sumSq / samples.length);
  const peak = Math.max(Math.abs(max), Math.abs(min));
  const crestFactor = peak / rms;

  assert(!hasNaN, `${waveform} no NaN in samples`);
  assert(peak <= 0.85, `${waveform} peak within range (${peak.toFixed(3)})`);
  assert(peak >= 0.75, `${waveform} has signal (peak=${peak.toFixed(3)})`);

  const exp = EXPECTED[waveform];
  assert(
    rms >= exp.rmsRange[0] && rms <= exp.rmsRange[1],
    `${waveform} RMS in expected range: ${rms.toFixed(3)} (expected ${exp.rmsRange[0]}-${exp.rmsRange[1]})`
  );
  assert(
    crestFactor >= exp.crestRange[0] && crestFactor <= exp.crestRange[1],
    `${waveform} crest factor in range: ${crestFactor.toFixed(3)} (expected ${exp.crestRange[0]}-${exp.crestRange[1]})`
  );

  // 3. Waveform detection via AnalyzeNode
  const detection = analyzeNode.detectWaveform(filepath);
  assert(
    detection.detected === waveform,
    `${waveform} detected correctly: "${detection.detected}" (confidence: ${detection.confidence})`
  );
  assert(
    detection.confidence >= 0.7,
    `${waveform} detection confidence >= 0.7: ${detection.confidence}`
  );

  // 4. Clean up
  try { unlinkSync(filepath); } catch {}
}

// Clean up tmp dir
try {
  const { readdirSync } = await import('fs');
  const remaining = readdirSync(tmpDir);
  if (remaining.length === 0) {
    const { rmdirSync } = await import('fs');
    rmdirSync(tmpDir);
  }
} catch {}

console.log(`\n${'='.repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}
