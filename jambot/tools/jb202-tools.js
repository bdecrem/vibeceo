/**
 * JB202 Tools (Modular Bass Synth)
 *
 * Tools for JB202 bass synth with custom DSP:
 *   - add_jb202, tweak_jb202 (pattern and params)
 *   - list_jb202_kits, load_jb202_kit (sound presets)
 *   - list_jb202_sequences, load_jb202_sequence (pattern presets)
 *
 * Uses shared converter architecture from params/converters.js
 * Uses shared preset loader from presets/loader.js
 */

import { registerTools } from './index.js';
import { getParamDef, toEngine } from '../params/converters.js';
import { listKits, loadKit, listSequences, loadSequence } from '../presets/loader.js';

const jb202Tools = {
  /**
   * Add JB202 bass pattern
   * @param {Array} pattern - Array of steps with note, gate, accent, slide
   * @param {number} [bars=1] - Pattern length in bars (16 steps per bar)
   */
  add_jb202: async (input, session, context) => {
    const pattern = input.pattern || [];
    const bars = input.bars || 1;
    const steps = bars * 16;

    session.jb202Pattern = Array(steps).fill(null).map((_, i) => {
      const step = pattern[i] || {};
      return {
        note: step.note || 'C2',
        gate: step.gate || false,
        accent: step.accent || false,
        slide: step.slide || false,
      };
    });

    // Also update the node's pattern
    if (session._nodes?.jb202) {
      session._nodes.jb202.setPattern(session.jb202Pattern);
    }

    const activeSteps = session.jb202Pattern.filter(s => s.gate).length;
    const barsLabel = bars > 1 ? ` (${bars} bars)` : '';
    return `JB202 bass: ${activeSteps} notes${barsLabel}`;
  },

  /**
   * DEPRECATED: Use generic tweak() instead.
   *
   * Examples with generic tweak:
   *   tweak({ path: 'jb202.bass.filterCutoff', value: 800 })     -> 800Hz
   *   tweak({ path: 'jb202.bass.filterResonance', value: 40 })   -> 40%
   *   tweak({ path: 'jb202.bass.drive', value: 50 })             -> 50%
   *   tweak({ path: 'jb202.bass.level', value: 80 })             -> 80%
   *
   * This tool still works but is no longer the recommended approach.
   * The generic tweak() handles unit conversion automatically.
   *
   * @deprecated
   */
  tweak_jb202: async (input, session, context) => {
    const tweaks = [];

    // Mute: convenience alias for level=0, Unmute: restore to 100
    if (input.mute === true) {
      const def = getParamDef('jb202', 'bass', 'level');
      session.jb202Params.level = def ? toEngine(0, def) : 0;
      tweaks.push('muted');
    } else if (input.mute === false) {
      const def = getParamDef('jb202', 'bass', 'level');
      session.jb202Params.level = def ? toEngine(100, def) : 1;
      tweaks.push('unmuted');
    }

    // Level: 0-100
    if (input.level !== undefined) {
      const def = getParamDef('jb202', 'bass', 'level');
      session.jb202Params.level = def ? toEngine(input.level, def) : input.level / 100;
      tweaks.push(`level=${input.level}`);
    }

    // Oscillator 1
    if (input.osc1Waveform !== undefined) {
      session.jb202Params.osc1Waveform = input.osc1Waveform;
      tweaks.push(`osc1Waveform=${input.osc1Waveform}`);
    }
    if (input.osc1Octave !== undefined) {
      // Octave passes through as semitones (engine expects semitones, not cents)
      session.jb202Params.osc1Octave = Math.max(-24, Math.min(24, input.osc1Octave));
      tweaks.push(`osc1Octave=${input.osc1Octave > 0 ? '+' : ''}${input.osc1Octave}st`);
    }
    if (input.osc1Detune !== undefined) {
      const def = getParamDef('jb202', 'bass', 'osc1Detune');
      session.jb202Params.osc1Detune = def ? toEngine(input.osc1Detune, def) : input.osc1Detune;
      tweaks.push(`osc1Detune=${input.osc1Detune > 0 ? '+' : ''}${input.osc1Detune}`);
    }
    if (input.osc1Level !== undefined) {
      const def = getParamDef('jb202', 'bass', 'osc1Level');
      session.jb202Params.osc1Level = def ? toEngine(input.osc1Level, def) : input.osc1Level / 100;
      tweaks.push(`osc1Level=${input.osc1Level}`);
    }

    // Oscillator 2
    if (input.osc2Waveform !== undefined) {
      session.jb202Params.osc2Waveform = input.osc2Waveform;
      tweaks.push(`osc2Waveform=${input.osc2Waveform}`);
    }
    if (input.osc2Octave !== undefined) {
      // Octave passes through as semitones (engine expects semitones, not cents)
      session.jb202Params.osc2Octave = Math.max(-24, Math.min(24, input.osc2Octave));
      tweaks.push(`osc2Octave=${input.osc2Octave > 0 ? '+' : ''}${input.osc2Octave}st`);
    }
    if (input.osc2Detune !== undefined) {
      const def = getParamDef('jb202', 'bass', 'osc2Detune');
      session.jb202Params.osc2Detune = def ? toEngine(input.osc2Detune, def) : input.osc2Detune;
      tweaks.push(`osc2Detune=${input.osc2Detune > 0 ? '+' : ''}${input.osc2Detune}`);
    }
    if (input.osc2Level !== undefined) {
      const def = getParamDef('jb202', 'bass', 'osc2Level');
      session.jb202Params.osc2Level = def ? toEngine(input.osc2Level, def) : input.osc2Level / 100;
      tweaks.push(`osc2Level=${input.osc2Level}`);
    }

    // Filter
    if (input.filterCutoff !== undefined) {
      const def = getParamDef('jb202', 'bass', 'filterCutoff');
      session.jb202Params.filterCutoff = def ? toEngine(input.filterCutoff, def) : input.filterCutoff;
      const display = input.filterCutoff >= 1000 ? `${(input.filterCutoff/1000).toFixed(1)}kHz` : `${input.filterCutoff}Hz`;
      tweaks.push(`filterCutoff=${display}`);
    }
    if (input.filterResonance !== undefined) {
      const def = getParamDef('jb202', 'bass', 'filterResonance');
      session.jb202Params.filterResonance = def ? toEngine(input.filterResonance, def) : input.filterResonance / 100;
      tweaks.push(`filterResonance=${input.filterResonance}`);
    }
    if (input.filterEnvAmount !== undefined) {
      const def = getParamDef('jb202', 'bass', 'filterEnvAmount');
      session.jb202Params.filterEnvAmount = def ? toEngine(input.filterEnvAmount, def) : input.filterEnvAmount;
      tweaks.push(`filterEnvAmount=${input.filterEnvAmount > 0 ? '+' : ''}${input.filterEnvAmount}`);
    }

    // Filter ADSR
    const filterEnvParams = ['filterAttack', 'filterDecay', 'filterSustain', 'filterRelease'];
    for (const param of filterEnvParams) {
      if (input[param] !== undefined) {
        const def = getParamDef('jb202', 'bass', param);
        session.jb202Params[param] = def ? toEngine(input[param], def) : input[param] / 100;
        tweaks.push(`${param}=${input[param]}`);
      }
    }

    // Amp ADSR
    const ampEnvParams = ['ampAttack', 'ampDecay', 'ampSustain', 'ampRelease'];
    for (const param of ampEnvParams) {
      if (input[param] !== undefined) {
        const def = getParamDef('jb202', 'bass', param);
        session.jb202Params[param] = def ? toEngine(input[param], def) : input[param] / 100;
        tweaks.push(`${param}=${input[param]}`);
      }
    }

    // Drive
    if (input.drive !== undefined) {
      const def = getParamDef('jb202', 'bass', 'drive');
      session.jb202Params.drive = def ? toEngine(input.drive, def) : input.drive / 100;
      tweaks.push(`drive=${input.drive}`);
    }

    return `JB202 bass: ${tweaks.join(', ')}`;
  },

  /**
   * List available JB202 kits (sound presets)
   */
  list_jb202_kits: async (input, session, context) => {
    const kits = listKits('jb202');
    if (kits.length === 0) {
      return 'No JB202 kits found';
    }
    const lines = kits.map(k => `* ${k.id}: ${k.name}${k.description ? ` - ${k.description}` : ''} (${k.source})`);
    return `JB202 kits:\n${lines.join('\n')}`;
  },

  /**
   * Load a JB202 kit (sound preset)
   * Applies all params from the kit file
   */
  load_jb202_kit: async (input, session, context) => {
    const kitId = input.kit || input.name || 'default';
    const result = loadKit('jb202', kitId, 'bass');

    if (result.error) {
      return result.error;
    }

    // Apply all params from kit
    Object.assign(session.jb202Params, result.params);

    return `Loaded JB202 kit: ${result.name}${result.description ? ` - ${result.description}` : ''}`;
  },

  /**
   * List available JB202 sequences (pattern presets)
   */
  list_jb202_sequences: async (input, session, context) => {
    const sequences = listSequences('jb202');
    if (sequences.length === 0) {
      return 'No JB202 sequences found';
    }
    const lines = sequences.map(s => `* ${s.id}: ${s.name}${s.description ? ` - ${s.description}` : ''} (${s.source})`);
    return `JB202 sequences:\n${lines.join('\n')}`;
  },

  /**
   * Load a JB202 sequence (pattern preset)
   * Applies the pattern from the sequence file
   */
  load_jb202_sequence: async (input, session, context) => {
    const seqId = input.sequence || input.name || 'default';
    const result = loadSequence('jb202', seqId);

    if (result.error) {
      return result.error;
    }

    // Apply pattern
    session.jb202Pattern = result.pattern;
    const activeSteps = result.pattern.filter(s => s.gate).length;

    return `Loaded JB202 sequence: ${result.name} (${activeSteps} notes)${result.description ? ` - ${result.description}` : ''}`;
  },
};

registerTools(jb202Tools);
