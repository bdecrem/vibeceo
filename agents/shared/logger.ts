/**
 * Shared Logger for WEBTOYS Agents
 *
 * Provides consistent logging across all agents with timestamps,
 * agent identification, and configurable log levels.
 */

import { config } from "./config.js";

export type LogLevel = "debug" | "info" | "warn" | "error";

export class AgentLogger {
  private agentName: string;
  private logLevel: LogLevel;

  constructor(agentName?: string) {
    this.agentName = agentName || config.agent.name;
    this.logLevel = config.agent.logLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = ["debug", "info", "warn", "error"];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${
      this.agentName
    }] [${level.toUpperCase()}]`;

    if (data) {
      return `${prefix} ${message} ${JSON.stringify(data)}`;
    }
    return `${prefix} ${message}`;
  }

  public debug(message: string, data?: any): void {
    if (this.shouldLog("debug")) {
      console.log(this.formatMessage("debug", message, data));
    }
  }

  public info(message: string, data?: any): void {
    if (this.shouldLog("info")) {
      console.log(this.formatMessage("info", message, data));
    }
  }

  public warn(message: string, data?: any): void {
    if (this.shouldLog("warn")) {
      console.warn(this.formatMessage("warn", message, data));
    }
  }

  public error(message: string, error?: Error | any): void {
    if (this.shouldLog("error")) {
      const errorData =
        error instanceof Error
          ? { message: error.message, stack: error.stack }
          : error;
      console.error(this.formatMessage("error", message, errorData));
    }
  }

  public logAgentStart(): void {
    this.info(`Starting ${config.getAgentInfo()}`);
  }

  public logAgentStop(): void {
    this.info(`Stopping ${config.getAgentInfo()}`);
  }

  public logDatabaseOperation(
    operation: string,
    table: string,
    data?: any
  ): void {
    this.debug(`Database ${operation} on ${table}`, data);
  }

  public logAPIRequest(service: string, endpoint: string, data?: any): void {
    this.debug(`API request to ${service}:${endpoint}`, data);
  }

  public logAPIResponse(
    service: string,
    endpoint: string,
    status: number,
    data?: any
  ): void {
    this.debug(`API response from ${service}:${endpoint} (${status})`, data);
  }
}

// Create default logger instance
export const logger = new AgentLogger();

// Create logger factory for specific agents
export function createLogger(agentName: string): AgentLogger {
  return new AgentLogger(agentName);
}
