/**
 * Automation Tools
 *
 * Unified automation that works on ANY parameter path.
 * Replaces drum-specific automate_drums.
 */

import { registerTools } from './index.js';
import {
  generateAutomation,
  getAutomationSummary,
  clearNodeAutomation,
} from '../core/automation.js';

const automationTools = {
  /**
   * Automate ANY parameter in the system
   *
   * Examples:
   *   automate({ path: 'drums.kick.decay', values: [50, 60, 70, 80, ...] })
   *   automate({ path: 'bass.cutoff', values: [1000, 2000, 3000, 4000, ...] })
   *   automate({ path: 'mixer.sends.reverb1.decay', pattern: 'triangle', min: 1, max: 4 })
   */
  automate: async (input, session, context) => {
    const { path, values, pattern, min, max, steps } = input;

    if (!path) {
      return 'Error: path is required (e.g., "drums.kick.decay", "bass.cutoff")';
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
    if (!session.params.nodes.has(nodeId)) {
      return `Error: Unknown node "${nodeId}". Available: ${session.listNodes().join(', ')}`;
    }

    // Set automation
    session.automate(path, automationValues);

    const preview = automationValues.slice(0, 4).map(v =>
      typeof v === 'number' ? v.toFixed(1) : v
    ).join(', ');

    return `Automated ${path}: [${preview}, ...] (${automationValues.length} steps)`;
  },

  // Note: clear_automation is registered in drum-tools.js
  // It uses session.drumAutomation format which works with current session

  /**
   * Show current automation
   */
  show_automation: async (input, session, context) => {
    const summary = getAutomationSummary(session);
    const nodes = Object.keys(summary);

    if (nodes.length === 0) {
      return 'No automation set. Use automate({ path, values }) to add.';
    }

    const lines = ['AUTOMATION:', ''];

    for (const [node, params] of Object.entries(summary)) {
      lines.push(`${node.toUpperCase()}:`);
      for (const [param, values] of Object.entries(params)) {
        const preview = values.slice(0, 4).map(v =>
          typeof v === 'number' ? v.toFixed(1) : v
        ).join(', ');
        lines.push(`  ${param}: [${preview}, ...] (${values.length} steps)`);
      }
      lines.push('');
    }

    return lines.join('\n');
  },

  // Note: automate_drums and clear_automation are registered in drum-tools.js
  // They use the session.drumAutomation format which works with the current session
};

registerTools(automationTools);
