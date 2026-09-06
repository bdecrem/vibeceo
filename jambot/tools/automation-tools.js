/**
 * Automation Tools
 *
 * Per-step parameter automation ("knob mashing") for any instrument.
 * Values are stored in producer units (same as tweak) and converted
 * to engine units at render time by each instrument node.
 *
 * Tools: automate, clear_automation, show_automation
 */

import { registerTools } from './index.js';
import {
  generateAutomation,
  getAutomationSummary,
  clearNodeAutomation,
} from '../core/automation.js';

const automationTools = {
  /**
   * Set per-step automation values for a parameter
   */
  automate: async (input, session) => {
    const { path, values, pattern, min, max, steps } = input;

    if (!path) {
      return 'Error: path is required (e.g., "jb01.ch.decay", "jb202.filterCutoff")';
    }

    // Either provide values directly or generate from pattern
    let automationValues = values;

    if (!automationValues && pattern) {
      if (min === undefined || max === undefined) {
        return 'Error: min and max required when using pattern';
      }
      automationValues = generateAutomation(pattern, min, max, steps || 16);
    }

    if (!automationValues || automationValues.length === 0) {
      return 'Error: values array or pattern required';
    }

    // Validate the path the same way tweak does: alias heads (drums.*, bass.*)
    // resolve to their node, a voice or param the node doesn't have is refused
    // instead of becoming a lane nothing ever reads.
    const check = session.params.checkPath(path);
    if (!check.ok) return check.error;
    if (check.mute) return `Error: ${path} can't be automated — automate the level instead`;
    if (check.resolved.nodeId.startsWith('fx.')) {
      return `Error: effect parameters can't be automated per step — only instrument parameters (e.g. "jb01.ch.decay")`;
    }

    // Store automation in ParamSystem (producer units, canonical path)
    session.automate(path, automationValues);
    const stored = session.params.canonicalPath(path);
    const [nodeId, ...rest] = stored.split('.');

    const activeSteps = automationValues.filter(v => v !== null && v !== undefined).length;
    return `${nodeId} ${rest.join('.')} automation set: ${activeSteps}/${automationValues.length} steps`;
  },

  /**
   * Clear automation for a parameter, instrument, or all
   */
  clear_automation: async (input, session) => {
    const { path } = input;

    if (!path) {
      // Clear ALL automation
      session.clearAutomation();
      return 'Cleared all automation';
    }

    // Lanes are stored under canonical ids ('jb01.kick.decay'), so resolve
    // aliases ('drums.kick.decay', 'drums') the way automate/tweak do. The raw
    // path is tried too for lanes older saves stored under an alias. Report
    // what was actually removed — "cleared" with the lane still there sent
    // the agent on to save a pattern it believed was clean.
    const canon = session.params.canonicalPath(path);
    const before = session.params.listAutomation().length;
    for (const p of new Set([path, canon])) {
      if (session.params.hasAutomation(p)) session.clearAutomation(p);   // exact lane
      clearNodeAutomation(session, p);                                   // every lane under an instrument/voice prefix
    }
    const removed = before - session.params.listAutomation().length;
    if (removed === 0) return `No automation found for "${path}"`;
    return removed === 1
      ? `Cleared automation on ${canon}`
      : `Cleared ${removed} automation lanes under ${canon}`;
  },

  /**
   * Show all active automation lanes
   */
  show_automation: async (input, session) => {
    const summary = getAutomationSummary(session);
    const nodes = Object.keys(summary);

    if (nodes.length === 0) {
      return 'No active automation';
    }

    const lines = ['AUTOMATION:'];
    for (const [node, params] of Object.entries(summary)) {
      for (const [param, values] of Object.entries(params)) {
        const activeSteps = values.filter(v => v !== null && v !== undefined).length;
        const viz = values.map(v => v !== null && v !== undefined ? '█' : '·').join('');
        lines.push(`  ${node}.${param}: ${viz} (${activeSteps}/${values.length} steps)`);
      }
    }
    return lines.join('\n');
  },
};

registerTools(automationTools);
