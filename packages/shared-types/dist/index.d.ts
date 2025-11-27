/**
 * Kochi Intelligence Platform - Shared Types
 *
 * Core TypeScript and Zod schemas for agents, sources, and pipelines.
 * Used by both sms-bot runtime and web builder.
 */
export * from './normalized-item';
export * from './data-source';
export * from './pipeline-step';
export * from './agent-definition';
export * from './user-sources';
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
