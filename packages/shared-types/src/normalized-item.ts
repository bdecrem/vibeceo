import { z } from 'zod';

/**
 * NormalizedItem: The universal data format for all sources
 * Every data source is converted into this structure for pipeline processing
 */
export const NormalizedItemSchema = z.object({
  id: z.string().optional(),
  title: z.string().optional(),
  summary: z.string().optional(),
  url: z.string().url().optional(),
  publishedAt: z.string().optional(),
  author: z.string().optional(),
  score: z.number().optional(), // Engagement/ranking score (e.g., upvotes, views, volume)
  raw: z.any(), // Original raw data from source
});

export type NormalizedItem = z.infer<typeof NormalizedItemSchema>;

/**
 * Enriched item with LLM processing metadata
 */
export const EnrichedItemSchema = NormalizedItemSchema.extend({
  score: z.number().optional(),
  relevanceReason: z.string().optional(),
  categories: z.array(z.string()).optional(),
  keyPoints: z.array(z.string()).optional(),
  sentiment: z.enum(['positive', 'negative', 'neutral']).optional(),
});

export type EnrichedItem = z.infer<typeof EnrichedItemSchema>;
