/**
 * AnalyzeNode - Audio analysis service for WAV files
 *
 * Unlike other effects, this is a "service node" - it doesn't process audio
 * in the signal chain, but provides analysis capabilities for rendered files.
 *
 * Parameters (analysis options):
 * - bpm: Session BPM for rhythm analysis (read from session)
 *
 * Capabilities:
 * - Basic stats: duration, sample rate, peak/RMS levels
 * - Frequency balance: low, low-mid, high-mid, high bands
 * - Sidechain detection: ducking pattern analysis
 * - Waveform detection: saw, square, triangle, sine identification
 * - Spectrogram generation
 *
 * Requires: sox (brew install sox)
 */

import { Node } from '../core/node.js';
import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { basename } from 'path';

export class AnalyzeNode extends Node {
  constructor(id = 'analyze', config = {}) {
    super(id, config);

    // Register analysis parameters/options
    this.registerParams({
      bpm: { min: 60, max: 200, default: 128, unit: 'bpm', description: 'Session BPM for rhythm analysis' },
      generateSpectrogram: { min: 0, max: 1, default: 0, unit: 'boolean', description: 'Generate spectrogram image' },
    });
  }

  /**
   * Check if sox is installed
   * @returns {boolean}
   */
  checkSoxInstalled() {
    try {
      execSync('which sox', { stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Run sox command and capture output
   * @param {string} args - Sox arguments
   * @returns {string}
   */
  runSox(args) {
    try {
      const result = execSync(`sox ${args} 2>&1`, { encoding: 'utf-8' });
      return result;
    } catch (e) {
      return e.stdout?.toString() || e.stderr?.toString() || '';
    }
  }

  /**
   * Analyze a WAV file
   * @param {string} wavPath - Path to WAV file
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Analysis results
   */
  async analyze(wavPath, options = {}) {
    const bpm = options.bpm ?? this._params.bpm ?? 128;

    if (!existsSync(wavPath)) {
      throw new Error(`File not found: ${wavPath}`);
    }

    if (!this.checkSoxInstalled()) {
      throw new Error('sox is not installed. Run: brew install sox');
    }

    const basicStats = this.getBasicStats(wavPath);
    const frequencyBalance = this.analyzeFrequencyBalance(wavPath);
    const sidechain = this.detectSidechain(wavPath, bpm);

    const result = {
      ...basicStats,
      frequencyBalance,
      sidechain,
    };

    if (options.spectrogram || this._params.generateSpectrogram) {
      result.spectrogramPath = this.generateSpectrogram(wavPath);
    }

    return result;
  }

  /**
   * Get basic audio stats from WAV file
   * @param {string} wavPath
   * @returns {Object}
   */
  getBasicStats(wavPath) {
    const infoOutput = this.runSox(`--info "${wavPath}"`);

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
    const statsOutput = this.runSox(`"${wavPath}" -n stats`);

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
   * @param {string} wavPath
   * @returns {Object}
   */
  analyzeFrequencyBalance(wavPath) {
    // Low: 20-250 Hz (kick, bass)
    const lowOutput = this.runSox(`"${wavPath}" -n sinc 20-250 stats 2>&1`);
    const lowRms = lowOutput.match(/RMS lev dB\s+([-\d.]+)/);

    // Low-mid: 250-1000 Hz (bass harmonics, mud zone)
    const lowMidOutput = this.runSox(`"${wavPath}" -n sinc 250-1000 stats 2>&1`);
    const lowMidRms = lowMidOutput.match(/RMS lev dB\s+([-\d.]+)/);

    // High-mid: 1000-4000 Hz (presence, vocals)
    const highMidOutput = this.runSox(`"${wavPath}" -n sinc 1000-4000 stats 2>&1`);
    const highMidRms = highMidOutput.match(/RMS lev dB\s+([-\d.]+)/);

    // High: 4000-20000 Hz (air, hats, cymbals)
    const highOutput = this.runSox(`"${wavPath}" -n sinc 4000-20000 stats 2>&1`);
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
   * @param {string} wavPath
   * @param {number} bpm
   * @returns {Object}
   */
  detectSidechain(wavPath, bpm = 128) {
    const duration = parseFloat(this.runSox(`--info -D "${wavPath}"`).trim());
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
        const output = this.runSox(`"${wavPath}" -n trim ${start.toFixed(3)} ${segmentDuration} stats 2>&1`);
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
   * Detect waveform type from a WAV file
   *
   * Analyzes the harmonic content to determine if the waveform is:
   * - sawtooth: all harmonics present, decreasing by 1/n
   * - square: odd harmonics only, decreasing by 1/n
   * - triangle: odd harmonics only, decreasing by 1/n^2
   * - sine: fundamental only, no harmonics
   *
   * @param {string} wavPath - Path to WAV file
   * @returns {Object} { detected: string, confidence: number, harmonics: Object }
   */
  detectWaveform(wavPath) {
    if (!existsSync(wavPath)) {
      throw new Error(`File not found: ${wavPath}`);
    }

    // For raw WAV analysis, we need to read the file directly
    // and analyze the waveform shape
    try {
      // Read WAV file
      const buffer = readFileSync(wavPath);

      // Parse WAV header
      const numChannels = buffer.readUInt16LE(22);
      const sampleRate = buffer.readUInt32LE(24);
      const bitsPerSample = buffer.readUInt16LE(34);
      const bytesPerSample = bitsPerSample / 8;

      // Find data chunk
      let dataOffset = 44; // Standard offset
      for (let i = 12; i < buffer.length - 8; i++) {
        if (buffer.toString('ascii', i, i + 4) === 'data') {
          dataOffset = i + 8;
          break;
        }
      }

      // Read samples (mono or first channel)
      const samples = [];
      const numSamples = Math.min(4096, (buffer.length - dataOffset) / (bytesPerSample * numChannels));

      for (let i = 0; i < numSamples; i++) {
        const offset = dataOffset + i * bytesPerSample * numChannels;
        if (offset + bytesPerSample > buffer.length) break;

        let sample;
        if (bitsPerSample === 16) {
          sample = buffer.readInt16LE(offset) / 32768;
        } else if (bitsPerSample === 32) {
          sample = buffer.readFloatLE(offset);
        } else {
          sample = (buffer.readUInt8(offset) - 128) / 128;
        }
        samples.push(sample);
      }

      if (samples.length < 256) {
        return { detected: 'unknown', confidence: 0, reason: 'Not enough samples' };
      }

      // Analyze waveform characteristics
      return this.analyzeWaveformShape(samples, sampleRate);
    } catch (e) {
      return { detected: 'unknown', confidence: 0, reason: e.message };
    }
  }

  /**
   * Analyze waveform shape from sample data
   * @param {number[]} samples - Audio samples (-1 to 1)
   * @param {number} sampleRate
   * @returns {Object}
   */
  analyzeWaveformShape(samples, sampleRate) {
    // Find zero crossings to detect period
    const zeroCrossings = [];
    for (let i = 1; i < samples.length; i++) {
      if ((samples[i - 1] < 0 && samples[i] >= 0) || (samples[i - 1] >= 0 && samples[i] < 0)) {
        zeroCrossings.push(i);
      }
    }

    if (zeroCrossings.length < 4) {
      return { detected: 'dc-or-noise', confidence: 0.5, reason: 'Too few zero crossings' };
    }

    // Estimate period from zero crossings (two crossings per cycle)
    const periods = [];
    for (let i = 2; i < zeroCrossings.length; i += 2) {
      periods.push(zeroCrossings[i] - zeroCrossings[i - 2]);
    }
    const avgPeriod = periods.reduce((a, b) => a + b, 0) / periods.length;
    const estimatedFreq = sampleRate / avgPeriod;

    // Extract one cycle for analysis
    const cycleStart = zeroCrossings[0];
    const cycleLength = Math.round(avgPeriod);
    if (cycleStart + cycleLength > samples.length) {
      return { detected: 'unknown', confidence: 0, reason: 'Cycle extends beyond samples' };
    }

    const cycle = samples.slice(cycleStart, cycleStart + cycleLength);

    // Normalize cycle
    const maxAmp = Math.max(...cycle.map(Math.abs));
    if (maxAmp < 0.01) {
      return { detected: 'silence', confidence: 1, reason: 'Very low amplitude' };
    }
    const normalizedCycle = cycle.map(s => s / maxAmp);

    // Calculate waveform characteristics
    const characteristics = this.calculateWaveformCharacteristics(normalizedCycle);

    // Score each waveform type
    const scores = {
      sawtooth: this.scoreSawtooth(normalizedCycle, characteristics),
      square: this.scoreSquare(normalizedCycle, characteristics),
      triangle: this.scoreTriangle(normalizedCycle, characteristics),
      sine: this.scoreSine(normalizedCycle, characteristics),
    };

    // Find best match
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const [detected, confidence] = sorted[0];
    const [secondBest, secondConfidence] = sorted[1];

    // Require clear winner
    const margin = confidence - secondConfidence;

    return {
      detected,
      confidence: Math.round(confidence * 100) / 100,
      margin: Math.round(margin * 100) / 100,
      estimatedFrequency: Math.round(estimatedFreq),
      characteristics,
      allScores: Object.fromEntries(sorted.map(([k, v]) => [k, Math.round(v * 100) / 100])),
    };
  }

  /**
   * Calculate various waveform characteristics
   */
  calculateWaveformCharacteristics(cycle) {
    const n = cycle.length;

    // RMS (root mean square)
    const rms = Math.sqrt(cycle.reduce((sum, s) => sum + s * s, 0) / n);

    // Peak-to-peak
    const max = Math.max(...cycle);
    const min = Math.min(...cycle);
    const peakToPeak = max - min;

    // Crest factor (peak / RMS)
    const crestFactor = Math.max(Math.abs(max), Math.abs(min)) / rms;

    // Slope analysis (derivative)
    const slopes = [];
    for (let i = 1; i < n; i++) {
      slopes.push(cycle[i] - cycle[i - 1]);
    }

    // Count slope changes (for square wave detection)
    let slopeChanges = 0;
    for (let i = 1; i < slopes.length; i++) {
      if (Math.sign(slopes[i]) !== Math.sign(slopes[i - 1]) && Math.abs(slopes[i]) > 0.01) {
        slopeChanges++;
      }
    }

    // Time at extremes (for square wave)
    let timeAtExtremes = 0;
    for (const s of cycle) {
      if (Math.abs(s) > 0.9) timeAtExtremes++;
    }
    const extremeRatio = timeAtExtremes / n;

    // Symmetry
    const halfN = Math.floor(n / 2);
    let symmetryError = 0;
    for (let i = 0; i < halfN; i++) {
      symmetryError += Math.abs(cycle[i] + cycle[i + halfN]);
    }
    symmetryError /= halfN;

    return {
      rms,
      peakToPeak,
      crestFactor,
      slopeChanges,
      extremeRatio,
      symmetryError,
    };
  }

  /**
   * Score how well the cycle matches a sawtooth wave
   * Sawtooth: linear ramp up or down, then jump
   */
  scoreSawtooth(cycle, chars) {
    let score = 0;

    // Sawtooth has RMS ~ 0.577 (1/sqrt(3))
    const expectedRms = 0.577;
    score += 1 - Math.min(1, Math.abs(chars.rms - expectedRms) * 3);

    // Check for linear ramp (consistent slope until jump)
    const n = cycle.length;
    let linearPortion = 0;
    let prevSlope = cycle[1] - cycle[0];

    for (let i = 2; i < n - 1; i++) {
      const slope = cycle[i] - cycle[i - 1];
      if (Math.sign(slope) === Math.sign(prevSlope) && Math.abs(slope - prevSlope) < 0.1) {
        linearPortion++;
      }
    }
    score += (linearPortion / n) * 0.5;

    // Crest factor for sawtooth ~ 1.73
    score += 1 - Math.min(1, Math.abs(chars.crestFactor - 1.73) * 0.5);

    return score / 2.5;
  }

  /**
   * Score how well the cycle matches a square wave
   * Square: spends most time at extremes, rapid transitions
   */
  scoreSquare(cycle, chars) {
    let score = 0;

    // Square spends lots of time at extremes
    score += chars.extremeRatio * 2;

    // Square has RMS = 1 for normalized wave
    score += 1 - Math.min(1, Math.abs(chars.rms - 1) * 2);

    // Crest factor for square ~ 1.0
    score += 1 - Math.min(1, Math.abs(chars.crestFactor - 1) * 2);

    // Few slope changes (just at transitions)
    score += chars.slopeChanges < 4 ? 0.5 : 0;

    return score / 4.5;
  }

  /**
   * Score how well the cycle matches a triangle wave
   * Triangle: linear ramps up and down, no flats
   */
  scoreTriangle(cycle, chars) {
    let score = 0;

    // Triangle has RMS ~ 0.577
    const expectedRms = 0.577;
    score += 1 - Math.min(1, Math.abs(chars.rms - expectedRms) * 3);

    // No time at extremes (pointy peaks)
    score += 1 - chars.extremeRatio * 3;

    // Consistent slope magnitude throughout
    const n = cycle.length;
    const slopes = [];
    for (let i = 1; i < n; i++) {
      slopes.push(Math.abs(cycle[i] - cycle[i - 1]));
    }
    const avgSlope = slopes.reduce((a, b) => a + b, 0) / slopes.length;
    const slopeVariance = slopes.reduce((sum, s) => sum + (s - avgSlope) ** 2, 0) / slopes.length;
    score += 1 - Math.min(1, slopeVariance * 100);

    // Crest factor for triangle ~ 1.73
    score += 1 - Math.min(1, Math.abs(chars.crestFactor - 1.73) * 0.5);

    return score / 4;
  }

  /**
   * Score how well the cycle matches a sine wave
   * Sine: smooth, no sharp corners, specific RMS
   */
  scoreSine(cycle, chars) {
    let score = 0;

    // Sine has RMS ~ 0.707
    const expectedRms = 0.707;
    score += 1 - Math.min(1, Math.abs(chars.rms - expectedRms) * 3);

    // Crest factor for sine ~ 1.414
    score += 1 - Math.min(1, Math.abs(chars.crestFactor - 1.414) * 0.5);

    // Compare to actual sine
    const n = cycle.length;
    let sineError = 0;
    for (let i = 0; i < n; i++) {
      const expected = Math.sin(2 * Math.PI * i / n);
      sineError += (cycle[i] - expected) ** 2;
    }
    sineError = Math.sqrt(sineError / n);
    score += 1 - Math.min(1, sineError * 2);

    // Low symmetry error (sine is symmetric)
    score += 1 - Math.min(1, chars.symmetryError * 2);

    return score / 4;
  }

  /**
   * Generate a spectrogram image
   * @param {string} wavPath
   * @param {string} outputPath
   * @returns {string|null}
   */
  generateSpectrogram(wavPath, outputPath = null) {
    const outPath = outputPath || wavPath.replace(/\.wav$/i, '-spectrogram.png');
    try {
      execSync(`sox "${wavPath}" -n spectrogram -o "${outPath}" -x 1200 -y 400 -z 80`, { stdio: 'pipe' });
      return outPath;
    } catch {
      return null;
    }
  }

  /**
   * Format analysis results for human-readable output
   * @param {Object} analysis
   * @returns {string}
   */
  formatAnalysis(analysis) {
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
   * @param {Object} analysis
   * @returns {string[]}
   */
  getRecommendations(analysis) {
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
}

// Export presets for common analysis configurations
export const ANALYZE_PRESETS = {
  full: {
    generateSpectrogram: 1,
  },
  quick: {
    generateSpectrogram: 0,
  },
};
