"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataSourceConfigSchema = exports.UserSourceRefSchema = exports.BuiltInSourceConfigSchema = exports.BuiltInSourceKindSchema = void 0;
const zod_1 = require("zod");
/**
 * Built-in source types
 */
exports.BuiltInSourceKindSchema = zod_1.z.enum([
    // Original sources
    'arxiv',
    'reddit',
    'hackernews',
    'youtube',
    'twitter',
    'rss',
    'http_json',
    'web_scraper',
    // New sources
    'github',
    'producthunt',
    'news_api',
    'google_news',
    'crypto_price',
    'stock_price',
    'weather',
    'gmail',
    'podcast',
]);
/**
 * Built-in source configuration
 */
exports.BuiltInSourceConfigSchema = zod_1.z.object({
    kind: zod_1.z.literal('builtin'),
    sourceType: exports.BuiltInSourceKindSchema,
    query: zod_1.z.string().optional(),
    maxItems: zod_1.z.number().int().min(1).max(50).default(10),
    timeRange: zod_1.z.enum(['1h', '6h', '24h', '7d', '30d']).optional(),
    // RSS-specific fields
    feedUrl: zod_1.z.string().url().optional(),
    // HTTP JSON-specific fields
    url: zod_1.z.string().url().optional(),
    method: zod_1.z.enum(['GET', 'POST']).optional(),
    headers: zod_1.z.record(zod_1.z.string()).optional(),
    jsonPath: zod_1.z.string().optional(),
    // Web scraper-specific fields
    extractMode: zod_1.z.enum(['single', 'list']).optional(),
    selectors: zod_1.z.record(zod_1.z.string()).optional(),
});
/**
 * User-defined source reference (will be expanded in Sprint 2)
 */
exports.UserSourceRefSchema = zod_1.z.object({
    kind: zod_1.z.literal('user_source_ref'),
    userSourceId: zod_1.z.string().uuid(),
});
/**
 * Union of all data source types
 */
exports.DataSourceConfigSchema = zod_1.z.discriminatedUnion('kind', [
    exports.BuiltInSourceConfigSchema,
    exports.UserSourceRefSchema,
]);
