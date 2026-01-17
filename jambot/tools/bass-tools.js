/**
 * Bass Tools (R3D3)
 *
 * Tools for TB-303 acid bass: add_bass, tweak_bass
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
    return `R3D3 bass: ${activeSteps} notes`;
  },

  /**
   * Tweak bass parameters
   * Accepts producer units: dB for level, Hz for cutoff, 0-100 for others
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

    return `R3D3 bass: ${tweaks.join(', ')}`;
  },
};

registerTools(bassTools);
