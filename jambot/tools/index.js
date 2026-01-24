/**
 * Jambot Tool Registry
 *
 * Central registry for all tool handlers. Tools are registered by category
 * and dispatched through a single entry point.
 */

// Tool handler registry - initialized immediately
const toolHandlers = new Map();
let initialized = false;

/**
 * Register a tool handler
 * @param {string} name - Tool name (e.g., "add_jb01")
 * @param {Function} handler - async (input, session, context) => string
 */
export function registerTool(name, handler) {
  if (toolHandlers.has(name)) {
    console.warn(`Tool "${name}" is being re-registered`);
  }
  toolHandlers.set(name, handler);
}

/**
 * Register multiple tools at once
 * @param {Object} tools - { toolName: handler, ... }
 */
export function registerTools(tools) {
  for (const [name, handler] of Object.entries(tools)) {
    registerTool(name, handler);
  }
}

/**
 * Initialize all tools (must be called before using executeTool)
 * Uses dynamic imports to avoid circular dependency issues
 */
export async function initializeTools() {
  if (initialized) return;

  // Dynamic imports ensure toolHandlers is initialized first
  await import('./session-tools.js');
  await import('./sampler-tools.js');
  await import('./jb200-tools.js');
  await import('./jb202-tools.js');
  await import('./jb01-tools.js');
  await import('./mixer-tools.js');
  await import('./song-tools.js');
  await import('./render-tools.js');
  await import('./generic-tools.js');
  await import('./analyze-tools.js');

  initialized = true;
}

/**
 * Execute a tool by name
 * @param {string} name - Tool name
 * @param {Object} input - Tool input parameters
 * @param {Object} session - Session state
 * @param {Object} context - Additional context (projectDir, etc.)
 * @returns {Promise<string>} - Tool result message
 */
export async function executeTool(name, input, session, context = {}) {
  // Auto-initialize if needed
  if (!initialized) {
    await initializeTools();
  }

  const handler = toolHandlers.get(name);

  if (!handler) {
    return `Unknown tool: ${name}`;
  }

  try {
    return await handler(input, session, context);
  } catch (error) {
    console.error(`Tool "${name}" error:`, error);
    return `Error in ${name}: ${error.message}`;
  }
}

/**
 * Check if a tool is registered
 * @param {string} name - Tool name
 * @returns {boolean}
 */
export function hasTool(name) {
  return toolHandlers.has(name);
}

/**
 * Get list of all registered tool names
 * @returns {string[]}
 */
export function getToolNames() {
  return Array.from(toolHandlers.keys());
}
