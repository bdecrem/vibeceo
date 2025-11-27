import { z } from 'zod';

/**
 * RSS Source Configuration
 */
export const RssSourceConfigSchema = z.object({
  feedUrl: z.string().url(),
  maxItems: z.number().int().min(1).max(100).default(10),
});

export type RssSourceConfig = z.infer<typeof RssSourceConfigSchema>;

/**
 * HTTP JSON Source Configuration
 */
export const HttpJsonSourceConfigSchema = z.object({
  url: z.string().url(),
  method: z.enum(['GET', 'POST']).default('GET'),
  headers: z.record(z.string()).optional(),
  body: z.string().optional(), // JSON string for POST
  jsonPath: z.string(), // JSONPath expression to items array, e.g., "$.data.items"
  maxItems: z.number().int().min(1).max(100).default(10),
});

export type HttpJsonSourceConfig = z.infer<typeof HttpJsonSourceConfigSchema>;

/**
 * Web Scraper Source Configuration
 * Fetches and extracts structured content from web pages
 */
export const WebScraperSourceConfigSchema = z.object({
  url: z.string().url(),
  refreshInterval: z.number().int().min(300).max(86400).default(3600), // seconds, min 5min, max 24h
  selectors: z.object({
    // CSS selectors for extracting content
    container: z.string().optional(), // Container element (e.g., "article", ".post")
    title: z.string().optional(), // Title selector (e.g., "h1", ".title")
    summary: z.string().optional(), // Summary/description selector
    content: z.string().optional(), // Full content selector
    author: z.string().optional(), // Author selector
    publishedAt: z.string().optional(), // Date selector
    links: z.string().optional(), // Links to extract (e.g., "a[href]")
  }).optional(),
  extractMode: z.enum([
    'single', // Extract one item from the page
    'list', // Extract multiple items from a list (requires container selector)
  ]).default('single'),
  maxItems: z.number().int().min(1).max(100).default(1),
});

export type WebScraperSourceConfig = z.infer<typeof WebScraperSourceConfigSchema>;

/**
 * Normalization Configuration
 * Maps source fields to NormalizedItem fields
 */
export const NormalizationConfigSchema = z.object({
  idPath: z.string().optional(), // JSONPath to id field
  titlePath: z.string().optional(), // JSONPath to title
  summaryPath: z.string().optional(), // JSONPath to summary/description
  urlPath: z.string().optional(), // JSONPath to URL
  publishedAtPath: z.string().optional(), // JSONPath to publish date
  authorPath: z.string().optional(), // JSONPath to author
});

export type NormalizationConfig = z.infer<typeof NormalizationConfigSchema>;

/**
 * User Source Definition (database model)
 */
export const UserSourceDefinitionSchema = z.object({
  id: z.string().uuid(),
  owner_user_id: z.string().uuid().optional(),
  name: z.string(),
  description: z.string().optional(),
  kind: z.enum(['rss', 'http_json', 'web_scraper']),
  config_jsonb: z.union([RssSourceConfigSchema, HttpJsonSourceConfigSchema, WebScraperSourceConfigSchema]),
  normalization_jsonb: NormalizationConfigSchema.optional(),
  visibility: z.enum(['private', 'shared', 'public']).default('private'),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export type UserSourceDefinition = z.infer<typeof UserSourceDefinitionSchema>;
