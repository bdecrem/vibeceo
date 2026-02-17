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

    // Validate the path exists
    const [nodeId] = path.split('.');
    if (!session._nodes[nodeId]) {
      return `Error: unknown instrument "${nodeId}"`;
    }

    // Store automation in ParamSystem (producer units, full path)
    session.automate(path, automationValues);

    const activeSteps = automationValues.filter(v => v !== null && v !== undefined).length;
    const paramName = path.split('.').slice(1).join('.');
    return `${nodeId} ${paramName} automation set: ${activeSteps}/${automationValues.length} steps`;
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

    // Check if it's an exact automation path
    if (session.params.hasAutomation(path)) {
      session.clearAutomation(path);
      return `Cleared automation on ${path}`;
    }

    // Check if it's an instrument prefix — clear all automation for that instrument
    clearNodeAutomation(session, path);
    const remaining = session.params.listAutomation().filter(p => p.startsWith(path + '.'));
    if (remaining.length === 0) {
      return `Cleared all automation for ${path}`;
    }
    return `No automation found for "${path}"`;
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
