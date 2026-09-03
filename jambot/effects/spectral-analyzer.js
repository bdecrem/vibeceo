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
import { existsSync, readFileSync } from 'fs';

/**
 * Clamp a dB value to a sane range, replacing NaN/Infinity with -120.
 * For RMS/peak levels (stats output), use maxDb=6.
 * For spectral magnitudes (stat -freq output), use maxDb=200 (FFT bins can be large).
 * @param {number} v - dB value
 * @param {number} maxDb - Upper bound (default 6 for level measurements)
 * @returns {number}
 */
function clampDb(v, maxDb = 6) {
  return isFinite(v) ? Math.max(-120, Math.min(maxDb, v)) : -120;
}

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

/**
 * Read a WAV file as mono Float32 samples (16/24/32-bit PCM or 32-bit float).
 * @param {string} path
 * @returns {{ samples: Float32Array, sampleRate: number }}
 */
export function readWavMono(path) {
  const b = readFileSync(path);
  let p = 12, fmt = null, off = 0, len = 0;
  while (p + 8 <= b.length) {
    const id = b.toString('ascii', p, p + 4), n = b.readUInt32LE(p + 4);
    if (id === 'fmt ') fmt = { tag: b.readUInt16LE(p + 8), ch: b.readUInt16LE(p + 10), sr: b.readUInt32LE(p + 12), bits: b.readUInt16LE(p + 22) };
    if (id === 'data') { off = p + 8; len = Math.min(n, b.length - off); break; }
    p += 8 + n + (n & 1);
  }
  if (!fmt || !off) throw new Error('Not a PCM WAV file');
  const { tag, ch, sr, bits } = fmt;
  const bps = bits / 8;
  const frames = Math.floor(len / (bps * ch));
  const out = new Float32Array(frames);
  for (let i = 0; i < frames; i++) {
    let sum = 0;
    for (let c = 0; c < ch; c++) {
      const o = off + (i * ch + c) * bps;
      let v;
      if (tag === 3 && bits === 32) v = b.readFloatLE(o);
      else if (bits === 16) v = b.readInt16LE(o) / 32768;
      else if (bits === 24) v = (((b[o] | (b[o + 1] << 8) | (b[o + 2] << 16)) << 8) >> 8) / 8388608;
      else if (bits === 32) v = b.readInt32LE(o) / 2147483648;
      else v = (b[o] - 128) / 128;
      sum += v;
    }
    out[i] = sum / ch;
  }
  return { samples: out, sampleRate: sr };
}

function nextPow2(n) { let p = 1; while (p < n) p <<= 1; return p; }

/** In-place iterative radix-2 FFT. re/im length must be a power of two. */
export function fftRadix2(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const p = i + k, q = i + k + len / 2;
        const br = re[q] * cr - im[q] * ci, bi = re[q] * ci + im[q] * cr;
        re[q] = re[p] - br; im[q] = im[p] - bi; re[p] += br; im[p] += bi;
        const ncr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = ncr;
      }
    }
  }
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
      fftSize = 32768,
      minPeakDistance = 10,
    } = options;

    if (!existsSync(wavPath)) {
      throw new Error(`File not found: ${wavPath}`);
    }

    // Native FFT (no sox): `sox stat -freq` only gave ~21.5 Hz bins and ranked
    // low-bin leakage above the actual note. Here: Hann-windowed 32768-point
    // frames averaged across the file, so bins are ~1.35 Hz at 44.1k, and each
    // peak's frequency/amplitude is parabolically interpolated between bins.
    // Amplitude is dBFS — a full-scale sine reads 0 dB.
    const { samples, sampleRate } = readWavMono(wavPath);
    const N = nextPow2(fftSize);
    const window = new Float32Array(N);
    let winSum = 0;
    for (let i = 0; i < N; i++) { window[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1)); winSum += window[i]; }

    const half = N / 2;
    const power = new Float64Array(half + 1);
    const total = samples.length;
    // Frame starts: hop N/2, but never more than 64 frames (long files)
    let hop = half;
    if (total > N) hop = Math.max(half, Math.floor((total - N) / 63));
    const starts = [];
    if (total <= N) starts.push(0); else for (let s0 = 0; s0 + N <= total; s0 += hop) starts.push(s0);
    const re = new Float64Array(N), im = new Float64Array(N);
    let used = 0;
    for (const s0 of starts) {
      let energy = 0;
      for (let i = 0; i < N; i++) { const v = s0 + i < total ? samples[s0 + i] : 0; re[i] = v * window[i]; im[i] = 0; energy += v * v; }
      if (Math.sqrt(energy / N) < 1e-5) continue;   // skip silent frames
      fftRadix2(re, im);
      for (let k = 0; k <= half; k++) power[k] += re[k] * re[k] + im[k] * im[k];
      used++;
    }
    if (used === 0) return [];

    // Averaged magnitude, normalized so a full-scale sine → 1.0 (0 dBFS)
    const db = new Float64Array(half + 1);
    for (let k = 0; k <= half; k++) { const mag = Math.sqrt(power[k] / used) * 2 / winSum; db[k] = mag > 0 ? 20 * Math.log10(mag) : -200; }

    const binHz = sampleRate / N;
    const kMin = Math.max(1, Math.ceil(minFreq / binHz));
    const kMax = Math.min(half - 1, Math.floor(maxFreq / binHz));
    const candidates = [];
    for (let k = kMin; k <= kMax; k++) {
      if (db[k] > db[k - 1] && db[k] >= db[k + 1] && db[k] >= minPeakDb) {
        // Parabolic interpolation on the log-magnitude spectrum
        const a = db[k - 1], b = db[k], c = db[k + 1];
        const denom = a - 2 * b + c;
        const delta = denom !== 0 ? 0.5 * (a - c) / denom : 0;
        const freq = (k + delta) * binHz;
        const amp = b - 0.25 * (a - c) * delta;
        candidates.push({ freq, amplitudeDb: amp });
      }
    }

    // Loudest first, drop anything within minPeakDistance of an accepted peak
    candidates.sort((x, y) => y.amplitudeDb - x.amplitudeDb);
    const peaks = [];
    for (const c of candidates) {
      if (peaks.some(p => Math.abs(p.freq - c.freq) < minPeakDistance)) continue;
      const noteInfo = hzToNote(c.freq);
      peaks.push({
        freq: Math.round(c.freq * 10) / 10,
        amplitudeDb: Math.round(clampDb(c.amplitudeDb, 200) * 10) / 10,
        note: noteInfo.note,
        midiNote: noteInfo.midiNote,
        cents: noteInfo.cents,
      });
      if (peaks.length >= maxPeaks) break;
    }
    return peaks;
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
      if (isFinite(prominence) && prominence >= minProminence) {
        prominentPeaks.push({
          freq: peak.freq,
          note: peak.note,
          prominenceDb: Math.round(Math.min(prominence, 60) * 10) / 10,
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

      const rmsMatch = output.match(/RMS lev dB\s+([-\d.inf]+)/);
      const rawRms = rmsMatch ? parseFloat(rmsMatch[1]) : -60;
      const rmsDb = clampDb(rawRms);

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

      const rmsMatch = output.match(/RMS lev dB\s+([-\d.inf]+)/);
      const rawRms = rmsMatch ? parseFloat(rmsMatch[1]) : -60;
      windowRms.push(clampDb(rawRms));
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

// Export clampDb for use by analyze-node.js
export { clampDb };
