import { z } from 'zod';

/**
 * Built-in source types
 */
export const BuiltInSourceKindSchema = z.enum([
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

export type BuiltInSourceKind = z.infer<typeof BuiltInSourceKindSchema>;

/**
 * Built-in source configuration
 */
export const BuiltInSourceConfigSchema = z.object({
  kind: z.literal('builtin'),
  sourceType: BuiltInSourceKindSchema,
  query: z.string().optional(),
  maxItems: z.number().int().min(1).max(50).default(10),
  timeRange: z.enum(['1h', '6h', '24h', '7d', '30d']).optional(),
  // RSS-specific fields
  feedUrl: z.string().url().optional(),
  // HTTP JSON-specific fields
  url: z.string().url().optional(),
  method: z.enum(['GET', 'POST']).optional(),
  headers: z.record(z.string()).optional(),
  jsonPath: z.string().optional(),
  // Web scraper-specific fields
  extractMode: z.enum(['single', 'list']).optional(),
  selectors: z.record(z.string()).optional(),
});

/**
 * User-defined source reference (will be expanded in Sprint 2)
 */
export const UserSourceRefSchema = z.object({
  kind: z.literal('user_source_ref'),
  userSourceId: z.string().uuid(),
});

/**
 * Union of all data source types
 */
export const DataSourceConfigSchema = z.discriminatedUnion('kind', [
  BuiltInSourceConfigSchema,
  UserSourceRefSchema,
]);

export type DataSourceConfig = z.infer<typeof DataSourceConfigSchema>;
export type BuiltInSourceConfig = z.infer<typeof BuiltInSourceConfigSchema>;
export type UserSourceRef = z.infer<typeof UserSourceRefSchema>;
