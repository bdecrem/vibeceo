/**
 * Drum Tools
 *
 * Tools for drum machine: add_drums, tweak_drums (deprecated), etc.
 *
 * NOTE: 'drums' is now an ALIAS for JB01.
 * The voices are JB01 voices: kick, snare, clap, ch, oh, perc, tom, cymbal
 */

import { registerTools } from './index.js';
import { getParamDef, toEngine } from '../params/converters.js';

// Voice names for JB01 (drums = jb01)
export const DRUM_VOICES = ['kick', 'snare', 'clap', 'ch', 'oh', 'perc', 'tom', 'cymbal'];

// Tool handlers
const drumTools = {
  /**
   * Add drum pattern - specify which steps each voice hits
   */
  add_drums: async (input, session, context) => {
    const added = [];

    for (const voice of DRUM_VOICES) {
      const steps = input[voice] || [];
      if (steps.length > 0) {
        session.drumPattern[voice] = Array(16).fill(null).map(() => ({ velocity: 0 }));
        const isDetailed = typeof steps[0] === 'object';

        if (isDetailed) {
          for (const hit of steps) {
            const step = hit.step;
            const vel = hit.vel !== undefined ? hit.vel : 1;
            if (step >= 0 && step < 16) {
              session.drumPattern[voice][step].velocity = vel;
            }
          }
          added.push(`${voice}:${steps.length}`);
        } else {
          const defaultVel = (voice === 'ch' || voice === 'oh') ? 0.7 : 1;
          for (const step of steps) {
            if (step >= 0 && step < 16) {
              session.drumPattern[voice][step].velocity = defaultVel;
            }
          }
          added.push(`${voice}:${steps.length}`);
        }
      }
    }

    return `drums: ${added.join(', ')}`;
  },

  /**
   * DEPRECATED: Use generic tweak() instead.
   *
   * Examples with generic tweak:
   *   tweak({ path: 'drums.kick.decay', value: 75 })
   *   tweak({ path: 'drums.kick.level', value: -6 })
   *   tweak({ path: 'drums.snare.tune', value: +3 })
   *
   * @deprecated
   */
  tweak_drums: async (input, session, context) => {
    const voice = input.voice;
    if (!DRUM_VOICES.includes(voice)) {
      return `Invalid voice: ${voice}. Use: ${DRUM_VOICES.join(', ')}`;
    }

    const tweaks = [];

    // Level: dB
    if (input.level !== undefined) {
      const def = getParamDef('jb01', voice, 'level');
      session.drumParams[voice].level = def ? toEngine(input.level, def) : input.level;
      tweaks.push(`level=${input.level}dB`);
    }

    // Mute: alias for level=-60
    if (input.mute === true) {
      const def = getParamDef('jb01', voice, 'level');
      session.drumParams[voice].level = def ? toEngine(-60, def) : 0;
      tweaks.push('muted');
    }

    // Tune: semitones
    if (input.tune !== undefined) {
      session.drumParams[voice].tune = input.tune * 100; // Convert to cents
      tweaks.push(`tune=${input.tune > 0 ? '+' : ''}${input.tune}st`);
    }

    // Decay: 0-100
    if (input.decay !== undefined) {
      const def = getParamDef('jb01', voice, 'decay');
      session.drumParams[voice].decay = def ? toEngine(input.decay, def) : input.decay / 100;
      tweaks.push(`decay=${input.decay}`);
    }

    // Attack: 0-100
    if (input.attack !== undefined) {
      const def = getParamDef('jb01', voice, 'attack');
      session.drumParams[voice].attack = def ? toEngine(input.attack, def) : input.attack / 100;
      tweaks.push(`attack=${input.attack}`);
    }

    return `drums ${voice}: ${tweaks.join(', ')}`;
  },

  /**
   * Set drum groove parameters (flam, pattern length, scale, accent)
   */
  set_drum_groove: async (input, session, context) => {
    const changes = [];

    if (input.flam !== undefined) {
      session.drumFlam = Math.max(0, Math.min(1, input.flam));
      changes.push(`flam=${session.drumFlam}`);
    }

    if (input.patternLength !== undefined) {
      session.drumPatternLength = Math.max(1, Math.min(16, Math.floor(input.patternLength)));
      changes.push(`patternLength=${session.drumPatternLength}`);
    }

    if (input.scale !== undefined) {
      const validScales = ['16th', '8th-triplet', '16th-triplet', '32nd'];
      if (validScales.includes(input.scale)) {
        session.drumScale = input.scale;
        changes.push(`scale=${session.drumScale}`);
      }
    }

    if (input.globalAccent !== undefined) {
      session.drumGlobalAccent = Math.max(0, Math.min(1, input.globalAccent));
      changes.push(`globalAccent=${session.drumGlobalAccent}`);
    }

    return `R9D9 groove: ${changes.join(', ') || 'no changes'}`;
  },

  /**
   * Add per-step automation to a drum voice parameter
   */
  automate_drums: async (input, session, context) => {
    const { voice, param, values } = input;

    // Initialize automation structure if needed
    if (!session.drumAutomation[voice]) {
      session.drumAutomation[voice] = {};
    }

    // Store the 16-step automation values (pad with null if needed)
    const automationValues = Array(16).fill(null).map((_, i) =>
      values[i] !== undefined ? values[i] : null
    );
    session.drumAutomation[voice][param] = automationValues;

    const activeSteps = automationValues.filter(v => v !== null).length;
    return `R9D9 ${voice} ${param} automation: ${activeSteps}/16 steps`;
  },

  /**
   * Clear automation from drum voices
   */
  clear_automation: async (input, session, context) => {
    const { voice, param } = input;

    if (!voice) {
      // Clear ALL automation
      session.drumAutomation = {};
      return `Cleared all drum automation`;
    }

    if (!session.drumAutomation[voice]) {
      return `No automation on ${voice} to clear`;
    }

    if (!param) {
      // Clear all params for this voice
      delete session.drumAutomation[voice];
      return `Cleared all automation on ${voice}`;
    }

    // Clear specific param
    delete session.drumAutomation[voice][param];
    // Clean up empty voice object
    if (Object.keys(session.drumAutomation[voice]).length === 0) {
      delete session.drumAutomation[voice];
    }
    return `Cleared ${voice} ${param} automation`;
  },

  // NOTE: list_909_kits and load_909_kit removed.
  // drums = jb01 now. Use list_jb01_kits and load_jb01_kit from jb01-tools.js
};

// Register all drum tools
registerTools(drumTools);
