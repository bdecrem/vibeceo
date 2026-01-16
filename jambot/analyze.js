/**
 * Audio Analysis Module for Jambot
 *
 * Analyzes WAV files and returns metrics that help the agent understand
 * the mix: levels, frequency balance, sidechain effectiveness.
 *
 * Requires: sox (brew install sox)
 *
 * Usage:
 *   import { analyzeWav } from './analyze.js';
 *   const analysis = await analyzeWav('/path/to/track.wav', { bpm: 128 });
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { basename } from 'path';

/**
 * Run sox command and capture output
 */
function runSox(args) {
  try {
    const result = execSync(`sox ${args} 2>&1`, { encoding: 'utf-8' });
    return result;
  } catch (e) {
    return e.stdout?.toString() || e.stderr?.toString() || '';
  }
}

/**
 * Check if sox is installed
 */
export function checkSoxInstalled() {
  try {
    execSync('which sox', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get basic audio stats from WAV file
 */
function getBasicStats(wavPath) {
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

  const peakMatch = statsOutput.match(/Pk lev dB\s+([-\d.]+)/);
  const rmsMatch = statsOutput.match(/RMS lev dB\s+([-\d.]+)/);

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

/**
 * Analyze frequency balance using bandpass filters
 */
function analyzeFrequencyBalance(wavPath) {
  // Low: 20-250 Hz (kick, bass)
  const lowOutput = runSox(`"${wavPath}" -n sinc 20-250 stats 2>&1`);
  const lowRms = lowOutput.match(/RMS lev dB\s+([-\d.]+)/);

  // Low-mid: 250-1000 Hz (bass harmonics, mud zone)
  const lowMidOutput = runSox(`"${wavPath}" -n sinc 250-1000 stats 2>&1`);
  const lowMidRms = lowMidOutput.match(/RMS lev dB\s+([-\d.]+)/);

  // High-mid: 1000-4000 Hz (presence, vocals)
  const highMidOutput = runSox(`"${wavPath}" -n sinc 1000-4000 stats 2>&1`);
  const highMidRms = highMidOutput.match(/RMS lev dB\s+([-\d.]+)/);

  // High: 4000-20000 Hz (air, hats, cymbals)
  const highOutput = runSox(`"${wavPath}" -n sinc 4000-20000 stats 2>&1`);
  const highRms = highOutput.match(/RMS lev dB\s+([-\d.]+)/);

  return {
    low: lowRms ? parseFloat(lowRms[1]) : -60,
    lowMid: lowMidRms ? parseFloat(lowMidRms[1]) : -60,
    highMid: highMidRms ? parseFloat(highMidRms[1]) : -60,
    high: highRms ? parseFloat(highRms[1]) : -60,
  };
}

/**
 * Detect sidechain ducking pattern
 */
function detectSidechain(wavPath, bpm = 128) {
  const duration = parseFloat(runSox(`--info -D "${wavPath}"`).trim());
  const beatsPerSecond = bpm / 60;

  const segmentDuration = 0.05; // 50ms segments
  const numSegments = Math.floor(duration / segmentDuration);
  const maxSamples = Math.min(numSegments, 200);
  const step = Math.max(1, Math.floor(numSegments / maxSamples));

  // Sample RMS at regular intervals
  const amplitudes = [];
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

  // Calculate differences between adjacent samples
  const diffs = [];
  for (let i = 1; i < amplitudes.length; i++) {
    diffs.push(amplitudes[i] - amplitudes[i - 1]);
  }

  // Count significant dips and rises (> 3dB)
  const significantDips = diffs.filter(d => d < -3).length;
  const significantRises = diffs.filter(d => d > 3).length;

  const dipRatio = Math.min(significantDips, significantRises) / Math.max(significantDips, significantRises, 1);
  const totalDips = significantDips + significantRises;

  // Calculate average ducking depth
  const negativeDiffs = diffs.filter(d => d < -2);
  const avgDucking = negativeDiffs.length > 0
    ? negativeDiffs.reduce((a, b) => a + b, 0) / negativeDiffs.length
    : 0;

  // Estimate pattern based on frequency of dips
  const dipsPerSecond = significantDips / duration;
  let pattern = 'unknown';
  if (dipsPerSecond > beatsPerSecond * 1.8) {
    pattern = 'eighth-notes';
  } else if (dipsPerSecond > beatsPerSecond * 0.8) {
    pattern = 'quarter-notes';
  } else if (dipsPerSecond > beatsPerSecond * 0.4) {
    pattern = 'half-notes';
  }

  const confidence = Math.min(1,
    (dipRatio * 0.5) +
    (totalDips > 10 ? 0.3 : totalDips / 30) +
    (Math.abs(avgDucking) > 4 ? 0.2 : 0)
  );

  return {
    detected: confidence > 0.5 && Math.abs(avgDucking) > 3,
    avgDuckingDb: Math.abs(avgDucking),
    duckingPattern: pattern,
    confidence: Math.round(confidence * 100) / 100,
  };
}

/**
 * Generate a spectrogram image
 */
export function generateSpectrogram(wavPath, outputPath = null) {
  const outPath = outputPath || wavPath.replace(/\.wav$/i, '-spectrogram.png');
  try {
    execSync(`sox "${wavPath}" -n spectrogram -o "${outPath}" -x 1200 -y 400 -z 80`, { stdio: 'pipe' });
    return outPath;
  } catch {
    return null;
  }
}

/**
 * Main analysis function
 *
 * @param {string} wavPath - Path to WAV file
 * @param {Object} options - Options
 * @param {number} [options.bpm=128] - BPM for sidechain detection
 * @param {boolean} [options.spectrogram=false] - Generate spectrogram image
 * @returns {Object} Analysis results
 */
export async function analyzeWav(wavPath, options = {}) {
  const bpm = options.bpm ?? 128;

  if (!existsSync(wavPath)) {
    throw new Error(`File not found: ${wavPath}`);
  }

  if (!checkSoxInstalled()) {
    throw new Error('sox is not installed. Run: brew install sox');
  }

  const basicStats = getBasicStats(wavPath);
  const frequencyBalance = analyzeFrequencyBalance(wavPath);
  const sidechain = detectSidechain(wavPath, bpm);

  const result = {
    ...basicStats,
    frequencyBalance,
    sidechain,
  };

  if (options.spectrogram) {
    result.spectrogramPath = generateSpectrogram(wavPath);
  }

  return result;
}

/**
 * Format analysis for human-readable output
 */
export function formatAnalysis(analysis) {
  const lines = [
    `File: ${analysis.file}`,
    `Duration: ${analysis.duration.toFixed(2)}s`,
    `Format: ${analysis.sampleRate}Hz, ${analysis.channels}ch, ${analysis.bitDepth}-bit`,
    '',
    'LEVELS:',
    `  Peak: ${analysis.peakLevel.toFixed(1)} dB`,
    `  RMS: ${analysis.rmsLevel.toFixed(1)} dB`,
    `  Dynamic Range: ${analysis.dynamicRange.toFixed(1)} dB`,
    '',
    'FREQUENCY BALANCE:',
    `  Low (20-250Hz):     ${analysis.frequencyBalance.low.toFixed(1)} dB`,
    `  Low-Mid (250-1kHz): ${analysis.frequencyBalance.lowMid.toFixed(1)} dB`,
    `  High-Mid (1-4kHz):  ${analysis.frequencyBalance.highMid.toFixed(1)} dB`,
    `  High (4-20kHz):     ${analysis.frequencyBalance.high.toFixed(1)} dB`,
    '',
    'SIDECHAIN:',
    `  Detected: ${analysis.sidechain.detected ? 'YES' : 'NO'}`,
  ];

  if (analysis.sidechain.detected) {
    lines.push(`  Avg Ducking: ${analysis.sidechain.avgDuckingDb.toFixed(1)} dB`);
    lines.push(`  Pattern: ${analysis.sidechain.duckingPattern}`);
  }

  lines.push(`  Confidence: ${(analysis.sidechain.confidence * 100).toFixed(0)}%`);

  if (analysis.spectrogramPath) {
    lines.push('');
    lines.push(`Spectrogram: ${analysis.spectrogramPath}`);
  }

  return lines.join('\n');
}

/**
 * Get recommendations based on analysis
 */
export function getRecommendations(analysis) {
  const recommendations = [];

  // Check headroom
  if (analysis.peakLevel > -1) {
    recommendations.push('WARNING: Peak level very close to 0 dB. Risk of clipping. Reduce master volume.');
  } else if (analysis.peakLevel > -3) {
    recommendations.push('Peak level is high. Consider leaving more headroom (-6 dB is common).');
  }

  // Check dynamic range
  if (analysis.dynamicRange < 6) {
    recommendations.push('Dynamic range is low (<6 dB). Mix may sound over-compressed or lifeless.');
  } else if (analysis.dynamicRange > 16) {
    recommendations.push('Dynamic range is high (>16 dB). Consider limiting for streaming platforms.');
  }

  // Check frequency balance
  const fb = analysis.frequencyBalance;
  if (fb.lowMid > fb.low) {
    recommendations.push('Low-mids are louder than lows. Consider cutting 250-500Hz to reduce muddiness.');
  }
  if (fb.high > fb.highMid + 6) {
    recommendations.push('Highs are dominant. Mix may sound harsh. Consider high-shelf reduction.');
  }
  if (fb.low < -30) {
    recommendations.push('Low end is weak. Kick and bass may need boosting.');
  }

  // Check sidechain
  if (analysis.sidechain.detected) {
    if (analysis.sidechain.avgDuckingDb > 10) {
      recommendations.push('Sidechain ducking is aggressive (>10 dB). May sound too "pumpy".');
    } else if (analysis.sidechain.avgDuckingDb < 3) {
      recommendations.push('Sidechain ducking is subtle (<3 dB). May not create enough space for kick.');
    }
  }

  if (recommendations.length === 0) {
    recommendations.push('Mix levels and frequency balance look good!');
  }

  return recommendations;
}

export default {
  analyzeWav,
  formatAnalysis,
  getRecommendations,
  generateSpectrogram,
  checkSoxInstalled,
};
