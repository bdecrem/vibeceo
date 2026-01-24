/**
 * SpectralAnalyzer - FFT-based audio analysis for Jambot
 *
 * Provides spectral analysis capabilities:
 * - getSpectralPeaks: Find dominant frequencies in the spectrum
 * - detectResonance: Identify resonance peaks (squelch detection)
 * - analyzeNarrowBands: Analyze specific frequency bands (mud detection)
 * - measureSpectralFlux: Measure spectral change over time (filter movement)
 *
 * Requires: sox (brew install sox)
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';

/**
 * Convert Hz to musical note with cents deviation
 * @param {number} hz - Frequency in Hz
 * @returns {{ note: string, hz: number, cents: number, midiNote: number }}
 */
export function hzToNote(hz) {
  if (hz <= 0) {
    return { note: 'N/A', hz: 0, cents: 0, midiNote: 0 };
  }

  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const a4 = 440;

  // Calculate semitones from A4
  const semitones = 12 * Math.log2(hz / a4);
  const roundedSemitones = Math.round(semitones);
  const cents = Math.round((semitones - roundedSemitones) * 100);

  // MIDI note number (A4 = 69)
  const midiNote = 69 + roundedSemitones;

  // Get note name and octave
  const noteIndex = ((midiNote % 12) + 12) % 12;
  const noteName = noteNames[noteIndex];
  const octave = Math.floor(midiNote / 12) - 1;

  return {
    note: `${noteName}${octave}`,
    hz: Math.round(hz * 10) / 10,
    cents,
    midiNote,
  };
}

export class SpectralAnalyzer {
  constructor() {
    // Default FFT settings
    this.fftSize = 4096;
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
      const result = execSync(`sox ${args} 2>&1`, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
      return result;
    } catch (e) {
      return e.stdout?.toString() || e.stderr?.toString() || '';
    }
  }

  /**
   * Get spectral peaks from a WAV file
   *
   * Uses sox's stat -freq to get frequency spectrum data, then finds local maxima.
   *
   * @param {string} wavPath - Path to WAV file
   * @param {Object} options - Analysis options
   * @param {number} options.minFreq - Minimum frequency to consider (default: 20)
   * @param {number} options.maxFreq - Maximum frequency to consider (default: 8000)
   * @param {number} options.minPeakDb - Minimum amplitude for peaks (default: -40)
   * @param {number} options.maxPeaks - Maximum number of peaks to return (default: 10)
   * @returns {Array<{ freq: number, amplitudeDb: number, note: string, midiNote: number, cents: number }>}
   */
  getSpectralPeaks(wavPath, options = {}) {
    const {
      minFreq = 20,
      maxFreq = 8000,
      minPeakDb = -40,
      maxPeaks = 10,
    } = options;

    if (!existsSync(wavPath)) {
      throw new Error(`File not found: ${wavPath}`);
    }

    if (!this.checkSoxInstalled()) {
      throw new Error('sox is not installed. Run: brew install sox');
    }

    // Get frequency spectrum using sox stat -freq
    // This outputs frequency/amplitude pairs
    const output = this.runSox(`"${wavPath}" -n stat -freq`);

    // Parse the frequency data
    // sox stat -freq outputs lines like: "100.0 -25.3" (freq amplitude)
    const lines = output.split('\n');
    const spectrumData = [];

    for (const line of lines) {
      const match = line.trim().match(/^([\d.]+)\s+([-\d.]+)/);
      if (match) {
        const freq = parseFloat(match[1]);
        const amplitude = parseFloat(match[2]);

        if (freq >= minFreq && freq <= maxFreq && amplitude >= minPeakDb && isFinite(amplitude)) {
          spectrumData.push({ freq, amplitude });
        }
      }
    }

    if (spectrumData.length < 3) {
      return [];
    }

    // Sort by frequency for peak detection
    spectrumData.sort((a, b) => a.freq - b.freq);

    // Find local maxima (peaks)
    const peaks = [];
    const minPeakDistance = 20; // Hz - minimum distance between peaks

    for (let i = 1; i < spectrumData.length - 1; i++) {
      const prev = spectrumData[i - 1];
      const curr = spectrumData[i];
      const next = spectrumData[i + 1];

      // Local maximum: higher than both neighbors
      if (curr.amplitude > prev.amplitude && curr.amplitude > next.amplitude) {
        // Check if this peak is far enough from existing peaks
        const tooClose = peaks.some(p => Math.abs(p.freq - curr.freq) < minPeakDistance);
        if (!tooClose) {
          const noteInfo = hzToNote(curr.freq);
          peaks.push({
            freq: curr.freq,
            amplitudeDb: Math.round(curr.amplitude * 10) / 10,
            note: noteInfo.note,
            midiNote: noteInfo.midiNote,
            cents: noteInfo.cents,
          });
        }
      }
    }

    // Sort by amplitude (loudest first) and limit
    peaks.sort((a, b) => b.amplitudeDb - a.amplitudeDb);
    return peaks.slice(0, maxPeaks);
  }

  /**
   * Detect resonance peaks (the "squelch" in squelchy sounds)
   *
   * A resonance peak is a spectral peak significantly louder than its neighbors.
   * This indicates filter resonance - the characteristic acid squelch.
   *
   * @param {string} wavPath - Path to WAV file
   * @param {Object} options - Detection options
   * @param {number} options.minProminence - Minimum prominence in dB to count as resonance (default: 6)
   * @param {number} options.minFreq - Minimum frequency to check (default: 200)
   * @param {number} options.maxFreq - Maximum frequency to check (default: 4000)
   * @returns {{ detected: boolean, peaks: Array<{ freq: number, note: string, prominenceDb: number }>, description: string }}
   */
  detectResonance(wavPath, options = {}) {
    const {
      minProminence = 6,
      minFreq = 200,
      maxFreq = 4000,
    } = options;

    if (!existsSync(wavPath)) {
      throw new Error(`File not found: ${wavPath}`);
    }

    // Get all spectral peaks
    const allPeaks = this.getSpectralPeaks(wavPath, {
      minFreq,
      maxFreq,
      minPeakDb: -50,
      maxPeaks: 20,
    });

    if (allPeaks.length < 2) {
      return {
        detected: false,
        peaks: [],
        description: 'Not enough spectral data for resonance detection',
      };
    }

    // Calculate average amplitude
    const avgAmplitude = allPeaks.reduce((sum, p) => sum + p.amplitudeDb, 0) / allPeaks.length;

    // Find peaks that are significantly above average (prominent)
    const prominentPeaks = [];
    for (const peak of allPeaks) {
      const prominence = peak.amplitudeDb - avgAmplitude;
      if (prominence >= minProminence) {
        prominentPeaks.push({
          freq: peak.freq,
          note: peak.note,
          prominenceDb: Math.round(prominence * 10) / 10,
          amplitudeDb: peak.amplitudeDb,
        });
      }
    }

    // Sort by prominence (most prominent first)
    prominentPeaks.sort((a, b) => b.prominenceDb - a.prominenceDb);

    const detected = prominentPeaks.length > 0;
    let description = '';

    if (detected) {
      const top = prominentPeaks[0];
      if (top.prominenceDb >= 12) {
        description = `Strong resonance peak at ${Math.round(top.freq)}Hz (${top.note}), ${top.prominenceDb}dB above average - very squelchy`;
      } else if (top.prominenceDb >= 8) {
        description = `Resonance peak at ${Math.round(top.freq)}Hz (${top.note}), ${top.prominenceDb}dB above average - squelchy`;
      } else {
        description = `Mild resonance peak at ${Math.round(top.freq)}Hz (${top.note}), ${top.prominenceDb}dB above average - slightly squelchy`;
      }
    } else {
      description = 'No prominent resonance peaks detected - not squelchy';
    }

    return {
      detected,
      peaks: prominentPeaks.slice(0, 5), // Return top 5 prominent peaks
      description,
    };
  }

  /**
   * Analyze narrow frequency bands for mud detection
   *
   * Uses sox sinc filters to measure RMS in narrow bands (default 50Hz wide).
   * This helps identify frequency buildup in the "mud zone" (200-600Hz).
   *
   * @param {string} wavPath - Path to WAV file
   * @param {Object} options - Analysis options
   * @param {number} options.startHz - Start frequency (default: 200)
   * @param {number} options.endHz - End frequency (default: 600)
   * @param {number} options.bandwidthHz - Width of each band (default: 50)
   * @returns {{ bands: Array<{ centerFreq: number, rmsDb: number, note: string }>, mudDetected: boolean, worstBand: object|null, description: string }}
   */
  analyzeNarrowBands(wavPath, options = {}) {
    const {
      startHz = 200,
      endHz = 600,
      bandwidthHz = 50,
    } = options;

    if (!existsSync(wavPath)) {
      throw new Error(`File not found: ${wavPath}`);
    }

    if (!this.checkSoxInstalled()) {
      throw new Error('sox is not installed. Run: brew install sox');
    }

    const bands = [];
    const halfBand = bandwidthHz / 2;

    // Analyze each narrow band
    for (let centerFreq = startHz + halfBand; centerFreq <= endHz - halfBand; centerFreq += bandwidthHz) {
      const lowFreq = centerFreq - halfBand;
      const highFreq = centerFreq + halfBand;

      // Use sox sinc filter to isolate the band and get stats
      const output = this.runSox(`"${wavPath}" -n sinc ${lowFreq}-${highFreq} stats`);

      const rmsMatch = output.match(/RMS lev dB\s+([-\d.]+)/);
      const rmsDb = rmsMatch ? parseFloat(rmsMatch[1]) : -60;

      const noteInfo = hzToNote(centerFreq);
      bands.push({
        centerFreq,
        rmsDb: Math.round(rmsDb * 10) / 10,
        note: noteInfo.note,
      });
    }

    if (bands.length === 0) {
      return {
        bands: [],
        mudDetected: false,
        worstBand: null,
        description: 'No bands analyzed',
      };
    }

    // Calculate average RMS across all bands
    const avgRms = bands.reduce((sum, b) => sum + b.rmsDb, 0) / bands.length;

    // Find the loudest band
    const sortedBands = [...bands].sort((a, b) => b.rmsDb - a.rmsDb);
    const worstBand = sortedBands[0];

    // Mud is detected if any band is significantly above average
    const mudThreshold = 4; // dB above average
    const mudDetected = worstBand.rmsDb - avgRms >= mudThreshold;

    let description = '';
    if (mudDetected) {
      const excess = Math.round((worstBand.rmsDb - avgRms) * 10) / 10;
      description = `Mud detected at ${worstBand.centerFreq}Hz (${worstBand.note}): ${excess}dB above average. Consider cutting this frequency.`;
    } else {
      description = `Low-mid frequencies are balanced. No significant mud detected.`;
    }

    return {
      bands,
      mudDetected,
      worstBand: {
        ...worstBand,
        excessDb: Math.round((worstBand.rmsDb - avgRms) * 10) / 10,
      },
      avgRmsDb: Math.round(avgRms * 10) / 10,
      description,
    };
  }

  /**
   * Measure spectral flux (how much the spectrum changes over time)
   *
   * High flux in the mid-range indicates filter sweeps - the "acid" character.
   * This analyzes short windows and measures the difference between them.
   *
   * @param {string} wavPath - Path to WAV file
   * @param {Object} options - Analysis options
   * @param {number} options.windowMs - Window size in milliseconds (default: 100)
   * @param {number} options.freqLow - Low frequency bound (default: 200)
   * @param {number} options.freqHigh - High frequency bound (default: 2000)
   * @returns {{ avgFlux: number, maxFlux: number, fluxLevel: string, description: string }}
   */
  measureSpectralFlux(wavPath, options = {}) {
    const {
      windowMs = 100,
      freqLow = 200,
      freqHigh = 2000,
    } = options;

    if (!existsSync(wavPath)) {
      throw new Error(`File not found: ${wavPath}`);
    }

    if (!this.checkSoxInstalled()) {
      throw new Error('sox is not installed. Run: brew install sox');
    }

    // Get file duration
    const durationOutput = this.runSox(`--info -D "${wavPath}"`);
    const duration = parseFloat(durationOutput.trim());

    if (isNaN(duration) || duration <= 0) {
      return {
        avgFlux: 0,
        maxFlux: 0,
        fluxLevel: 'unknown',
        description: 'Could not determine file duration',
      };
    }

    const windowSec = windowMs / 1000;
    const numWindows = Math.floor(duration / windowSec);
    const maxWindows = Math.min(numWindows, 20); // Limit to 20 windows for performance

    if (maxWindows < 2) {
      return {
        avgFlux: 0,
        maxFlux: 0,
        fluxLevel: 'unknown',
        description: 'File too short for flux analysis',
      };
    }

    // Sample RMS in the target frequency band for each window
    const windowRms = [];
    const step = duration / maxWindows;

    for (let i = 0; i < maxWindows; i++) {
      const start = i * step;
      const output = this.runSox(`"${wavPath}" -n trim ${start.toFixed(3)} ${windowSec.toFixed(3)} sinc ${freqLow}-${freqHigh} stats`);

      const rmsMatch = output.match(/RMS lev dB\s+([-\d.]+)/);
      const rmsDb = rmsMatch ? parseFloat(rmsMatch[1]) : -60;
      windowRms.push(rmsDb);
    }

    // Calculate flux as the average absolute difference between adjacent windows
    const fluxValues = [];
    for (let i = 1; i < windowRms.length; i++) {
      const flux = Math.abs(windowRms[i] - windowRms[i - 1]);
      fluxValues.push(flux);
    }

    if (fluxValues.length === 0) {
      return {
        avgFlux: 0,
        maxFlux: 0,
        fluxLevel: 'static',
        description: 'No spectral movement detected',
      };
    }

    const avgFlux = fluxValues.reduce((a, b) => a + b, 0) / fluxValues.length;
    const maxFlux = Math.max(...fluxValues);

    // Categorize the flux level
    let fluxLevel, description;
    if (avgFlux >= 6) {
      fluxLevel = 'high';
      description = `High spectral flux (${avgFlux.toFixed(1)}dB avg) - filter is moving actively, strong acid character`;
    } else if (avgFlux >= 3) {
      fluxLevel = 'medium';
      description = `Medium spectral flux (${avgFlux.toFixed(1)}dB avg) - some filter movement, moderate dynamics`;
    } else if (avgFlux >= 1) {
      fluxLevel = 'low';
      description = `Low spectral flux (${avgFlux.toFixed(1)}dB avg) - minimal filter movement, static sound`;
    } else {
      fluxLevel = 'static';
      description = `Very low spectral flux (${avgFlux.toFixed(1)}dB avg) - no filter movement detected`;
    }

    return {
      avgFlux: Math.round(avgFlux * 10) / 10,
      maxFlux: Math.round(maxFlux * 10) / 10,
      fluxLevel,
      description,
    };
  }

  /**
   * Format analysis results for human-readable output
   * @param {Object} analysis - Combined analysis results
   * @returns {string}
   */
  formatAnalysis(analysis) {
    const lines = [];

    if (analysis.resonance) {
      lines.push('RESONANCE DETECTION:');
      lines.push(`  ${analysis.resonance.description}`);
      if (analysis.resonance.peaks && analysis.resonance.peaks.length > 0) {
        lines.push('  Prominent peaks:');
        for (const peak of analysis.resonance.peaks.slice(0, 3)) {
          lines.push(`    ${Math.round(peak.freq)}Hz (${peak.note}): +${peak.prominenceDb}dB prominence`);
        }
      }
      lines.push('');
    }

    if (analysis.mud) {
      lines.push('MUD DETECTION (200-600Hz):');
      lines.push(`  ${analysis.mud.description}`);
      if (analysis.mud.bands && analysis.mud.bands.length > 0) {
        lines.push('  Band levels:');
        for (const band of analysis.mud.bands) {
          const bar = '='.repeat(Math.max(0, Math.round((band.rmsDb + 60) / 3)));
          lines.push(`    ${band.centerFreq}Hz: ${bar} ${band.rmsDb}dB`);
        }
      }
      lines.push('');
    }

    if (analysis.flux) {
      lines.push('SPECTRAL FLUX:');
      lines.push(`  ${analysis.flux.description}`);
      lines.push(`  Avg flux: ${analysis.flux.avgFlux}dB, Max flux: ${analysis.flux.maxFlux}dB`);
      lines.push('');
    }

    return lines.join('\n');
  }
}

// Export singleton instance for easy use
export const spectralAnalyzer = new SpectralAnalyzer();
