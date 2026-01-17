/**
 * Session Tools
 *
 * Tools for session management: create_session, set_swing
 */

import { registerTools } from './index.js';

// Helper: Create empty bass pattern (16 steps)
export function createEmptyBassPattern() {
  return Array(16).fill(null).map(() => ({
    note: 'C2',
    gate: false,
    accent: false,
    slide: false,
  }));
}

// Helper: Create empty lead pattern (16 steps)
export function createEmptyLeadPattern() {
  return Array(16).fill(null).map(() => ({
    note: 'C3',
    gate: false,
    accent: false,
    slide: false,
  }));
}

// Tool handlers
const sessionTools = {
  /**
   * Create a new session with specified BPM
   */
  create_session: async (input, session, context) => {
    session.bpm = input.bpm;
    session.swing = 0;

    // Reset R9D9 (drums)
    session.drumKit = 'default';
    session.drumPattern = {};
    session.drumParams = {};
    session.drumFlam = 0;
    session.drumPatternLength = 16;
    session.drumScale = '16th';
    session.drumGlobalAccent = 1;
    session.drumVoiceEngines = {};
    session.drumUseSample = {};
    session.drumAutomation = {};

    // Reset R3D3 (bass)
    session.bassPattern = createEmptyBassPattern();
    session.bassParams = {
      waveform: 'sawtooth',
      cutoff: 0.5,
      resonance: 0.5,
      envMod: 0.5,
      decay: 0.5,
      accent: 0.8,
      level: 0.8
    };

    // Reset R1D1 (lead)
    session.leadPreset = null;
    session.leadPattern = createEmptyLeadPattern();
    session.leadParams = {
      vcoSaw: 0.5, vcoPulse: 0.5, pulseWidth: 0.5,
      subLevel: 0, subMode: 0,
      cutoff: 0.5, resonance: 0.3, envMod: 0.5,
      attack: 0.01, decay: 0.3, sustain: 0.7, release: 0.3,
      lfoRate: 0.3, lfoWaveform: 'triangle', lfoToPitch: 0, lfoToFilter: 0, lfoToPW: 0,
      level: 0.8
    };

    // Reset R9DS (sampler) - keep kit loaded, just clear pattern
    session.samplerPattern = {};
    session.samplerParams = {};

    return `Session created at ${input.bpm} BPM`;
  },

  /**
   * Set swing amount (0-100%)
   */
  set_swing: async (input, session, context) => {
    session.swing = Math.max(0, Math.min(100, input.amount));
    return `Swing set to ${session.swing}%`;
  },
};

// Register all session tools
registerTools(sessionTools);
