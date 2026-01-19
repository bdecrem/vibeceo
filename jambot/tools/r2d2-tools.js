/**
 * R2D2 Tools (Bass Monosynth)
 *
 * Tools for R2D2 bass synth: add_r2d2, tweak_r2d2
 */

import { registerTools } from './index.js';
import { getParamDef, toEngine } from '../params/converters.js';

const r2d2Tools = {
  /**
   * Add R2D2 bass pattern - 16 steps with note, gate, accent, slide
   */
  add_r2d2: async (input, session, context) => {
    const pattern = input.pattern || [];
    session.r2d2Pattern = Array(16).fill(null).map((_, i) => {
      const step = pattern[i] || {};
      return {
        note: step.note || 'C2',
        gate: step.gate || false,
        accent: step.accent || false,
        slide: step.slide || false,
      };
    });
    const activeSteps = session.r2d2Pattern.filter(s => s.gate).length;
    return `R2D2 bass: ${activeSteps} notes`;
  },

  /**
   * Tweak R2D2 parameters
   * Accepts producer units: dB for level, Hz for cutoff, semitones for octave, 0-100 for others
   */
  tweak_r2d2: async (input, session, context) => {
    const tweaks = [];

    // Mute: convenience alias for level=-60dB (silent)
    if (input.mute === true) {
      const def = getParamDef('r2d2', 'bass', 'level');
      session.r2d2Params.level = def ? toEngine(-60, def) : 0;
      tweaks.push('muted');
    }

    // Level: dB → linear
    if (input.level !== undefined) {
      const def = getParamDef('r2d2', 'bass', 'level');
      session.r2d2Params.level = def ? toEngine(input.level, def) : input.level;
      tweaks.push(`level=${input.level}dB`);
    }

    // Oscillator 1
    if (input.osc1Waveform !== undefined) {
      session.r2d2Params.osc1Waveform = input.osc1Waveform;
      tweaks.push(`osc1Waveform=${input.osc1Waveform}`);
    }
    if (input.osc1Octave !== undefined) {
      session.r2d2Params.osc1Octave = input.osc1Octave;
      tweaks.push(`osc1Octave=${input.osc1Octave > 0 ? '+' : ''}${input.osc1Octave}st`);
    }
    if (input.osc1Detune !== undefined) {
      session.r2d2Params.osc1Detune = input.osc1Detune;
      tweaks.push(`osc1Detune=${input.osc1Detune}`);
    }
    if (input.osc1Level !== undefined) {
      const def = getParamDef('r2d2', 'bass', 'osc1Level');
      session.r2d2Params.osc1Level = def ? toEngine(input.osc1Level, def) : input.osc1Level / 100;
      tweaks.push(`osc1Level=${input.osc1Level}`);
    }

    // Oscillator 2
    if (input.osc2Waveform !== undefined) {
      session.r2d2Params.osc2Waveform = input.osc2Waveform;
      tweaks.push(`osc2Waveform=${input.osc2Waveform}`);
    }
    if (input.osc2Octave !== undefined) {
      session.r2d2Params.osc2Octave = input.osc2Octave;
      tweaks.push(`osc2Octave=${input.osc2Octave > 0 ? '+' : ''}${input.osc2Octave}st`);
    }
    if (input.osc2Detune !== undefined) {
      session.r2d2Params.osc2Detune = input.osc2Detune;
      tweaks.push(`osc2Detune=${input.osc2Detune}`);
    }
    if (input.osc2Level !== undefined) {
      const def = getParamDef('r2d2', 'bass', 'osc2Level');
      session.r2d2Params.osc2Level = def ? toEngine(input.osc2Level, def) : input.osc2Level / 100;
      tweaks.push(`osc2Level=${input.osc2Level}`);
    }

    // Filter
    if (input.filterCutoff !== undefined) {
      const def = getParamDef('r2d2', 'bass', 'filterCutoff');
      session.r2d2Params.filterCutoff = def ? toEngine(input.filterCutoff, def) : input.filterCutoff;
      const display = input.filterCutoff >= 1000 ? `${(input.filterCutoff/1000).toFixed(1)}kHz` : `${input.filterCutoff}Hz`;
      tweaks.push(`filterCutoff=${display}`);
    }
    if (input.filterResonance !== undefined) {
      const def = getParamDef('r2d2', 'bass', 'filterResonance');
      session.r2d2Params.filterResonance = def ? toEngine(input.filterResonance, def) : input.filterResonance / 100;
      tweaks.push(`filterResonance=${input.filterResonance}`);
    }
    if (input.filterEnvAmount !== undefined) {
      const def = getParamDef('r2d2', 'bass', 'filterEnvAmount');
      // Env amount can be negative, handle specially
      session.r2d2Params.filterEnvAmount = input.filterEnvAmount / 100;  // -100 to 100 → -1 to 1
      tweaks.push(`filterEnvAmount=${input.filterEnvAmount}`);
    }

    // Filter ADSR
    const filterEnvParams = ['filterAttack', 'filterDecay', 'filterSustain', 'filterRelease'];
    for (const param of filterEnvParams) {
      if (input[param] !== undefined) {
        const def = getParamDef('r2d2', 'bass', param);
        session.r2d2Params[param] = def ? toEngine(input[param], def) : input[param] / 100;
        tweaks.push(`${param}=${input[param]}`);
      }
    }

    // Amp ADSR
    const ampEnvParams = ['ampAttack', 'ampDecay', 'ampSustain', 'ampRelease'];
    for (const param of ampEnvParams) {
      if (input[param] !== undefined) {
        const def = getParamDef('r2d2', 'bass', param);
        session.r2d2Params[param] = def ? toEngine(input[param], def) : input[param] / 100;
        tweaks.push(`${param}=${input[param]}`);
      }
    }

    // Drive
    if (input.drive !== undefined) {
      const def = getParamDef('r2d2', 'bass', 'drive');
      session.r2d2Params.drive = def ? toEngine(input.drive, def) : input.drive / 100;
      tweaks.push(`drive=${input.drive}`);
    }

    return `R2D2 bass: ${tweaks.join(', ')}`;
  },
};

registerTools(r2d2Tools);
