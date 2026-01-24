/**
 * Analyze Tools
 *
 * Tools for audio analysis: analyze_render, analyze_waveform, detect_waveform,
 * detect_resonance, detect_mud
 *
 * Uses the AnalyzeNode for basic analysis and SpectralAnalyzer for spectral analysis.
 */

import { registerTools } from './index.js';
import { AnalyzeNode } from '../effects/analyze-node.js';
import { spectralAnalyzer } from '../effects/spectral-analyzer.js';

// Create a singleton instance of AnalyzeNode for tool use
const analyzeNode = new AnalyzeNode('analyze');

const analyzeTools = {
  /**
   * Analyze a rendered WAV file
   * Returns levels, frequency balance, sidechain detection, and recommendations
   */
  analyze_render: async (input, session, context) => {
    const { filename, spectrogram } = input;
    // Use provided filename, or fall back to session's last rendered file
    const wavPath = filename || session.lastRenderedFile;

    if (!wavPath) {
      return 'No WAV file to analyze. Render first, or provide a filename.';
    }

    try {
      // Set BPM from session
      analyzeNode.setParam('bpm', session.bpm || 128);

      const analysis = await analyzeNode.analyze(wavPath, {
        bpm: session.bpm || 128,
        spectrogram: spectrogram || false,
      });

      const formatted = analyzeNode.formatAnalysis(analysis);
      const recommendations = analyzeNode.getRecommendations(analysis);

      return `${formatted}\n\nRECOMMENDATIONS:\n${recommendations.map(r => `  - ${r}`).join('\n')}`;
    } catch (e) {
      return `Analysis error: ${e.message}`;
    }
  },

  /**
   * Detect the waveform type of a WAV file
   * Useful for verifying synthesizer output (saw, square, triangle, sine)
   */
  detect_waveform: async (input, session, context) => {
    const { filename } = input;
    const wavPath = filename || session.lastRenderedFile;

    if (!wavPath) {
      return 'No WAV file to analyze. Render first, or provide a filename.';
    }

    try {
      const result = analyzeNode.detectWaveform(wavPath);

      if (result.detected === 'unknown') {
        return `Could not detect waveform: ${result.reason || 'unknown error'}`;
      }

      const lines = [
        'WAVEFORM DETECTION:',
        `  Type: ${result.detected.toUpperCase()}`,
        `  Confidence: ${(result.confidence * 100).toFixed(0)}%`,
        `  Margin: ${(result.margin * 100).toFixed(0)}%`,
      ];

      if (result.estimatedFrequency) {
        lines.push(`  Estimated Frequency: ${result.estimatedFrequency} Hz`);
      }

      if (result.allScores) {
        lines.push('');
        lines.push('All Scores:');
        for (const [type, score] of Object.entries(result.allScores)) {
          const bar = '='.repeat(Math.round(score * 20));
          lines.push(`  ${type.padEnd(10)} ${bar} ${(score * 100).toFixed(0)}%`);
        }
      }

      if (result.characteristics) {
        lines.push('');
        lines.push('Characteristics:');
        lines.push(`  RMS: ${result.characteristics.rms.toFixed(3)}`);
        lines.push(`  Crest Factor: ${result.characteristics.crestFactor.toFixed(3)}`);
        lines.push(`  Extreme Ratio: ${(result.characteristics.extremeRatio * 100).toFixed(1)}%`);
      }

      return lines.join('\n');
    } catch (e) {
      return `Waveform detection error: ${e.message}`;
    }
  },

  /**
   * Verify that a WAV file contains the expected waveform type
   * Returns pass/fail with detailed comparison
   */
  verify_waveform: async (input, session, context) => {
    const { filename, expected } = input;
    const wavPath = filename || session.lastRenderedFile;

    if (!wavPath) {
      return 'No WAV file to verify. Render first, or provide a filename.';
    }

    if (!expected) {
      return 'Error: expected waveform type required (sawtooth, square, triangle, sine)';
    }

    const validTypes = ['sawtooth', 'square', 'triangle', 'sine'];
    // Normalize: 'saw' -> 'sawtooth', but don't break 'sawtooth'
    let normalizedExpected = expected.toLowerCase();
    if (normalizedExpected === 'saw') {
      normalizedExpected = 'sawtooth';
    }

    if (!validTypes.includes(normalizedExpected)) {
      return `Error: invalid waveform type "${expected}". Valid types: ${validTypes.join(', ')}, saw`;
    }

    try {
      const result = analyzeNode.detectWaveform(wavPath);

      if (result.detected === 'unknown') {
        return `VERIFY FAILED: Could not detect waveform - ${result.reason || 'unknown error'}`;
      }

      const detected = result.detected.toLowerCase();
      const passed = detected === normalizedExpected;

      const lines = [
        `WAVEFORM VERIFICATION: ${passed ? 'PASSED' : 'FAILED'}`,
        `  Expected: ${normalizedExpected}`,
        `  Detected: ${detected}`,
        `  Confidence: ${(result.confidence * 100).toFixed(0)}%`,
      ];

      if (!passed && result.allScores) {
        lines.push('');
        lines.push(`  Expected score: ${(result.allScores[normalizedExpected] * 100).toFixed(0)}%`);
        lines.push(`  Detected score: ${(result.allScores[detected] * 100).toFixed(0)}%`);
      }

      if (result.estimatedFrequency) {
        lines.push(`  Frequency: ${result.estimatedFrequency} Hz`);
      }

      return lines.join('\n');
    } catch (e) {
      return `Verification error: ${e.message}`;
    }
  },

  /**
   * Generate a spectrogram image from a WAV file
   */
  generate_spectrogram: async (input, session, context) => {
    const { filename, output } = input;
    const wavPath = filename || session.lastRenderedFile;

    if (!wavPath) {
      return 'No WAV file to analyze. Render first, or provide a filename.';
    }

    try {
      const spectrogramPath = analyzeNode.generateSpectrogram(wavPath, output);

      if (spectrogramPath) {
        return `Spectrogram generated: ${spectrogramPath}`;
      } else {
        return 'Failed to generate spectrogram. Make sure sox is installed (brew install sox).';
      }
    } catch (e) {
      return `Spectrogram error: ${e.message}`;
    }
  },

  /**
   * Check if sox (audio analysis tool) is installed
   */
  check_sox: async (input, session, context) => {
    const installed = analyzeNode.checkSoxInstalled();

    if (installed) {
      return 'sox is installed and available for audio analysis.';
    } else {
      return 'sox is NOT installed. Install with: brew install sox';
    }
  },

  /**
   * Detect resonance peaks in audio (squelch detection)
   *
   * Identifies if a sound has prominent filter resonance - the characteristic
   * "squelch" of acid bass. Returns resonance peaks and their prominence.
   */
  detect_resonance: async (input, session, context) => {
    const { filename, minProminence, minFreq, maxFreq } = input;
    const wavPath = filename || session.lastRenderedFile;

    if (!wavPath) {
      return 'No WAV file to analyze. Render first, or provide a filename.';
    }

    try {
      const result = spectralAnalyzer.detectResonance(wavPath, {
        minProminence: minProminence || 6,
        minFreq: minFreq || 200,
        maxFreq: maxFreq || 4000,
      });

      const lines = [
        'RESONANCE DETECTION:',
        `  Squelchy: ${result.detected ? 'YES' : 'NO'}`,
        '',
        `  ${result.description}`,
      ];

      if (result.peaks && result.peaks.length > 0) {
        lines.push('');
        lines.push('  Prominent Peaks:');
        for (const peak of result.peaks) {
          lines.push(`    ${Math.round(peak.freq)}Hz (${peak.note}): +${peak.prominenceDb}dB prominence`);
        }
      }

      return lines.join('\n');
    } catch (e) {
      return `Resonance detection error: ${e.message}`;
    }
  },

  /**
   * Detect mud in the low-mid frequency range
   *
   * Analyzes narrow frequency bands in the "mud zone" (200-600Hz) to identify
   * frequency buildup that can make a mix sound muddy or boomy.
   */
  detect_mud: async (input, session, context) => {
    const { filename, startHz, endHz, bandwidthHz } = input;
    const wavPath = filename || session.lastRenderedFile;

    if (!wavPath) {
      return 'No WAV file to analyze. Render first, or provide a filename.';
    }

    try {
      const result = spectralAnalyzer.analyzeNarrowBands(wavPath, {
        startHz: startHz || 200,
        endHz: endHz || 600,
        bandwidthHz: bandwidthHz || 50,
      });

      const lines = [
        'MUD DETECTION (Low-Mid Frequency Analysis):',
        `  Mud Detected: ${result.mudDetected ? 'YES' : 'NO'}`,
        '',
        `  ${result.description}`,
      ];

      if (result.worstBand) {
        lines.push('');
        lines.push(`  Loudest Band: ${result.worstBand.centerFreq}Hz (${result.worstBand.note})`);
        lines.push(`    Level: ${result.worstBand.rmsDb}dB (${result.worstBand.excessDb >= 0 ? '+' : ''}${result.worstBand.excessDb}dB vs average)`);
      }

      if (result.bands && result.bands.length > 0) {
        lines.push('');
        lines.push('  Band Analysis:');
        for (const band of result.bands) {
          const normalizedLevel = band.rmsDb + 60; // Normalize to 0-60 range
          const barLength = Math.max(0, Math.round(normalizedLevel / 2));
          const bar = '='.repeat(barLength);
          lines.push(`    ${band.centerFreq.toString().padStart(3)}Hz (${band.note.padEnd(3)}): ${bar.padEnd(30)} ${band.rmsDb}dB`);
        }
      }

      return lines.join('\n');
    } catch (e) {
      return `Mud detection error: ${e.message}`;
    }
  },

  /**
   * Measure spectral flux (filter movement / acid character)
   *
   * Measures how much the spectrum changes over time. High flux in the
   * mid-range indicates active filter sweeps - the "acid" character.
   */
  measure_spectral_flux: async (input, session, context) => {
    const { filename, windowMs, freqLow, freqHigh } = input;
    const wavPath = filename || session.lastRenderedFile;

    if (!wavPath) {
      return 'No WAV file to analyze. Render first, or provide a filename.';
    }

    try {
      const result = spectralAnalyzer.measureSpectralFlux(wavPath, {
        windowMs: windowMs || 100,
        freqLow: freqLow || 200,
        freqHigh: freqHigh || 2000,
      });

      const lines = [
        'SPECTRAL FLUX ANALYSIS:',
        `  Flux Level: ${result.fluxLevel.toUpperCase()}`,
        '',
        `  ${result.description}`,
        '',
        `  Average Flux: ${result.avgFlux}dB`,
        `  Maximum Flux: ${result.maxFlux}dB`,
      ];

      return lines.join('\n');
    } catch (e) {
      return `Spectral flux error: ${e.message}`;
    }
  },

  /**
   * Get spectral peaks - find dominant frequencies
   *
   * Returns the loudest frequency peaks in the spectrum with their
   * musical note names and amplitudes.
   */
  get_spectral_peaks: async (input, session, context) => {
    const { filename, minFreq, maxFreq, minPeakDb, maxPeaks } = input;
    const wavPath = filename || session.lastRenderedFile;

    if (!wavPath) {
      return 'No WAV file to analyze. Render first, or provide a filename.';
    }

    try {
      const peaks = spectralAnalyzer.getSpectralPeaks(wavPath, {
        minFreq: minFreq || 20,
        maxFreq: maxFreq || 8000,
        minPeakDb: minPeakDb || -40,
        maxPeaks: maxPeaks || 10,
      });

      if (peaks.length === 0) {
        return 'No spectral peaks found. The audio may be too quiet or too noisy.';
      }

      const lines = [
        'SPECTRAL PEAKS (Dominant Frequencies):',
        '',
      ];

      for (let i = 0; i < peaks.length; i++) {
        const peak = peaks[i];
        const centsStr = peak.cents >= 0 ? `+${peak.cents}` : `${peak.cents}`;
        lines.push(`  ${i + 1}. ${Math.round(peak.freq)}Hz (${peak.note}, ${centsStr} cents): ${peak.amplitudeDb}dB`);
      }

      return lines.join('\n');
    } catch (e) {
      return `Spectral peaks error: ${e.message}`;
    }
  },
};

registerTools(analyzeTools);
