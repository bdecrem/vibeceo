/**
 * Session status — what the agent (and any UI) is told about the session.
 *
 * Generic over the node registry: any instrument registered in the session
 * shows up here. Nothing in this file names a specific synth beyond the
 * canonical id list used for ordering.
 *
 *   buildSessionContext(session)  → text block appended to the system prompt
 *   describeSession(session)      → JSON model for UIs (controls, status)
 *   readProducerValue(session, p) → current value of a path in producer units
 */

import { fromEngine } from '../params/converters.js';

export const CANONICAL_INSTRUMENTS = ['jb01', 'jt90', 'jb202', 'jt30', 'jt10', 'jp9000', 'jbs'];

/**
 * Does a pattern contain any hits/notes? Works for every pattern shape:
 *   drums/sampler: { voice: [{ velocity }] }
 *   mono synths:   [{ note, gate }]
 */
export function patternHasContent(pattern) {
  if (!pattern) return false;
  // Mono-synth steps carry a gate (velocity is just accent weight); drum /
  // sampler steps carry only a velocity.
  const stepHit = s => !!s && ('gate' in s ? s.gate === true : (typeof s.velocity === 'number' && s.velocity > 0));
  if (Array.isArray(pattern)) return pattern.some(stepHit);
  if (typeof pattern === 'object') {
    return Object.values(pattern).some(v => Array.isArray(v) && v.some(stepHit));
  }
  return false;
}

/**
 * Which voices/slots of a multi-voice pattern are in use.
 */
export function activeVoices(pattern) {
  if (!pattern || Array.isArray(pattern) || typeof pattern !== 'object') return [];
  return Object.entries(pattern)
    .filter(([, v]) => Array.isArray(v) && v.some(s => s && s.velocity > 0))
    .map(([k]) => k);
}

function nodeStoresProducerUnits(session, path) {
  const resolved = session.params?._resolveNode?.(path);
  return !!(resolved && resolved.node && resolved.node.producerUnitStorage);
}

/**
 * Current value of a parameter path in producer units (dB, Hz, 0-100, ...).
 * Mirrors the conversion rules the `tweak` / `get_param` tools use.
 */
export function readProducerValue(session, path) {
  const value = session.get(path);
  if (value === undefined) return undefined;
  const descriptor = session.getDescriptor(path);
  if (!descriptor) return value;
  const segs = path.split('.');
  const isNodeLevel = segs.length === 2 && segs[1] === 'level';
  if (isNodeLevel || nodeStoresProducerUnits(session, path)) return value;
  if (descriptor.unit === 'choice') return value;
  return fromEngine(value, descriptor);
}

export function formatProducerValue(value, descriptor) {
  if (value === undefined || value === null) return '—';
  if (!descriptor || descriptor.unit === 'choice') return String(value);
  const r = Math.round(value * 10) / 10;
  switch (descriptor.unit) {
    case 'dB': return `${r > 0 ? '+' : ''}${r}dB`;
    case 'Hz': return `${Math.round(value)}Hz`;
    case 'semitones': return `${r > 0 ? '+' : ''}${r}st`;
    case 'cents': return `${r > 0 ? '+' : ''}${r}c`;
    case 'ms': return `${Math.round(value)}ms`;
    default: return `${Math.round(value)}`;
  }
}

/**
 * Structured description of the whole session. This is the model the web
 * controls are generated from, and buildSessionContext() renders it to text.
 *
 * @returns {{
 *   bpm, swing, bars,
 *   instruments: [{ id, active, voices, pattern, level, params: [{ path, value, descriptor, isDefault }] }],
 *   effects: [{ target, chain: [{ id, type }] }],
 *   patterns: { [instrument]: [name] }, arrangement: [...],
 *   automation: [path]
 * }}
 */
export function describeSession(session) {
  const instruments = [];
  const seenNodes = new Set();   // aliases (drums→jb01, bass→jb202) share a node
  const ids = [...CANONICAL_INSTRUMENTS, ...Object.keys(session._nodes || {})];

  for (const id of ids) {
    const node = session._nodes?.[id];
    if (!node || typeof node.getPattern !== 'function') continue;
    if (seenNodes.has(node)) continue;
    seenNodes.add(node);

    const pattern = safe(() => node.getPattern());
    const active = patternHasContent(pattern);
    const descriptors = safe(() => session.describe(id)) || {};
    const params = [];
    for (const [sub, descriptor] of Object.entries(descriptors)) {
      if (sub === 'level') continue;   // node output level is reported separately (dB)
      const path = `${id}.${sub}`;
      const value = safe(() => readProducerValue(session, path));
      if (value === undefined) continue;
      const isDefault = descriptor.default === undefined
        ? true
        : descriptor.unit === 'choice' || typeof value !== 'number'
          ? value === descriptor.default
          : Math.abs(value - descriptor.default) < 0.5;
      params.push({ path, sub, value, descriptor, isDefault });
    }
    // Node output level is not in the descriptors — expose it too.
    const level = typeof node.getLevel === 'function' ? node.getLevel() : 0;

    const type = typeof session.instrumentType === 'function' ? (session.instrumentType(id) || id) : id;
    instruments.push({ id, type, active, voices: activeVoices(pattern), pattern, level, params });
  }

  const effects = [];
  for (const [target, chain] of Object.entries(session.mixer?.effectChains || {})) {
    if (Array.isArray(chain) && chain.length > 0) {
      effects.push({
        target,
        chain: chain.map(e => ({
          id: e.id,
          type: e.type,
          params: e._node ? e._node.getParams() : e.params,
          descriptors: safe(() => session.describe(`fx.${target}.${e.id}`)) || {},
        })),
      });
    }
  }

  const patterns = {};
  for (const [inst, named] of Object.entries(session.patterns || {})) {
    const names = Object.keys(named || {});
    if (names.length) patterns[inst] = names;
  }

  const automation = session.params?.automation ? Array.from(session.params.automation.keys()) : [];

  return {
    bpm: session.bpm,
    swing: session.swing || 0,
    bars: session.bars || 2,
    instruments,
    effects,
    patterns,
    arrangement: session.arrangement || [],
    automation,
  };
}

/**
 * Text block describing the current session, appended to the system prompt
 * on every agent iteration. Kept compact: the agent has `get_state` /
 * `list_params` for detail.
 */
export function buildSessionContext(session) {
  const d = describeSession(session);
  const parts = [];

  parts.push(`BPM: ${d.bpm}${d.swing > 0 ? `, swing ${d.swing}%` : ''}, ${d.bars} bars`);

  if (session.samplerKit) {
    const slotList = (session.samplerKit.slots || []).map(s => `${s.id}=${s.name}`).join(', ');
    parts.push(`LOADED KIT: "${session.samplerKit.name}" slots: ${slotList}`);
  }

  const programmed = d.instruments.filter(i => i.active).map(i => {
    const voices = i.voices.length ? ` (${i.voices.join(' ')})` : '';
    const tweaks = i.params.filter(p => !p.isDefault).slice(0, 12)
      .map(p => `${p.sub}=${formatProducerValue(p.value, p.descriptor)}`);
    const lvl = i.level !== 0 ? ` level ${i.level > 0 ? '+' : ''}${i.level}dB` : '';
    const tw = tweaks.length ? ` [${tweaks.join(', ')}]` : '';
    return `${i.id}${voices}${lvl}${tw}`;
  });
  parts.push(programmed.length ? `Programmed: ${programmed.join('; ')}` : 'Programmed: nothing yet');

  if (d.effects.length) {
    parts.push('Effects: ' + d.effects.map(e => `${e.target}: ${e.chain.map(c => `${c.type}(${c.id})`).join(' → ')}`).join('; '));
  }
  if (d.automation.length) parts.push(`Automation: ${d.automation.join(', ')}`);

  const saved = Object.entries(d.patterns).map(([inst, names]) => `${inst}: ${names.join(', ')}`);
  if (saved.length) parts.push(`Saved patterns: ${saved.join('; ')}`);

  if (d.arrangement.length) {
    const sections = d.arrangement.map((s, i) => {
      const insts = Object.entries(s.patterns || {}).map(([k, v]) => `${k}=${v}`).join(',');
      return `${i + 1}:${s.bars}bars[${insts}]`;
    });
    parts.push(`Arrangement: ${sections.join(' → ')}`);
  }

  return `\n\nCURRENT SESSION STATE:\n${parts.join('\n')}`;
}

function safe(fn) {
  try { return fn(); } catch { return undefined; }
}
