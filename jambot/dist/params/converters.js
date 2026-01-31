/**
 * Jambot Parameter Converters
 *
 * Converts producer-friendly units to engine units (0-1 normalized).
 *
 * 4 UNIT TYPES:
 *   dB         → Volume (-60 to +6)
 *   0-100      → Knob position (hardware feel)
 *   semitones  → Pitch (±12 or ±24)
 *   Hz         → Filter frequency (log scale)
 *   pan        → Stereo position (-100 L to +100 R)
 *   choice     → Discrete option (pass-through)
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load param definitions
const loadParams = (filename) => {
  const path = join(__dirname, filename);
  return JSON.parse(readFileSync(path, 'utf-8'));
};

export const JB200_PARAMS = loadParams('jb200-params.json');
export const JB202_PARAMS = loadParams('jb202-params.json');
export const JB01_PARAMS = loadParams('jb01-params.json');
export const JT30_PARAMS = loadParams('jt30-params.json');
export const JT10_PARAMS = loadParams('jt10-params.json');
export const JT90_PARAMS = loadParams('jt90-params.json');
export const SAMPLER_PARAMS = loadParams('sampler-params.json');

const SYNTH_PARAMS = {
  jb200: JB200_PARAMS,
  jb202: JB202_PARAMS,
  jb01: JB01_PARAMS,
  jt30: JT30_PARAMS,
  jt10: JT10_PARAMS,
  jt90: JT90_PARAMS,
  sampler: SAMPLER_PARAMS,
};

/**
 * Get param definition for a synth/voice/param combo
 */
export function getParamDef(synth, voice, param) {
  const synthParams = SYNTH_PARAMS[synth.toLowerCase()];
  if (!synthParams) return null;

  // Sampler uses generic "slot" definition for all slots (s1-s10)
  const voiceKey = synth.toLowerCase() === 'sampler' ? 'slot' : voice;
  const voiceParams = synthParams[voiceKey];
  if (!voiceParams) return null;

  return voiceParams[param] || null;
}

/**
 * Convert from producer units to engine units (0-1)
 *
 * @param {number|string} value - Producer-friendly value
 * @param {object} paramDef - Parameter definition from JSON
 * @returns {number} - Normalized 0-1 value for engine
 */
export function toEngine(value, paramDef) {
  const { unit, min, max } = paramDef;

  // Clamp to valid range first
  const clamped = typeof value === 'number'
    ? Math.max(min, Math.min(max, value))
    : value;

  switch (unit) {
    case 'dB':
      // dB to linear gain, normalized to 0-1
      // -60dB → 0.001, 0dB → 1.0, +6dB → 2.0
      // We normalize so +6dB = 1.0 (max engine level)
      const linear = Math.pow(10, clamped / 20);
      const maxLinear = Math.pow(10, max / 20);  // typically 2.0 for +6dB
      return Math.min(1, linear / maxLinear);

    case '0-100':
      // Simple percentage to 0-1
      return clamped / 100;

    case 'bipolar':
      // Linear normalization for bipolar ranges (e.g., -50 to +50 → 0 to 1)
      // Center value maps to 0.5
      return (clamped - min) / (max - min);

    case 'semitones':
      // Convert to cents for engines that expect it
      // Most engines want cents: semitones * 100
      // But some want normalized 0-1, so we return cents
      // The jambot.js handler can decide what to do
      return clamped * 100;  // Return cents

    case 'Hz':
      // Log scale normalization for frequencies
      const logMin = Math.log(min);
      const logMax = Math.log(max);
      const logVal = Math.log(clamped);
      return (logVal - logMin) / (logMax - logMin);

    case 'pan':
      // -100 to +100 → -1 to +1
      return clamped / 100;

    case 'choice':
      // Pass through discrete choices
      return clamped;

    default:
      // Unknown unit - return as-is
      return clamped;
  }
}

/**
 * Convert from engine units (0-1) to producer units
 *
 * @param {number} value - Normalized 0-1 engine value
 * @param {object} paramDef - Parameter definition from JSON
 * @returns {number} - Producer-friendly value
 */
export function fromEngine(value, paramDef) {
  const { unit, min, max } = paramDef;

  switch (unit) {
    case 'dB':
      // Linear (0-1) to dB
      const maxLinear = Math.pow(10, max / 20);
      const linear = value * maxLinear;
      if (linear <= 0.001) return -60;
      return 20 * Math.log10(linear);

    case '0-100':
      return value * 100;

    case 'bipolar':
      // 0-1 back to min-max range (e.g., 0-1 → -50 to +50)
      return min + value * (max - min);

    case 'semitones':
      // Cents back to semitones
      return value / 100;

    case 'Hz':
      // Log scale denormalization
      const logMin = Math.log(min);
      const logMax = Math.log(max);
      return Math.exp(logMin + value * (logMax - logMin));

    case 'pan':
      return value * 100;

    case 'choice':
      return value;

    default:
      return value;
  }
}

/**
 * Apply a relative change in producer units
 * e.g., "lower by 3dB" or "increase decay by 10"
 *
 * @param {number} currentEngineValue - Current engine value (0-1 or cents)
 * @param {number} delta - Change in producer units
 * @param {object} paramDef - Parameter definition
 * @returns {number} - New engine value
 */
export function applyRelative(currentEngineValue, delta, paramDef) {
  const currentProducer = fromEngine(currentEngineValue, paramDef);
  const newProducer = currentProducer + delta;
  const clamped = Math.max(paramDef.min, Math.min(paramDef.max, newProducer));
  return toEngine(clamped, paramDef);
}

/**
 * Format a value for display
 */
export function formatValue(value, paramDef) {
  const { unit } = paramDef;

  switch (unit) {
    case 'dB':
      const rounded = Math.round(value * 10) / 10;
      return `${rounded >= 0 ? '+' : ''}${rounded}dB`;

    case '0-100':
      return `${Math.round(value)}`;

    case 'semitones':
      const st = Math.round(value);
      return `${st >= 0 ? '+' : ''}${st}st`;

    case 'Hz':
      if (value >= 1000) return `${(value / 1000).toFixed(1)}kHz`;
      return `${Math.round(value)}Hz`;

    case 'pan':
      if (value === 0) return 'C';
      if (value < 0) return `L${Math.abs(Math.round(value))}`;
      return `R${Math.round(value)}`;

    case 'choice':
      return String(value);

    default:
      return String(value);
  }
}

/**
 * Convert a full tweak object from producer units to engine units
 *
 * @param {string} synth - 'jb01', 'jb202', 'jt10', 'jt30', 'jt90', 'sampler'
 * @param {string} voice - Voice name (e.g., 'kick', 'bass', 'lead', 's1')
 * @param {object} tweaks - Object of param:value pairs in producer units
 * @returns {object} - Object of param:value pairs in engine units
 */
export function convertTweaks(synth, voice, tweaks) {
  const result = {};

  for (const [param, value] of Object.entries(tweaks)) {
    const paramDef = getParamDef(synth, voice, param);

    if (!paramDef) {
      // Unknown param - pass through
      result[param] = value;
      continue;
    }

    if (paramDef.unit === 'choice') {
      // Discrete choice - pass through
      result[param] = value;
    } else if (paramDef.unit === 'semitones') {
      // Semitones: most engines want cents, but some want raw semitones
      // Return cents (semitones * 100), let jambot.js decide
      result[param] = value * 100;
    } else {
      result[param] = toEngine(value, paramDef);
    }
  }

  return result;
}

/**
 * Build a human-readable description of available params
 * Used for tool descriptions
 */
export function describeParams(synth, voice) {
  const synthParams = SYNTH_PARAMS[synth.toLowerCase()];
  if (!synthParams) return '';

  const voiceKey = synth.toLowerCase() === 'sampler' ? 'slot' : voice;
  const voiceParams = synthParams[voiceKey];
  if (!voiceParams) return '';

  const parts = [];
  for (const [name, def] of Object.entries(voiceParams)) {
    if (def.unit === 'choice') {
      parts.push(`${name} (${def.options.join('/')})`);
    } else if (def.unit === 'dB') {
      parts.push(`${name} (dB)`);
    } else if (def.unit === 'Hz') {
      parts.push(`${name} (Hz)`);
    } else if (def.unit === 'semitones') {
      parts.push(`${name} (semitones)`);
    } else if (def.unit === 'pan') {
      parts.push(`${name} (L/R)`);
    } else {
      parts.push(`${name} (0-100)`);
    }
  }

  return parts.join(', ');
}

/**
 * Validate a value against its param definition
 * Returns { valid: boolean, error?: string }
 */
export function validate(value, paramDef) {
  const { unit, min, max, options } = paramDef;

  if (unit === 'choice') {
    if (!options.includes(value)) {
      return { valid: false, error: `Must be one of: ${options.join(', ')}` };
    }
    return { valid: true };
  }

  if (typeof value !== 'number') {
    return { valid: false, error: 'Must be a number' };
  }

  if (value < min || value > max) {
    return { valid: false, error: `Must be between ${min} and ${max}` };
  }

  return { valid: true };
}
