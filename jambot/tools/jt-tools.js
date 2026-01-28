/**
 * JT Series Tools
 *
 * Tools for the JT instruments:
 *   - JT10 (101-style lead synth)
 *   - JT30 (303-style acid bass)
 *   - JT90 (909-style drum machine)
 */

import { registerTools } from './index.js';
import { getParamDef, toEngine } from '../params/converters.js';

// JT90 voices
const JT90_VOICES = ['kick', 'snare', 'clap', 'rimshot', 'lowtom', 'midtom', 'hitom', 'ch', 'oh', 'crash', 'ride'];

/**
 * Convert step array to melodic pattern
 */
function createMelodicPattern(steps = 16) {
  return Array(steps).fill(null).map(() => ({
    note: 'C2',
    gate: false,
    accent: false,
    slide: false,
  }));
}

/**
 * Convert step array to drum pattern
 */
function stepsToPattern(steps, length = 16, velocity = 1, accent = false) {
  return Array(length).fill(null).map((_, i) => ({
    velocity: steps.includes(i) ? velocity : 0,
    accent: steps.includes(i) ? accent : false,
  }));
}

const jtTools = {
  // ==================== JT10 (Lead Synth) ====================

  /**
   * Add JT10 lead pattern
   */
  add_jt10: async (input, session, context) => {
    const pattern = input.pattern;

    if (!pattern || !Array.isArray(pattern)) {
      return 'JT10: pattern must be an array of 16 steps';
    }

    // Normalize pattern to 16 steps
    const normalized = pattern.slice(0, 16);
    while (normalized.length < 16) {
      normalized.push({ note: 'C3', gate: false, accent: false, slide: false });
    }

    session.jt10Pattern = normalized;

    // Also update the node's pattern
    if (session._nodes?.jt10) {
      session._nodes.jt10.setPattern(normalized);
    }

    const activeSteps = normalized.filter(s => s.gate).length;
    return `JT10: ${activeSteps} notes programmed`;
  },

  /**
   * Tweak JT10 lead parameters
   */
  tweak_jt10: async (input, session, context) => {
    const tweaks = [];

    // Mute/unmute
    if (input.mute === true) {
      session._nodes?.jt10?.setParam('lead.level', 0);
      tweaks.push('muted');
    } else if (input.mute === false) {
      session._nodes?.jt10?.setParam('lead.level', 0.8);
      tweaks.push('unmuted');
    }

    // Map producer params to engine params
    const paramMap = {
      level: 'level',
      waveform: 'waveform',
      pulseWidth: 'pulseWidth',
      subLevel: 'subLevel',
      subOctave: 'subOctave',
      filterCutoff: 'filterCutoff',
      filterResonance: 'filterResonance',
      filterEnvAmount: 'filterEnvAmount',
      filterAttack: 'filterAttack',
      filterDecay: 'filterDecay',
      filterSustain: 'filterSustain',
      filterRelease: 'filterRelease',
      ampAttack: 'ampAttack',
      ampDecay: 'ampDecay',
      ampSustain: 'ampSustain',
      ampRelease: 'ampRelease',
      lfoRate: 'lfoRate',
      lfoAmount: 'lfoAmount',
      lfoDestination: 'lfoDestination',
    };

    for (const [inputKey, engineKey] of Object.entries(paramMap)) {
      if (input[inputKey] !== undefined) {
        const def = getParamDef('jt10', 'lead', engineKey);
        let value = input[inputKey];

        // Convert producer units to engine units
        if (def && typeof value === 'number') {
          value = toEngine(value, def);
        }

        session._nodes?.jt10?.setParam(`lead.${engineKey}`, value);
        tweaks.push(`${inputKey}=${input[inputKey]}`);
      }
    }

    if (tweaks.length === 0) {
      return 'JT10: no changes';
    }

    return `JT10: ${tweaks.join(', ')}`;
  },

  // ==================== JT30 (Acid Bass) ====================

  /**
   * Add JT30 acid bass pattern
   */
  add_jt30: async (input, session, context) => {
    const pattern = input.pattern;

    if (!pattern || !Array.isArray(pattern)) {
      return 'JT30: pattern must be an array of 16 steps';
    }

    // Normalize pattern to 16 steps
    const normalized = pattern.slice(0, 16);
    while (normalized.length < 16) {
      normalized.push({ note: 'C2', gate: false, accent: false, slide: false });
    }

    session.jt30Pattern = normalized;

    // Also update the node's pattern
    if (session._nodes?.jt30) {
      session._nodes.jt30.setPattern(normalized);
    }

    const activeSteps = normalized.filter(s => s.gate).length;
    return `JT30: ${activeSteps} notes programmed`;
  },

  /**
   * Tweak JT30 acid bass parameters
   */
  tweak_jt30: async (input, session, context) => {
    const tweaks = [];

    // Mute/unmute
    if (input.mute === true) {
      session._nodes?.jt30?.setParam('bass.level', 0);
      tweaks.push('muted');
    } else if (input.mute === false) {
      session._nodes?.jt30?.setParam('bass.level', 1.0);
      tweaks.push('unmuted');
    }

    // Map producer params to engine params
    // Tool uses filterCutoff/filterResonance, engine uses cutoff/resonance
    const paramMap = {
      level: 'level',
      waveform: 'waveform',
      filterCutoff: 'cutoff',
      filterResonance: 'resonance',
      filterEnvAmount: 'envMod',
      filterDecay: 'decay',
      accentLevel: 'accent',
      drive: 'drive',
    };

    for (const [inputKey, engineKey] of Object.entries(paramMap)) {
      if (input[inputKey] !== undefined) {
        const def = getParamDef('jt30', 'bass', engineKey);
        let value = input[inputKey];

        // Convert producer units to engine units
        if (def && typeof value === 'number') {
          value = toEngine(value, def);
        }

        session._nodes?.jt30?.setParam(`bass.${engineKey}`, value);
        tweaks.push(`${inputKey}=${input[inputKey]}`);
      }
    }

    if (tweaks.length === 0) {
      return 'JT30: no changes';
    }

    return `JT30: ${tweaks.join(', ')}`;
  },

  // ==================== JT90 (Drum Machine) ====================

  /**
   * Add JT90 drum pattern
   */
  add_jt90: async (input, session, context) => {
    const bars = input.bars || 1;
    const steps = bars * 16;
    const added = [];

    // Clear all voices first if requested
    if (input.clear) {
      for (const voice of JT90_VOICES) {
        session.jt90Pattern[voice] = stepsToPattern([], steps);
      }
    }

    // If bars > 1 and no existing pattern, resize first
    if (bars > 1) {
      for (const voice of JT90_VOICES) {
        if (!session.jt90Pattern[voice] || session.jt90Pattern[voice].length < steps) {
          session.jt90Pattern[voice] = stepsToPattern([], steps);
        }
      }
    }

    for (const voice of JT90_VOICES) {
      if (input[voice] !== undefined) {
        const data = input[voice];

        if (Array.isArray(data)) {
          // Check if it's a step array (numbers) or pattern array (objects)
          if (data.length > 0 && typeof data[0] === 'number') {
            // Step array: [0, 4, 8, 12]
            session.jt90Pattern[voice] = stepsToPattern(data, steps);
            added.push(`${voice}: ${data.length} hits`);
          } else {
            // Full pattern array - use as-is (pad if needed)
            if (data.length < steps) {
              const padded = [...data, ...Array(steps - data.length).fill({ velocity: 0, accent: false })];
              session.jt90Pattern[voice] = padded;
            } else {
              session.jt90Pattern[voice] = data;
            }
            const activeSteps = data.filter(s => s && s.velocity > 0).length;
            added.push(`${voice}: ${activeSteps} hits`);
          }
        }
      }
    }

    // Also update the node's pattern
    if (session._nodes?.jt90) {
      session._nodes.jt90.setPattern(session.jt90Pattern);
    }

    if (added.length === 0) {
      return 'JT90: no pattern changes';
    }

    const barsLabel = bars > 1 ? ` (${bars} bars)` : '';
    const clearLabel = input.clear ? ' (cleared first)' : '';
    return `JT90: ${added.join(', ')}${barsLabel}${clearLabel}`;
  },

  /**
   * Tweak JT90 drum voice parameters
   */
  tweak_jt90: async (input, session, context) => {
    const voice = input.voice;
    if (!voice || !JT90_VOICES.includes(voice)) {
      return `JT90: invalid voice. Use: ${JT90_VOICES.join(', ')}`;
    }

    const tweaks = [];

    // Mute/unmute
    if (input.mute === true) {
      session._nodes?.jt90?.setParam(`${voice}.level`, 0);
      tweaks.push('muted');
    } else if (input.mute === false) {
      session._nodes?.jt90?.setParam(`${voice}.level`, 1.0);
      tweaks.push('unmuted');
    }

    // Level: 0-100 -> 0-1
    if (input.level !== undefined) {
      const def = getParamDef('jt90', voice, 'level');
      const value = def ? toEngine(input.level, def) : input.level / 100;
      session._nodes?.jt90?.setParam(`${voice}.level`, value);
      tweaks.push(`level=${input.level}`);
    }

    // Tune: cents (-1200 to +1200)
    if (input.tune !== undefined) {
      const def = getParamDef('jt90', voice, 'tune');
      const value = def ? toEngine(input.tune, def) : input.tune;
      session._nodes?.jt90?.setParam(`${voice}.tune`, value);
      tweaks.push(`tune=${input.tune}c`);
    }

    // Decay: 0-100 -> 0-1
    if (input.decay !== undefined) {
      const def = getParamDef('jt90', voice, 'decay');
      const value = def ? toEngine(input.decay, def) : input.decay / 100;
      session._nodes?.jt90?.setParam(`${voice}.decay`, value);
      tweaks.push(`decay=${input.decay}`);
    }

    // Attack (kick only): 0-100 -> 0-1
    if (input.attack !== undefined && voice === 'kick') {
      const def = getParamDef('jt90', voice, 'attack');
      const value = def ? toEngine(input.attack, def) : input.attack / 100;
      session._nodes?.jt90?.setParam(`${voice}.attack`, value);
      tweaks.push(`attack=${input.attack}`);
    }

    // Tone: 0-100 -> 0-1
    if (input.tone !== undefined) {
      const def = getParamDef('jt90', voice, 'tone');
      const value = def ? toEngine(input.tone, def) : input.tone / 100;
      session._nodes?.jt90?.setParam(`${voice}.tone`, value);
      tweaks.push(`tone=${input.tone}`);
    }

    // Snappy (snare only): 0-100 -> 0-1
    if (input.snappy !== undefined && voice === 'snare') {
      const def = getParamDef('jt90', voice, 'snappy');
      const value = def ? toEngine(input.snappy, def) : input.snappy / 100;
      session._nodes?.jt90?.setParam(`${voice}.snappy`, value);
      tweaks.push(`snappy=${input.snappy}`);
    }

    if (tweaks.length === 0) {
      return `JT90 ${voice}: no changes`;
    }

    return `JT90 ${voice}: ${tweaks.join(', ')}`;
  },
};

registerTools(jtTools);
