"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnrichedItemSchema = exports.NormalizedItemSchema = void 0;
const zod_1 = require("zod");
/**
 * NormalizedItem: The universal data format for all sources
 * Every data source is converted into this structure for pipeline processing
 */
exports.NormalizedItemSchema = zod_1.z.object({
    id: zod_1.z.string().optional(),
    title: zod_1.z.string().optional(),
    summary: zod_1.z.string().optional(),
    url: zod_1.z.string().url().optional(),
    publishedAt: zod_1.z.string().optional(),
    author: zod_1.z.string().optional(),
    score: zod_1.z.number().optional(), // Engagement/ranking score (e.g., upvotes, views, volume)
    raw: zod_1.z.any(), // Original raw data from source
});
/**
 * Enriched item with LLM processing metadata
 */
exports.EnrichedItemSchema = exports.NormalizedItemSchema.extend({
    score: zod_1.z.number().optional(),
    relevanceReason: zod_1.z.string().optional(),
    categories: zod_1.z.array(zod_1.z.string()).optional(),
    keyPoints: zod_1.z.array(zod_1.z.string()).optional(),
    sentiment: zod_1.z.enum(['positive', 'negative', 'neutral']).optional(),
});
