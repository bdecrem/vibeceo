/**
 * Jambot Automation System
 *
 * Unified automation that works on ANY parameter path.
 * Automation is stored in the ParamSystem and applied during render.
 */

/**
 * Apply automation values to a session at a specific step
 * This updates the actual parameter values based on automation data
 *
 * @param {Object} session - Session with params (ParamSystem)
 * @param {number} step - Current step index (0-15 typically)
 * @param {Object} options - { patternLength }
 */
export function applyAutomationAtStep(session, step, options = {}) {
  const patternLength = options.patternLength || 16;
  const automationPaths = session.params.listAutomation();

  for (const path of automationPaths) {
    const values = session.params.getAutomation(path);
    if (!values || values.length === 0) continue;

    // Get value at this step (wrapping if needed)
    const wrappedStep = step % values.length;
    const value = values[wrappedStep];

    if (value !== undefined && value !== null) {
      session.params.set(path, value);
    }
  }
}

/**
 * Get all automation values for a specific step
 * Returns { path: value } for all automated parameters
 *
 * @param {Object} session - Session with params
 * @param {number} step - Step index
 * @returns {Object} { 'drums.kick.decay': 75, 'bass.cutoff': 2000, ... }
 */
export function getAutomationValuesAtStep(session, step) {
  const result = {};
  const automationPaths = session.params.listAutomation();

  for (const path of automationPaths) {
    const values = session.params.getAutomation(path);
    if (!values || values.length === 0) continue;

    const wrappedStep = step % values.length;
    result[path] = values[wrappedStep];
  }

  return result;
}

/**
 * Build automation summary for display
 *
 * @param {Object} session - Session with params
 * @returns {Object} Grouped by node: { drums: { 'kick.decay': [...], ... }, ... }
 */
export function getAutomationSummary(session) {
  const result = {};
  const automationPaths = session.params.listAutomation();

  for (const path of automationPaths) {
    const [node, ...rest] = path.split('.');
    const paramPath = rest.join('.');
    const values = session.params.getAutomation(path);

    if (!result[node]) result[node] = {};
    result[node][paramPath] = values;
  }

  return result;
}

/**
 * Clear all automation for a node
 *
 * @param {Object} session
 * @param {string} nodeId - e.g., 'drums', 'bass', 'mixer'
 */
export function clearNodeAutomation(session, nodeId) {
  const automationPaths = session.params.listAutomation();

  for (const path of automationPaths) {
    if (path.startsWith(nodeId + '.')) {
      session.params.clearAutomation(path);
    }
  }
}

/**
 * Generate automation values using various patterns
 *
 * @param {string} pattern - Pattern type: 'ramp', 'triangle', 'random', 'sine', 'square'
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @param {number} steps - Number of steps (default 16)
 * @returns {number[]}
 */
export function generateAutomation(pattern, min, max, steps = 16) {
  const range = max - min;
  const values = [];

  switch (pattern) {
    case 'ramp':
      // Linear ramp from min to max
      for (let i = 0; i < steps; i++) {
        values.push(min + (range * i) / (steps - 1));
      }
      break;

    case 'triangle':
      // Ramp up then down
      const mid = Math.floor(steps / 2);
      for (let i = 0; i < steps; i++) {
        if (i < mid) {
          values.push(min + (range * i) / mid);
        } else {
          values.push(max - (range * (i - mid)) / (steps - mid));
        }
      }
      break;

    case 'random':
      // Random values within range
      for (let i = 0; i < steps; i++) {
        values.push(min + Math.random() * range);
      }
      break;

    case 'sine':
      // Sine wave from min to max
      for (let i = 0; i < steps; i++) {
        const t = (i / steps) * Math.PI * 2;
        values.push(min + (range / 2) * (1 + Math.sin(t)));
      }
      break;

    case 'square':
      // Alternating min and max
      for (let i = 0; i < steps; i++) {
        values.push(i % 2 === 0 ? min : max);
      }
      break;

    default:
      // Fill with min value
      for (let i = 0; i < steps; i++) {
        values.push(min);
      }
  }

  return values;
}

/**
 * Interpolate between automation values for smooth rendering
 * Useful for parameters that need sub-step resolution
 *
 * @param {number[]} values - Automation values
 * @param {number} position - Fractional step position (e.g., 2.5 = halfway between step 2 and 3)
 * @returns {number}
 */
export function interpolateAutomation(values, position) {
  if (!values || values.length === 0) return undefined;

  const len = values.length;
  const wrapped = position % len;
  const floor = Math.floor(wrapped);
  const ceil = (floor + 1) % len;
  const frac = wrapped - floor;

  // Linear interpolation
  return values[floor] * (1 - frac) + values[ceil] * frac;
}
