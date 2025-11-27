"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PipelineStepSchema = exports.ClaudeAgentStepSchema = exports.EnrichDataStepSchema = exports.MergeItemsStepSchema = exports.FieldMappingStepSchema = exports.ScoringRankStepSchema = exports.URLExtractionStepSchema = exports.TextCleanupStepSchema = exports.TranslationStepSchema = exports.CategoryClassificationStepSchema = exports.EntityExtractionStepSchema = exports.SentimentAnalysisStepSchema = exports.HasMediaFilterStepSchema = exports.RandomSampleFilterStepSchema = exports.TopNFilterStepSchema = exports.LanguageFilterStepSchema = exports.AuthorFilterStepSchema = exports.RegexFilterStepSchema = exports.ScoreFilterStepSchema = exports.LengthFilterStepSchema = exports.SentimentFilterStepSchema = exports.LimitFilterStepSchema = exports.KeywordFilterStepSchema = exports.DateFilterStepSchema = exports.CustomStepSchema = exports.TransformStepSchema = exports.RankStepSchema = exports.SummarizeStepSchema = exports.SortStepSchema = exports.FilterStepSchema = exports.DedupeStepSchema = exports.FetchStepSchema = void 0;
const zod_1 = require("zod");
/**
 * Pipeline step: Fetch data from sources
 */
exports.FetchStepSchema = zod_1.z.object({
    kind: zod_1.z.literal('fetch'),
    name: zod_1.z.string().optional(),
});
/**
 * Pipeline step: Deduplicate items by URL or ID
 */
exports.DedupeStepSchema = zod_1.z.object({
    kind: zod_1.z.literal('dedupe'),
    name: zod_1.z.string().optional(),
    dedupeBy: zod_1.z.enum(['url', 'id', 'title']).default('url'),
});
/**
 * Pipeline step: Filter items by criteria
 */
exports.FilterStepSchema = zod_1.z.object({
    kind: zod_1.z.literal('filter'),
    name: zod_1.z.string().optional(),
    maxItems: zod_1.z.number().int().min(1).max(100).optional(),
    minScore: zod_1.z.number().min(0).max(1).optional(),
});
/**
 * Pipeline step: Sort items
 */
exports.SortStepSchema = zod_1.z.object({
    kind: zod_1.z.literal('sort'),
    name: zod_1.z.string().optional(),
    sortBy: zod_1.z.enum(['publishedAt', 'score', 'relevance']).default('publishedAt'),
    order: zod_1.z.enum(['asc', 'desc']).default('desc'),
});
/**
 * Pipeline step: LLM summarization
 */
exports.SummarizeStepSchema = zod_1.z.object({
    kind: zod_1.z.literal('summarize'),
    name: zod_1.z.string().optional(),
    promptTemplateId: zod_1.z.string(),
    model: zod_1.z.enum(['gpt-4', 'gpt-3.5-turbo', 'claude-3-opus', 'claude-3-sonnet']).default('gpt-4'),
    maxTokens: zod_1.z.number().int().min(100).max(4000).default(1000),
    perItem: zod_1.z.boolean().default(false), // If true, summarize each item individually
});
/**
 * Pipeline step: LLM ranking/scoring
 */
exports.RankStepSchema = zod_1.z.object({
    kind: zod_1.z.literal('rank'),
    name: zod_1.z.string().optional(),
    promptTemplateId: zod_1.z.string(),
    model: zod_1.z.enum(['gpt-4', 'gpt-3.5-turbo', 'claude-3-opus', 'claude-3-sonnet']).default('gpt-4'),
});
/**
 * Pipeline step: LLM transformation
 */
exports.TransformStepSchema = zod_1.z.object({
    kind: zod_1.z.literal('transform'),
    name: zod_1.z.string().optional(),
    promptTemplateId: zod_1.z.string(),
    model: zod_1.z.enum(['gpt-4', 'gpt-3.5-turbo', 'claude-3-opus', 'claude-3-sonnet']).default('gpt-4'),
    outputFormat: zod_1.z.enum(['json', 'text', 'markdown']).default('json'),
});
/**
 * Pipeline step: Custom code (for advanced mode)
 */
exports.CustomStepSchema = zod_1.z.object({
    kind: zod_1.z.literal('custom'),
    name: zod_1.z.string().optional(),
    customStepId: zod_1.z.string(),
    config: zod_1.z.record(zod_1.z.any()).optional(),
});
/**
 * Pipeline step: Date range filter
 */
exports.DateFilterStepSchema = zod_1.z.object({
    kind: zod_1.z.literal('date_filter'),
    name: zod_1.z.string().optional(),
    startDate: zod_1.z.string().optional(),
    endDate: zod_1.z.string().optional(),
    timeRange: zod_1.z.enum(['1h', '6h', '24h', '7d', '30d']).optional(),
});
/**
 * Pipeline step: Keyword filter
 */
exports.KeywordFilterStepSchema = zod_1.z.object({
    kind: zod_1.z.literal('keyword_filter'),
    name: zod_1.z.string().optional(),
    include: zod_1.z.array(zod_1.z.string()).optional(),
    exclude: zod_1.z.array(zod_1.z.string()).optional(),
    caseSensitive: zod_1.z.boolean().default(false),
});
/**
 * Pipeline step: Limit count
 */
exports.LimitFilterStepSchema = zod_1.z.object({
    kind: zod_1.z.literal('limit_filter'),
    name: zod_1.z.string().optional(),
    maxItems: zod_1.z.number().int().min(1).max(100),
});
/**
 * Pipeline step: Sentiment filter
 */
exports.SentimentFilterStepSchema = zod_1.z.object({
    kind: zod_1.z.literal('sentiment_filter'),
    name: zod_1.z.string().optional(),
    sentiment: zod_1.z.enum(['positive', 'negative', 'neutral']),
});
/**
 * Pipeline step: Length filter
 */
exports.LengthFilterStepSchema = zod_1.z.object({
    kind: zod_1.z.literal('length_filter'),
    name: zod_1.z.string().optional(),
    minLength: zod_1.z.number().int().optional(),
    maxLength: zod_1.z.number().int().optional(),
    measureBy: zod_1.z.enum(['characters', 'words']).default('characters'),
});
/**
 * Pipeline step: Score threshold filter
 */
exports.ScoreFilterStepSchema = zod_1.z.object({
    kind: zod_1.z.literal('score_filter'),
    name: zod_1.z.string().optional(),
    minScore: zod_1.z.number().min(0),
});
/**
 * Pipeline step: Regex pattern filter
 */
exports.RegexFilterStepSchema = zod_1.z.object({
    kind: zod_1.z.literal('regex_filter'),
    name: zod_1.z.string().optional(),
    pattern: zod_1.z.string(),
    field: zod_1.z.enum(['title', 'summary', 'content']).default('summary'),
});
/**
 * Pipeline step: Author/source filter
 */
exports.AuthorFilterStepSchema = zod_1.z.object({
    kind: zod_1.z.literal('author_filter'),
    name: zod_1.z.string().optional(),
    include: zod_1.z.array(zod_1.z.string()).optional(),
    exclude: zod_1.z.array(zod_1.z.string()).optional(),
});
/**
 * Pipeline step: Language filter
 */
exports.LanguageFilterStepSchema = zod_1.z.object({
    kind: zod_1.z.literal('language_filter'),
    name: zod_1.z.string().optional(),
    languages: zod_1.z.array(zod_1.z.string()),
});
/**
 * Pipeline step: Top N filter
 */
exports.TopNFilterStepSchema = zod_1.z.object({
    kind: zod_1.z.literal('top_n_filter'),
    name: zod_1.z.string().optional(),
    n: zod_1.z.number().int().min(1).max(100),
    sortBy: zod_1.z.enum(['score', 'publishedAt', 'relevance']),
});
/**
 * Pipeline step: Random sample filter
 */
exports.RandomSampleFilterStepSchema = zod_1.z.object({
    kind: zod_1.z.literal('random_sample_filter'),
    name: zod_1.z.string().optional(),
    sampleSize: zod_1.z.number().int().min(1).max(100),
});
/**
 * Pipeline step: Has media filter
 */
exports.HasMediaFilterStepSchema = zod_1.z.object({
    kind: zod_1.z.literal('has_media_filter'),
    name: zod_1.z.string().optional(),
    mediaType: zod_1.z.enum(['image', 'video', 'any']).default('any'),
});
/**
 * Pipeline step: Sentiment analysis
 */
exports.SentimentAnalysisStepSchema = zod_1.z.object({
    kind: zod_1.z.literal('sentiment_analysis'),
    name: zod_1.z.string().optional(),
    model: zod_1.z.enum(['simple', 'advanced']).default('simple'),
});
/**
 * Pipeline step: Entity extraction
 */
exports.EntityExtractionStepSchema = zod_1.z.object({
    kind: zod_1.z.literal('entity_extraction'),
    name: zod_1.z.string().optional(),
    entityTypes: zod_1.z.array(zod_1.z.enum(['person', 'organization', 'location', 'date'])).default(['person', 'organization', 'location']),
});
/**
 * Pipeline step: Category classification
 */
exports.CategoryClassificationStepSchema = zod_1.z.object({
    kind: zod_1.z.literal('category_classification'),
    name: zod_1.z.string().optional(),
    categories: zod_1.z.array(zod_1.z.string()).optional(),
});
/**
 * Pipeline step: Translation
 */
exports.TranslationStepSchema = zod_1.z.object({
    kind: zod_1.z.literal('translation'),
    name: zod_1.z.string().optional(),
    targetLanguage: zod_1.z.string(),
    translateFields: zod_1.z.array(zod_1.z.enum(['title', 'summary', 'content'])).default(['summary']),
});
/**
 * Pipeline step: Text cleanup
 */
exports.TextCleanupStepSchema = zod_1.z.object({
    kind: zod_1.z.literal('text_cleanup'),
    name: zod_1.z.string().optional(),
    removeHTML: zod_1.z.boolean().default(true),
    normalizeWhitespace: zod_1.z.boolean().default(true),
    removeEmojis: zod_1.z.boolean().default(false),
});
/**
 * Pipeline step: URL extraction
 */
exports.URLExtractionStepSchema = zod_1.z.object({
    kind: zod_1.z.literal('url_extraction'),
    name: zod_1.z.string().optional(),
    expandShortLinks: zod_1.z.boolean().default(true),
    extractDomain: zod_1.z.boolean().default(true),
});
/**
 * Pipeline step: Scoring/ranking
 */
exports.ScoringRankStepSchema = zod_1.z.object({
    kind: zod_1.z.literal('scoring_rank'),
    name: zod_1.z.string().optional(),
    criteria: zod_1.z.string(),
    model: zod_1.z.enum(['gpt-4', 'gpt-3.5-turbo', 'claude-3-opus', 'claude-3-sonnet']).default('gpt-4'),
});
/**
 * Pipeline step: Field mapping
 */
exports.FieldMappingStepSchema = zod_1.z.object({
    kind: zod_1.z.literal('field_mapping'),
    name: zod_1.z.string().optional(),
    mappings: zod_1.z.record(zod_1.z.string()),
});
/**
 * Pipeline step: Merge items
 */
exports.MergeItemsStepSchema = zod_1.z.object({
    kind: zod_1.z.literal('merge_items'),
    name: zod_1.z.string().optional(),
    mergeBy: zod_1.z.enum(['title', 'url', 'id']).default('url'),
});
/**
 * Pipeline step: Enrich data
 */
exports.EnrichDataStepSchema = zod_1.z.object({
    kind: zod_1.z.literal('enrich_data'),
    name: zod_1.z.string().optional(),
    apiUrl: zod_1.z.string().url(),
    headers: zod_1.z.record(zod_1.z.string()).optional(),
    fieldMapping: zod_1.z.record(zod_1.z.string()).optional(),
});
/**
 * Pipeline step: Claude Agent (runtime AI)
 */
exports.ClaudeAgentStepSchema = zod_1.z.object({
    kind: zod_1.z.literal('claude_agent'),
    name: zod_1.z.string().optional(),
    systemPrompt: zod_1.z.string(),
    userPromptTemplate: zod_1.z.string(),
    model: zod_1.z.enum(['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307']).default('claude-3-5-sonnet-20241022'),
    maxTokens: zod_1.z.number().int().min(100).max(4096).default(1024),
    outputField: zod_1.z.string().default('agentOutput'),
});
/**
 * Union of all pipeline step types
 */
exports.PipelineStepSchema = zod_1.z.discriminatedUnion('kind', [
    exports.FetchStepSchema,
    exports.DedupeStepSchema,
    exports.FilterStepSchema,
    exports.SortStepSchema,
    exports.SummarizeStepSchema,
    exports.RankStepSchema,
    exports.TransformStepSchema,
    exports.CustomStepSchema,
    // New filter steps
    exports.DateFilterStepSchema,
    exports.KeywordFilterStepSchema,
    exports.LimitFilterStepSchema,
    exports.SentimentFilterStepSchema,
    exports.LengthFilterStepSchema,
    exports.ScoreFilterStepSchema,
    exports.RegexFilterStepSchema,
    exports.AuthorFilterStepSchema,
    exports.LanguageFilterStepSchema,
    exports.TopNFilterStepSchema,
    exports.RandomSampleFilterStepSchema,
    exports.HasMediaFilterStepSchema,
    // New transform steps
    exports.SentimentAnalysisStepSchema,
    exports.EntityExtractionStepSchema,
    exports.CategoryClassificationStepSchema,
    exports.TranslationStepSchema,
    exports.TextCleanupStepSchema,
    exports.URLExtractionStepSchema,
    exports.ScoringRankStepSchema,
    exports.FieldMappingStepSchema,
    exports.MergeItemsStepSchema,
    exports.EnrichDataStepSchema,
    exports.ClaudeAgentStepSchema,
]);
