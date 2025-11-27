import { z } from 'zod';
import { DataSourceConfigSchema } from './data-source';
import { PipelineStepSchema } from './pipeline-step';

/**
 * Agent metadata and identity
 */
export const AgentMetadataSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  description: z.string().min(10).max(500),
  icon: z.string().optional(),
  category: z.enum([
    'research',
    'news',
    'finance',
    'crypto',
    'health',
    'technology',
    'recruiting',
    'education',
    'entertainment',
    'other',
  ]),
  tags: z.array(z.string()).max(10).default([]),
  version: z.string().default('1.0.0'),
});

/**
 * Agent triggers: when and how the agent runs
 */
export const AgentTriggersSchema = z.object({
  schedule: z.object({
    enabled: z.boolean().default(false),
    cron: z.string().optional(), // Cron expression
    timezone: z.string().default('America/Los_Angeles'),
  }).optional(),
  commands: z.array(z.object({
    keyword: z.string().regex(/^[A-Z0-9\s]+$/), // SMS command keyword
    description: z.string().optional(),
  })).min(1),
});

/**
 * User profile schema for personalization
 */
export const UserProfileSchema = z.object({
  fields: z.array(z.object({
    key: z.string(),
    label: z.string(),
    type: z.enum(['text', 'number', 'select', 'multiselect']),
    required: z.boolean().default(false),
    options: z.array(z.string()).optional(), // For select/multiselect
    defaultValue: z.any().optional(),
  })).optional(),
});

/**
 * Collation: how to combine results from multiple sources
 */
export const CollationConfigSchema = z.object({
  strategy: z.enum([
    'merge', // Merge all sources into one array
    'separate', // Keep sources separate in output
    'prioritize', // Prioritize first source, use others as fallback
  ]).default('merge'),
  maxTotalItems: z.number().int().min(1).max(100).default(20),
});

/**
 * Output configuration
 */
export const OutputConfigSchema = z.object({
  sms: z.object({
    enabled: z.boolean().default(true),
    template: z.string(), // Template ID or inline template
    maxLength: z.number().int().min(100).max(1600).default(1600),
  }),
  report: z.object({
    enabled: z.boolean().default(true),
    format: z.enum(['markdown', 'html', 'json']).default('markdown'),
    sections: z.array(z.object({
      title: z.string(),
      content: z.enum(['summary', 'items', 'custom']),
      template: z.string().optional(),
    })).optional(),
  }).optional(),
  audio: z.object({
    enabled: z.boolean().default(false),
    voice: z.string().optional(),
  }).optional(),
  email: z.object({
    enabled: z.boolean().default(false),
    to: z.array(z.string().email()),
    subject: z.string(),
    template: z.string(),
  }).optional(),
  webhook: z.object({
    enabled: z.boolean().default(false),
    url: z.string().url(),
    method: z.enum(['POST', 'PUT']).default('POST'),
    headers: z.record(z.string()).optional(),
  }).optional(),
  slack: z.object({
    enabled: z.boolean().default(false),
    channel: z.string(),
    webhookUrl: z.string().url(),
    template: z.string().optional(),
  }).optional(),
  discord: z.object({
    enabled: z.boolean().default(false),
    webhookUrl: z.string().url(),
    template: z.string().optional(),
  }).optional(),
  twitter: z.object({
    enabled: z.boolean().default(false),
    template: z.string(),
    maxLength: z.number().int().min(1).max(280).default(280),
  }).optional(),
  notification: z.object({
    enabled: z.boolean().default(false),
    title: z.string(),
    body: z.string(),
    deviceTokens: z.array(z.string()).optional(),
  }).optional(),
  database: z.object({
    enabled: z.boolean().default(false),
    connectionString: z.string(),
    table: z.string(),
    fieldMapping: z.record(z.string()).optional(),
  }).optional(),
  sheets: z.object({
    enabled: z.boolean().default(false),
    spreadsheetId: z.string(),
    sheetName: z.string(),
    appendMode: z.boolean().default(true),
  }).optional(),
  file: z.object({
    enabled: z.boolean().default(false),
    format: z.enum(['csv', 'json', 'markdown']).default('json'),
    filename: z.string().optional(),
  }).optional(),
});

/**
 * Safety and resource limits
 */
export const SafetyConfigSchema = z.object({
  maxSourcesPerRun: z.number().int().min(1).max(5).default(3),
  maxItemsPerSource: z.number().int().min(1).max(50).default(10),
  maxLLMCalls: z.number().int().min(1).max(20).default(10),
  maxTokensPerRun: z.number().int().min(1000).max(50000).default(10000),
  timeout: z.number().int().min(30).max(300).default(120), // seconds
});

/**
 * Complete Agent Definition
 */
export const AgentDefinitionSchema = z.object({
  metadata: AgentMetadataSchema,
  triggers: AgentTriggersSchema,
  userProfile: UserProfileSchema.optional(),
  sources: z.array(DataSourceConfigSchema).min(1).max(5),
  pipeline: z.array(PipelineStepSchema).min(1),
  collation: CollationConfigSchema,
  output: OutputConfigSchema,
  safety: SafetyConfigSchema.optional(),
});

export type AgentDefinition = z.infer<typeof AgentDefinitionSchema>;
export type AgentMetadata = z.infer<typeof AgentMetadataSchema>;
export type AgentTriggers = z.infer<typeof AgentTriggersSchema>;
export type UserProfile = z.infer<typeof UserProfileSchema>;
export type CollationConfig = z.infer<typeof CollationConfigSchema>;
export type OutputConfig = z.infer<typeof OutputConfigSchema>;
export type SafetyConfig = z.infer<typeof SafetyConfigSchema>;
