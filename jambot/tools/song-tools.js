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

    if (instrument === 'sampler') {
      session.patterns.sampler[patternName] = {
        pattern: JSON.parse(JSON.stringify(session.samplerPattern)),
        params: JSON.parse(JSON.stringify(session.samplerParams)),
        channelInserts: getInsertsForInstrument(session, 'sampler'),
      };
      session.currentPattern.sampler = patternName;
      return `Saved sampler pattern "${patternName}"`;
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

    if (instrument === 'jt90') {
      if (!session.patterns.jt90) session.patterns.jt90 = {};
      session.patterns.jt90[patternName] = {
        pattern: JSON.parse(JSON.stringify(session.jt90Pattern || {})),
        params: session._nodes?.jt90 ? { ...session._nodes.jt90._params } : {},
        automation: getAutomationForInstrument(session, 'jt90'),
        channelInserts: getInsertsForInstrument(session, 'jt90'),
        swing: session._nodes?.jt90?.getSwing() || 0,
        accentLevel: session._nodes?.jt90?.getAccentLevel() || 1.0,
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

    if (instrument === 'sampler') {
      const saved = session.patterns.sampler[patternName];
      if (!saved) return `No sampler pattern "${patternName}" found`;
      session.samplerPattern = JSON.parse(JSON.stringify(saved.pattern));
      session.samplerParams = JSON.parse(JSON.stringify(saved.params));
      clearInsertsForInstrument(session, 'sampler');
      restoreInserts(session, saved.channelInserts);
      session.currentPattern.sampler = patternName;
      return `Loaded sampler pattern "${patternName}"`;
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

    if (instrument === 'jt90') {
      const saved = session.patterns.jt90?.[patternName];
      if (!saved) return `No jt90 pattern "${patternName}" found`;
      session.jt90Pattern = JSON.parse(JSON.stringify(saved.pattern));
      if (session._nodes?.jt90) {
        session._nodes.jt90.setPattern(session.jt90Pattern);
        if (saved.params) Object.assign(session._nodes.jt90._params, saved.params);
        if (saved.swing !== undefined) session._nodes.jt90.setSwing(saved.swing);
        if (saved.accentLevel !== undefined) session._nodes.jt90.setAccentLevel(saved.accentLevel);
      }
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
    return `Copied ${instrument} pattern "${from}" to "${to}"`;
  },

  /**
   * List all saved patterns per instrument
   */
  list_patterns: async (input, session, context) => {
    const lines = [];
    // Active instruments first
    for (const instrument of ['jb01', 'jb200', 'jb202', 'jt90', 'sampler']) {
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
    session.arrangement = input.sections.map(s => ({
      bars: s.bars,
      patterns: {
        jb01: s.jb01 || null,
        jb200: s.jb200 || null,
        jb202: s.jb202 || null,
        jt90: s.jt90 || null,
        sampler: s.sampler || null,
        // Dormant instruments (legacy support)
        drums: s.drums || null,
        bass: s.bass || null,
        lead: s.lead || null,
      }
    }));

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
    for (const instrument of ['jb01', 'jb200', 'jb202', 'jt90', 'sampler']) {
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
        if (section.patterns.jt90) parts.push(`jt90:${section.patterns.jt90}`);
        if (section.patterns.sampler) parts.push(`sampler:${section.patterns.sampler}`);
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
