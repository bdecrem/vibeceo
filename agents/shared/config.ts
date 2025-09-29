/**
 * Shared Configuration for WEBTOYS Agents
 *
 * This file provides common configuration utilities for all agents
 * to ensure consistency and reduce duplication.
 */

export interface AgentConfig {
  name: string;
  version: string;
  description: string;
  enabled: boolean;
  logLevel: "debug" | "info" | "warn" | "error";
}

export interface DatabaseConfig {
  url: string;
  serviceKey: string;
  anonKey: string;
}

export interface APIConfig {
  openai: {
    apiKey: string;
    model: string;
    maxTokens: number;
  };
  github?: {
    token: string;
    owner: string;
    repo: string;
  };
}

export class SharedConfig {
  private static instance: SharedConfig;

  public readonly agent: AgentConfig;
  public readonly database: DatabaseConfig;
  public readonly api: APIConfig;

  private constructor() {
    this.agent = {
      name: process.env.AGENT_NAME || "unknown-agent",
      version: process.env.AGENT_VERSION || "1.0.0",
      description: process.env.AGENT_DESCRIPTION || "WEBTOYS Agent",
      enabled: process.env.AGENT_ENABLED !== "false",
      logLevel: (process.env.LOG_LEVEL as any) || "info",
    };

    this.database = {
      url: process.env.SUPABASE_URL || "",
      serviceKey: process.env.SUPABASE_SERVICE_KEY || "",
      anonKey: process.env.SUPABASE_ANON_KEY || "",
    };

    this.api = {
      openai: {
        apiKey: process.env.OPENAI_API_KEY || "",
        model: process.env.OPENAI_MODEL || "gpt-4o",
        maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || "1000"),
      },
      github: process.env.GITHUB_TOKEN
        ? {
            token: process.env.GITHUB_TOKEN,
            owner: process.env.GITHUB_OWNER || "",
            repo: process.env.GITHUB_REPO || "",
          }
        : undefined,
    };
  }

  public static getInstance(): SharedConfig {
    if (!SharedConfig.instance) {
      SharedConfig.instance = new SharedConfig();
    }
    return SharedConfig.instance;
  }

  public validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.database.url) errors.push("SUPABASE_URL is required");
    if (!this.database.serviceKey)
      errors.push("SUPABASE_SERVICE_KEY is required");
    if (!this.api.openai.apiKey) errors.push("OPENAI_API_KEY is required");

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  public getAgentInfo(): string {
    return `${this.agent.name} v${this.agent.version} - ${this.agent.description}`;
  }
}

export const config = SharedConfig.getInstance();
