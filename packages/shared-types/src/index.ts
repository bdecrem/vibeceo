/**
 * Kochi Intelligence Platform - Shared Types
 *
 * Core TypeScript and Zod schemas for agents, sources, and pipelines.
 * Used by both sms-bot runtime and web builder.
 */

// Normalized items
export * from './normalized-item';

// Data sources
export * from './data-source';

// Pipeline steps
export * from './pipeline-step';

// Agent definition
export * from './agent-definition';

// User sources
export * from './user-sources';

// Runtime types
export interface RunContext {
  agentId: string;
  agentVersionId: string;
  userId?: string;
  userProfile?: Record<string, any>;
  triggerType: 'scheduled' | 'command' | 'manual' | 'preview';
  triggerData?: Record<string, any>;
  dryRun?: boolean;
}

export interface RunResult {
  success: boolean;
  agentRunId?: string;
  outputs: {
    sms?: string;
    reportUrl?: string;
    reportMarkdown?: string;
    audioUrl?: string;
  };
  metrics: {
    sourcesFetched: number;
    itemsProcessed: number;
    llmCallsMade: number;
    tokensUsed: number;
    durationMs: number;
  };
  errors?: Array<{
    step: string;
    message: string;
    stack?: string;
  }>;
}
