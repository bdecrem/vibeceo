/**
 * Shared Utilities for WEBTOYS Agents
 *
 * This module exports all shared utilities that can be used
 * across different agents to ensure consistency and reduce duplication.
 */

export { config, SharedConfig } from "./config.js";
export { logger, AgentLogger, createLogger } from "./logger.js";
export { DatabaseManager, createDatabaseManager } from "./database.js";

// Re-export types for convenience
export type { AgentConfig, DatabaseConfig, APIConfig } from "./config.js";
export type { LogLevel } from "./logger.js";
