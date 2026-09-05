/**
 * Song Tools
 *
 * Tools for song mode: save_pattern, load_pattern, copy_pattern, list_patterns,
 * set_arrangement, clear_arrangement, show_arrangement
 */

import { registerTools } from './index.js';
import { clearNodeAutomation } from '../core/automation.js';

// JB01 voices
const JB01_VOICES = ['jb01', 'kick', 'snare', 'clap', 'ch', 'oh', 'lowtom', 'hitom', 'cymbal'];
// JT90 voices (user-facing names)
const JT90_VOICES = ['jt90', 'kick', 'snare', 'clap', 'rimshot', 'lowtom', 'midtom', 'hitom', 'ch', 'oh', 'crash', 'ride'];
// Legacy drums = jb01
const DRUM_VOICES = ['drums', 'kick', 'snare', 'clap', 'ch', 'oh', 'lowtom', 'hitom', 'cymbal'];

// Helper: get channel inserts for an instrument
function getInsertsForInstrument(session, inst) {
  const inserts = session.mixer?.channelInserts || {};
  // For jb01, include 'jb01' channel + all voice channels
  if (inst === 'jb01') {
    const result = {};
    if (inserts['jb01']) result['jb01'] = JSON.parse(JSON.stringify(inserts['jb01']));
    for (const v of JB01_VOICES) {
      if (inserts[v]) result[v] = JSON.parse(JSON.stringify(inserts[v]));
    }
    return Object.keys(result).length > 0 ? result : null;
  }
  // For jt90, include 'jt90' channel + all voice channels
  if (inst === 'jt90') {
    const result = {};
    for (const v of JT90_VOICES) {
      if (inserts[v]) result[v] = JSON.parse(JSON.stringify(inserts[v]));
    }
    return Object.keys(result).length > 0 ? result : null;
  }
  // For legacy drums, include 'drums' channel + all voice channels
  if (inst === 'drums') {
    const result = {};
    if (inserts['drums']) result['drums'] = JSON.parse(JSON.stringify(inserts['drums']));
    for (const v of DRUM_VOICES) {
      if (inserts[v]) result[v] = JSON.parse(JSON.stringify(inserts[v]));
    }
    return Object.keys(result).length > 0 ? result : null;
  }
  // For bass/lead/sampler/jb200, just the instrument channel
  if (inserts[inst]) return { [inst]: JSON.parse(JSON.stringify(inserts[inst])) };
  return null;
}

// Helper: restore channel inserts for an instrument
function restoreInserts(session, inserts) {
  if (!inserts) return;
  if (!session.mixer) session.mixer = { sends: {}, voiceRouting: {}, channelInserts: {}, masterInserts: [], masterVolume: 0.8 };
  if (!session.mixer.channelInserts) session.mixer.channelInserts = {};
  for (const [channel, insertList] of Object.entries(inserts)) {
    session.mixer.channelInserts[channel] = JSON.parse(JSON.stringify(insertList));
  }
}

// Helper: collect automation for an instrument from ParamSystem
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

// Helper: restore automation for an instrument into ParamSystem
function restoreAutomation(session, inst, automation) {
  if (!automation) return;
  for (const [path, values] of Object.entries(automation)) {
    session.params.automate(`${inst}.${path}`, [...values]);
  }
}

// Helper: clear channel inserts for an instrument
function clearInsertsForInstrument(session, inst) {
  if (!session.mixer?.channelInserts) return;
  if (inst === 'jb01') {
    for (const v of JB01_VOICES) delete session.mixer.channelInserts[v];
  } else if (inst === 'jt90') {
    for (const v of JT90_VOICES) delete session.mixer.channelInserts[v];
  } else if (inst === 'drums') {
    for (const v of DRUM_VOICES) delete session.mixer.channelInserts[v];
  } else {
    delete session.mixer.channelInserts[inst];
  }
}

const songTools = {
  /**
   * Save current working pattern to a named slot
   */
  save_pattern: async (input, session, context) => {
    const { instrument, name: patternName } = input;

    // Any instrument instance (canonical or added) with a pattern/params
    // accessor — one code path for jb01/jb202/jt10/jt30/jt90 and every
    // extra instance ('jb202-2'). jbs/jp9000 keep their own branches below.
    const acc = session.instrument?.(instrument);
    if (acc && acc.kind !== 'sampler' && acc.kind !== 'modular') {
      if (!session.patterns[instrument]) session.patterns[instrument] = {};
      const entry = {
        pattern: JSON.parse(JSON.stringify(acc.pattern || (acc.kind === 'drums' ? {} : []))),
        params: JSON.parse(JSON.stringify(acc.params || {})),
        automation: getAutomationForInstrument(session, instrument),
        channelInserts: getInsertsForInstrument(session, instrument),
      };
      if (typeof acc.node.getSwing === 'function') entry.swing = acc.node.getSwing() || 0;
      if (typeof acc.node.getAccentLevel === 'function') entry.accentLevel = acc.node.getAccentLevel() ?? 1.0;
      session.patterns[instrument][patternName] = entry;
      if (!session.currentPattern) session.currentPattern = {};
      session.currentPattern[instrument] = patternName;
      return `Saved ${instrument} pattern "${patternName}"`;
    }

    if (instrument === 'drums') {
      session.patterns.drums[patternName] = {
        pattern: JSON.parse(JSON.stringify(session.drumPattern)),
        params: JSON.parse(JSON.stringify(session.drumParams)),
        automation: JSON.parse(JSON.stringify(session.drumAutomation)),
        flam: session.drumFlam,
        length: session.drumPatternLength,
        scale: session.drumScale,
        accent: session.drumGlobalAccent,
        engines: JSON.parse(JSON.stringify(session.drumVoiceEngines)),
        useSample: JSON.parse(JSON.stringify(session.drumUseSample)),
        channelInserts: getInsertsForInstrument(session, 'drums'),
      };
      session.currentPattern.drums = patternName;
      return `Saved drums pattern "${patternName}"`;
    }

    if (instrument === 'bass') {
      session.patterns.bass[patternName] = {
        pattern: JSON.parse(JSON.stringify(session.bassPattern)),
        params: JSON.parse(JSON.stringify(session.bassParams)),
        channelInserts: getInsertsForInstrument(session, 'bass'),
      };
      session.currentPattern.bass = patternName;
      return `Saved bass pattern "${patternName}"`;
    }

    if (instrument === 'lead') {
      session.patterns.lead[patternName] = {
        pattern: JSON.parse(JSON.stringify(session.leadPattern)),
        params: JSON.parse(JSON.stringify(session.leadParams)),
        arp: JSON.parse(JSON.stringify(session.leadArp)),
        channelInserts: getInsertsForInstrument(session, 'lead'),
      };
      session.currentPattern.lead = patternName;
      return `Saved lead pattern "${patternName}"`;
    }

    if (instrument === 'jbs' || instrument === 'sampler') {
      if (!session.patterns.jbs) session.patterns.jbs = {};
      session.patterns.jbs[patternName] = {
        pattern: JSON.parse(JSON.stringify(session.jbsPattern)),
        params: JSON.parse(JSON.stringify(session.jbsParams)),
        channelInserts: getInsertsForInstrument(session, 'jbs'),
      };
      session.currentPattern.jbs = patternName;
      return `Saved jbs pattern "${patternName}"`;
    }

    if (instrument === 'jb01') {
      if (!session.patterns.jb01) session.patterns.jb01 = {};
      session.patterns.jb01[patternName] = {
        pattern: JSON.parse(JSON.stringify(session.jb01Pattern || {})),
        params: JSON.parse(JSON.stringify(session.jb01Params || {})),
        automation: getAutomationForInstrument(session, 'jb01'),
        channelInserts: getInsertsForInstrument(session, 'jb01'),
      };
      if (!session.currentPattern) session.currentPattern = {};
      session.currentPattern.jb01 = patternName;
      return `Saved jb01 pattern "${patternName}"`;
    }

    if (instrument === 'jb200') {
      session.patterns.jb200[patternName] = {
        pattern: JSON.parse(JSON.stringify(session.jb200Pattern)),
        params: JSON.parse(JSON.stringify(session.jb200Params)),
        channelInserts: getInsertsForInstrument(session, 'jb200'),
      };
      session.currentPattern.jb200 = patternName;
      return `Saved jb200 pattern "${patternName}"`;
    }

    if (instrument === 'jb202') {
      if (!session.patterns.jb202) session.patterns.jb202 = {};
      session.patterns.jb202[patternName] = {
        pattern: JSON.parse(JSON.stringify(session.jb202Pattern || [])),
        params: JSON.parse(JSON.stringify(session.jb202Params || {})),
        automation: getAutomationForInstrument(session, 'jb202'),
        channelInserts: getInsertsForInstrument(session, 'jb202'),
      };
      if (!session.currentPattern) session.currentPattern = {};
      session.currentPattern.jb202 = patternName;
      return `Saved jb202 pattern "${patternName}"`;
    }

    if (instrument === 'jt10') {
      if (!session.patterns.jt10) session.patterns.jt10 = {};
      session.patterns.jt10[patternName] = {
        pattern: JSON.parse(JSON.stringify(session.jt10Pattern || [])),
        params: JSON.parse(JSON.stringify(session.jt10Params || {})),
        automation: getAutomationForInstrument(session, 'jt10'),
        channelInserts: getInsertsForInstrument(session, 'jt10'),
      };
      if (!session.currentPattern) session.currentPattern = {};
      session.currentPattern.jt10 = patternName;
      return `Saved jt10 pattern "${patternName}"`;
    }

    if (instrument === 'jt30') {
      if (!session.patterns.jt30) session.patterns.jt30 = {};
      session.patterns.jt30[patternName] = {
        pattern: JSON.parse(JSON.stringify(session.jt30Pattern || [])),
        params: JSON.parse(JSON.stringify(session.jt30Params || {})),
        automation: getAutomationForInstrument(session, 'jt30'),
        channelInserts: getInsertsForInstrument(session, 'jt30'),
      };
      if (!session.currentPattern) session.currentPattern = {};
      session.currentPattern.jt30 = patternName;
      return `Saved jt30 pattern "${patternName}"`;
    }

    if (instrument === 'jt90') {
      if (!session.patterns.jt90) session.patterns.jt90 = {};
      session.patterns.jt90[patternName] = {
        pattern: JSON.parse(JSON.stringify(session.jt90Pattern || {})),
        params: JSON.parse(JSON.stringify(session.jt90Params || {})),
        automation: getAutomationForInstrument(session, 'jt90'),
        channelInserts: getInsertsForInstrument(session, 'jt90'),
        swing: session.jt90Swing || 0,
        accentLevel: session.jt90AccentLevel || 1.0,
      };
      if (!session.currentPattern) session.currentPattern = {};
      session.currentPattern.jt90 = patternName;
      return `Saved jt90 pattern "${patternName}"`;
    }

    return `Unknown instrument: ${instrument}`;
  },

  /**
   * Load a saved pattern into current working pattern
   */
  load_pattern: async (input, session, context) => {
    const { instrument, name: patternName } = input;

    const acc = session.instrument?.(instrument);
    if (acc && acc.kind !== 'sampler' && acc.kind !== 'modular') {
      const saved = session.patterns[instrument]?.[patternName];
      if (!saved) {
        const have = Object.keys(session.patterns[instrument] || {});
        return `No ${instrument} pattern "${patternName}" found${have.length ? ` (saved: ${have.join(', ')})` : ''}`;
      }
      acc.pattern = JSON.parse(JSON.stringify(saved.pattern));
      if (saved.params) acc.params = JSON.parse(JSON.stringify(saved.params));
      if (saved.swing !== undefined && typeof acc.node.setSwing === 'function') acc.node.setSwing(saved.swing);
      if (saved.accentLevel !== undefined && typeof acc.node.setAccentLevel === 'function') acc.node.setAccentLevel(saved.accentLevel);
      clearNodeAutomation(session, instrument);
      restoreAutomation(session, instrument, saved.automation);
      clearInsertsForInstrument(session, instrument);
      restoreInserts(session, saved.channelInserts);
      if (!session.currentPattern) session.currentPattern = {};
      session.currentPattern[instrument] = patternName;
      return `Loaded ${instrument} pattern "${patternName}"`;
    }

    if (instrument === 'drums') {
      const saved = session.patterns.drums[patternName];
      if (!saved) return `No drums pattern "${patternName}" found`;
      session.drumPattern = JSON.parse(JSON.stringify(saved.pattern));
      session.drumParams = JSON.parse(JSON.stringify(saved.params));
      session.drumAutomation = JSON.parse(JSON.stringify(saved.automation || {}));
      session.drumFlam = saved.flam || 0;
      session.drumPatternLength = saved.length || 16;
      session.drumScale = saved.scale || '16th';
      session.drumGlobalAccent = saved.accent || 1;
      session.drumVoiceEngines = JSON.parse(JSON.stringify(saved.engines || {}));
      session.drumUseSample = JSON.parse(JSON.stringify(saved.useSample || {}));
      clearInsertsForInstrument(session, 'drums');
      restoreInserts(session, saved.channelInserts);
      session.currentPattern.drums = patternName;
      return `Loaded drums pattern "${patternName}"`;
    }

    if (instrument === 'bass') {
      const saved = session.patterns.bass[patternName];
      if (!saved) return `No bass pattern "${patternName}" found`;
      session.bassPattern = JSON.parse(JSON.stringify(saved.pattern));
      session.bassParams = JSON.parse(JSON.stringify(saved.params));
      clearInsertsForInstrument(session, 'bass');
      restoreInserts(session, saved.channelInserts);
      session.currentPattern.bass = patternName;
      return `Loaded bass pattern "${patternName}"`;
    }

    if (instrument === 'lead') {
      const saved = session.patterns.lead[patternName];
      if (!saved) return `No lead pattern "${patternName}" found`;
      session.leadPattern = JSON.parse(JSON.stringify(saved.pattern));
      session.leadParams = JSON.parse(JSON.stringify(saved.params));
      session.leadArp = JSON.parse(JSON.stringify(saved.arp || { mode: 'off', octaves: 1, hold: false }));
      clearInsertsForInstrument(session, 'lead');
      restoreInserts(session, saved.channelInserts);
      session.currentPattern.lead = patternName;
      return `Loaded lead pattern "${patternName}"`;
    }

    if (instrument === 'jbs' || instrument === 'sampler') {
      const saved = session.patterns.jbs?.[patternName];
      if (!saved) return `No jbs pattern "${patternName}" found`;
      session.jbsPattern = JSON.parse(JSON.stringify(saved.pattern));
      session.jbsParams = JSON.parse(JSON.stringify(saved.params));
      clearInsertsForInstrument(session, 'jbs');
      restoreInserts(session, saved.channelInserts);
      session.currentPattern.jbs = patternName;
      return `Loaded jbs pattern "${patternName}"`;
    }

    if (instrument === 'jb01') {
      const saved = session.patterns.jb01?.[patternName];
      if (!saved) return `No jb01 pattern "${patternName}" found`;
      session.jb01Pattern = JSON.parse(JSON.stringify(saved.pattern));
      session.jb01Params = JSON.parse(JSON.stringify(saved.params));
      clearNodeAutomation(session, 'jb01');
      restoreAutomation(session, 'jb01', saved.automation);
      clearInsertsForInstrument(session, 'jb01');
      restoreInserts(session, saved.channelInserts);
      if (!session.currentPattern) session.currentPattern = {};
      session.currentPattern.jb01 = patternName;
      return `Loaded jb01 pattern "${patternName}"`;
    }

    if (instrument === 'jb200') {
      const saved = session.patterns.jb200[patternName];
      if (!saved) return `No jb200 pattern "${patternName}" found`;
      session.jb200Pattern = JSON.parse(JSON.stringify(saved.pattern));
      session.jb200Params = JSON.parse(JSON.stringify(saved.params));
      clearInsertsForInstrument(session, 'jb200');
      restoreInserts(session, saved.channelInserts);
      session.currentPattern.jb200 = patternName;
      return `Loaded jb200 pattern "${patternName}"`;
    }

    if (instrument === 'jb202') {
      const saved = session.patterns.jb202?.[patternName];
      if (!saved) return `No jb202 pattern "${patternName}" found`;
      session.jb202Pattern = JSON.parse(JSON.stringify(saved.pattern));
      session.jb202Params = JSON.parse(JSON.stringify(saved.params));
      clearNodeAutomation(session, 'jb202');
      restoreAutomation(session, 'jb202', saved.automation);
      clearInsertsForInstrument(session, 'jb202');
      restoreInserts(session, saved.channelInserts);
      if (!session.currentPattern) session.currentPattern = {};
      session.currentPattern.jb202 = patternName;
      return `Loaded jb202 pattern "${patternName}"`;
    }

    if (instrument === 'jt10') {
      const saved = session.patterns.jt10?.[patternName];
      if (!saved) return `No jt10 pattern "${patternName}" found`;
      session.jt10Pattern = JSON.parse(JSON.stringify(saved.pattern));
      if (saved.params) session.jt10Params = JSON.parse(JSON.stringify(saved.params));
      clearNodeAutomation(session, 'jt10');
      restoreAutomation(session, 'jt10', saved.automation);
      clearInsertsForInstrument(session, 'jt10');
      restoreInserts(session, saved.channelInserts);
      if (!session.currentPattern) session.currentPattern = {};
      session.currentPattern.jt10 = patternName;
      return `Loaded jt10 pattern "${patternName}"`;
    }

    if (instrument === 'jt30') {
      const saved = session.patterns.jt30?.[patternName];
      if (!saved) return `No jt30 pattern "${patternName}" found`;
      session.jt30Pattern = JSON.parse(JSON.stringify(saved.pattern));
      if (saved.params) session.jt30Params = JSON.parse(JSON.stringify(saved.params));
      clearNodeAutomation(session, 'jt30');
      restoreAutomation(session, 'jt30', saved.automation);
      clearInsertsForInstrument(session, 'jt30');
      restoreInserts(session, saved.channelInserts);
      if (!session.currentPattern) session.currentPattern = {};
      session.currentPattern.jt30 = patternName;
      return `Loaded jt30 pattern "${patternName}"`;
    }

    if (instrument === 'jt90') {
      const saved = session.patterns.jt90?.[patternName];
      if (!saved) return `No jt90 pattern "${patternName}" found`;
      session.jt90Pattern = JSON.parse(JSON.stringify(saved.pattern));
      if (saved.params) session.jt90Params = JSON.parse(JSON.stringify(saved.params));
      if (saved.swing !== undefined) session.jt90Swing = saved.swing;
      if (saved.accentLevel !== undefined) session.jt90AccentLevel = saved.accentLevel;
      clearNodeAutomation(session, 'jt90');
      restoreAutomation(session, 'jt90', saved.automation);
      clearInsertsForInstrument(session, 'jt90');
      restoreInserts(session, saved.channelInserts);
      if (!session.currentPattern) session.currentPattern = {};
      session.currentPattern.jt90 = patternName;
      return `Loaded jt90 pattern "${patternName}"`;
    }

    return `Unknown instrument: ${instrument}`;
  },

  /**
   * Copy a pattern to a new name (for variations)
   */
  copy_pattern: async (input, session, context) => {
    const { instrument, from, to } = input;
    const patterns = session.patterns[instrument];
    if (!patterns) return `Unknown instrument: ${instrument}`;
    if (!patterns[from]) return `No ${instrument} pattern "${from}" found`;

    patterns[to] = JSON.parse(JSON.stringify(patterns[from]));
    // Load the copy into the live node so subsequent tweaks apply to it
    await songTools.load_pattern({ instrument, name: to }, session, context);
    return `Copied ${instrument} pattern "${from}" to "${to}" (now active)`;
  },

  /**
   * List all saved patterns per instrument
   */
  list_patterns: async (input, session, context) => {
    const lines = [];
    // Active instruments first
    const knownIds = (session.listInstruments?.() || []).map(i => i.id);
    for (const instrument of [...new Set([...knownIds, 'jb200'])]) {
      const patterns = session.patterns?.[instrument] || {};
      const names = Object.keys(patterns);
      const current = session.currentPattern?.[instrument];
      if (names.length > 0) {
        const list = names.map(n => n === current ? `[${n}]` : n).join(', ');
        lines.push(`${instrument}: ${list}`);
      } else {
        lines.push(`${instrument}: (none saved)`);
      }
    }
    // Dormant instruments (only show if they have patterns)
    for (const instrument of ['drums', 'bass', 'lead']) {
      const patterns = session.patterns?.[instrument] || {};
      const names = Object.keys(patterns);
      if (names.length > 0) {
        const current = session.currentPattern?.[instrument];
        const list = names.map(n => n === current ? `[${n}]` : n).join(', ');
        lines.push(`${instrument}: ${list}`);
      }
    }
    return lines.join('\n');
  },

  /**
   * Set the song arrangement (sections with bar counts and pattern assignments)
   */
  set_arrangement: async (input, session, context) => {
    // Any key other than `bars` names an instrument instance (jb01, jt90,
    // jb202-2, ...) and the saved pattern it plays in that section.
    const unknown = [];
    const next = input.sections.map(sec => {
      const patterns = {};
      for (const [key, value] of Object.entries(sec)) {
        if (key === 'bars' || value === undefined || value === null) continue;
        const id = key === 'sampler' ? 'jbs' : key;
        const known = session.instrument?.(id) || ['jb200', 'drums', 'bass', 'lead', 'jbs', 'jp9000'].includes(id);
        if (!known && !unknown.includes(id)) unknown.push(id);
        patterns[id] = value;
      }
      return { bars: sec.bars, patterns };
    });
    if (unknown.length) {
      const ids = (session.listInstruments?.() || []).map(i => i.id).join(', ');
      return `Error: unknown instrument(s) in arrangement: ${unknown.join(', ')}. Instruments: ${ids}. Arrangement unchanged.`;
    }
    session.arrangement = next;

    const totalBars = session.arrangement.reduce((sum, s) => sum + s.bars, 0);
    const sectionCount = session.arrangement.length;
    return `Arrangement set: ${sectionCount} sections, ${totalBars} bars total`;
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

    // Show patterns (active instruments first)
    lines.push('PATTERNS:');
    for (const instrument of ['jb01', 'jb200', 'jb202', 'jt10', 'jt30', 'jt90', 'jbs']) {
      const patterns = session.patterns?.[instrument] || {};
      const names = Object.keys(patterns);
      if (names.length > 0) {
        lines.push(`  ${instrument}: ${names.join(', ')}`);
      }
    }
    // Dormant instruments (only show if they have patterns)
    for (const instrument of ['drums', 'bass', 'lead']) {
      const patterns = session.patterns?.[instrument] || {};
      const names = Object.keys(patterns);
      if (names.length > 0) {
        lines.push(`  ${instrument}: ${names.join(', ')}`);
      }
    }

    // Show arrangement
    if (session.arrangement && session.arrangement.length > 0) {
      lines.push('\nARRANGEMENT:');
      session.arrangement.forEach((section, i) => {
        const parts = [];
        if (section.patterns.jb01) parts.push(`jb01:${section.patterns.jb01}`);
        if (section.patterns.jb200) parts.push(`jb200:${section.patterns.jb200}`);
        if (section.patterns.jb202) parts.push(`jb202:${section.patterns.jb202}`);
        if (section.patterns.jt10) parts.push(`jt10:${section.patterns.jt10}`);
        if (section.patterns.jt30) parts.push(`jt30:${section.patterns.jt30}`);
        if (section.patterns.jt90) parts.push(`jt90:${section.patterns.jt90}`);
        if (section.patterns.jbs) parts.push(`jbs:${section.patterns.jbs}`);
        if (section.patterns.drums) parts.push(`drums:${section.patterns.drums}`);
        if (section.patterns.bass) parts.push(`bass:${section.patterns.bass}`);
        if (section.patterns.lead) parts.push(`lead:${section.patterns.lead}`);
        lines.push(`  ${i + 1}. ${section.bars} bars — ${parts.join(', ') || '(silent)'}`);
      });
      const totalBars = session.arrangement.reduce((sum, s) => sum + s.bars, 0);
      lines.push(`\nTotal: ${totalBars} bars`);
    } else {
      lines.push('\nARRANGEMENT: (not set - single pattern mode)');
    }

    return lines.join('\n');
  },
};

registerTools(songTools);
