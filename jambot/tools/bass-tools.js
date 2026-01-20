/**
 * Bass Tools
 *
 * Tools for bass synth: add_bass, tweak_bass (deprecated)
 *
 * NOTE: 'bass' is now an ALIAS for JB200.
 * Use generic tweak() for parameter changes.
 */

import { registerTools } from './index.js';
import { getParamDef, toEngine } from '../params/converters.js';

const bassTools = {
  /**
   * Add bass pattern - 16 steps with note, gate, accent, slide
   */
  add_bass: async (input, session, context) => {
    const pattern = input.pattern || [];
    session.bassPattern = Array(16).fill(null).map((_, i) => {
      const step = pattern[i] || {};
      return {
        note: step.note || 'C2',
        gate: step.gate || false,
        accent: step.accent || false,
        slide: step.slide || false,
      };
    });
    const activeSteps = session.bassPattern.filter(s => s.gate).length;
    return `bass: ${activeSteps} notes`;
  },

  /**
   * DEPRECATED: Use generic tweak() instead.
   *
   * Examples with generic tweak:
   *   tweak({ path: 'bass.cutoff', value: 2000 })      → 2000Hz
   *   tweak({ path: 'bass.resonance', value: 80 })    → 80%
   *   tweak({ path: 'bass.level', value: -6 })        → -6dB
   *
   * This tool still works but is no longer the recommended approach.
   * The generic tweak() handles unit conversion automatically.
   *
   * @deprecated
   */
  tweak_bass: async (input, session, context) => {
    const tweaks = [];

    // Mute: convenience alias for level=-60dB (silent)
    if (input.mute === true) {
      const def = getParamDef('r3d3', 'bass', 'level');
      session.bassParams.level = def ? toEngine(-60, def) : 0;
      tweaks.push('muted');
    }

    // Waveform (choice, no conversion)
    if (input.waveform !== undefined) {
      session.bassParams.waveform = input.waveform;
      tweaks.push(`waveform=${input.waveform}`);
    }

    // Level: dB → linear
    if (input.level !== undefined) {
      const def = getParamDef('r3d3', 'bass', 'level');
      session.bassParams.level = def ? toEngine(input.level, def) : input.level;
      tweaks.push(`level=${input.level}dB`);
    }

    // Cutoff: Hz → 0-1 (log scale)
    if (input.cutoff !== undefined) {
      const def = getParamDef('r3d3', 'bass', 'cutoff');
      session.bassParams.cutoff = def ? toEngine(input.cutoff, def) : input.cutoff;
      const display = input.cutoff >= 1000 ? `${(input.cutoff/1000).toFixed(1)}kHz` : `${input.cutoff}Hz`;
      tweaks.push(`cutoff=${display}`);
    }

    // Resonance: 0-100 → 0-1
    if (input.resonance !== undefined) {
      const def = getParamDef('r3d3', 'bass', 'resonance');
      session.bassParams.resonance = def ? toEngine(input.resonance, def) : input.resonance / 100;
      tweaks.push(`resonance=${input.resonance}`);
    }

    // EnvMod: 0-100 → 0-1
    if (input.envMod !== undefined) {
      const def = getParamDef('r3d3', 'bass', 'envMod');
      session.bassParams.envMod = def ? toEngine(input.envMod, def) : input.envMod / 100;
      tweaks.push(`envMod=${input.envMod}`);
    }

    // Decay: 0-100 → 0-1
    if (input.decay !== undefined) {
      const def = getParamDef('r3d3', 'bass', 'decay');
      session.bassParams.decay = def ? toEngine(input.decay, def) : input.decay / 100;
      tweaks.push(`decay=${input.decay}`);
    }

    // Accent: 0-100 → 0-1
    if (input.accent !== undefined) {
      const def = getParamDef('r3d3', 'bass', 'accent');
      session.bassParams.accent = def ? toEngine(input.accent, def) : input.accent / 100;
      tweaks.push(`accent=${input.accent}`);
    }

    return `bass: ${tweaks.join(', ')}`;
  },
};

registerTools(bassTools);
