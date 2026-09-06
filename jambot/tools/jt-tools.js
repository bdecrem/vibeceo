/**
 * JT Series Tools
 *
 * Tools for the JT instruments:
 *   - JT10 (101-style lead synth)
 *   - JT30 (303-style acid bass)
 *   - JT90 (909-style drum machine)
 *
 * Also exports the shared pattern builders used by jb01-tools.js:
 *   buildMonoPattern()   — step-object patterns (jt10/jt30)
 *   programDrumPattern() — per-voice step arrays (jt90/jb01)
 */

import { registerTools } from './index.js';
import { resolveInstrument } from './targets.js';
import { getParamDef, toEngine } from '../params/converters.js';

// JT90 voices
const JT90_VOICES = ['kick', 'snare', 'clap', 'rimshot', 'lowtom', 'midtom', 'hitom', 'ch', 'oh', 'crash', 'ride'];

const STEPS_PER_BAR = 16;
const NOTE_RE = /^[A-Ga-g][#b]?-?\d+$/;

const barsFor = (steps) => Math.max(1, Math.ceil(steps / STEPS_PER_BAR));
const emptyDrumStep = () => ({ velocity: 0, accent: false });

/**
 * In loop mode (no arrangement) a pattern longer than the session loop would
 * be cut off at render time — grow the loop to fit and say so.
 * @returns {string|null} note for the tool result
 */
function fitSessionBars(session, bars) {
  const hasArrangement = Array.isArray(session.arrangement) && session.arrangement.length > 0;
  if (hasArrangement) return null;
  if (bars > (session.bars || 0)) {
    session.bars = bars;
    return `loop length set to ${bars} bars`;
  }
  return null;
}

/**
 * Build a step-object pattern for the mono synths (jt10 / jt30 / jb202-style).
 *
 *  - `bars` sets the length; without it the array length decides (a 32-step
 *    array is 2 bars, never silently cut to 16).
 *  - a step without `note` takes the previous step's note (or `defaultNote`),
 *    so `{ gate: true }` can't reach the engine as `note: undefined` and kill
 *    the render.
 *  - invalid note names are refused with the offending steps listed.
 *
 * @returns {{ pattern, bars, steps, truncated }|{ error }}
 */
export function buildMonoPattern(input, defaultNote, label) {
  const src = input.pattern;
  if (!Array.isArray(src)) {
    return { error: `${label}: pattern must be an array of steps like { note: '${defaultNote}', gate: true }` };
  }
  if (input.bars !== undefined && (!Number.isInteger(input.bars) || input.bars < 1)) {
    return { error: `${label}: bars must be a whole number >= 1` };
  }

  const bars = input.bars || barsFor(src.length);
  const steps = bars * STEPS_PER_BAR;
  const bad = [];
  let prevNote = defaultNote;

  const pattern = Array(steps).fill(null).map((_, i) => {
    const step = (src[i] && typeof src[i] === 'object') ? src[i] : {};
    let note = step.note;
    if (note === undefined || note === null || note === '') {
      note = prevNote;
    } else if (typeof note === 'string') {
      if (!NOTE_RE.test(note.trim())) bad.push(`step ${i}: ${JSON.stringify(note)}`);
      else note = note.trim();
    } else if (typeof note !== 'number' || !Number.isFinite(note)) {
      bad.push(`step ${i}: ${JSON.stringify(note)}`);
    }
    prevNote = note;
    return {
      note,
      gate: !!step.gate,
      accent: !!step.accent,
      slide: !!step.slide,
    };
  });

  if (bad.length > 0) {
    return { error: `${label}: invalid note at ${bad.join(', ')} — use names like C2, F#1, Bb2 (or a MIDI number)` };
  }

  return { pattern, bars, steps, truncated: src.length > steps };
}

/** Repeat (wrap) a drum track's content to `steps`; missing/empty → silence. */
function tileTrack(track, steps) {
  const src = Array.isArray(track) && track.length > 0 ? track : null;
  return Array.from({ length: steps }, (_, i) => {
    const s = src ? src[i % src.length] : null;
    if (!s || typeof s !== 'object') return emptyDrumStep();
    return { ...s, velocity: s.velocity > 0 ? s.velocity : 0, accent: !!s.accent };
  });
}

const countHits = (track) => track.filter(s => s && s.velocity > 0).length;

/**
 * Program drum voices for add_jt90 / add_jb01. Mutates `pattern` in place
 * (it is the node's own pattern object) and leaves every voice at one length.
 *
 *  - length = max(bars*16, longest existing voice unless clear:true, what the
 *    step data needs). A step >= bars*16 grows the pattern; it never vanishes.
 *  - voices not named in the call are kept and stretched to the new length by
 *    repeating their content, so a 1-bar hat keeps ticking through bar 2.
 *  - a voice given shorter than the result (steps 0-15 on a 2-bar pattern) is
 *    repeated the same way.
 *  - clear:true wipes every voice first and is the only way to shrink.
 *
 * @param {Object} o
 * @param {Object} o.input - tool input ({ bars, clear, kick: [...], ... })
 * @param {string[]} o.voices - voice names in order
 * @param {Object} o.pattern - node pattern { voice: [{ velocity, accent }] }
 * @param {string} o.label - 'JT90' / 'JB01' for messages
 * @returns {{ steps, bars, added: string[], notes: string[] }|{ error }}
 */
export function programDrumPattern({ input, voices, pattern, label }) {
  if (input.bars !== undefined && (!Number.isInteger(input.bars) || input.bars < 1)) {
    return { error: `${label}: bars must be a whole number >= 1` };
  }

  // --- parse the requested voices
  const requested = {};
  const errors = [];
  for (const voice of voices) {
    const data = input[voice];
    if (data === undefined || data === null) continue;
    if (!Array.isArray(data)) { errors.push(`${voice}: expected an array of step numbers like [0, 4, 8, 12]`); continue; }
    if (data.length === 0) { requested[voice] = { steps: [] }; continue; }
    if (data.every(x => typeof x === 'number')) {
      const bad = data.filter(x => !Number.isInteger(x) || x < 0);
      if (bad.length) { errors.push(`${voice}: steps must be whole numbers >= 0 (got ${bad.join(', ')})`); continue; }
      requested[voice] = { steps: data };
    } else if (data.every(x => x === null || typeof x === 'object')) {
      requested[voice] = { track: data };
    } else {
      errors.push(`${voice}: mixed numbers and objects — pass step numbers like [0, 4, 8, 12]`);
    }
  }
  if (errors.length > 0) return { error: `${label}: ${errors.join('; ')}` };

  // --- how long does the pattern have to be?
  let needed = 0;          // steps the data itself needs
  for (const r of Object.values(requested)) {
    if (r.steps) needed = Math.max(needed, r.steps.length ? Math.max(...r.steps) + 1 : 0);
    else needed = Math.max(needed, r.track.length);
  }
  const neededBars = needed > 0 ? barsFor(needed) : 0;
  const existingLen = input.clear ? 0 : Math.max(0, ...voices.map(v => pattern[v]?.length || 0));
  const existingBars = existingLen > 0 ? barsFor(existingLen) : 0;
  const requestedBars = input.bars || 0;
  const base = Math.max(1, requestedBars, existingBars);
  const bars = Math.max(base, neededBars);
  const steps = bars * STEPS_PER_BAR;

  const notes = [];
  if (bars > base) notes.push(`grown to ${bars} bars to fit step ${needed - 1}`);
  if (requestedBars && !input.clear && existingBars > requestedBars) {
    notes.push(`kept the existing ${existingBars}-bar length (use clear:true to shrink)`);
  }

  // --- clear / stretch voices not named in the call
  for (const voice of voices) {
    if (requested[voice]) continue;
    if (input.clear || !pattern[voice] || pattern[voice].length !== steps) {
      pattern[voice] = input.clear ? tileTrack(null, steps) : tileTrack(pattern[voice], steps);
    }
  }

  // --- place the requested voices
  const added = [];
  for (const voice of voices) {
    const r = requested[voice];
    if (!r) continue;

    let own;
    if (r.steps) {
      const ownLen = Math.max(requestedBars * STEPS_PER_BAR, (r.steps.length ? barsFor(Math.max(...r.steps) + 1) : 1) * STEPS_PER_BAR);
      own = Array.from({ length: ownLen }, emptyDrumStep);
      for (const s of r.steps) own[s] = { velocity: 1, accent: false };
    } else {
      const ownLen = Math.max(requestedBars * STEPS_PER_BAR, barsFor(r.track.length) * STEPS_PER_BAR);
      own = tileTrack([...r.track, ...Array(Math.max(0, ownLen - r.track.length)).fill(null)], ownLen);
    }

    const repeated = own.length < steps;
    const track = repeated ? tileTrack(own, steps) : own;
    pattern[voice] = track;
    const hits = countHits(track);
    added.push(`${voice}: ${hits} hit${hits === 1 ? '' : 's'}${repeated ? ` (${own.length / STEPS_PER_BAR}-bar part repeated)` : ''}`);
  }

  return { steps, bars, added, notes };
}

/** Shared tail for add_jt90 / add_jb01: apply, fit the loop, format. */
export function finishDrumProgram(res, input, session, inst, label) {
  inst.node.setPattern(inst.pattern);

  if (res.added.length === 0) {
    return `${label}: no pattern changes`;
  }

  const fit = fitSessionBars(session, res.bars);
  if (fit) res.notes.push(fit);

  const barsLabel = res.bars > 1 ? ` (${res.bars} bars)` : '';
  const clearLabel = input.clear ? ' (cleared first)' : '';
  const notesLabel = res.notes.length ? ` — ${res.notes.join('; ')}` : '';
  return `${label}: ${res.added.join(', ')}${barsLabel}${clearLabel}${notesLabel}`;
}

/** Shared tail for add_jt10 / add_jt30. */
function finishMonoProgram(r, session, inst, label) {
  inst.pattern = r.pattern;
  const activeSteps = r.pattern.filter(s => s.gate).length;
  const notes = [];
  if (r.truncated) notes.push(`array longer than ${r.bars} bar${r.bars > 1 ? 's' : ''}, extra steps dropped — pass bars to keep them`);
  const fit = fitSessionBars(session, r.bars);
  if (fit) notes.push(fit);
  const barsLabel = r.bars > 1 ? ` (${r.bars} bars)` : '';
  const notesLabel = notes.length ? ` — ${notes.join('; ')}` : '';
  return `${label}: ${activeSteps} notes programmed${barsLabel}${notesLabel}`;
}

const jtTools = {
  // ==================== JT10 (Lead Synth) ====================

  /**
   * Add JT10 lead pattern
   */
  add_jt10: async (input, session, context) => {
    const inst = resolveInstrument(session, input.instrument, 'jt10');
    if (inst.error) return inst.error;
    const r = buildMonoPattern(input, 'C3', 'JT10');
    if (r.error) return r.error;
    return finishMonoProgram(r, session, inst, 'JT10');
  },

  /**
   * Tweak JT10 lead parameters
   */
  tweak_jt10: async (input, session, context) => {
    const inst = resolveInstrument(session, input.instrument, 'jt10');
    if (inst.error) return inst.error;
    const tweaks = [];

    // Level: sets NODE output level in dB (used by mixer for gain staging)
    // Routes through ParamSystem → InstrumentNode.setLevel()
    if (input.level !== undefined) {
      session.set(`${inst.id}.level`, input.level);
      tweaks.push(`level=${input.level}dB`);
    }

    // Mute/unmute via node output level (dB)
    if (input.mute === true) {
      session.set(`${inst.id}.level`, -60);
      tweaks.push('muted');
    } else if (input.mute === false) {
      session.set(`${inst.id}.level`, 0);
      tweaks.push('unmuted');
    }

    // Map tool input names to engine param names
    const paramMap = {
      sawLevel: 'sawLevel',
      pulseLevel: 'pulseLevel',
      pulseWidth: 'pulseWidth',
      subLevel: 'subLevel',
      subMode: 'subMode',
      filterCutoff: 'cutoff',
      filterResonance: 'resonance',
      filterEnvAmount: 'envMod',
      keyTrack: 'keyTrack',
      ampAttack: 'attack',
      ampDecay: 'decay',
      ampSustain: 'sustain',
      ampRelease: 'release',
      filterAttack: 'filterAttack',
      filterDecay: 'filterDecay',
      filterSustain: 'filterSustain',
      filterRelease: 'filterRelease',
      lfoRate: 'lfoRate',
      lfoToPitch: 'lfoToPitch',
      lfoToFilter: 'lfoToFilter',
      lfoToPW: 'lfoToPW',
      glideTime: 'glideTime',
    };

    for (const [inputKey, engineKey] of Object.entries(paramMap)) {
      if (input[inputKey] !== undefined) {
        const def = getParamDef('jt10', 'lead', engineKey);
        let value = input[inputKey];
        let shown = `${inputKey}=${input[inputKey]}`;

        if (inputKey === 'glideTime' && typeof value === 'number') {
          // Documented as 0-100; the engine wants seconds (0-1). Values above 1
          // are knob positions (50 → 0.5 s); 0-1 are already seconds. Before
          // this, toEngine clamped 50 to 1 s — every glide became the maximum.
          const seconds = Math.max(0, Math.min(1, value > 1 ? value / 100 : value));
          value = seconds;
          shown = `glideTime=${+seconds.toFixed(3)}s`;
        } else if (def && typeof value === 'number' && def.unit !== 'choice') {
          // Convert producer units to engine units (skip choice params — no min/max)
          value = toEngine(value, def);
        }

        session.set(`${inst.id}.lead.${engineKey}`, value);
        tweaks.push(shown);
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
    const inst = resolveInstrument(session, input.instrument, 'jt30');
    if (inst.error) return inst.error;
    const r = buildMonoPattern(input, 'A1', 'JT30');
    if (r.error) return r.error;
    return finishMonoProgram(r, session, inst, 'JT30');
  },

  /**
   * Tweak JT30 acid bass parameters
   */
  tweak_jt30: async (input, session, context) => {
    const inst = resolveInstrument(session, input.instrument, 'jt30');
    if (inst.error) return inst.error;
    const tweaks = [];

    // Level: sets NODE output level in dB (used by mixer for gain staging)
    // Routes through ParamSystem → InstrumentNode.setLevel()
    if (input.level !== undefined) {
      session.set(`${inst.id}.level`, input.level);
      tweaks.push(`level=${input.level}dB`);
    }

    // Mute/unmute via node output level (dB)
    if (input.mute === true) {
      session.set(`${inst.id}.level`, -60);
      tweaks.push('muted');
    } else if (input.mute === false) {
      session.set(`${inst.id}.level`, 0);
      tweaks.push('unmuted');
    }

    // Map producer params to engine params
    // Tool uses filterCutoff/filterResonance, engine uses cutoff/resonance
    const paramMap = {
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

        session.set(`${inst.id}.bass.${engineKey}`, value);
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
   * @param {number} [bars] - Pattern length in bars (16 steps per bar); grows to fit the steps given
   * @param {boolean} [clear=false] - Clear all voices before adding (the only way to shrink)
   * Accepts either step arrays (e.g., kick: [0, 4, 8, 12]) or full pattern objects
   */
  add_jt90: async (input, session, context) => {
    const inst = resolveInstrument(session, input.instrument, 'jt90');
    if (inst.error) return inst.error;
    const res = programDrumPattern({ input, voices: JT90_VOICES, pattern: inst.pattern, label: 'JT90' });
    if (res.error) return res.error;
    return finishDrumProgram(res, input, session, inst, 'JT90');
  },

  /**
   * Tweak JT90 drum voice parameters
   */
  tweak_jt90: async (input, session, context) => {
    const inst = resolveInstrument(session, input.instrument, 'jt90');
    if (inst.error) return inst.error;
    const voice = input.voice;
    if (!voice || !JT90_VOICES.includes(voice)) {
      return `JT90: invalid voice. Use: ${JT90_VOICES.join(', ')}`;
    }

    const tweaks = [];

    // Mute/unmute (sets voice level to silent/unity)
    if (input.mute === true) {
      const def = getParamDef('jt90', voice, 'level');
      session.set(`${inst.id}.${voice}.level`, def ? toEngine(-60, def) : 0);
      tweaks.push('muted');
    } else if (input.mute === false) {
      const def = getParamDef('jt90', voice, 'level');
      session.set(`${inst.id}.${voice}.level`, def ? toEngine(0, def) : 0.5);
      tweaks.push('unmuted');
    }

    // Level: dB (-60 to +6, 0=unity) -> node gain
    if (input.level !== undefined) {
      const def = getParamDef('jt90', voice, 'level');
      const value = def ? toEngine(input.level, def) : input.level / 100;
      session.set(`${inst.id}.${voice}.level`, value);
      tweaks.push(`level=${input.level}dB`);
    }

    // Tune: semitones (-12 to +12)
    if (input.tune !== undefined) {
      const def = getParamDef('jt90', voice, 'tune');
      const value = def ? toEngine(input.tune, def) : input.tune;
      session.set(`${inst.id}.${voice}.tune`, value);
      tweaks.push(`tune=${input.tune}st`);
    }

    // Decay: 0-100 -> 0-1
    if (input.decay !== undefined) {
      const def = getParamDef('jt90', voice, 'decay');
      const value = def ? toEngine(input.decay, def) : input.decay / 100;
      session.set(`${inst.id}.${voice}.decay`, value);
      tweaks.push(`decay=${input.decay}`);
    }

    // Attack (kick only): 0-100 -> 0-1
    if (input.attack !== undefined && voice === 'kick') {
      const def = getParamDef('jt90', voice, 'attack');
      const value = def ? toEngine(input.attack, def) : input.attack / 100;
      session.set(`${inst.id}.${voice}.attack`, value);
      tweaks.push(`attack=${input.attack}`);
    }

    // Sweep / pitch envelope depth (kick only): 0-100 -> 0-1
    if (input.sweep !== undefined && voice === 'kick') {
      const def = getParamDef('jt90', voice, 'sweep');
      const value = def ? toEngine(input.sweep, def) : input.sweep / 100;
      session.set(`${inst.id}.${voice}.sweep`, value);
      tweaks.push(`sweep=${input.sweep}`);
    }

    // Tone: 0-100 -> 0-1
    if (input.tone !== undefined) {
      const def = getParamDef('jt90', voice, 'tone');
      const value = def ? toEngine(input.tone, def) : input.tone / 100;
      session.set(`${inst.id}.${voice}.tone`, value);
      tweaks.push(`tone=${input.tone}`);
    }

    // Snappy (snare only): 0-100 -> 0-1
    if (input.snappy !== undefined && voice === 'snare') {
      const def = getParamDef('jt90', voice, 'snappy');
      const value = def ? toEngine(input.snappy, def) : input.snappy / 100;
      session.set(`${inst.id}.${voice}.snappy`, value);
      tweaks.push(`snappy=${input.snappy}`);
    }

    if (tweaks.length === 0) {
      return `JT90 ${voice}: no changes`;
    }

    return `JT90 ${voice}: ${tweaks.join(', ')}`;
  },
};

registerTools(jtTools);
