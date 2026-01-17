/**
 * Drum Tools (R9D9)
 *
 * Tools for TR-909 drum machine: add_drums, tweak_drums, set_drum_groove,
 * automate_drums, clear_automation, list_909_kits, load_909_kit
 */

import { registerTools } from './index.js';
import { getParamDef } from '../params/converters.js';
import { TR909_KITS } from '../../web/public/909/dist/machines/tr909/presets.js';

// Voice names for the 909
export const DRUM_VOICES = ['kick', 'snare', 'clap', 'ch', 'oh', 'ltom', 'mtom', 'htom', 'rimshot', 'crash', 'ride'];

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

    return `R9D9 drums: ${added.join(', ')}`;
  },

  /**
   * Tweak drum voice parameters
   * Stores producer units (dB, semitones, 0-100) - conversion happens at render time
   */
  tweak_drums: async (input, session, context) => {
    const voice = input.voice;
    if (!session.drumParams[voice]) {
      session.drumParams[voice] = {};
    }

    const tweaks = [];

    // Mute: convenience alias for level=-60 (silent)
    if (input.mute === true) {
      session.drumParams[voice].level = -60;
      tweaks.push('muted');
    }

    // Level: dB (-60 to +6)
    if (input.level !== undefined) {
      session.drumParams[voice].level = input.level;
      tweaks.push(`level=${input.level}dB`);
    }

    // Tune: semitones (±12)
    if (input.tune !== undefined) {
      session.drumParams[voice].tune = input.tune;
      tweaks.push(`tune=${input.tune > 0 ? '+' : ''}${input.tune}st`);
    }

    // Decay: 0-100
    if (input.decay !== undefined) {
      session.drumParams[voice].decay = input.decay;
      tweaks.push(`decay=${input.decay}`);
    }

    // Tone: Hz for hats, 0-100 for others
    if (input.tone !== undefined) {
      const def = getParamDef('r9d9', voice, 'tone');
      session.drumParams[voice].tone = input.tone;
      if (def?.unit === 'Hz') {
        tweaks.push(`tone=${input.tone}Hz`);
      } else {
        tweaks.push(`tone=${input.tone}`);
      }
    }

    // Attack: 0-100 (kick only)
    if (input.attack !== undefined) {
      session.drumParams[voice].attack = input.attack;
      tweaks.push(`attack=${input.attack}`);
    }

    // Sweep: 0-100 (kick only)
    if (input.sweep !== undefined) {
      session.drumParams[voice].sweep = input.sweep;
      tweaks.push(`sweep=${input.sweep}`);
    }

    // Snappy: 0-100 (snare only)
    if (input.snappy !== undefined) {
      session.drumParams[voice].snappy = input.snappy;
      tweaks.push(`snappy=${input.snappy}`);
    }

    // Per-voice engine selection (no conversion needed)
    if (input.engine !== undefined) {
      session.drumVoiceEngines[voice] = input.engine;
      tweaks.push(`engine=${input.engine}`);
    }

    // Sample mode (ch, oh, crash, ride only)
    if (input.useSample !== undefined) {
      const sampleCapable = ['ch', 'oh', 'crash', 'ride'];
      if (sampleCapable.includes(voice)) {
        session.drumUseSample[voice] = input.useSample;
        tweaks.push(`useSample=${input.useSample}`);
      }
    }

    return `R9D9 ${voice}: ${tweaks.join(', ')}`;
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

  /**
   * List available 909 kits (sound presets)
   */
  list_909_kits: async (input, session, context) => {
    const kitList = TR909_KITS.map(k => `  ${k.id} - ${k.name}: ${k.description}`).join('\n');
    return `Available 909 kits:\n${kitList}`;
  },

  /**
   * Load a 909 kit by ID
   */
  load_909_kit: async (input, session, context) => {
    const kit = TR909_KITS.find(k => k.id === input.kit);
    if (!kit) {
      const available = TR909_KITS.map(k => k.id).join(', ');
      return `Unknown kit: ${input.kit}. Available: ${available}`;
    }
    session.drumKit = kit.id;

    // Copy kit's voiceParams into session.drumParams (producer units)
    // This allows the agent to see/report current values
    if (kit.voiceParams) {
      for (const [voice, params] of Object.entries(kit.voiceParams)) {
        session.drumParams[voice] = { ...params };
      }
    }

    // Build a summary of what was set
    const paramSummary = kit.voiceParams && Object.keys(kit.voiceParams).length > 0
      ? Object.entries(kit.voiceParams).map(([voice, params]) => {
          const paramList = Object.entries(params).map(([p, v]) => `${p}=${v}`).join(', ');
          return `${voice}: ${paramList}`;
        }).join('; ')
      : 'default params';

    return `Loaded 909 kit "${kit.name}" (${kit.engine} engine). Set: ${paramSummary}`;
  },
};

// Register all drum tools
registerTools(drumTools);
