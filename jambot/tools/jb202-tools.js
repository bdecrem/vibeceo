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
import { resolveInstrument } from './targets.js';
import { getParamDef, toEngine } from '../params/converters.js';
import { listKits, loadKit, listSequences, loadSequence } from '../presets/loader.js';

/**
 * Canonical note name ('C2', 'Bb1', 'F#3') or null when unparseable. The
 * engine's noteToMidi silently played C4 for 'DB2', 'C', 'H2' — a typo became
 * a wrong pitch two octaves up instead of an error the agent could fix.
 */
export function canonicalNote(note) {
  if (typeof note !== 'string') return null;
  const m = note.trim().match(/^([A-Ga-g])([#b♭]?)(-?\d)$/i);
  if (!m) return null;
  const acc = m[2] === '♭' ? 'b' : m[2].toLowerCase() === 'b' ? 'b' : m[2];
  return `${m[1].toUpperCase()}${acc}${m[3]}`;
}

const jb202Tools = {
  /**
   * Add JB202 bass pattern
   * @param {Array} pattern - Array of steps with note, gate, accent, slide
   * @param {number} [bars] - Pattern length in bars (16 steps per bar).
   *   Defaults to the length the pattern needs (a 32-step pattern is 2 bars).
   */
  add_jb202: async (input, session, context) => {
    const inst = resolveInstrument(session, input.instrument, 'jb202');
    if (inst.error) return inst.error;
    const pattern = input.pattern || [];
    if (!Array.isArray(pattern)) return 'Error: pattern must be an array of steps';

    // Size from the pattern: a 32-step bass line is two bars, not 16 steps
    // with the second half silently dropped. An explicit `bars` that is
    // shorter than the pattern is an error, not a truncation.
    const neededBars = Math.max(1, Math.ceil(pattern.length / 16));
    const bars = input.bars ? Math.round(input.bars) : neededBars;
    if (!(bars >= 1)) return 'Error: bars must be a positive number';
    const steps = bars * 16;
    if (pattern.length > steps) {
      return `Error: pattern has ${pattern.length} steps but bars=${bars} only holds ${steps}. Pass bars: ${neededBars} (or omit bars).`;
    }

    const badNotes = [];
    const normalized = Array(steps).fill(null).map((_, i) => {
      const step = pattern[i] || {};
      let note = 'C2';
      if (step.note !== undefined && step.note !== null) {
        const c = canonicalNote(step.note);
        if (!c) badNotes.push(`step ${i} (${JSON.stringify(step.note)})`);
        else note = c;
      }
      return {
        note,
        gate: !!step.gate,
        accent: !!step.accent,
        slide: !!step.slide,
      };
    });
    if (badNotes.length) {
      return `Error: unparseable note name(s) at ${badNotes.join(', ')} — use names like C1, Eb2, F#2 (letter, optional # or b, octave).`;
    }

    inst.pattern = normalized;

    const activeSteps = normalized.filter(s => s.gate).length;
    const barsLabel = bars > 1 ? ` (${bars} bars)` : '';
    return `JB202 bass: ${activeSteps} notes${barsLabel}`;
  },

  /**
   * DEPRECATED: Use generic tweak() instead.
   *
   * Examples with generic tweak:
   *   tweak({ path: 'jb202.bass.filterCutoff', value: 800 })     -> 800Hz
   *   tweak({ path: `${inst.id}.bass.level`, delta: -5 })             -> Reduce level by 5
   *
   * This tool still works but is no longer the recommended approach.
   * The generic tweak() handles unit conversion automatically AND supports
   * relative adjustments via delta parameter.
   *
   * @deprecated
   */
  tweak_jb202: async (input, session, context) => {
    const inst = resolveInstrument(session, input.instrument, 'jb202');
    if (inst.error) return inst.error;
    const tweaks = [];
    const errors = [];

    // Every write goes through the node and is checked — a refused value
    // (unknown param, bad waveform) used to be reported as applied.
    const apply = (param, engineValue, label) => {
      if (inst.node.setParam(`bass.${param}`, engineValue)) tweaks.push(label);
      else {
        const d = inst.node.getDescriptor(`bass.${param}`);
        const hint = d?.options ? ` (one of ${d.options.join('|')})` : '';
        errors.push(`${param}=${JSON.stringify(input[param])} rejected${hint}`);
      }
    };
    const conv = (param, value) => {
      const def = getParamDef('jb202', 'bass', param);
      return def ? toEngine(value, def) : value;
    };

    // Mute / level / levelDelta act on the NODE output level (dB) — the
    // instrument has no 'bass.level' param, so the old session.set() calls
    // were refused and the bass played on at 0 dB while the tool said "muted".
    if (input.mute === true) {
      inst.node.setParam('mute', true);
      tweaks.push('muted (-60dB)');
    } else if (input.mute === false) {
      inst.node.setParam('mute', false);
      tweaks.push(`unmuted (${inst.node.getLevel()}dB)`);
    }

    if (input.level !== undefined || input.levelDelta !== undefined) {
      const def = getParamDef('jb202', 'bass', 'level');
      const minLevel = def?.min ?? -60;
      const maxLevel = def?.max ?? 6;
      let newLevel;
      if (input.levelDelta !== undefined) {
        const current = inst.node.getLevel();
        newLevel = Math.max(minLevel, Math.min(maxLevel, current + input.levelDelta));
        tweaks.push(`level=${Math.round(newLevel)}dB (was ${Math.round(current)}dB, ${input.levelDelta > 0 ? '+' : ''}${input.levelDelta})`);
      } else {
        newLevel = Math.max(minLevel, Math.min(maxLevel, input.level));
        tweaks.push(`level=${Math.round(newLevel)}dB`);
      }
      inst.node.setLevel(newLevel);
    }

    // Oscillator 1
    if (input.osc1Waveform !== undefined) apply('osc1Waveform', input.osc1Waveform, `osc1Waveform=${input.osc1Waveform}`);
    if (input.osc1Octave !== undefined) {
      // Semitones in, stored as cents (the shared 'semitones' engine unit);
      // the node converts to engine semitones at render time.
      apply('osc1Octave', conv('osc1Octave', input.osc1Octave), `osc1Octave=${input.osc1Octave > 0 ? '+' : ''}${input.osc1Octave}st`);
    }
    if (input.osc1Detune !== undefined) apply('osc1Detune', conv('osc1Detune', input.osc1Detune), `osc1Detune=${input.osc1Detune > 0 ? '+' : ''}${input.osc1Detune}`);
    if (input.osc1Level !== undefined) apply('osc1Level', conv('osc1Level', input.osc1Level), `osc1Level=${input.osc1Level}`);

    // Oscillator 2
    if (input.osc2Waveform !== undefined) apply('osc2Waveform', input.osc2Waveform, `osc2Waveform=${input.osc2Waveform}`);
    if (input.osc2Octave !== undefined) {
      apply('osc2Octave', conv('osc2Octave', input.osc2Octave), `osc2Octave=${input.osc2Octave > 0 ? '+' : ''}${input.osc2Octave}st`);
    }
    if (input.osc2Detune !== undefined) apply('osc2Detune', conv('osc2Detune', input.osc2Detune), `osc2Detune=${input.osc2Detune > 0 ? '+' : ''}${input.osc2Detune}`);
    if (input.osc2Level !== undefined) apply('osc2Level', conv('osc2Level', input.osc2Level), `osc2Level=${input.osc2Level}`);

    // Filter
    if (input.filterCutoff !== undefined) {
      const display = input.filterCutoff >= 1000 ? `${(input.filterCutoff / 1000).toFixed(1)}kHz` : `${input.filterCutoff}Hz`;
      apply('filterCutoff', conv('filterCutoff', input.filterCutoff), `filterCutoff=${display}`);
    }
    if (input.filterResonance !== undefined) apply('filterResonance', conv('filterResonance', input.filterResonance), `filterResonance=${input.filterResonance}`);
    if (input.filterEnvAmount !== undefined) apply('filterEnvAmount', conv('filterEnvAmount', input.filterEnvAmount), `filterEnvAmount=${input.filterEnvAmount > 0 ? '+' : ''}${input.filterEnvAmount}`);

    // Filter ADSR + Amp ADSR + drive (all 0-100)
    for (const param of ['filterAttack', 'filterDecay', 'filterSustain', 'filterRelease', 'ampAttack', 'ampDecay', 'ampSustain', 'ampRelease', 'drive']) {
      if (input[param] !== undefined) apply(param, conv(param, input[param]), `${param}=${input[param]}`);
    }

    if (tweaks.length === 0 && errors.length === 0) return 'JB202 bass: no changes';
    let out = `JB202 bass: ${tweaks.join(', ')}`;
    if (errors.length) out += `${tweaks.length ? '. ' : ''}Error: ${errors.join('; ')}`;
    return out;
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
    const inst = resolveInstrument(session, input.instrument, 'jb202');
    if (inst.error) return inst.error;
    const kitId = input.kit || input.name || 'default';
    const result = loadKit('jb202', kitId, 'bass');

    if (result.error) {
      return result.error;
    }

    // Apply all params from kit. Library presets and bundled kits carry the
    // octaves as raw semitones (-12); the node stores cents — JB202Node.setParam
    // recognises integer semitones within ±24 and scales them, so the value
    // reads back as -12st and renders a real sub octave.
    for (const [param, value] of Object.entries(result.params || {})) {
      inst.node.setParam(`bass.${param}`, value);
    }

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
    const inst = resolveInstrument(session, input.instrument, 'jb202');
    if (inst.error) return inst.error;
    const seqId = input.sequence || input.name || 'default';
    const result = loadSequence('jb202', seqId);

    if (result.error) {
      return result.error;
    }

    // Apply pattern
    inst.pattern = result.pattern;
    const activeSteps = result.pattern.filter(s => s.gate).length;

    return `Loaded JB202 sequence: ${result.name} (${activeSteps} notes)${result.description ? ` - ${result.description}` : ''}`;
  },
};

registerTools(jb202Tools);
