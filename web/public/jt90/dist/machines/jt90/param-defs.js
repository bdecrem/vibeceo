/**
 * JT90 Parameter Definitions — Single Source of Truth
 *
 * All parameter metadata lives here. Both the engine (for defaults)
 * and the web UI (for knobs) import from this file.
 *
 * Units: Parameters are defined in producer-friendly units (semitones, 0-1).
 * Conversion to engine units happens at call sites via toEngineDefault().
 *
 * The canonical JSON source is jambot/params/jt90-params.json (producer units:
 * 0-100 for knobs, semitones for tune). This file mirrors those definitions
 * in engine-friendly format (0-1 for knobs, semitones for tune).
 */

// Parameter definitions per voice
// Format: { id, label, min, max, defaultValue, unit? }
// - unit: 'semitones' for tune params (converted to cents for engine)
// - no unit: 0-1 range params (no conversion needed)
export const VOICE_PARAM_DEFS = {
  kick: [
    { id: 'tune', label: 'Tune', min: -12, max: 12, defaultValue: 0, unit: 'semitones' },
    { id: 'decay', label: 'Decay', min: 0, max: 1, defaultValue: 0.5 },
    { id: 'attack', label: 'Attack', min: 0, max: 1, defaultValue: 0.5 },
    { id: 'sweep', label: 'Sweep', min: 0, max: 1, defaultValue: 0.5 },
    { id: 'level', label: 'Level', min: 0, max: 1, defaultValue: 1 },
  ],
  snare: [
    { id: 'tune', label: 'Tune', min: -12, max: 12, defaultValue: 0, unit: 'semitones' },
    { id: 'decay', label: 'Decay', min: 0, max: 1, defaultValue: 0.4 },
    { id: 'snappy', label: 'Snappy', min: 0, max: 1, defaultValue: 0.5 },
    { id: 'tone', label: 'Tone', min: 0, max: 1, defaultValue: 0.5 },
    { id: 'level', label: 'Level', min: 0, max: 1, defaultValue: 1 },
  ],
  clap: [
    { id: 'decay', label: 'Decay', min: 0, max: 1, defaultValue: 0.03 },
    { id: 'tone', label: 'Tone', min: 0, max: 1, defaultValue: 0.13 },
    { id: 'level', label: 'Level', min: 0, max: 1, defaultValue: 1 },
  ],
  rimshot: [
    { id: 'tune', label: 'Tune', min: -12, max: 12, defaultValue: -7, unit: 'semitones' },
    { id: 'decay', label: 'Decay', min: 0, max: 1, defaultValue: 0.1 },
    { id: 'level', label: 'Level', min: 0, max: 1, defaultValue: 1 },
  ],
  ch: [
    { id: 'tune', label: 'Tune', min: -12, max: 12, defaultValue: 0, unit: 'semitones' },
    { id: 'decay', label: 'Decay', min: 0, max: 1, defaultValue: 1 },
    { id: 'tone', label: 'Tone', min: 0, max: 1, defaultValue: 1 },
    { id: 'level', label: 'Level', min: 0, max: 1, defaultValue: 1 },
  ],
  oh: [
    { id: 'tune', label: 'Tune', min: -12, max: 12, defaultValue: 0, unit: 'semitones' },
    { id: 'decay', label: 'Decay', min: 0, max: 1, defaultValue: 1 },
    { id: 'tone', label: 'Tone', min: 0, max: 1, defaultValue: 1 },
    { id: 'level', label: 'Level', min: 0, max: 1, defaultValue: 1 },
  ],
  ltom: [
    { id: 'tune', label: 'Tune', min: -12, max: 12, defaultValue: 0, unit: 'semitones' },
    { id: 'decay', label: 'Decay', min: 0, max: 1, defaultValue: 1 },
    { id: 'level', label: 'Level', min: 0, max: 1, defaultValue: 1 },
  ],
  mtom: [
    { id: 'tune', label: 'Tune', min: -12, max: 12, defaultValue: -5, unit: 'semitones' },
    { id: 'decay', label: 'Decay', min: 0, max: 1, defaultValue: 0.8 },
    { id: 'level', label: 'Level', min: 0, max: 1, defaultValue: 1 },
  ],
  htom: [
    { id: 'tune', label: 'Tune', min: -12, max: 12, defaultValue: -5, unit: 'semitones' },
    { id: 'decay', label: 'Decay', min: 0, max: 1, defaultValue: 0.55 },
    { id: 'level', label: 'Level', min: 0, max: 1, defaultValue: 1 },
  ],
  crash: [
    { id: 'tune', label: 'Tune', min: -12, max: 12, defaultValue: 0, unit: 'semitones' },
    { id: 'decay', label: 'Decay', min: 0, max: 1, defaultValue: 1 },
    { id: 'level', label: 'Level', min: 0, max: 1, defaultValue: 1 },
  ],
  ride: [
    { id: 'tune', label: 'Tune', min: -12, max: 12, defaultValue: 0, unit: 'semitones' },
    { id: 'decay', label: 'Decay', min: 0, max: 1, defaultValue: 1 },
    { id: 'level', label: 'Level', min: 0, max: 1, defaultValue: 1 },
  ],
};

/**
 * Convert a producer-facing value to engine units.
 * Semitones -> cents, everything else passes through.
 */
export function toEngineDefault(value, paramDef) {
  if (paramDef.unit === 'semitones') return value * 100;
  return value;
}
