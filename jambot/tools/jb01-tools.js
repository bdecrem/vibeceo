/**
 * JB01 Tools (Reference Drum Machine)
 *
 * Tools for JB01 drum machine:
 *   - add_jb01 (pattern)
 *   - tweak_jb01 (voice params)
 *   - list_jb01_kits, load_jb01_kit (sound presets)
 *   - list_jb01_sequences, load_jb01_sequence (pattern presets)
 *
 * Uses shared converter architecture from params/converters.js
 * Uses shared preset loader from presets/loader.js
 */

import { registerTools } from './index.js';
import { resolveInstrument } from './targets.js';
import { getParamDef, toEngine, fromEngine, formatValue } from '../params/converters.js';
import { listKits, loadKit, listSequences, loadSequence } from '../presets/loader.js';
import { programDrumPattern, finishDrumProgram } from './jt-tools.js';

const VOICES = ['kick', 'snare', 'clap', 'ch', 'oh', 'lowtom', 'hitom', 'cymbal'];

const jb01Tools = {
  /**
   * Add JB01 drum pattern
   * @param {number} [bars] - Pattern length in bars (16 steps per bar); grows to fit the steps given
   * @param {boolean} [clear=false] - Clear all voices before adding (the only way to shrink)
   * Accepts either step arrays (e.g., kick: [0, 4, 8, 12]) or full pattern objects.
   * Voices not named in the call are kept (stretched by repetition if the
   * pattern grows). See programDrumPattern() in jt-tools.js for the rules.
   */
  add_jb01: async (input, session, context) => {
    const inst = resolveInstrument(session, input.instrument, 'jb01');
    if (inst.error) return inst.error;
    const res = programDrumPattern({ input, voices: VOICES, pattern: inst.pattern, label: 'JB01' });
    if (res.error) return res.error;
    return finishDrumProgram(res, input, session, inst, 'JB01');
  },

  /**
   * Tweak JB01 voice parameters
   * Accepts producer units: dB for level, semitones for tune, 0-100 for others
   */
  tweak_jb01: async (input, session, context) => {
    const inst = resolveInstrument(session, input.instrument, 'jb01');
    if (inst.error) return inst.error;
    const voice = input.voice;
    if (!voice || !VOICES.includes(voice)) {
      return `JB01: invalid voice. Use: ${VOICES.join(', ')}`;
    }

    // Params are managed by JB01Node via inst.params proxy
    const tweaks = [];

    // Mute: convenience alias for level=-60dB, Unmute: restore to 0dB
    if (input.mute === true) {
      const def = getParamDef('jb01', voice, 'level');
      inst.params[voice].level = def ? toEngine(-60, def) : 0;
      tweaks.push('muted');
    } else if (input.mute === false) {
      const def = getParamDef('jb01', voice, 'level');
      inst.params[voice].level = def ? toEngine(0, def) : 1;  // 0dB = unity
      tweaks.push('unmuted');
    }

    // Level: dB → linear
    if (input.level !== undefined) {
      const def = getParamDef('jb01', voice, 'level');
      inst.params[voice].level = def ? toEngine(input.level, def) : input.level;
      tweaks.push(`level=${input.level}dB`);
    }

    // Tune: semitones → cents
    if (input.tune !== undefined) {
      // Store as cents (semitones * 100)
      inst.params[voice].tune = input.tune * 100;
      tweaks.push(`tune=${input.tune > 0 ? '+' : ''}${input.tune}st`);
    }

    // Decay: 0-100 → 0-1
    if (input.decay !== undefined) {
      const def = getParamDef('jb01', voice, 'decay');
      inst.params[voice].decay = def ? toEngine(input.decay, def) : input.decay / 100;
      tweaks.push(`decay=${input.decay}`);
    }

    // Attack (kick only): 0-100 → 0-1
    if (input.attack !== undefined && voice === 'kick') {
      const def = getParamDef('jb01', voice, 'attack');
      inst.params[voice].attack = def ? toEngine(input.attack, def) : input.attack / 100;
      tweaks.push(`attack=${input.attack}`);
    }

    // Sweep (kick only): 0-100 → 0-1
    if (input.sweep !== undefined && voice === 'kick') {
      const def = getParamDef('jb01', voice, 'sweep');
      inst.params[voice].sweep = def ? toEngine(input.sweep, def) : input.sweep / 100;
      tweaks.push(`sweep=${input.sweep}`);
    }

    // Tone: 0-100 → 0-1
    if (input.tone !== undefined) {
      const def = getParamDef('jb01', voice, 'tone');
      inst.params[voice].tone = def ? toEngine(input.tone, def) : input.tone / 100;
      tweaks.push(`tone=${input.tone}`);
    }

    // Snappy (snare only): 0-100 → 0-1
    if (input.snappy !== undefined && voice === 'snare') {
      const def = getParamDef('jb01', voice, 'snappy');
      inst.params[voice].snappy = def ? toEngine(input.snappy, def) : input.snappy / 100;
      tweaks.push(`snappy=${input.snappy}`);
    }

    if (tweaks.length === 0) {
      return `JB01 ${voice}: no changes`;
    }

    return `JB01 ${voice}: ${tweaks.join(', ')}`;
  },

  /**
   * List available JB01 kits (sound presets)
   */
  list_jb01_kits: async (input, session, context) => {
    const kits = listKits('jb01');
    if (kits.length === 0) {
      return 'No JB01 kits found';
    }
    const lines = kits.map(k => `• ${k.id}: ${k.name}${k.description ? ` - ${k.description}` : ''} (${k.source})`);
    return `JB01 kits:\n${lines.join('\n')}`;
  },

  /**
   * Load a JB01 kit (sound preset)
   */
  load_jb01_kit: async (input, session, context) => {
    const inst = resolveInstrument(session, input.instrument, 'jb01');
    if (inst.error) return inst.error;
    const kitId = input.kit || input.name || 'default';

    // JB01 kits are nested per voice ({ params: { kick: {...}, snare: {...} } }).
    // loadKit() converts them to engine units; only descriptor-backed numeric
    // values are written — a malformed kit gets an error, never stray keys.
    const result = loadKit('jb01', kitId);
    if (result.error) return `Error: ${result.error}`;
    if (!result.nested || !result.params) {
      return `Error: kit '${kitId}' has no per-voice params (expected { params: { kick: { level, tune, decay, ... }, ... } })`;
    }

    const applied = [];
    const skipped = [...(result.skipped || [])];
    for (const voice of VOICES) {
      const params = result.params[voice];
      if (!params) continue;
      let n = 0;
      for (const [param, value] of Object.entries(params)) {
        if (!getParamDef('jb01', voice, param) || typeof value !== 'number' || !Number.isFinite(value)) {
          skipped.push(`${voice}.${param}`);
          continue;
        }
        if (inst.node.setParam(`${voice}.${param}`, value)) n++;
        else skipped.push(`${voice}.${param}`);
      }
      if (n > 0) applied.push(voice);
    }

    if (applied.length === 0) {
      return `Error: kit '${kitId}' had no usable JB01 params${skipped.length ? ` (skipped: ${skipped.join(', ')})` : ''}`;
    }

    const skippedLabel = skipped.length ? `; skipped ${skipped.join(', ')}` : '';
    return `Loaded JB01 kit: ${result.name || kitId} (${applied.length} voices: ${applied.join(', ')}${skippedLabel})`;
  },

  /**
   * List available JB01 sequences (pattern presets)
   */
  list_jb01_sequences: async (input, session, context) => {
    const sequences = listSequences('jb01');
    if (sequences.length === 0) {
      return 'No JB01 sequences found';
    }
    const lines = sequences.map(s => `• ${s.id}: ${s.name}${s.description ? ` - ${s.description}` : ''} (${s.source})`);
    return `JB01 sequences:\n${lines.join('\n')}`;
  },

  /**
   * Load a JB01 sequence (pattern preset)
   */
  load_jb01_sequence: async (input, session, context) => {
    const inst = resolveInstrument(session, input.instrument, 'jb01');
    if (inst.error) return inst.error;
    const seqId = input.sequence || input.name || 'default';
    const result = loadSequence('jb01', seqId);

    if (result.error) {
      return result.error;
    }

    // Pattern is managed by JB01Node via inst.pattern proxy
    // Apply pattern (result.pattern is a full pattern object)
    if (result.pattern) {
      for (const voice of VOICES) {
        if (result.pattern[voice]) {
          inst.pattern[voice] = result.pattern[voice];
        }
      }
    }

    // Count total hits
    let totalHits = 0;
    for (const voice of VOICES) {
      const pattern = inst.pattern[voice] || [];
      totalHits += pattern.filter(s => s && s.velocity > 0).length;
    }

    return `Loaded JB01 sequence: ${result.name} (${totalHits} hits)${result.description ? ` - ${result.description}` : ''}`;
  },

  /**
   * Show current JB01 state
   */
  show_jb01: async (input, session, context) => {
    const inst = resolveInstrument(session, input.instrument, 'jb01');
    if (inst.error) return inst.error;
    const lines = ['JB01 Drum Machine:'];

    // Pattern
    lines.push('\nPattern:');
    for (const voice of VOICES) {
      const pattern = inst.pattern?.[voice] || [];
      const hits = pattern.filter(s => s && s.velocity > 0).length;
      if (hits > 0) {
        const steps = pattern.map((s, i) => (s && s.velocity > 0) ? i : null).filter(i => i !== null);
        lines.push(`  ${voice}: [${steps.join(', ')}]`);
      }
    }

    // Params (convert engine units to producer-friendly units for display)
    if (inst.params) {
      lines.push('\nParams:');
      for (const voice of VOICES) {
        const engineParams = inst.params[voice];
        if (engineParams && Object.keys(engineParams).length > 0) {
          const paramParts = [];
          for (const [paramName, engineValue] of Object.entries(engineParams)) {
            if (engineValue === undefined) continue;
            const def = getParamDef('jb01', voice, paramName);
            if (def) {
              const producerValue = fromEngine(engineValue, def);
              paramParts.push(`${paramName}=${formatValue(producerValue, def)}`);
            } else {
              paramParts.push(`${paramName}=${typeof engineValue === 'number' ? engineValue.toFixed(2) : engineValue}`);
            }
          }
          if (paramParts.length > 0) {
            lines.push(`  ${voice}: ${paramParts.join(', ')}`);
          }
        }
      }
    }

    return lines.join('\n');
  },
};

registerTools(jb01Tools);
