/**
 * Analyze Tools
 *
 * Tools for audio analysis: analyze_render, analyze_waveform, detect_waveform
 *
 * Uses the AnalyzeNode for all analysis operations.
 */

import { registerTools } from './index.js';
import { AnalyzeNode } from '../effects/analyze-node.js';

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
};

registerTools(analyzeTools);
