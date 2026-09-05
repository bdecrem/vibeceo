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
 * Default tool modules, as import thunks. Each module registers its own
 * handlers on import. jb200-tools.js is retired: the JB200 node is no longer
 * registered in the session, so its tools reported success while producing
 * no audio or crashing. File left on disk; simply not loaded.
 */
export const DEFAULT_TOOL_MODULES = [
  () => import('./session-tools.js'),
  () => import('./jbs-tools.js'),
  () => import('./jb202-tools.js'),
  () => import('./jb01-tools.js'),
  () => import('./mixer-tools.js'),
  () => import('./song-tools.js'),
  () => import('./render-tools.js'),
  () => import('./generic-tools.js'),
  () => import('./analyze-tools.js'),
  () => import('./jp9000-tools.js'),
  () => import('./jt-tools.js'),
  () => import('./automation-tools.js'),
  () => import('./routing-tools.js'),
  () => import('./instrument-tools.js'),
];

/**
 * Initialize tools (must be called before using executeTool).
 * Uses dynamic imports to avoid circular dependency issues.
 *
 * @param {Array<() => Promise>} [modules] - Which tool modules to load.
 *   Defaults to everything. A browser bundle passes only the modules that
 *   don't need the file system / sox, and registers its own `render`.
 */
export async function initializeTools(modules = DEFAULT_TOOL_MODULES) {
  if (initialized) return;

  for (const load of modules) {
    await load();
  }

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
