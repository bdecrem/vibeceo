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
import { getParamDef, toEngine, fromEngine, formatValue } from '../params/converters.js';
import { listKits, loadKit, listSequences, loadSequence } from '../presets/loader.js';

const VOICES = ['kick', 'snare', 'clap', 'ch', 'oh', 'perc', 'tom', 'cymbal'];

/**
 * Convert step array (e.g., [0, 4, 8, 12]) to pattern array
 * @param {number[]} steps - Step positions
 * @param {number} length - Total pattern length in steps
 * @param {number} velocity - Hit velocity (default 1)
 * @param {boolean} accent - Accent flag (default false)
 */
function stepsToPattern(steps, length = 16, velocity = 1, accent = false) {
  return Array(length).fill(null).map((_, i) => ({
    velocity: steps.includes(i) ? velocity : 0,
    accent: steps.includes(i) ? accent : false,
  }));
}

const jb01Tools = {
  /**
   * Add JB01 drum pattern
   * @param {number} [bars=1] - Pattern length in bars (16 steps per bar)
   * @param {boolean} [clear=false] - Clear all voices before adding (for creating fresh patterns)
   * Accepts either step arrays (e.g., kick: [0, 4, 8, 12]) or full pattern objects
   */
  add_jb01: async (input, session, context) => {
    const bars = input.bars || 1;
    const steps = bars * 16;
    const added = [];

    // Clear all voices first if requested (for creating fresh patterns in song mode)
    if (input.clear) {
      for (const voice of VOICES) {
        session.jb01Pattern[voice] = stepsToPattern([], steps);
      }
    }

    // If bars > 1 and no existing pattern, resize first
    if (bars > 1) {
      for (const voice of VOICES) {
        if (!session.jb01Pattern[voice] || session.jb01Pattern[voice].length < steps) {
          session.jb01Pattern[voice] = stepsToPattern([], steps);
        }
      }
    }

    for (const voice of VOICES) {
      if (input[voice] !== undefined) {
        const data = input[voice];

        if (Array.isArray(data)) {
          // Check if it's a step array (numbers) or pattern array (objects)
          if (data.length > 0 && typeof data[0] === 'number') {
            // Step array: [0, 4, 8, 12]
            session.jb01Pattern[voice] = stepsToPattern(data, steps);
            added.push(`${voice}: ${data.length} hits`);
          } else {
            // Full pattern array - use as-is (pad if needed)
            if (data.length < steps) {
              const padded = [...data, ...Array(steps - data.length).fill({ velocity: 0, accent: false })];
              session.jb01Pattern[voice] = padded;
            } else {
              session.jb01Pattern[voice] = data;
            }
            const activeSteps = data.filter(s => s && s.velocity > 0).length;
            added.push(`${voice}: ${activeSteps} hits`);
          }
        }
      }
    }

    // Also update the node's pattern
    if (session._nodes?.jb01) {
      session._nodes.jb01.setPattern(session.jb01Pattern);
    }

    if (added.length === 0) {
      return 'JB01: no pattern changes';
    }

    const barsLabel = bars > 1 ? ` (${bars} bars)` : '';
    const clearLabel = input.clear ? ' (cleared first)' : '';
    return `JB01: ${added.join(', ')}${barsLabel}${clearLabel}`;
  },

  /**
   * Tweak JB01 voice parameters
   * Accepts producer units: dB for level, semitones for tune, 0-100 for others
   */
  tweak_jb01: async (input, session, context) => {
    const voice = input.voice;
    if (!voice || !VOICES.includes(voice)) {
      return `JB01: invalid voice. Use: ${VOICES.join(', ')}`;
    }

    // Params are managed by JB01Node via session.jb01Params proxy
    const tweaks = [];

    // Mute: convenience alias for level=-60dB, Unmute: restore to 0dB
    if (input.mute === true) {
      const def = getParamDef('jb01', voice, 'level');
      session.jb01Params[voice].level = def ? toEngine(-60, def) : 0;
      tweaks.push('muted');
    } else if (input.mute === false) {
      const def = getParamDef('jb01', voice, 'level');
      session.jb01Params[voice].level = def ? toEngine(0, def) : 1;  // 0dB = unity
      tweaks.push('unmuted');
    }

    // Level: dB → linear
    if (input.level !== undefined) {
      const def = getParamDef('jb01', voice, 'level');
      session.jb01Params[voice].level = def ? toEngine(input.level, def) : input.level;
      tweaks.push(`level=${input.level}dB`);
    }

    // Tune: semitones → cents
    if (input.tune !== undefined) {
      // Store as cents (semitones * 100)
      session.jb01Params[voice].tune = input.tune * 100;
      tweaks.push(`tune=${input.tune > 0 ? '+' : ''}${input.tune}st`);
    }

    // Decay: 0-100 → 0-1
    if (input.decay !== undefined) {
      const def = getParamDef('jb01', voice, 'decay');
      session.jb01Params[voice].decay = def ? toEngine(input.decay, def) : input.decay / 100;
      tweaks.push(`decay=${input.decay}`);
    }

    // Attack (kick only): 0-100 → 0-1
    if (input.attack !== undefined && voice === 'kick') {
      const def = getParamDef('jb01', voice, 'attack');
      session.jb01Params[voice].attack = def ? toEngine(input.attack, def) : input.attack / 100;
      tweaks.push(`attack=${input.attack}`);
    }

    // Sweep (kick only): 0-100 → 0-1
    if (input.sweep !== undefined && voice === 'kick') {
      const def = getParamDef('jb01', voice, 'sweep');
      session.jb01Params[voice].sweep = def ? toEngine(input.sweep, def) : input.sweep / 100;
      tweaks.push(`sweep=${input.sweep}`);
    }

    // Tone: 0-100 → 0-1
    if (input.tone !== undefined) {
      const def = getParamDef('jb01', voice, 'tone');
      session.jb01Params[voice].tone = def ? toEngine(input.tone, def) : input.tone / 100;
      tweaks.push(`tone=${input.tone}`);
    }

    // Snappy (snare only): 0-100 → 0-1
    if (input.snappy !== undefined && voice === 'snare') {
      const def = getParamDef('jb01', voice, 'snappy');
      session.jb01Params[voice].snappy = def ? toEngine(input.snappy, def) : input.snappy / 100;
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
    const kitId = input.kit || input.name || 'default';

    // Params are managed by JB01Node via session.jb01Params proxy
    let loaded = false;
    const loadedVoices = [];

    for (const voice of VOICES) {
      const result = loadKit('jb01', kitId, voice);
      if (!result.error && result.params) {
        // Object.assign works with proxy - triggers set for each param
        Object.assign(session.jb01Params[voice], result.params);
        loaded = true;
        loadedVoices.push(voice);
      }
    }

    if (!loaded) {
      return `Kit '${kitId}' not found or empty`;
    }

    return `Loaded JB01 kit: ${kitId} (${loadedVoices.length} voices)`;
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
    const seqId = input.sequence || input.name || 'default';
    const result = loadSequence('jb01', seqId);

    if (result.error) {
      return result.error;
    }

    // Pattern is managed by JB01Node via session.jb01Pattern proxy
    // Apply pattern (result.pattern is a full pattern object)
    if (result.pattern) {
      for (const voice of VOICES) {
        if (result.pattern[voice]) {
          session.jb01Pattern[voice] = result.pattern[voice];
        }
      }
    }

    // Count total hits
    let totalHits = 0;
    for (const voice of VOICES) {
      const pattern = session.jb01Pattern[voice] || [];
      totalHits += pattern.filter(s => s && s.velocity > 0).length;
    }

    return `Loaded JB01 sequence: ${result.name} (${totalHits} hits)${result.description ? ` - ${result.description}` : ''}`;
  },

  /**
   * Show current JB01 state
   */
  show_jb01: async (input, session, context) => {
    const lines = ['JB01 Drum Machine:'];

    // Pattern
    lines.push('\nPattern:');
    for (const voice of VOICES) {
      const pattern = session.jb01Pattern?.[voice] || [];
      const hits = pattern.filter(s => s && s.velocity > 0).length;
      if (hits > 0) {
        const steps = pattern.map((s, i) => (s && s.velocity > 0) ? i : null).filter(i => i !== null);
        lines.push(`  ${voice}: [${steps.join(', ')}]`);
      }
    }

    // Params (convert engine units to producer-friendly units for display)
    if (session.jb01Params) {
      lines.push('\nParams:');
      for (const voice of VOICES) {
        const engineParams = session.jb01Params[voice];
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
