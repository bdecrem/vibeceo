import { z } from 'zod';

/**
 * Pipeline step: Fetch data from sources
 */
export const FetchStepSchema = z.object({
  kind: z.literal('fetch'),
  name: z.string().optional(),
});

/**
 * Pipeline step: Deduplicate items by URL or ID
 */
export const DedupeStepSchema = z.object({
  kind: z.literal('dedupe'),
  name: z.string().optional(),
  dedupeBy: z.enum(['url', 'id', 'title']).default('url'),
});

/**
 * Pipeline step: Filter items by criteria
 */
export const FilterStepSchema = z.object({
  kind: z.literal('filter'),
  name: z.string().optional(),
  maxItems: z.number().int().min(1).max(100).optional(),
  minScore: z.number().min(0).max(1).optional(),
});

/**
 * Pipeline step: Sort items
 */
export const SortStepSchema = z.object({
  kind: z.literal('sort'),
  name: z.string().optional(),
  sortBy: z.enum(['publishedAt', 'score', 'relevance']).default('publishedAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * Pipeline step: LLM summarization
 */
export const SummarizeStepSchema = z.object({
  kind: z.literal('summarize'),
  name: z.string().optional(),
  promptTemplateId: z.string(),
  model: z.enum(['gpt-4', 'gpt-3.5-turbo', 'claude-3-opus', 'claude-3-sonnet']).default('gpt-4'),
  maxTokens: z.number().int().min(100).max(4000).default(1000),
  perItem: z.boolean().default(false), // If true, summarize each item individually
});

/**
 * Pipeline step: LLM ranking/scoring
 */
export const RankStepSchema = z.object({
  kind: z.literal('rank'),
  name: z.string().optional(),
  promptTemplateId: z.string(),
  model: z.enum(['gpt-4', 'gpt-3.5-turbo', 'claude-3-opus', 'claude-3-sonnet']).default('gpt-4'),
});

/**
 * Pipeline step: LLM transformation
 */
export const TransformStepSchema = z.object({
  kind: z.literal('transform'),
  name: z.string().optional(),
  promptTemplateId: z.string(),
  model: z.enum(['gpt-4', 'gpt-3.5-turbo', 'claude-3-opus', 'claude-3-sonnet']).default('gpt-4'),
  outputFormat: z.enum(['json', 'text', 'markdown']).default('json'),
});

/**
 * Pipeline step: Custom code (for advanced mode)
 */
export const CustomStepSchema = z.object({
  kind: z.literal('custom'),
  name: z.string().optional(),
  customStepId: z.string(),
  config: z.record(z.any()).optional(),
});

/**
 * Pipeline step: Date range filter
 */
export const DateFilterStepSchema = z.object({
  kind: z.literal('date_filter'),
  name: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  timeRange: z.enum(['1h', '6h', '24h', '7d', '30d']).optional(),
});

/**
 * Pipeline step: Keyword filter
 */
export const KeywordFilterStepSchema = z.object({
  kind: z.literal('keyword_filter'),
  name: z.string().optional(),
  include: z.array(z.string()).optional(),
  exclude: z.array(z.string()).optional(),
  caseSensitive: z.boolean().default(false),
});

/**
 * Pipeline step: Limit count
 */
export const LimitFilterStepSchema = z.object({
  kind: z.literal('limit_filter'),
  name: z.string().optional(),
  maxItems: z.number().int().min(1).max(100),
});

/**
 * Pipeline step: Sentiment filter
 */
export const SentimentFilterStepSchema = z.object({
  kind: z.literal('sentiment_filter'),
  name: z.string().optional(),
  sentiment: z.enum(['positive', 'negative', 'neutral']),
});

/**
 * Pipeline step: Length filter
 */
export const LengthFilterStepSchema = z.object({
  kind: z.literal('length_filter'),
  name: z.string().optional(),
  minLength: z.number().int().optional(),
  maxLength: z.number().int().optional(),
  measureBy: z.enum(['characters', 'words']).default('characters'),
});

/**
 * Pipeline step: Score threshold filter
 */
export const ScoreFilterStepSchema = z.object({
  kind: z.literal('score_filter'),
  name: z.string().optional(),
  minScore: z.number().min(0),
});

/**
 * Pipeline step: Regex pattern filter
 */
export const RegexFilterStepSchema = z.object({
  kind: z.literal('regex_filter'),
  name: z.string().optional(),
  pattern: z.string(),
  field: z.enum(['title', 'summary', 'content']).default('summary'),
});

/**
 * Pipeline step: Author/source filter
 */
export const AuthorFilterStepSchema = z.object({
  kind: z.literal('author_filter'),
  name: z.string().optional(),
  include: z.array(z.string()).optional(),
  exclude: z.array(z.string()).optional(),
});

/**
 * Pipeline step: Language filter
 */
export const LanguageFilterStepSchema = z.object({
  kind: z.literal('language_filter'),
  name: z.string().optional(),
  languages: z.array(z.string()),
});

/**
 * Pipeline step: Top N filter
 */
export const TopNFilterStepSchema = z.object({
  kind: z.literal('top_n_filter'),
  name: z.string().optional(),
  n: z.number().int().min(1).max(100),
  sortBy: z.enum(['score', 'publishedAt', 'relevance']),
});

/**
 * Pipeline step: Random sample filter
 */
export const RandomSampleFilterStepSchema = z.object({
  kind: z.literal('random_sample_filter'),
  name: z.string().optional(),
  sampleSize: z.number().int().min(1).max(100),
});

/**
 * Pipeline step: Has media filter
 */
export const HasMediaFilterStepSchema = z.object({
  kind: z.literal('has_media_filter'),
  name: z.string().optional(),
  mediaType: z.enum(['image', 'video', 'any']).default('any'),
});

/**
 * Pipeline step: Sentiment analysis
 */
export const SentimentAnalysisStepSchema = z.object({
  kind: z.literal('sentiment_analysis'),
  name: z.string().optional(),
  model: z.enum(['simple', 'advanced']).default('simple'),
});

/**
 * Pipeline step: Entity extraction
 */
export const EntityExtractionStepSchema = z.object({
  kind: z.literal('entity_extraction'),
  name: z.string().optional(),
  entityTypes: z.array(z.enum(['person', 'organization', 'location', 'date'])).default(['person', 'organization', 'location']),
});

/**
 * Pipeline step: Category classification
 */
export const CategoryClassificationStepSchema = z.object({
  kind: z.literal('category_classification'),
  name: z.string().optional(),
  categories: z.array(z.string()).optional(),
});

/**
 * Pipeline step: Translation
 */
export const TranslationStepSchema = z.object({
  kind: z.literal('translation'),
  name: z.string().optional(),
  targetLanguage: z.string(),
  translateFields: z.array(z.enum(['title', 'summary', 'content'])).default(['summary']),
});

/**
 * Pipeline step: Text cleanup
 */
export const TextCleanupStepSchema = z.object({
  kind: z.literal('text_cleanup'),
  name: z.string().optional(),
  removeHTML: z.boolean().default(true),
  normalizeWhitespace: z.boolean().default(true),
  removeEmojis: z.boolean().default(false),
});

/**
 * Pipeline step: URL extraction
 */
export const URLExtractionStepSchema = z.object({
  kind: z.literal('url_extraction'),
  name: z.string().optional(),
  expandShortLinks: z.boolean().default(true),
  extractDomain: z.boolean().default(true),
});

/**
 * Pipeline step: Scoring/ranking
 */
export const ScoringRankStepSchema = z.object({
  kind: z.literal('scoring_rank'),
  name: z.string().optional(),
  criteria: z.string(),
  model: z.enum(['gpt-4', 'gpt-3.5-turbo', 'claude-3-opus', 'claude-3-sonnet']).default('gpt-4'),
});

/**
 * Pipeline step: Field mapping
 */
export const FieldMappingStepSchema = z.object({
  kind: z.literal('field_mapping'),
  name: z.string().optional(),
  mappings: z.record(z.string()),
});

/**
 * Pipeline step: Merge items
 */
export const MergeItemsStepSchema = z.object({
  kind: z.literal('merge_items'),
  name: z.string().optional(),
  mergeBy: z.enum(['title', 'url', 'id']).default('url'),
});

/**
 * Pipeline step: Enrich data
 */
export const EnrichDataStepSchema = z.object({
  kind: z.literal('enrich_data'),
  name: z.string().optional(),
  apiUrl: z.string().url(),
  headers: z.record(z.string()).optional(),
  fieldMapping: z.record(z.string()).optional(),
});

/**
 * Pipeline step: Claude Agent (runtime AI)
 */
export const ClaudeAgentStepSchema = z.object({
  kind: z.literal('claude_agent'),
  name: z.string().optional(),
  systemPrompt: z.string(),
  userPromptTemplate: z.string(),
  model: z.enum(['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307']).default('claude-3-5-sonnet-20241022'),
  maxTokens: z.number().int().min(100).max(4096).default(1024),
  outputField: z.string().default('agentOutput'),
});

/**
 * Union of all pipeline step types
 */
export const PipelineStepSchema = z.discriminatedUnion('kind', [
  FetchStepSchema,
  DedupeStepSchema,
  FilterStepSchema,
  SortStepSchema,
  SummarizeStepSchema,
  RankStepSchema,
  TransformStepSchema,
  CustomStepSchema,
  // New filter steps
  DateFilterStepSchema,
  KeywordFilterStepSchema,
  LimitFilterStepSchema,
  SentimentFilterStepSchema,
  LengthFilterStepSchema,
  ScoreFilterStepSchema,
  RegexFilterStepSchema,
  AuthorFilterStepSchema,
  LanguageFilterStepSchema,
  TopNFilterStepSchema,
  RandomSampleFilterStepSchema,
  HasMediaFilterStepSchema,
  // New transform steps
  SentimentAnalysisStepSchema,
  EntityExtractionStepSchema,
  CategoryClassificationStepSchema,
  TranslationStepSchema,
  TextCleanupStepSchema,
  URLExtractionStepSchema,
  ScoringRankStepSchema,
  FieldMappingStepSchema,
  MergeItemsStepSchema,
  EnrichDataStepSchema,
  ClaudeAgentStepSchema,
]);

export type PipelineStep = z.infer<typeof PipelineStepSchema>;
export type FetchStep = z.infer<typeof FetchStepSchema>;
export type DedupeStep = z.infer<typeof DedupeStepSchema>;
export type FilterStep = z.infer<typeof FilterStepSchema>;
export type SortStep = z.infer<typeof SortStepSchema>;
export type SummarizeStep = z.infer<typeof SummarizeStepSchema>;
export type RankStep = z.infer<typeof RankStepSchema>;
export type TransformStep = z.infer<typeof TransformStepSchema>;
export type CustomStep = z.infer<typeof CustomStepSchema>;
// New filter step types
export type DateFilterStep = z.infer<typeof DateFilterStepSchema>;
export type KeywordFilterStep = z.infer<typeof KeywordFilterStepSchema>;
export type LimitFilterStep = z.infer<typeof LimitFilterStepSchema>;
export type SentimentFilterStep = z.infer<typeof SentimentFilterStepSchema>;
export type LengthFilterStep = z.infer<typeof LengthFilterStepSchema>;
export type ScoreFilterStep = z.infer<typeof ScoreFilterStepSchema>;
export type RegexFilterStep = z.infer<typeof RegexFilterStepSchema>;
export type AuthorFilterStep = z.infer<typeof AuthorFilterStepSchema>;
export type LanguageFilterStep = z.infer<typeof LanguageFilterStepSchema>;
export type TopNFilterStep = z.infer<typeof TopNFilterStepSchema>;
export type RandomSampleFilterStep = z.infer<typeof RandomSampleFilterStepSchema>;
export type HasMediaFilterStep = z.infer<typeof HasMediaFilterStepSchema>;
// New transform step types
export type SentimentAnalysisStep = z.infer<typeof SentimentAnalysisStepSchema>;
export type EntityExtractionStep = z.infer<typeof EntityExtractionStepSchema>;
export type CategoryClassificationStep = z.infer<typeof CategoryClassificationStepSchema>;
export type TranslationStep = z.infer<typeof TranslationStepSchema>;
export type TextCleanupStep = z.infer<typeof TextCleanupStepSchema>;
export type URLExtractionStep = z.infer<typeof URLExtractionStepSchema>;
export type ScoringRankStep = z.infer<typeof ScoringRankStepSchema>;
export type FieldMappingStep = z.infer<typeof FieldMappingStepSchema>;
export type MergeItemsStep = z.infer<typeof MergeItemsStepSchema>;
export type EnrichDataStep = z.infer<typeof EnrichDataStepSchema>;
export type ClaudeAgentStep = z.infer<typeof ClaudeAgentStepSchema>;
