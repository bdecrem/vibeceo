"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserSourceDefinitionSchema = exports.NormalizationConfigSchema = exports.WebScraperSourceConfigSchema = exports.HttpJsonSourceConfigSchema = exports.RssSourceConfigSchema = void 0;
const zod_1 = require("zod");
/**
 * RSS Source Configuration
 */
exports.RssSourceConfigSchema = zod_1.z.object({
    feedUrl: zod_1.z.string().url(),
    maxItems: zod_1.z.number().int().min(1).max(100).default(10),
});
/**
 * HTTP JSON Source Configuration
 */
exports.HttpJsonSourceConfigSchema = zod_1.z.object({
    url: zod_1.z.string().url(),
    method: zod_1.z.enum(['GET', 'POST']).default('GET'),
    headers: zod_1.z.record(zod_1.z.string()).optional(),
    body: zod_1.z.string().optional(), // JSON string for POST
    jsonPath: zod_1.z.string(), // JSONPath expression to items array, e.g., "$.data.items"
    maxItems: zod_1.z.number().int().min(1).max(100).default(10),
});
/**
 * Web Scraper Source Configuration
 * Fetches and extracts structured content from web pages
 */
exports.WebScraperSourceConfigSchema = zod_1.z.object({
    url: zod_1.z.string().url(),
    refreshInterval: zod_1.z.number().int().min(300).max(86400).default(3600), // seconds, min 5min, max 24h
    selectors: zod_1.z.object({
        // CSS selectors for extracting content
        container: zod_1.z.string().optional(), // Container element (e.g., "article", ".post")
        title: zod_1.z.string().optional(), // Title selector (e.g., "h1", ".title")
        summary: zod_1.z.string().optional(), // Summary/description selector
        content: zod_1.z.string().optional(), // Full content selector
        author: zod_1.z.string().optional(), // Author selector
        publishedAt: zod_1.z.string().optional(), // Date selector
        links: zod_1.z.string().optional(), // Links to extract (e.g., "a[href]")
    }).optional(),
    extractMode: zod_1.z.enum([
        'single', // Extract one item from the page
        'list', // Extract multiple items from a list (requires container selector)
    ]).default('single'),
    maxItems: zod_1.z.number().int().min(1).max(100).default(1),
});
/**
 * Normalization Configuration
 * Maps source fields to NormalizedItem fields
 */
exports.NormalizationConfigSchema = zod_1.z.object({
    idPath: zod_1.z.string().optional(), // JSONPath to id field
    titlePath: zod_1.z.string().optional(), // JSONPath to title
    summaryPath: zod_1.z.string().optional(), // JSONPath to summary/description
    urlPath: zod_1.z.string().optional(), // JSONPath to URL
    publishedAtPath: zod_1.z.string().optional(), // JSONPath to publish date
    authorPath: zod_1.z.string().optional(), // JSONPath to author
});
/**
 * User Source Definition (database model)
 */
exports.UserSourceDefinitionSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    owner_user_id: zod_1.z.string().uuid().optional(),
    name: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    kind: zod_1.z.enum(['rss', 'http_json', 'web_scraper']),
    config_jsonb: zod_1.z.union([exports.RssSourceConfigSchema, exports.HttpJsonSourceConfigSchema, exports.WebScraperSourceConfigSchema]),
    normalization_jsonb: exports.NormalizationConfigSchema.optional(),
    visibility: zod_1.z.enum(['private', 'shared', 'public']).default('private'),
    created_at: zod_1.z.string().optional(),
    updated_at: zod_1.z.string().optional(),
});
