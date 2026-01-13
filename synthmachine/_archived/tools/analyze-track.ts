#!/usr/bin/env npx ts-node
/**
 * Audio Analysis Tool for SynthMachine
 *
 * Analyzes WAV files and outputs JSON with key metrics.
 * Amber can use this to "see" what's happening with frequencies,
 * dynamics, and sidechain compression.
 *
 * Usage:
 *   npx ts-node synthmachine/tools/analyze-track.ts path/to/track.wav
 *   npx ts-node synthmachine/tools/analyze-track.ts track.wav --spectrogram
 *
 * Requires: sox (brew install sox)
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync, unlinkSync } from 'fs';
import { basename, dirname, join } from 'path';

interface AudioStats {
  file: string;
  duration: number;
  sampleRate: number;
  channels: number;
  bitDepth: number;

  // Levels (in dB)
  peakLevel: number;
  rmsLevel: number;
  dynamicRange: number;

  // Frequency balance (relative levels)
  frequencyBalance: {
    low: number;      // 20-250 Hz
    lowMid: number;   // 250-1000 Hz
    highMid: number;  // 1000-4000 Hz
    high: number;     // 4000-20000 Hz
  };

  // Sidechain detection
  sidechain: {
    detected: boolean;
    avgDuckingDb: number;
    duckingPattern: string; // e.g., "quarter-notes", "eighth-notes"
    confidence: number;     // 0-1
  };

  // Spectrogram path (if generated)
  spectrogramPath?: string;
}

function runSox(args: string): string {
  try {
    // sox outputs stats to stderr, so we redirect stderr to stdout
    const result = execSync(`sox ${args} 2>&1`, { encoding: 'utf-8' });
    return result;
  } catch (e: any) {
    return e.stdout?.toString() || e.stderr?.toString() || '';
  }
}

function getBasicStats(wavPath: string): Partial<AudioStats> {
  // Get file info
  const infoOutput = runSox(`--info "${wavPath}"`);

  const sampleRateMatch = infoOutput.match(/Sample Rate\s*:\s*(\d+)/);
  const channelsMatch = infoOutput.match(/Channels\s*:\s*(\d+)/);
  const bitDepthMatch = infoOutput.match(/Precision\s*:\s*(\d+)-bit/);
  const durationMatch = infoOutput.match(/Duration\s*:\s*([\d:.]+)/);

  // Parse duration (format: HH:MM:SS.ss)
  let duration = 0;
  if (durationMatch) {
    const parts = durationMatch[1].split(':');
    if (parts.length === 3) {
      duration = parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
    } else if (parts.length === 2) {
      duration = parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
    } else {
      duration = parseFloat(parts[0]);
    }
  }

  // Get audio stats
  const statsOutput = runSox(`"${wavPath}" -n stats`);

  // sox outputs columns: Overall, Left, Right - we want Overall (first value after label)
  // Values are space-padded, so we need to match flexibly
  const peakMatch = statsOutput.match(/Pk lev dB\s+([-\d.]+)/);
  const rmsMatch = statsOutput.match(/RMS lev dB\s+([-\d.]+)/);

  // Dynamic range = Peak - RMS (crest factor in dB)
  const peakLevel = peakMatch ? parseFloat(peakMatch[1]) : 0;
  const rmsLevel = rmsMatch ? parseFloat(rmsMatch[1]) : 0;
  const dynamicRange = Math.abs(peakLevel - rmsLevel);

  return {
    file: basename(wavPath),
    duration,
    sampleRate: sampleRateMatch ? parseInt(sampleRateMatch[1]) : 44100,
    channels: channelsMatch ? parseInt(channelsMatch[1]) : 2,
    bitDepth: bitDepthMatch ? parseInt(bitDepthMatch[1]) : 16,
    peakLevel,
    rmsLevel,
    dynamicRange,
  };
}

function analyzeFrequencyBalance(wavPath: string): AudioStats['frequencyBalance'] {
  // Use sox to get frequency-specific RMS levels
  // Low: 20-250 Hz
  const lowOutput = runSox(`"${wavPath}" -n sinc 20-250 stats 2>&1`);
  const lowRms = lowOutput.match(/RMS lev dB\s+([-\d.]+)/);

  // Low-mid: 250-1000 Hz
  const lowMidOutput = runSox(`"${wavPath}" -n sinc 250-1000 stats 2>&1`);
  const lowMidRms = lowMidOutput.match(/RMS lev dB\s+([-\d.]+)/);

  // High-mid: 1000-4000 Hz
  const highMidOutput = runSox(`"${wavPath}" -n sinc 1000-4000 stats 2>&1`);
  const highMidRms = highMidOutput.match(/RMS lev dB\s+([-\d.]+)/);

  // High: 4000-20000 Hz
  const highOutput = runSox(`"${wavPath}" -n sinc 4000-20000 stats 2>&1`);
  const highRms = highOutput.match(/RMS lev dB\s+([-\d.]+)/);

  return {
    low: lowRms ? parseFloat(lowRms[1]) : -60,
    lowMid: lowMidRms ? parseFloat(lowMidRms[1]) : -60,
    highMid: highMidRms ? parseFloat(highMidRms[1]) : -60,
    high: highRms ? parseFloat(highRms[1]) : -60,
  };
}

function detectSidechain(wavPath: string, bpm: number = 128): AudioStats['sidechain'] {
  // Analyze amplitude envelope over time to detect regular ducking
  // A sidechain typically ducks on every kick, so we look for periodic dips

  const duration = parseFloat(runSox(`--info -D "${wavPath}"`).trim());
  const beatsPerSecond = bpm / 60;
  const samplesPerBeat = Math.floor(44100 / beatsPerSecond);

  // Get amplitude envelope by splitting into segments and measuring each
  const segmentDuration = 0.05; // 50ms segments
  const numSegments = Math.floor(duration / segmentDuration);

  // Sample RMS at regular intervals using trim + stats
  const amplitudes: number[] = [];
  const maxSamples = Math.min(numSegments, 200); // Limit for performance
  const step = Math.max(1, Math.floor(numSegments / maxSamples));

  for (let i = 0; i < numSegments && amplitudes.length < maxSamples; i += step) {
    const start = i * segmentDuration;
    try {
      const output = runSox(`"${wavPath}" -n trim ${start.toFixed(3)} ${segmentDuration} stats 2>&1`);
      const rmsMatch = output.match(/RMS lev dB\s+([-\d.]+)/);
      if (rmsMatch) {
        amplitudes.push(parseFloat(rmsMatch[1]));
      }
    } catch {
      // Skip failed segments
    }
  }

  if (amplitudes.length < 10) {
    return {
      detected: false,
      avgDuckingDb: 0,
      duckingPattern: 'unknown',
      confidence: 0,
    };
  }

  // Look for periodic dips
  // Calculate differences between adjacent samples
  const diffs: number[] = [];
  for (let i = 1; i < amplitudes.length; i++) {
    diffs.push(amplitudes[i] - amplitudes[i - 1]);
  }

  // Count significant dips (> 3dB drop)
  const significantDips = diffs.filter(d => d < -3).length;
  const significantRises = diffs.filter(d => d > 3).length;

  // If we have roughly equal dips and rises, and they're substantial, sidechain is likely
  const dipRatio = Math.min(significantDips, significantRises) / Math.max(significantDips, significantRises, 1);
  const totalDips = significantDips + significantRises;

  // Calculate average ducking depth
  const negativeDiffs = diffs.filter(d => d < -2);
  const avgDucking = negativeDiffs.length > 0
    ? negativeDiffs.reduce((a, b) => a + b, 0) / negativeDiffs.length
    : 0;

  // Estimate pattern based on frequency of dips relative to BPM
  const dipsPerSecond = significantDips / duration;
  let pattern = 'unknown';
  if (dipsPerSecond > beatsPerSecond * 1.8) {
    pattern = 'eighth-notes';
  } else if (dipsPerSecond > beatsPerSecond * 0.8) {
    pattern = 'quarter-notes';
  } else if (dipsPerSecond > beatsPerSecond * 0.4) {
    pattern = 'half-notes';
  }

  const confidence = Math.min(1, (dipRatio * 0.5) + (totalDips > 10 ? 0.3 : totalDips / 30) + (Math.abs(avgDucking) > 4 ? 0.2 : 0));

  return {
    detected: confidence > 0.5 && Math.abs(avgDucking) > 3,
    avgDuckingDb: Math.abs(avgDucking),
    duckingPattern: pattern,
    confidence: Math.round(confidence * 100) / 100,
  };
}

function generateSpectrogram(wavPath: string): string {
  const outputPath = wavPath.replace(/\.wav$/i, '-spectrogram.png');
  try {
    execSync(`sox "${wavPath}" -n spectrogram -o "${outputPath}" -x 1200 -y 400 -z 80`, { stdio: 'pipe' });
    return outputPath;
  } catch {
    return '';
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    console.log(`
Audio Analysis Tool for SynthMachine

Usage:
  npx ts-node analyze-track.ts <wav-file> [options]

Options:
  --spectrogram    Generate a spectrogram image
  --bpm <number>   Specify BPM for sidechain detection (default: 128)
  --json           Output only JSON (no formatting)
  --help           Show this help

Example:
  npx ts-node analyze-track.ts my-track.wav --spectrogram --bpm 125
`);
    process.exit(0);
  }

  const wavPath = args[0];
  const generateSpec = args.includes('--spectrogram');
  const jsonOnly = args.includes('--json');
  const bpmIndex = args.indexOf('--bpm');
  const bpm = bpmIndex !== -1 ? parseInt(args[bpmIndex + 1]) || 128 : 128;

  if (!existsSync(wavPath)) {
    console.error(`Error: File not found: ${wavPath}`);
    process.exit(1);
  }

  // Check sox is installed
  try {
    execSync('which sox', { stdio: 'pipe' });
  } catch {
    console.error('Error: sox is not installed. Run: brew install sox');
    process.exit(1);
  }

  if (!jsonOnly) {
    console.log(`Analyzing: ${wavPath}`);
  }

  // Gather all stats
  const basicStats = getBasicStats(wavPath);
  const frequencyBalance = analyzeFrequencyBalance(wavPath);
  const sidechain = detectSidechain(wavPath, bpm);

  const result: AudioStats = {
    ...(basicStats as AudioStats),
    frequencyBalance,
    sidechain,
  };

  if (generateSpec) {
    result.spectrogramPath = generateSpectrogram(wavPath);
  }

  if (jsonOnly) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log('\n=== Audio Analysis Results ===\n');
    console.log(`File: ${result.file}`);
    console.log(`Duration: ${result.duration.toFixed(2)}s`);
    console.log(`Format: ${result.sampleRate}Hz, ${result.channels}ch, ${result.bitDepth}-bit`);
    console.log('');
    console.log('Levels:');
    console.log(`  Peak: ${result.peakLevel.toFixed(1)} dB`);
    console.log(`  RMS: ${result.rmsLevel.toFixed(1)} dB`);
    console.log(`  Dynamic Range: ${result.dynamicRange.toFixed(1)} dB`);
    console.log('');
    console.log('Frequency Balance:');
    console.log(`  Low (20-250Hz):     ${result.frequencyBalance.low.toFixed(1)} dB`);
    console.log(`  Low-Mid (250-1kHz): ${result.frequencyBalance.lowMid.toFixed(1)} dB`);
    console.log(`  High-Mid (1-4kHz):  ${result.frequencyBalance.highMid.toFixed(1)} dB`);
    console.log(`  High (4-20kHz):     ${result.frequencyBalance.high.toFixed(1)} dB`);
    console.log('');
    console.log('Sidechain:');
    console.log(`  Detected: ${result.sidechain.detected ? 'YES' : 'NO'}`);
    if (result.sidechain.detected) {
      console.log(`  Avg Ducking: ${result.sidechain.avgDuckingDb.toFixed(1)} dB`);
      console.log(`  Pattern: ${result.sidechain.duckingPattern}`);
    }
    console.log(`  Confidence: ${(result.sidechain.confidence * 100).toFixed(0)}%`);

    if (result.spectrogramPath) {
      console.log('');
      console.log(`Spectrogram: ${result.spectrogramPath}`);
    }

    console.log('');
    console.log('--- JSON Output ---');
    console.log(JSON.stringify(result, null, 2));
  }
}

main().catch(console.error);
