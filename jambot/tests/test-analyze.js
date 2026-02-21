#!/usr/bin/env node
/**
 * Analysis Toolchain Tests
 *
 * Verifies that spectral-analyzer and analyze-node produce sane output:
 * - No NaN/Infinity in any field
 * - dB values in plausible ranges
 * - Silence detected and handled
 * - Sidechain doesn't false-fire on normal percussion
 * - Resonance prominence capped at sane levels
 *
 * Requires: sox (brew install sox)
 */
import { execSync } from 'child_process';
import { existsSync, unlinkSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { SpectralAnalyzer } from '../effects/spectral-analyzer.js';
import { AnalyzeNode } from '../effects/analyze-node.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const tmpDir = join(__dirname, '.tmp-test-analyze');

// Ensure tmp dir exists
if (!existsSync(tmpDir)) mkdirSync(tmpDir);

const spectral = new SpectralAnalyzer();
const analyzeNode = new AnalyzeNode('analyze');

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${msg}`);
  } else {
    failed++;
    console.error(`  ✗ ${msg}`);
  }
}

function assertNoNaN(obj, path = '') {
  for (const [key, val] of Object.entries(obj)) {
    const fullPath = path ? `${path}.${key}` : key;
    if (typeof val === 'number') {
      assert(isFinite(val), `${fullPath} is finite (got ${val})`);
    } else if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
      assertNoNaN(val, fullPath);
    }
  }
}

/**
 * Generate a WAV file using sox.
 * @param {string} filename - output filename
 * @param {string} formatFlags - output format flags (e.g. '-r 44100 -c 1 -b 16')
 * @param {string} effects - sox effects (e.g. 'synth 2.0 sine 440')
 */
function generateWav(filename, formatFlags, effects) {
  const path = join(tmpDir, filename);
  // sox -n [format-flags] output.wav [effects...]
  execSync(`sox -n ${formatFlags} "${path}" ${effects}`, { stdio: 'pipe' });
  return path;
}

function cleanup() {
  if (existsSync(tmpDir)) {
    execSync(`rm -rf "${tmpDir}"`, { stdio: 'pipe' });
  }
}

// ─── Test 1: Silence ─────────────────────────────────────────────
console.log('\nTest 1: Silence');

const silencePath = generateWav('silence.wav', '-r 44100 -c 1 -b 16', 'trim 0.0 2.0');

const silenceAnalysis = await analyzeNode.analyze(silencePath, { bpm: 128 });
assertNoNaN(silenceAnalysis);
assert(silenceAnalysis.isSilent === true, 'isSilent flag is true for silence');
assert(silenceAnalysis.peakLevel <= -80, `peakLevel <= -80 for silence (got ${silenceAnalysis.peakLevel})`);

const silenceRecs = analyzeNode.getRecommendations(silenceAnalysis);
assert(silenceRecs.length > 0, 'recommendations not empty');
assert(silenceRecs[0].includes('quiet') || silenceRecs[0].includes('silent'), `silence recommendation mentions quiet/silent: "${silenceRecs[0]}"`);
assert(!silenceRecs.some(r => r.includes('look good')), 'no "looks good" on silence');

const silenceFormatted = analyzeNode.formatAnalysis(silenceAnalysis);
assert(!silenceFormatted.includes('NaN'), 'formatted output has no NaN');
assert(!silenceFormatted.includes('Infinity'), 'formatted output has no Infinity');

const silenceFlux = spectral.measureSpectralFlux(silencePath);
assertNoNaN(silenceFlux);

const silencePeaks = spectral.getSpectralPeaks(silencePath);
assert(Array.isArray(silencePeaks), 'silence peaks returns array');

// ─── Test 2: 440Hz Sine ──────────────────────────────────────────
console.log('\nTest 2: 440Hz Sine');

const sinePath = generateWav('sine440.wav', '-r 44100 -c 1 -b 16', 'synth 2.0 sine 440');

const sinePeaks = spectral.getSpectralPeaks(sinePath, { minPeakDb: -60 });
assert(sinePeaks.length > 0, `found spectral peaks (got ${sinePeaks.length})`);

if (sinePeaks.length > 0) {
  // Check that a peak near 440Hz exists somewhere in the results
  const near440 = sinePeaks.find(p => p.freq > 400 && p.freq < 480);
  assert(near440 !== undefined, `found a peak near 440Hz (peaks: ${sinePeaks.slice(0, 3).map(p => `${Math.round(p.freq)}Hz`).join(', ')})`);
  // All peaks should have sane dB values (spectral magnitudes can be 100+ dB for FFT bins)
  assert(sinePeaks.every(p => p.amplitudeDb > -120 && p.amplitudeDb <= 200), `all amplitudes in sane dB range [-120, 200]`);
  assert(sinePeaks.every(p => p.amplitudeDb < 200), `no absurd dB values (max: ${Math.max(...sinePeaks.map(p => p.amplitudeDb))}dB)`);
}

const sineAnalysis = await analyzeNode.analyze(sinePath, { bpm: 128 });
assertNoNaN(sineAnalysis);
assert(sineAnalysis.isSilent === false, 'sine is not silent');

// ─── Test 3: 4x4 Kick Pattern (sidechain false positive check) ──
console.log('\nTest 3: 4x4 Kick Pattern (sidechain check)');

// Generate a simple kick-like pattern: 4 short sine bursts at quarter notes (128bpm = 0.5s apart)
// Each "kick" is a 60Hz sine, 100ms long
const kickPath = join(tmpDir, 'kick4x4.wav');
// Create 4 kicks at 0, 0.5, 1.0, 1.5 seconds within a 2-second file
execSync(`sox -n -r 44100 -c 1 -b 16 "${join(tmpDir, 'k1.wav')}" synth 0.1 sine 60 fade t 0 0.1 0.05`, { stdio: 'pipe' });
execSync(`sox -n -r 44100 -c 1 -b 16 "${join(tmpDir, 'pad.wav')}" trim 0.0 0.4`, { stdio: 'pipe' });
// Concatenate kick + pad x4
execSync(`sox "${join(tmpDir, 'k1.wav')}" "${join(tmpDir, 'pad.wav')}" "${join(tmpDir, 'k1.wav')}" "${join(tmpDir, 'pad.wav')}" "${join(tmpDir, 'k1.wav')}" "${join(tmpDir, 'pad.wav')}" "${join(tmpDir, 'k1.wav')}" "${join(tmpDir, 'pad.wav')}" "${kickPath}"`, { stdio: 'pipe' });

const kickAnalysis = await analyzeNode.analyze(kickPath, { bpm: 128 });
assertNoNaN(kickAnalysis);
assert(kickAnalysis.sidechain.detected === false, `sidechain not falsely detected on 4x4 kicks (detected=${kickAnalysis.sidechain.detected}, confidence=${kickAnalysis.sidechain.confidence})`);

// ─── Test 4: Resonance Sanity ────────────────────────────────────
console.log('\nTest 4: Resonance Sanity');

const resonancePeaks = spectral.detectResonance(sinePath);
assert(resonancePeaks.peaks.every(p => p.prominenceDb <= 60), `all prominence values <= 60dB (capped)`);
assert(resonancePeaks.peaks.every(p => isFinite(p.prominenceDb)), 'all prominence values are finite');

// ─── Test 5: Format doesn't crash on edge cases ──────────────────
console.log('\nTest 5: Format edge cases');

const formatted = analyzeNode.formatAnalysis(sineAnalysis);
assert(typeof formatted === 'string', 'formatAnalysis returns string');
assert(!formatted.includes('NaN'), 'no NaN in formatted output');
assert(!formatted.includes('Infinity'), 'no Infinity in formatted output');

// ─── Cleanup ─────────────────────────────────────────────────────
cleanup();

console.log(`\n${'─'.repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}
