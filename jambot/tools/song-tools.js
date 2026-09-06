/**
 * Song Tools
 *
 * Tools for song mode: save_pattern, load_pattern, copy_pattern, list_patterns,
 * set_arrangement, clear_arrangement, show_arrangement
 *
 * A saved pattern captures one instrument instance's step pattern, params,
 * automation and channel inserts (its effect chains). The arrangement names a
 * saved pattern per instrument per section. Everything keys on the instance
 * id (jb01, jt90, jb202, jt30, jt10, jbs, or an added id such as jb202-2).
 */

import { registerTools } from './index.js';
import { clearNodeAutomation } from '../core/automation.js';
import { DelayNode } from '../effects/delay-node.js';
import { EQNode } from '../effects/eq-node.js';
import { FilterNode } from '../effects/filter-node.js';
import { SidechainNode } from '../effects/sidechain-node.js';
import { ReverbNode } from '../effects/reverb-node.js';

// Effect type → node class, for rebuilding a pattern's inserts on load
// (same table as mixer-tools.js / core/session.js).
const EFFECT_NODE_CLASSES = {
  delay: DelayNode,
  eq: EQNode,
  filter: FilterNode,
  sidechain: SidechainNode,
  reverb: ReverbNode,
};

// Names that are not instrument ids. The pattern tools and the arrangement
// name the canonical id instead of guessing — a 'drums' key in a section was
// accepted and then never rendered.
const LEGACY_ALIASES = { drums: 'jb01', bass: 'jb202', lead: 'jb202', synth: 'jb202', sampler: 'jbs' };

// Same cap as the session `bars` param (generic-tools SESSION_PARAMS) and the
// product promise ("up to 128 bars").
const MAX_ARRANGEMENT_BARS = 128;

const deep = (v) => JSON.parse(JSON.stringify(v));

/**
 * Resolve the instrument a pattern tool acts on.
 * @returns {Object} accessor ({ id, kind, node, pattern, params }) or { error }
 */
function resolvePatternInstrument(session, instrument) {
  const ids = (session.listInstruments?.() || []).map(i => i.id);
  if (typeof instrument !== 'string' || !instrument) {
    return { error: `Error: instrument is required. Instruments: ${ids.join(', ')}` };
  }
  if (LEGACY_ALIASES[instrument]) {
    return { error: `Error: "${instrument}" is a legacy alias, not an instrument id — use "${LEGACY_ALIASES[instrument]}"` };
  }
  if (instrument === 'jb200') {
    return { error: 'Error: jb200 is retired — use "jb202"' };
  }
  const acc = session.instrument?.(instrument);
  if (!acc) {
    return { error: `Error: no instrument "${instrument}". Instruments: ${ids.join(', ')}` };
  }
  if (acc.kind === 'modular') {
    return { error: `Error: ${instrument} has no song patterns — use save_jp9000_rig / load_jp9000_rig` };
  }
  return acc;
}

// ---------------------------------------------------------------------------
// Channel inserts (effect chains) per pattern
//
// The mixer tools write session.mixer.effectChains, keyed '<inst>' or
// '<inst>.<voice>'. save_pattern snapshots the chains that belong to the
// instrument into the saved pattern's `channelInserts` as plain data
// ({ key: [{ id, type, params }] }); load_pattern drops the instrument's live
// chains and rebuilds them from the snapshot. A pattern saved before this
// existed carries `channelInserts: null` and leaves the live effects alone.
// ---------------------------------------------------------------------------

function ownsChainKey(inst, key) {
  return key === inst || key.startsWith(inst + '.');
}

function instrumentChainKeys(effectChains, inst) {
  return Object.keys(effectChains || {}).filter(k => ownsChainKey(inst, k));
}

/** Plain-data snapshot of the instrument's live effect chains ({} when none). */
function snapshotInserts(session, inst) {
  const chains = session.mixer?.effectChains || {};
  const out = {};
  for (const key of instrumentChainKeys(chains, inst)) {
    const chain = chains[key];
    if (!Array.isArray(chain) || chain.length === 0) continue;
    out[key] = chain.map(e => ({
      id: e.id,
      type: e.type,
      params: e._node && typeof e._node.getParams === 'function' ? { ...e._node.getParams() } : { ...(e.params || {}) },
    }));
  }
  return out;
}

/** Remove the instrument's live chains (and their fx.* param paths). */
function dropInserts(session, inst) {
  const chains = session.mixer?.effectChains;
  if (!chains) return [];
  const dropped = [];
  for (const key of instrumentChainKeys(chains, inst)) {
    for (const e of chains[key] || []) {
      session.params.unregister(`fx.${key}.${e.id}`);
      dropped.push(`${key}/${e.id}`);
    }
    delete chains[key];
  }
  return dropped;
}

/** Rebuild the instrument's chains from a snapshot. */
function restoreInserts(session, inst, snapshot) {
  if (!session.mixer) session.mixer = { masterVolume: 0.8, effectChains: {} };
  if (!session.mixer.effectChains) session.mixer.effectChains = {};
  const restored = [];
  const skipped = [];
  for (const [key, list] of Object.entries(snapshot || {})) {
    if (!ownsChainKey(inst, key)) { skipped.push(key); continue; }   // never touch another instrument's chain
    if (!Array.isArray(list) || list.length === 0) continue;
    const chain = [];
    list.forEach((e, i) => {
      const NodeClass = EFFECT_NODE_CLASSES[e?.type];
      if (!NodeClass) { skipped.push(`${key}/${e?.type ?? '?'}`); return; }
      const id = e.id || `${e.type}${i + 1}`;
      const node = new NodeClass(id);
      for (const [k, v] of Object.entries(e.params || {})) node.setParam(k, v);
      session.params.register(`fx.${key}.${id}`, node);
      chain.push({ id, type: e.type, _node: node });
      restored.push(`${key}/${id}`);
    });
    if (chain.length) session.mixer.effectChains[key] = chain;
  }
  return { restored, skipped };
}

/**
 * Apply a saved pattern's inserts to the live session.
 * @returns {string} suffix for the tool result ('' for legacy saves)
 */
function applySavedInserts(session, inst, saved) {
  const snapshot = saved.channelInserts;
  if (snapshot === null || snapshot === undefined || typeof snapshot !== 'object') return '';
  const dropped = dropInserts(session, inst);
  const { restored, skipped } = restoreInserts(session, inst, snapshot);
  const lost = dropped.filter(d => !restored.includes(d));
  const parts = [];
  if (restored.length) parts.push(`inserts restored: ${restored.join(', ')}`);
  if (lost.length) parts.push(`dropped live inserts not saved in this pattern: ${lost.join(', ')}`);
  if (skipped.length) parts.push(`could not restore: ${skipped.join(', ')}`);
  return parts.length ? ` — ${parts.join('; ')}` : '';
}

function describeInserts(snapshot) {
  const names = [];
  for (const [key, list] of Object.entries(snapshot || {})) for (const e of list) names.push(`${key}/${e.id}`);
  return names.length ? ` (with inserts: ${names.join(', ')})` : '';
}

// ---------------------------------------------------------------------------
// Automation per pattern
// ---------------------------------------------------------------------------

function getAutomationForInstrument(session, inst) {
  const automation = {};
  for (const [path, values] of session.params.automation) {
    if (path.startsWith(inst + '.')) {
      // Store with node-relative path: 'jb01.kick.decay' → 'kick.decay'
      automation[path.slice(inst.length + 1)] = [...values];
    }
  }
  return Object.keys(automation).length > 0 ? automation : undefined;
}

function restoreAutomation(session, inst, automation) {
  if (!automation) return;
  for (const [path, values] of Object.entries(automation)) {
    session.params.automate(`${inst}.${path}`, [...values]);
  }
}

/** Length of a saved step pattern in bars (16 steps per bar); 0 if unknown. */
function patternBars(pattern) {
  let len = 0;
  if (Array.isArray(pattern)) {
    len = pattern.length;
  } else if (pattern && typeof pattern === 'object') {
    for (const v of Object.values(pattern)) if (Array.isArray(v) && v.length > len) len = v.length;
  }
  return len ? Math.ceil(len / 16) : 0;
}

/** Saved-pattern names per instrument: live instances first, then anything else in session.patterns. */
function patternOwners(session) {
  const known = (session.listInstruments?.() || []).map(i => i.id);
  const extra = Object.keys(session.patterns || {})
    .filter(id => !known.includes(id) && Object.keys(session.patterns[id] || {}).length > 0);
  return { known, extra };
}

const songTools = {
  /**
   * Save current working pattern to a named slot
   */
  save_pattern: async (input, session, context) => {
    const { instrument, name: patternName } = input;
    if (typeof patternName !== 'string' || !patternName) return 'Error: save_pattern needs a pattern name (A, B, C, ...)';
    const acc = resolvePatternInstrument(session, instrument);
    if (acc.error) return acc.error;
    const id = acc.id;

    if (!session.patterns[id]) session.patterns[id] = {};
    if (!session.currentPattern) session.currentPattern = {};

    if (acc.kind === 'sampler') {
      // jbs keeps its legacy pattern/params accessors (single instance)
      const entry = {
        pattern: deep(session.jbsPattern),
        params: deep(session.jbsParams),
        channelInserts: snapshotInserts(session, id),
      };
      session.patterns[id][patternName] = entry;
      session.currentPattern[id] = patternName;
      return `Saved ${id} pattern "${patternName}"${describeInserts(entry.channelInserts)}`;
    }

    // One code path for jb01/jb202/jt10/jt30/jt90 and every added instance.
    const entry = {
      pattern: deep(acc.pattern || (acc.kind === 'drums' ? {} : [])),
      params: deep(acc.params || {}),
      automation: getAutomationForInstrument(session, id),
      channelInserts: snapshotInserts(session, id),
    };
    if (typeof acc.node.getSwing === 'function') entry.swing = acc.node.getSwing() || 0;
    if (typeof acc.node.getAccentLevel === 'function') entry.accentLevel = acc.node.getAccentLevel() ?? 1.0;
    session.patterns[id][patternName] = entry;
    session.currentPattern[id] = patternName;
    return `Saved ${id} pattern "${patternName}"${describeInserts(entry.channelInserts)}`;
  },

  /**
   * Load a saved pattern into current working pattern
   */
  load_pattern: async (input, session, context) => {
    const { instrument, name: patternName } = input;
    const acc = resolvePatternInstrument(session, instrument);
    if (acc.error) return acc.error;
    const id = acc.id;

    const saved = session.patterns[id]?.[patternName];
    if (!saved) {
      const have = Object.keys(session.patterns[id] || {});
      return `No ${id} pattern "${patternName}" found${have.length ? ` (saved: ${have.join(', ')})` : ' (none saved)'}`;
    }
    if (!session.currentPattern) session.currentPattern = {};

    if (acc.kind === 'sampler') {
      session.jbsPattern = deep(saved.pattern);
      if (saved.params) session.jbsParams = deep(saved.params);
      const insertNote = applySavedInserts(session, id, saved);
      session.currentPattern[id] = patternName;
      return `Loaded ${id} pattern "${patternName}"${insertNote}`;
    }

    acc.pattern = deep(saved.pattern);
    if (saved.params) acc.params = deep(saved.params);
    if (saved.swing !== undefined && typeof acc.node.setSwing === 'function') acc.node.setSwing(saved.swing);
    if (saved.accentLevel !== undefined && typeof acc.node.setAccentLevel === 'function') acc.node.setAccentLevel(saved.accentLevel);
    clearNodeAutomation(session, id);
    restoreAutomation(session, id, saved.automation);
    const insertNote = applySavedInserts(session, id, saved);
    session.currentPattern[id] = patternName;
    return `Loaded ${id} pattern "${patternName}"${insertNote}`;
  },

  /**
   * Copy a pattern to a new name (for variations)
   */
  copy_pattern: async (input, session, context) => {
    const { instrument, from, to } = input;
    const acc = resolvePatternInstrument(session, instrument);
    if (acc.error) return acc.error;
    if (typeof to !== 'string' || !to) return 'Error: copy_pattern needs a destination name (`to`)';
    const patterns = session.patterns[acc.id] || (session.patterns[acc.id] = {});
    if (!patterns[from]) {
      const have = Object.keys(patterns);
      return `No ${acc.id} pattern "${from}" found${have.length ? ` (saved: ${have.join(', ')})` : ' (none saved)'}`;
    }

    patterns[to] = deep(patterns[from]);
    // Load the copy into the live node so subsequent tweaks apply to it
    await songTools.load_pattern({ instrument: acc.id, name: to }, session, context);
    return `Copied ${acc.id} pattern "${from}" to "${to}" (now active)`;
  },

  /**
   * List all saved patterns per instrument
   */
  list_patterns: async (input, session, context) => {
    const lines = [];
    const { known, extra } = patternOwners(session);
    const line = (id) => {
      const names = Object.keys(session.patterns?.[id] || {});
      const current = session.currentPattern?.[id];
      return names.length
        ? `${id}: ${names.map(n => n === current ? `[${n}]` : n).join(', ')}`
        : `${id}: (none saved)`;
    };
    for (const id of known) lines.push(line(id));
    // Patterns saved under ids that are not live instruments (legacy sessions)
    for (const id of extra) lines.push(`${line(id)} (not an instrument in this session)`);
    return lines.join('\n');
  },

  /**
   * Set the song arrangement (sections with bar counts and pattern assignments)
   */
  set_arrangement: async (input, session, context) => {
    const sections = input?.sections;
    const ids = (session.listInstruments?.() || []).map(i => i.id);
    if (!Array.isArray(sections) || sections.length === 0) {
      return 'Error: set_arrangement needs a non-empty `sections` array, e.g. [{ bars: 4, jt90: "A", jb202: "A" }]. Arrangement unchanged.';
    }

    // Any key other than `bars` names an instrument instance (jb01, jt90,
    // jb202-2, ...) and the saved pattern it plays in that section. Validate
    // everything, report everything, change nothing on error.
    const problems = [];
    const notes = [];
    const next = [];
    let total = 0;

    sections.forEach((sec, i) => {
      const n = i + 1;
      if (!sec || typeof sec !== 'object' || Array.isArray(sec)) {
        problems.push(`section ${n}: must be an object like { bars: 4, jt90: 'A' }`);
        return;
      }
      const raw = sec.bars;
      const bars = typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : raw;
      const barsOk = typeof bars === 'number' && Number.isInteger(bars) && bars >= 1;
      if (!barsOk) problems.push(`section ${n}: bars must be a whole number ≥ 1 (got ${JSON.stringify(raw)})`);
      else total += bars;

      const patterns = {};
      for (const [key, value] of Object.entries(sec)) {
        if (key === 'bars' || value === undefined || value === null) continue;
        if (LEGACY_ALIASES[key]) {
          problems.push(`section ${n}: "${key}" is a legacy alias — key the section on "${LEGACY_ALIASES[key]}"`);
          continue;
        }
        if (key === 'jb200') {
          problems.push(`section ${n}: jb200 is retired — use "jb202"`);
          continue;
        }
        if (!session.instrument?.(key)) {
          problems.push(`section ${n}: unknown instrument "${key}"`);
          continue;
        }
        const name = String(value);
        const saved = session.patterns?.[key]?.[name];
        if (!saved) {
          const have = Object.keys(session.patterns?.[key] || {});
          problems.push(`section ${n}: no saved ${key} pattern "${name}"${have.length ? ` (saved: ${have.join(', ')})` : ' (none saved — save_pattern first)'}`);
          continue;
        }
        patterns[key] = name;
        const pb = patternBars(saved.pattern);
        if (barsOk && pb > bars) {
          notes.push(`section ${n}: ${key} "${name}" is ${pb} bars but the section is ${bars} — only its first ${bars} bar${bars === 1 ? '' : 's'} play`);
        }
      }
      next.push({ bars, patterns });
    });

    if (!problems.length && total > MAX_ARRANGEMENT_BARS) {
      problems.push(`arrangement is ${total} bars; max ${MAX_ARRANGEMENT_BARS}`);
    }
    if (problems.length) {
      return `Error: arrangement not set — ${problems.join('; ')}. Instruments: ${ids.join(', ')}. Arrangement unchanged.`;
    }

    session.arrangement = next;
    let msg = `Arrangement set: ${next.length} sections, ${total} bars total`;
    if (notes.length) msg += `. Note: ${notes.join('; ')}`;
    return msg;
  },

  /**
   * Clear arrangement, return to single-pattern mode
   */
  clear_arrangement: async (input, session, context) => {
    session.arrangement = [];
    return `Arrangement cleared. Back to single-pattern mode.`;
  },

  /**
   * Display current patterns and arrangement
   */
  show_arrangement: async (input, session, context) => {
    const lines = [];

    lines.push('PATTERNS:');
    const { known, extra } = patternOwners(session);
    for (const id of [...known, ...extra]) {
      const names = Object.keys(session.patterns?.[id] || {});
      if (names.length > 0) lines.push(`  ${id}: ${names.join(', ')}`);
    }

    if (session.arrangement && session.arrangement.length > 0) {
      lines.push('\nARRANGEMENT:');
      session.arrangement.forEach((section, i) => {
        const parts = Object.entries(section.patterns || {})
          .filter(([, name]) => name !== undefined && name !== null)
          .map(([id, name]) => `${id}:${name}`);
        lines.push(`  ${i + 1}. ${section.bars} bars — ${parts.join(', ') || '(silent)'}`);
      });
      const totalBars = session.arrangement.reduce((sum, s) => sum + (Number(s.bars) || 0), 0);
      lines.push(`\nTotal: ${totalBars} bars`);
    } else {
      lines.push('\nARRANGEMENT: (not set - single pattern mode)');
    }

    return lines.join('\n');
  },
};

registerTools(songTools);
