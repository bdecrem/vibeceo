/**
 * Lead Tools (R1D1)
 *
 * Tools for SH-101 lead synth: add_lead, tweak_lead, list_101_presets, load_101_preset
 */

import { registerTools } from './index.js';
import { getParamDef, toEngine } from '../params/converters.js';
import SH101Presets from '../../web/public/101/dist/machines/sh101/presets.js';

const SH101_PRESETS = Object.values(SH101Presets);

const leadTools = {
  /**
   * List available 101 presets
   */
  list_101_presets: async (input, session, context) => {
    const presetList = SH101_PRESETS.map(p => `  ${p.id} - ${p.name}: ${p.description}`).join('\n');
    return `Available 101 presets:\n${presetList}`;
  },

  /**
   * Load a 101 preset (sound + optionally pattern)
   */
  load_101_preset: async (input, session, context) => {
    const preset = SH101_PRESETS.find(p => p.id === input.preset);
    if (!preset) {
      const available = SH101_PRESETS.map(p => p.id).join(', ');
      return `Unknown preset: ${input.preset}. Available: ${available}`;
    }
    session.leadPreset = preset.id;

    // Apply ALL preset parameters to leadParams
    if (preset.parameters) {
      Object.entries(preset.parameters).forEach(([key, value]) => {
        // Map 'volume' to 'level' for jambot consistency
        const paramKey = key === 'volume' ? 'level' : key;
        session.leadParams[paramKey] = value;
      });
    }

    // Apply preset BPM
    const details = [];
    if (preset.bpm) {
      session.bpm = preset.bpm;
      details.push(`${preset.bpm} BPM`);
    }

    // Load the pattern (default: true)
    const includePattern = input.includePattern !== false;
    if (includePattern && preset.pattern) {
      session.leadPattern = preset.pattern.map(step => ({
        note: step.note || 'C3',
        gate: step.gate || false,
        accent: step.accent || false,
        slide: step.slide || false,
      }));
      details.push('pattern');
    }

    // Apply arpeggiator settings if present
    if (preset.arp) {
      session.leadArp = {
        mode: preset.arp.mode || 'off',
        octaves: preset.arp.octaves || 1,
        hold: preset.arp.hold || false,
      };
      details.push(`arp: ${preset.arp.mode}`);
    }

    const detailsMsg = details.length > 0 ? ` (${details.join(', ')})` : '';
    return `Loaded 101 preset "${preset.name}"${detailsMsg}`;
  },

  /**
   * Add lead pattern - 16 steps with note, gate, accent, slide
   */
  add_lead: async (input, session, context) => {
    const pattern = input.pattern || [];
    session.leadPattern = Array(16).fill(null).map((_, i) => {
      const step = pattern[i] || {};
      return {
        note: step.note || 'C3',
        gate: step.gate || false,
        accent: step.accent || false,
        slide: step.slide || false,
      };
    });
    const activeSteps = session.leadPattern.filter(s => s.gate).length;
    return `R1D1 lead: ${activeSteps} notes`;
  },

  /**
   * Tweak lead parameters
   * Accepts producer units: dB for level, Hz for cutoff, semitones for lfoToPitch, 0-100 for most others
   */
  tweak_lead: async (input, session, context) => {
    const tweaks = [];

    // Mute: convenience alias for level=-60dB (silent)
    if (input.mute === true) {
      const def = getParamDef('r1d1', 'lead', 'level');
      session.leadParams.level = def ? toEngine(-60, def) : 0;
      tweaks.push('muted');
    }

    // Level: dB → linear
    if (input.level !== undefined) {
      const def = getParamDef('r1d1', 'lead', 'level');
      session.leadParams.level = def ? toEngine(input.level, def) : input.level;
      tweaks.push(`level=${input.level}dB`);
    }

    // Cutoff: Hz → 0-1 (log scale)
    if (input.cutoff !== undefined) {
      const def = getParamDef('r1d1', 'lead', 'cutoff');
      session.leadParams.cutoff = def ? toEngine(input.cutoff, def) : input.cutoff;
      const display = input.cutoff >= 1000 ? `${(input.cutoff/1000).toFixed(1)}kHz` : `${input.cutoff}Hz`;
      tweaks.push(`cutoff=${display}`);
    }

    // LFO to pitch: semitones (keep as semitones for engine, it handles it)
    if (input.lfoToPitch !== undefined) {
      // SH-101 engine expects 0-1 for lfoToPitch where 1 = max modulation
      // We'll convert semitones to 0-1 range (0-24 semitones → 0-1)
      const def = getParamDef('r1d1', 'lead', 'lfoToPitch');
      session.leadParams.lfoToPitch = def ? input.lfoToPitch / def.max : input.lfoToPitch / 24;
      tweaks.push(`lfoToPitch=${input.lfoToPitch}st`);
    }

    // All other 0-100 params
    const knobParams = [
      'vcoSaw', 'vcoPulse', 'pulseWidth',
      'subLevel', 'resonance', 'envMod',
      'attack', 'decay', 'sustain', 'release',
      'lfoRate', 'lfoToFilter', 'lfoToPW'
    ];
    for (const param of knobParams) {
      if (input[param] !== undefined) {
        const def = getParamDef('r1d1', 'lead', param);
        session.leadParams[param] = def ? toEngine(input[param], def) : input[param] / 100;
        tweaks.push(`${param}=${input[param]}`);
      }
    }

    // Choice params (no conversion)
    if (input.subMode !== undefined) {
      session.leadParams.subMode = input.subMode;
      tweaks.push(`subMode=${input.subMode}`);
    }
    if (input.lfoWaveform !== undefined) {
      session.leadParams.lfoWaveform = input.lfoWaveform;
      tweaks.push(`lfoWaveform=${input.lfoWaveform}`);
    }

    return `R1D1 lead: ${tweaks.join(', ')}`;
  },
};

registerTools(leadTools);
