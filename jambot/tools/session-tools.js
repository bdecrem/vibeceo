/**
 * Session Tools
 *
 * Tools for session management: create_session, set_swing, show
 */

import { registerTools } from './index.js';
import { TR909_KITS } from '../../web/public/909/dist/machines/tr909/presets.js';
import { fromEngine, JB200_PARAMS, JB01_PARAMS, JT10_PARAMS, JT30_PARAMS, JT90_PARAMS } from '../params/converters.js';

// Param definitions by instrument
const PARAM_DEFS = {
  jb200: JB200_PARAMS,
  jb01: JB01_PARAMS,
  jt10: JT10_PARAMS,
  jt30: JT30_PARAMS,
  jt90: JT90_PARAMS,
};

/**
 * Format a parameter value for display (convert from engine to producer units)
 */
function formatParam(value, paramDef) {
  if (value === undefined) return '—';
  if (paramDef.unit === 'choice') return value;

  const producerValue = fromEngine(value, paramDef);

  switch (paramDef.unit) {
    case 'dB':
      return `${producerValue >= 0 ? '+' : ''}${producerValue.toFixed(1)}dB`;
    case 'Hz':
      return producerValue >= 1000 ? `${(producerValue / 1000).toFixed(1)}kHz` : `${Math.round(producerValue)}Hz`;
    case 'semitones':
      return `${producerValue >= 0 ? '+' : ''}${Math.round(producerValue)}st`;
    case 'bipolar':
      return `${producerValue >= 0 ? '+' : ''}${Math.round(producerValue)}`;
    case '0-100':
      return `${Math.round(producerValue)}`;
    case 'pan':
      if (producerValue === 0) return 'C';
      return producerValue < 0 ? `L${Math.abs(Math.round(producerValue))}` : `R${Math.round(producerValue)}`;
    default:
      return String(producerValue);
  }
}

/**
 * Format pattern as compact string showing active steps
 */
function formatPattern(pattern) {
  if (!pattern || !Array.isArray(pattern)) return 'empty';
  const activeSteps = pattern
    .map((step, i) => step?.gate ? i + 1 : null)
    .filter(Boolean);
  if (activeSteps.length === 0) return 'empty';
  return `${activeSteps.length} steps: ${activeSteps.join(', ')}`;
}

/**
 * Format mono-synth pattern with notes
 */
function formatMonoPattern(pattern) {
  if (!pattern || !Array.isArray(pattern)) return 'empty';
  const notes = pattern
    .map((step, i) => step?.gate ? `${i + 1}:${step.note}${step.accent ? '!' : ''}${step.slide ? '~' : ''}` : null)
    .filter(Boolean);
  if (notes.length === 0) return 'empty';
  return notes.join(' ');
}

/**
 * Show JB200 state
 */
function showJB200(session) {
  const node = session._nodes.jb200;
  const params = node._params;
  const defs = JB200_PARAMS.bass;
  const pattern = node.getPattern();

  const lines = ['JB200 BASS MONOSYNTH', ''];

  // Oscillators
  lines.push('OSC1: ' + [
    params['bass.osc1Waveform'] || 'saw',
    formatParam(params['bass.osc1Octave'], defs.osc1Octave),
    `detune ${formatParam(params['bass.osc1Detune'], defs.osc1Detune)}`,
    `lvl ${formatParam(params['bass.osc1Level'], defs.osc1Level)}`,
  ].join(', '));

  lines.push('OSC2: ' + [
    params['bass.osc2Waveform'] || 'saw',
    formatParam(params['bass.osc2Octave'], defs.osc2Octave),
    `detune ${formatParam(params['bass.osc2Detune'], defs.osc2Detune)}`,
    `lvl ${formatParam(params['bass.osc2Level'], defs.osc2Level)}`,
  ].join(', '));

  // Filter
  lines.push('');
  lines.push('FILTER: ' + [
    formatParam(params['bass.filterCutoff'], defs.filterCutoff),
    `res ${formatParam(params['bass.filterResonance'], defs.filterResonance)}`,
    `env ${formatParam(params['bass.filterEnvAmount'], defs.filterEnvAmount)}`,
  ].join(', '));

  lines.push('FILT ENV: ' + [
    `A${formatParam(params['bass.filterAttack'], defs.filterAttack)}`,
    `D${formatParam(params['bass.filterDecay'], defs.filterDecay)}`,
    `S${formatParam(params['bass.filterSustain'], defs.filterSustain)}`,
    `R${formatParam(params['bass.filterRelease'], defs.filterRelease)}`,
  ].join(' '));

  // Amp
  lines.push('AMP ENV: ' + [
    `A${formatParam(params['bass.ampAttack'], defs.ampAttack)}`,
    `D${formatParam(params['bass.ampDecay'], defs.ampDecay)}`,
    `S${formatParam(params['bass.ampSustain'], defs.ampSustain)}`,
    `R${formatParam(params['bass.ampRelease'], defs.ampRelease)}`,
  ].join(' '));

  // Output
  lines.push('');
  lines.push('OUTPUT: ' + [
    `drive ${formatParam(params['bass.drive'], defs.drive)}`,
    `level ${formatParam(params['bass.level'], defs.level)}`,
  ].join(', '));

  // Pattern
  lines.push('');
  lines.push('PATTERN: ' + formatMonoPattern(pattern));

  return lines.join('\n');
}

/**
 * Show Sampler state
 */
function showSampler(session) {
  const kit = session.samplerKit;

  if (!kit) {
    return 'SAMPLER\n\nNo kit loaded. Use load_kit to load one.';
  }

  const lines = ['SAMPLER', ''];
  lines.push(`Kit: ${kit.name} (${kit.id})`);
  lines.push('');
  lines.push('SLOTS:');

  for (const slot of kit.slots) {
    const pattern = session.samplerPattern[slot.id] || [];
    const hits = pattern.filter(s => s?.velocity > 0).length;
    const params = session.samplerParams[slot.id] || {};

    let info = `  ${slot.id}: ${slot.name}`;
    if (hits > 0) info += ` — ${hits} hits`;
    if (params.level !== undefined && params.level !== 0) info += ` @ ${params.level}dB`;
    lines.push(info);
  }

  return lines.join('\n');
}

/**
 * Show JB01 (reference drum machine) state
 */
function showJB01(session) {
  const node = session._nodes.jb01;
  const pattern = node.getPattern();
  const voices = node._voices;

  const lines = ['JB01 DRUM MACHINE', ''];
  lines.push('PATTERN:');

  // Show voices with hits
  for (const voice of voices) {
    const steps = pattern[voice] || [];
    const hits = steps.filter(s => s?.velocity > 0);
    if (hits.length > 0) {
      const hitSteps = steps.map((s, i) => s?.velocity > 0 ? i + 1 : null).filter(Boolean);
      const params = Object.fromEntries(
        Object.entries(node._params)
          .filter(([k]) => k.startsWith(`${voice}.`))
          .map(([k, v]) => [k.slice(voice.length + 1), v])
      );
      let info = `  ${voice.toUpperCase()}: ${hitSteps.join(', ')}`;
      // Show level if not default (0.5 engine units = 0dB)
      if (params.level !== undefined && Math.abs(params.level - 0.5) > 0.01) {
        const dB = fromEngine(params.level, { unit: 'dB', min: -60, max: 6 });
        info += ` @ ${dB >= 0 ? '+' : ''}${dB.toFixed(0)}dB`;
      }
      lines.push(info);
    }
  }

  if (lines.length === 3) {
    lines.push('  (no pattern)');
  }

  return lines.join('\n');
}

// Default kit to load on session creation
const DEFAULT_DRUM_KIT = 'bart-deep';

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

// Helper: Create empty JB200 pattern (16 steps)
export function createEmptyJB200Pattern() {
  return Array(16).fill(null).map(() => ({
    note: 'C2',
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

    // Reset JB01 drums - load default kit with its parameters
    session.drumKit = DEFAULT_DRUM_KIT;
    session.drumPattern = {};
    session.drumParams = {};
    session.drumFlam = 0;

    // Load default kit's voice parameters so agent knows the values
    const kit = TR909_KITS.find(k => k.id === DEFAULT_DRUM_KIT);
    if (kit?.voiceParams) {
      for (const [voice, params] of Object.entries(kit.voiceParams)) {
        session.drumParams[voice] = { ...params };
      }
    }
    session.drumPatternLength = 16;
    session.drumScale = '16th';
    session.drumGlobalAccent = 1;
    session.drumVoiceEngines = {};
    session.drumUseSample = {};
    session.drumAutomation = {};

    // Reset bass (legacy pattern)
    session.bassPattern = createEmptyBassPattern();
    session.bassParams = {
      waveform: 'sawtooth',
      cutoff: 0.5,
      resonance: 0.5,
      envMod: 0.5,
      decay: 0.5,
      accent: 0.8,
      level: 0.25  // -6dB for proper gain staging
    };

    // Reset lead (legacy pattern)
    session.leadPreset = null;
    session.leadPattern = createEmptyLeadPattern();
    session.leadParams = {
      vcoSaw: 0.5, vcoPulse: 0.5, pulseWidth: 0.5,
      subLevel: 0, subMode: 0,
      cutoff: 0.5, resonance: 0.3, envMod: 0.5,
      attack: 0.01, decay: 0.3, sustain: 0.7, release: 0.3,
      lfoRate: 0.3, lfoWaveform: 'triangle', lfoToPitch: 0, lfoToFilter: 0, lfoToPW: 0,
      level: 0.25  // -6dB for proper gain staging
    };

    // Reset Sampler - keep kit loaded, just clear pattern
    session.samplerPattern = {};
    session.samplerParams = {};

    // Reset JB200 (bass monosynth)
    // Uses the node-based proxy system - values are in engine units (0-1)
    session.jb200Pattern = createEmptyJB200Pattern();
    // Reset to default engine values via the proxy (which writes to JB200Node)
    session.jb200Params = {
      osc1Waveform: 'sawtooth',
      osc1Octave: 0,
      osc1Detune: 0.5,    // 0-1 (0.5 = 0 cents)
      osc1Level: 1.0,     // 0-1 (100%)
      osc2Waveform: 'sawtooth',
      osc2Octave: -12,
      osc2Detune: 0.57,   // 0-1 (7 cents)
      osc2Level: 0.8,     // 0-1 (80%)
      filterCutoff: 0.55, // 0-1 (800Hz on log scale)
      filterResonance: 0.4,
      filterEnvAmount: 0.8,
      filterAttack: 0,
      filterDecay: 0.4,
      filterSustain: 0.2,
      filterRelease: 0.3,
      ampAttack: 0,
      ampDecay: 0.3,
      ampSustain: 0.6,
      ampRelease: 0.2,
      drive: 0.2,
      level: 0.25,        // 0-1 (-6dB for proper gain staging)
    };

    return `Session created at ${input.bpm} BPM`;
  },

  /**
   * Set swing amount (0-100%)
   */
  set_swing: async (input, session, context) => {
    session.swing = Math.max(0, Math.min(100, input.amount));
    return `Swing set to ${session.swing}%`;
  },

  /**
   * Show current state of any instrument
   * Generic tool that works with all synths: jb200, bass, lead, drums, sampler
   */
  show: async (input, session, context) => {
    const { instrument } = input;

    // Map instrument names to show functions
    const showFns = {
      jb200: showJB200,
      jb202: showJB200,  // alias
      jb01: showJB01,
      sampler: showSampler,
      // TODO: Add show functions for jt10, jt30, jt90
    };

    const showFn = showFns[instrument?.toLowerCase()];
    if (!showFn) {
      const available = Object.keys(showFns);
      return `Unknown instrument: ${instrument}. Available: ${available.join(', ')}`;
    }

    return showFn(session);
  },
};

// Register all session tools
registerTools(sessionTools);
