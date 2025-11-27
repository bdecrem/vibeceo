"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentDefinitionSchema = exports.SafetyConfigSchema = exports.OutputConfigSchema = exports.CollationConfigSchema = exports.UserProfileSchema = exports.AgentTriggersSchema = exports.AgentMetadataSchema = void 0;
const zod_1 = require("zod");
const data_source_1 = require("./data-source");
const pipeline_step_1 = require("./pipeline-step");
/**
 * Agent metadata and identity
 */
exports.AgentMetadataSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100),
    slug: zod_1.z.string().regex(/^[a-z0-9-]+$/),
    description: zod_1.z.string().min(10).max(500),
    icon: zod_1.z.string().optional(),
    category: zod_1.z.enum([
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
    tags: zod_1.z.array(zod_1.z.string()).max(10).default([]),
    version: zod_1.z.string().default('1.0.0'),
});
/**
 * Agent triggers: when and how the agent runs
 */
exports.AgentTriggersSchema = zod_1.z.object({
    schedule: zod_1.z.object({
        enabled: zod_1.z.boolean().default(false),
        cron: zod_1.z.string().optional(), // Cron expression
        timezone: zod_1.z.string().default('America/Los_Angeles'),
    }).optional(),
    commands: zod_1.z.array(zod_1.z.object({
        keyword: zod_1.z.string().regex(/^[A-Z0-9\s]+$/), // SMS command keyword
        description: zod_1.z.string().optional(),
    })).min(1),
});
/**
 * User profile schema for personalization
 */
exports.UserProfileSchema = zod_1.z.object({
    fields: zod_1.z.array(zod_1.z.object({
        key: zod_1.z.string(),
        label: zod_1.z.string(),
        type: zod_1.z.enum(['text', 'number', 'select', 'multiselect']),
        required: zod_1.z.boolean().default(false),
        options: zod_1.z.array(zod_1.z.string()).optional(), // For select/multiselect
        defaultValue: zod_1.z.any().optional(),
    })).optional(),
});
/**
 * Collation: how to combine results from multiple sources
 */
exports.CollationConfigSchema = zod_1.z.object({
    strategy: zod_1.z.enum([
        'merge', // Merge all sources into one array
        'separate', // Keep sources separate in output
        'prioritize', // Prioritize first source, use others as fallback
    ]).default('merge'),
    maxTotalItems: zod_1.z.number().int().min(1).max(100).default(20),
});
/**
 * Output configuration
 */
exports.OutputConfigSchema = zod_1.z.object({
    sms: zod_1.z.object({
        enabled: zod_1.z.boolean().default(true),
        template: zod_1.z.string(), // Template ID or inline template
        maxLength: zod_1.z.number().int().min(100).max(1600).default(1600),
    }),
    report: zod_1.z.object({
        enabled: zod_1.z.boolean().default(true),
        format: zod_1.z.enum(['markdown', 'html', 'json']).default('markdown'),
        sections: zod_1.z.array(zod_1.z.object({
            title: zod_1.z.string(),
            content: zod_1.z.enum(['summary', 'items', 'custom']),
            template: zod_1.z.string().optional(),
        })).optional(),
    }).optional(),
    audio: zod_1.z.object({
        enabled: zod_1.z.boolean().default(false),
        voice: zod_1.z.string().optional(),
    }).optional(),
    email: zod_1.z.object({
        enabled: zod_1.z.boolean().default(false),
        to: zod_1.z.array(zod_1.z.string().email()),
        subject: zod_1.z.string(),
        template: zod_1.z.string(),
    }).optional(),
    webhook: zod_1.z.object({
        enabled: zod_1.z.boolean().default(false),
        url: zod_1.z.string().url(),
        method: zod_1.z.enum(['POST', 'PUT']).default('POST'),
        headers: zod_1.z.record(zod_1.z.string()).optional(),
    }).optional(),
    slack: zod_1.z.object({
        enabled: zod_1.z.boolean().default(false),
        channel: zod_1.z.string(),
        webhookUrl: zod_1.z.string().url(),
        template: zod_1.z.string().optional(),
    }).optional(),
    discord: zod_1.z.object({
        enabled: zod_1.z.boolean().default(false),
        webhookUrl: zod_1.z.string().url(),
        template: zod_1.z.string().optional(),
    }).optional(),
    twitter: zod_1.z.object({
        enabled: zod_1.z.boolean().default(false),
        template: zod_1.z.string(),
        maxLength: zod_1.z.number().int().min(1).max(280).default(280),
    }).optional(),
    notification: zod_1.z.object({
        enabled: zod_1.z.boolean().default(false),
        title: zod_1.z.string(),
        body: zod_1.z.string(),
        deviceTokens: zod_1.z.array(zod_1.z.string()).optional(),
    }).optional(),
    database: zod_1.z.object({
        enabled: zod_1.z.boolean().default(false),
        connectionString: zod_1.z.string(),
        table: zod_1.z.string(),
        fieldMapping: zod_1.z.record(zod_1.z.string()).optional(),
    }).optional(),
    sheets: zod_1.z.object({
        enabled: zod_1.z.boolean().default(false),
        spreadsheetId: zod_1.z.string(),
        sheetName: zod_1.z.string(),
        appendMode: zod_1.z.boolean().default(true),
    }).optional(),
    file: zod_1.z.object({
        enabled: zod_1.z.boolean().default(false),
        format: zod_1.z.enum(['csv', 'json', 'markdown']).default('json'),
        filename: zod_1.z.string().optional(),
    }).optional(),
});
/**
 * Safety and resource limits
 */
exports.SafetyConfigSchema = zod_1.z.object({
    maxSourcesPerRun: zod_1.z.number().int().min(1).max(5).default(3),
    maxItemsPerSource: zod_1.z.number().int().min(1).max(50).default(10),
    maxLLMCalls: zod_1.z.number().int().min(1).max(20).default(10),
    maxTokensPerRun: zod_1.z.number().int().min(1000).max(50000).default(10000),
    timeout: zod_1.z.number().int().min(30).max(300).default(120), // seconds
});
/**
 * Complete Agent Definition
 */
exports.AgentDefinitionSchema = zod_1.z.object({
    metadata: exports.AgentMetadataSchema,
    triggers: exports.AgentTriggersSchema,
    userProfile: exports.UserProfileSchema.optional(),
    sources: zod_1.z.array(data_source_1.DataSourceConfigSchema).min(1).max(5),
    pipeline: zod_1.z.array(pipeline_step_1.PipelineStepSchema).min(1),
    collation: exports.CollationConfigSchema,
    output: exports.OutputConfigSchema,
    safety: exports.SafetyConfigSchema.optional(),
});
