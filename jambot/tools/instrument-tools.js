/**
 * Instrument instance tools: add_instrument, remove_instrument, list_instruments
 *
 * The session starts with one of each instrument (jb01, jt90, jb202, jt30,
 * jt10, jp9000, jbs). add_instrument adds more of any type except the
 * single-instance jp9000/jbs; every other tool takes the new id in its
 * `instrument` argument or as the head of a param path.
 */
import { registerTools } from './index.js';
import { INSTRUMENT_TYPES } from '../core/session.js';

const instrumentTools = {
  add_instrument: async (input, session, context) => {
    const type = String(input.type || '').toLowerCase();
    const r = session.addInstrument(type, input.id ? String(input.id).toLowerCase() : undefined);
    if (r.error) return `Error: ${r.error}`;
    const t = INSTRUMENT_TYPES[type];
    const how = t.kind === 'drums'
      ? `add_${type}({ instrument: '${r.id}', kick: [0, 4, 8, 12] })`
      : `add_${type}({ instrument: '${r.id}', pattern: [...] })`;
    return `Added ${type} as "${r.id}". Program it with ${how}; params via tweak({ path: '${r.id}.…' }); effects via add_effect({ target: '${r.id}' }); in arrangements use the key '${r.id}'.`;
  },

  remove_instrument: async (input, session, context) => {
    const id = String(input.id || '').toLowerCase();
    const r = session.removeInstrument(id);
    if (r.error) return `Error: ${r.error}`;
    return `Removed "${id}" (its patterns, effects and arrangement slots are gone).`;
  },

  list_instruments: async (input, session, context) => {
    const lines = ['INSTRUMENTS:'];
    for (const { id, type } of session.listInstruments()) {
      const acc = session.instrument(id);
      const pattern = acc?.pattern;
      let active = false;
      if (Array.isArray(pattern)) active = pattern.some(s => s?.gate);
      else if (pattern && typeof pattern === 'object') active = Object.values(pattern).some(v => Array.isArray(v) && v.some(s => s?.velocity > 0));
      const level = acc?.node?.getLevel?.() ?? 0;
      lines.push(`  ${id.padEnd(10)} ${type.padEnd(7)} ${active ? 'programmed' : 'empty'}${level ? `  level ${level > 0 ? '+' : ''}${level}dB` : ''}`);
    }
    lines.push('', `Types: ${Object.entries(INSTRUMENT_TYPES).map(([k, v]) => v.single ? `${k} (single)` : k).join(', ')}`);
    return lines.join('\n');
  },
};

registerTools(instrumentTools);
