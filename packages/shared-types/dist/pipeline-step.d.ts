import { z } from 'zod';
/**
 * Pipeline step: Fetch data from sources
 */
export declare const FetchStepSchema: z.ZodObject<{
    kind: z.ZodLiteral<"fetch">;
    name: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    kind: "fetch";
    name?: string | undefined;
}, {
    kind: "fetch";
    name?: string | undefined;
}>;
/**
 * Pipeline step: Deduplicate items by URL or ID
 */
export declare const DedupeStepSchema: z.ZodObject<{
    kind: z.ZodLiteral<"dedupe">;
    name: z.ZodOptional<z.ZodString>;
    dedupeBy: z.ZodDefault<z.ZodEnum<["url", "id", "title"]>>;
}, "strip", z.ZodTypeAny, {
    kind: "dedupe";
    dedupeBy: "url" | "id" | "title";
    name?: string | undefined;
}, {
    kind: "dedupe";
    name?: string | undefined;
    dedupeBy?: "url" | "id" | "title" | undefined;
}>;
/**
 * Pipeline step: Filter items by criteria
 */
export declare const FilterStepSchema: z.ZodObject<{
    kind: z.ZodLiteral<"filter">;
    name: z.ZodOptional<z.ZodString>;
    maxItems: z.ZodOptional<z.ZodNumber>;
    minScore: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    kind: "filter";
    maxItems?: number | undefined;
    name?: string | undefined;
    minScore?: number | undefined;
}, {
    kind: "filter";
    maxItems?: number | undefined;
    name?: string | undefined;
    minScore?: number | undefined;
}>;
/**
 * Pipeline step: Sort items
 */
export declare const SortStepSchema: z.ZodObject<{
    kind: z.ZodLiteral<"sort">;
    name: z.ZodOptional<z.ZodString>;
    sortBy: z.ZodDefault<z.ZodEnum<["publishedAt", "score", "relevance"]>>;
    order: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    kind: "sort";
    sortBy: "publishedAt" | "score" | "relevance";
    order: "asc" | "desc";
    name?: string | undefined;
}, {
    kind: "sort";
    name?: string | undefined;
    sortBy?: "publishedAt" | "score" | "relevance" | undefined;
    order?: "asc" | "desc" | undefined;
}>;
/**
 * Pipeline step: LLM summarization
 */
export declare const SummarizeStepSchema: z.ZodObject<{
    kind: z.ZodLiteral<"summarize">;
    name: z.ZodOptional<z.ZodString>;
    promptTemplateId: z.ZodString;
    model: z.ZodDefault<z.ZodEnum<["gpt-4", "gpt-3.5-turbo", "claude-3-opus", "claude-3-sonnet"]>>;
    maxTokens: z.ZodDefault<z.ZodNumber>;
    perItem: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    kind: "summarize";
    promptTemplateId: string;
    model: "gpt-4" | "gpt-3.5-turbo" | "claude-3-opus" | "claude-3-sonnet";
    maxTokens: number;
    perItem: boolean;
    name?: string | undefined;
}, {
    kind: "summarize";
    promptTemplateId: string;
    name?: string | undefined;
    model?: "gpt-4" | "gpt-3.5-turbo" | "claude-3-opus" | "claude-3-sonnet" | undefined;
    maxTokens?: number | undefined;
    perItem?: boolean | undefined;
}>;
/**
 * Pipeline step: LLM ranking/scoring
 */
export declare const RankStepSchema: z.ZodObject<{
    kind: z.ZodLiteral<"rank">;
    name: z.ZodOptional<z.ZodString>;
    promptTemplateId: z.ZodString;
    model: z.ZodDefault<z.ZodEnum<["gpt-4", "gpt-3.5-turbo", "claude-3-opus", "claude-3-sonnet"]>>;
}, "strip", z.ZodTypeAny, {
    kind: "rank";
    promptTemplateId: string;
    model: "gpt-4" | "gpt-3.5-turbo" | "claude-3-opus" | "claude-3-sonnet";
    name?: string | undefined;
}, {
    kind: "rank";
    promptTemplateId: string;
    name?: string | undefined;
    model?: "gpt-4" | "gpt-3.5-turbo" | "claude-3-opus" | "claude-3-sonnet" | undefined;
}>;
/**
 * Pipeline step: LLM transformation
 */
export declare const TransformStepSchema: z.ZodObject<{
    kind: z.ZodLiteral<"transform">;
    name: z.ZodOptional<z.ZodString>;
    promptTemplateId: z.ZodString;
    model: z.ZodDefault<z.ZodEnum<["gpt-4", "gpt-3.5-turbo", "claude-3-opus", "claude-3-sonnet"]>>;
    outputFormat: z.ZodDefault<z.ZodEnum<["json", "text", "markdown"]>>;
}, "strip", z.ZodTypeAny, {
    kind: "transform";
    promptTemplateId: string;
    model: "gpt-4" | "gpt-3.5-turbo" | "claude-3-opus" | "claude-3-sonnet";
    outputFormat: "json" | "text" | "markdown";
    name?: string | undefined;
}, {
    kind: "transform";
    promptTemplateId: string;
    name?: string | undefined;
    model?: "gpt-4" | "gpt-3.5-turbo" | "claude-3-opus" | "claude-3-sonnet" | undefined;
    outputFormat?: "json" | "text" | "markdown" | undefined;
}>;
/**
 * Pipeline step: Custom code (for advanced mode)
 */
export declare const CustomStepSchema: z.ZodObject<{
    kind: z.ZodLiteral<"custom">;
    name: z.ZodOptional<z.ZodString>;
    customStepId: z.ZodString;
    config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    kind: "custom";
    customStepId: string;
    name?: string | undefined;
    config?: Record<string, any> | undefined;
}, {
    kind: "custom";
    customStepId: string;
    name?: string | undefined;
    config?: Record<string, any> | undefined;
}>;
/**
 * Pipeline step: Date range filter
 */
export declare const DateFilterStepSchema: z.ZodObject<{
    kind: z.ZodLiteral<"date_filter">;
    name: z.ZodOptional<z.ZodString>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
    timeRange: z.ZodOptional<z.ZodEnum<["1h", "6h", "24h", "7d", "30d"]>>;
}, "strip", z.ZodTypeAny, {
    kind: "date_filter";
    timeRange?: "1h" | "6h" | "24h" | "7d" | "30d" | undefined;
    name?: string | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
}, {
    kind: "date_filter";
    timeRange?: "1h" | "6h" | "24h" | "7d" | "30d" | undefined;
    name?: string | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
}>;
/**
 * Pipeline step: Keyword filter
 */
export declare const KeywordFilterStepSchema: z.ZodObject<{
    kind: z.ZodLiteral<"keyword_filter">;
    name: z.ZodOptional<z.ZodString>;
    include: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    exclude: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    caseSensitive: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    kind: "keyword_filter";
    caseSensitive: boolean;
    name?: string | undefined;
    include?: string[] | undefined;
    exclude?: string[] | undefined;
}, {
    kind: "keyword_filter";
    name?: string | undefined;
    include?: string[] | undefined;
    exclude?: string[] | undefined;
    caseSensitive?: boolean | undefined;
}>;
/**
 * Pipeline step: Limit count
 */
export declare const LimitFilterStepSchema: z.ZodObject<{
    kind: z.ZodLiteral<"limit_filter">;
    name: z.ZodOptional<z.ZodString>;
    maxItems: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    kind: "limit_filter";
    maxItems: number;
    name?: string | undefined;
}, {
    kind: "limit_filter";
    maxItems: number;
    name?: string | undefined;
}>;
/**
 * Pipeline step: Sentiment filter
 */
export declare const SentimentFilterStepSchema: z.ZodObject<{
    kind: z.ZodLiteral<"sentiment_filter">;
    name: z.ZodOptional<z.ZodString>;
    sentiment: z.ZodEnum<["positive", "negative", "neutral"]>;
}, "strip", z.ZodTypeAny, {
    kind: "sentiment_filter";
    sentiment: "positive" | "negative" | "neutral";
    name?: string | undefined;
}, {
    kind: "sentiment_filter";
    sentiment: "positive" | "negative" | "neutral";
    name?: string | undefined;
}>;
/**
 * Pipeline step: Length filter
 */
export declare const LengthFilterStepSchema: z.ZodObject<{
    kind: z.ZodLiteral<"length_filter">;
    name: z.ZodOptional<z.ZodString>;
    minLength: z.ZodOptional<z.ZodNumber>;
    maxLength: z.ZodOptional<z.ZodNumber>;
    measureBy: z.ZodDefault<z.ZodEnum<["characters", "words"]>>;
}, "strip", z.ZodTypeAny, {
    kind: "length_filter";
    measureBy: "characters" | "words";
    name?: string | undefined;
    minLength?: number | undefined;
    maxLength?: number | undefined;
}, {
    kind: "length_filter";
    name?: string | undefined;
    minLength?: number | undefined;
    maxLength?: number | undefined;
    measureBy?: "characters" | "words" | undefined;
}>;
/**
 * Pipeline step: Score threshold filter
 */
export declare const ScoreFilterStepSchema: z.ZodObject<{
    kind: z.ZodLiteral<"score_filter">;
    name: z.ZodOptional<z.ZodString>;
    minScore: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    kind: "score_filter";
    minScore: number;
    name?: string | undefined;
}, {
    kind: "score_filter";
    minScore: number;
    name?: string | undefined;
}>;
/**
 * Pipeline step: Regex pattern filter
 */
export declare const RegexFilterStepSchema: z.ZodObject<{
    kind: z.ZodLiteral<"regex_filter">;
    name: z.ZodOptional<z.ZodString>;
    pattern: z.ZodString;
    field: z.ZodDefault<z.ZodEnum<["title", "summary", "content"]>>;
}, "strip", z.ZodTypeAny, {
    kind: "regex_filter";
    pattern: string;
    field: "title" | "summary" | "content";
    name?: string | undefined;
}, {
    kind: "regex_filter";
    pattern: string;
    name?: string | undefined;
    field?: "title" | "summary" | "content" | undefined;
}>;
/**
 * Pipeline step: Author/source filter
 */
export declare const AuthorFilterStepSchema: z.ZodObject<{
    kind: z.ZodLiteral<"author_filter">;
    name: z.ZodOptional<z.ZodString>;
    include: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    exclude: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    kind: "author_filter";
    name?: string | undefined;
    include?: string[] | undefined;
    exclude?: string[] | undefined;
}, {
    kind: "author_filter";
    name?: string | undefined;
    include?: string[] | undefined;
    exclude?: string[] | undefined;
}>;
/**
 * Pipeline step: Language filter
 */
export declare const LanguageFilterStepSchema: z.ZodObject<{
    kind: z.ZodLiteral<"language_filter">;
    name: z.ZodOptional<z.ZodString>;
    languages: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    kind: "language_filter";
    languages: string[];
    name?: string | undefined;
}, {
    kind: "language_filter";
    languages: string[];
    name?: string | undefined;
}>;
/**
 * Pipeline step: Top N filter
 */
export declare const TopNFilterStepSchema: z.ZodObject<{
    kind: z.ZodLiteral<"top_n_filter">;
    name: z.ZodOptional<z.ZodString>;
    n: z.ZodNumber;
    sortBy: z.ZodEnum<["score", "publishedAt", "relevance"]>;
}, "strip", z.ZodTypeAny, {
    kind: "top_n_filter";
    sortBy: "publishedAt" | "score" | "relevance";
    n: number;
    name?: string | undefined;
}, {
    kind: "top_n_filter";
    sortBy: "publishedAt" | "score" | "relevance";
    n: number;
    name?: string | undefined;
}>;
/**
 * Pipeline step: Random sample filter
 */
export declare const RandomSampleFilterStepSchema: z.ZodObject<{
    kind: z.ZodLiteral<"random_sample_filter">;
    name: z.ZodOptional<z.ZodString>;
    sampleSize: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    kind: "random_sample_filter";
    sampleSize: number;
    name?: string | undefined;
}, {
    kind: "random_sample_filter";
    sampleSize: number;
    name?: string | undefined;
}>;
/**
 * Pipeline step: Has media filter
 */
export declare const HasMediaFilterStepSchema: z.ZodObject<{
    kind: z.ZodLiteral<"has_media_filter">;
    name: z.ZodOptional<z.ZodString>;
    mediaType: z.ZodDefault<z.ZodEnum<["image", "video", "any"]>>;
}, "strip", z.ZodTypeAny, {
    kind: "has_media_filter";
    mediaType: "image" | "video" | "any";
    name?: string | undefined;
}, {
    kind: "has_media_filter";
    name?: string | undefined;
    mediaType?: "image" | "video" | "any" | undefined;
}>;
/**
 * Pipeline step: Sentiment analysis
 */
export declare const SentimentAnalysisStepSchema: z.ZodObject<{
    kind: z.ZodLiteral<"sentiment_analysis">;
    name: z.ZodOptional<z.ZodString>;
    model: z.ZodDefault<z.ZodEnum<["simple", "advanced"]>>;
}, "strip", z.ZodTypeAny, {
    kind: "sentiment_analysis";
    model: "simple" | "advanced";
    name?: string | undefined;
}, {
    kind: "sentiment_analysis";
    name?: string | undefined;
    model?: "simple" | "advanced" | undefined;
}>;
/**
 * Pipeline step: Entity extraction
 */
export declare const EntityExtractionStepSchema: z.ZodObject<{
    kind: z.ZodLiteral<"entity_extraction">;
    name: z.ZodOptional<z.ZodString>;
    entityTypes: z.ZodDefault<z.ZodArray<z.ZodEnum<["person", "organization", "location", "date"]>, "many">>;
}, "strip", z.ZodTypeAny, {
    kind: "entity_extraction";
    entityTypes: ("date" | "person" | "organization" | "location")[];
    name?: string | undefined;
}, {
    kind: "entity_extraction";
    name?: string | undefined;
    entityTypes?: ("date" | "person" | "organization" | "location")[] | undefined;
}>;
/**
 * Pipeline step: Category classification
 */
export declare const CategoryClassificationStepSchema: z.ZodObject<{
    kind: z.ZodLiteral<"category_classification">;
    name: z.ZodOptional<z.ZodString>;
    categories: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    kind: "category_classification";
    name?: string | undefined;
    categories?: string[] | undefined;
}, {
    kind: "category_classification";
    name?: string | undefined;
    categories?: string[] | undefined;
}>;
/**
 * Pipeline step: Translation
 */
export declare const TranslationStepSchema: z.ZodObject<{
    kind: z.ZodLiteral<"translation">;
    name: z.ZodOptional<z.ZodString>;
    targetLanguage: z.ZodString;
    translateFields: z.ZodDefault<z.ZodArray<z.ZodEnum<["title", "summary", "content"]>, "many">>;
}, "strip", z.ZodTypeAny, {
    kind: "translation";
    targetLanguage: string;
    translateFields: ("title" | "summary" | "content")[];
    name?: string | undefined;
}, {
    kind: "translation";
    targetLanguage: string;
    name?: string | undefined;
    translateFields?: ("title" | "summary" | "content")[] | undefined;
}>;
/**
 * Pipeline step: Text cleanup
 */
export declare const TextCleanupStepSchema: z.ZodObject<{
    kind: z.ZodLiteral<"text_cleanup">;
    name: z.ZodOptional<z.ZodString>;
    removeHTML: z.ZodDefault<z.ZodBoolean>;
    normalizeWhitespace: z.ZodDefault<z.ZodBoolean>;
    removeEmojis: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    kind: "text_cleanup";
    removeHTML: boolean;
    normalizeWhitespace: boolean;
    removeEmojis: boolean;
    name?: string | undefined;
}, {
    kind: "text_cleanup";
    name?: string | undefined;
    removeHTML?: boolean | undefined;
    normalizeWhitespace?: boolean | undefined;
    removeEmojis?: boolean | undefined;
}>;
/**
 * Pipeline step: URL extraction
 */
export declare const URLExtractionStepSchema: z.ZodObject<{
    kind: z.ZodLiteral<"url_extraction">;
    name: z.ZodOptional<z.ZodString>;
    expandShortLinks: z.ZodDefault<z.ZodBoolean>;
    extractDomain: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    kind: "url_extraction";
    expandShortLinks: boolean;
    extractDomain: boolean;
    name?: string | undefined;
}, {
    kind: "url_extraction";
    name?: string | undefined;
    expandShortLinks?: boolean | undefined;
    extractDomain?: boolean | undefined;
}>;
/**
 * Pipeline step: Scoring/ranking
 */
export declare const ScoringRankStepSchema: z.ZodObject<{
    kind: z.ZodLiteral<"scoring_rank">;
    name: z.ZodOptional<z.ZodString>;
    criteria: z.ZodString;
    model: z.ZodDefault<z.ZodEnum<["gpt-4", "gpt-3.5-turbo", "claude-3-opus", "claude-3-sonnet"]>>;
}, "strip", z.ZodTypeAny, {
    kind: "scoring_rank";
    model: "gpt-4" | "gpt-3.5-turbo" | "claude-3-opus" | "claude-3-sonnet";
    criteria: string;
    name?: string | undefined;
}, {
    kind: "scoring_rank";
    criteria: string;
    name?: string | undefined;
    model?: "gpt-4" | "gpt-3.5-turbo" | "claude-3-opus" | "claude-3-sonnet" | undefined;
}>;
/**
 * Pipeline step: Field mapping
 */
export declare const FieldMappingStepSchema: z.ZodObject<{
    kind: z.ZodLiteral<"field_mapping">;
    name: z.ZodOptional<z.ZodString>;
    mappings: z.ZodRecord<z.ZodString, z.ZodString>;
}, "strip", z.ZodTypeAny, {
    kind: "field_mapping";
    mappings: Record<string, string>;
    name?: string | undefined;
}, {
    kind: "field_mapping";
    mappings: Record<string, string>;
    name?: string | undefined;
}>;
/**
 * Pipeline step: Merge items
 */
export declare const MergeItemsStepSchema: z.ZodObject<{
    kind: z.ZodLiteral<"merge_items">;
    name: z.ZodOptional<z.ZodString>;
    mergeBy: z.ZodDefault<z.ZodEnum<["title", "url", "id"]>>;
}, "strip", z.ZodTypeAny, {
    kind: "merge_items";
    mergeBy: "url" | "id" | "title";
    name?: string | undefined;
}, {
    kind: "merge_items";
    name?: string | undefined;
    mergeBy?: "url" | "id" | "title" | undefined;
}>;
/**
 * Pipeline step: Enrich data
 */
export declare const EnrichDataStepSchema: z.ZodObject<{
    kind: z.ZodLiteral<"enrich_data">;
    name: z.ZodOptional<z.ZodString>;
    apiUrl: z.ZodString;
    headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    fieldMapping: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    kind: "enrich_data";
    apiUrl: string;
    headers?: Record<string, string> | undefined;
    name?: string | undefined;
    fieldMapping?: Record<string, string> | undefined;
}, {
    kind: "enrich_data";
    apiUrl: string;
    headers?: Record<string, string> | undefined;
    name?: string | undefined;
    fieldMapping?: Record<string, string> | undefined;
}>;
/**
 * Pipeline step: Claude Agent (runtime AI)
 */
export declare const ClaudeAgentStepSchema: z.ZodObject<{
    kind: z.ZodLiteral<"claude_agent">;
    name: z.ZodOptional<z.ZodString>;
    systemPrompt: z.ZodString;
    userPromptTemplate: z.ZodString;
    model: z.ZodDefault<z.ZodEnum<["claude-3-5-sonnet-20241022", "claude-3-haiku-20240307"]>>;
    maxTokens: z.ZodDefault<z.ZodNumber>;
    outputField: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    kind: "claude_agent";
    model: "claude-3-5-sonnet-20241022" | "claude-3-haiku-20240307";
    maxTokens: number;
    systemPrompt: string;
    userPromptTemplate: string;
    outputField: string;
    name?: string | undefined;
}, {
    kind: "claude_agent";
    systemPrompt: string;
    userPromptTemplate: string;
    name?: string | undefined;
    model?: "claude-3-5-sonnet-20241022" | "claude-3-haiku-20240307" | undefined;
    maxTokens?: number | undefined;
    outputField?: string | undefined;
}>;
/**
 * Union of all pipeline step types
 */
export declare const PipelineStepSchema: z.ZodDiscriminatedUnion<"kind", [z.ZodObject<{
    kind: z.ZodLiteral<"fetch">;
    name: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    kind: "fetch";
    name?: string | undefined;
}, {
    kind: "fetch";
    name?: string | undefined;
}>, z.ZodObject<{
    kind: z.ZodLiteral<"dedupe">;
    name: z.ZodOptional<z.ZodString>;
    dedupeBy: z.ZodDefault<z.ZodEnum<["url", "id", "title"]>>;
}, "strip", z.ZodTypeAny, {
    kind: "dedupe";
    dedupeBy: "url" | "id" | "title";
    name?: string | undefined;
}, {
    kind: "dedupe";
    name?: string | undefined;
    dedupeBy?: "url" | "id" | "title" | undefined;
}>, z.ZodObject<{
    kind: z.ZodLiteral<"filter">;
    name: z.ZodOptional<z.ZodString>;
    maxItems: z.ZodOptional<z.ZodNumber>;
    minScore: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    kind: "filter";
    maxItems?: number | undefined;
    name?: string | undefined;
    minScore?: number | undefined;
}, {
    kind: "filter";
    maxItems?: number | undefined;
    name?: string | undefined;
    minScore?: number | undefined;
}>, z.ZodObject<{
    kind: z.ZodLiteral<"sort">;
    name: z.ZodOptional<z.ZodString>;
    sortBy: z.ZodDefault<z.ZodEnum<["publishedAt", "score", "relevance"]>>;
    order: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    kind: "sort";
    sortBy: "publishedAt" | "score" | "relevance";
    order: "asc" | "desc";
    name?: string | undefined;
}, {
    kind: "sort";
    name?: string | undefined;
    sortBy?: "publishedAt" | "score" | "relevance" | undefined;
    order?: "asc" | "desc" | undefined;
}>, z.ZodObject<{
    kind: z.ZodLiteral<"summarize">;
    name: z.ZodOptional<z.ZodString>;
    promptTemplateId: z.ZodString;
    model: z.ZodDefault<z.ZodEnum<["gpt-4", "gpt-3.5-turbo", "claude-3-opus", "claude-3-sonnet"]>>;
    maxTokens: z.ZodDefault<z.ZodNumber>;
    perItem: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    kind: "summarize";
    promptTemplateId: string;
    model: "gpt-4" | "gpt-3.5-turbo" | "claude-3-opus" | "claude-3-sonnet";
    maxTokens: number;
    perItem: boolean;
    name?: string | undefined;
}, {
    kind: "summarize";
    promptTemplateId: string;
    name?: string | undefined;
    model?: "gpt-4" | "gpt-3.5-turbo" | "claude-3-opus" | "claude-3-sonnet" | undefined;
    maxTokens?: number | undefined;
    perItem?: boolean | undefined;
}>, z.ZodObject<{
    kind: z.ZodLiteral<"rank">;
    name: z.ZodOptional<z.ZodString>;
    promptTemplateId: z.ZodString;
    model: z.ZodDefault<z.ZodEnum<["gpt-4", "gpt-3.5-turbo", "claude-3-opus", "claude-3-sonnet"]>>;
}, "strip", z.ZodTypeAny, {
    kind: "rank";
    promptTemplateId: string;
    model: "gpt-4" | "gpt-3.5-turbo" | "claude-3-opus" | "claude-3-sonnet";
    name?: string | undefined;
}, {
    kind: "rank";
    promptTemplateId: string;
    name?: string | undefined;
    model?: "gpt-4" | "gpt-3.5-turbo" | "claude-3-opus" | "claude-3-sonnet" | undefined;
}>, z.ZodObject<{
    kind: z.ZodLiteral<"transform">;
    name: z.ZodOptional<z.ZodString>;
    promptTemplateId: z.ZodString;
    model: z.ZodDefault<z.ZodEnum<["gpt-4", "gpt-3.5-turbo", "claude-3-opus", "claude-3-sonnet"]>>;
    outputFormat: z.ZodDefault<z.ZodEnum<["json", "text", "markdown"]>>;
}, "strip", z.ZodTypeAny, {
    kind: "transform";
    promptTemplateId: string;
    model: "gpt-4" | "gpt-3.5-turbo" | "claude-3-opus" | "claude-3-sonnet";
    outputFormat: "json" | "text" | "markdown";
    name?: string | undefined;
}, {
    kind: "transform";
    promptTemplateId: string;
    name?: string | undefined;
    model?: "gpt-4" | "gpt-3.5-turbo" | "claude-3-opus" | "claude-3-sonnet" | undefined;
    outputFormat?: "json" | "text" | "markdown" | undefined;
}>, z.ZodObject<{
    kind: z.ZodLiteral<"custom">;
    name: z.ZodOptional<z.ZodString>;
    customStepId: z.ZodString;
    config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    kind: "custom";
    customStepId: string;
    name?: string | undefined;
    config?: Record<string, any> | undefined;
}, {
    kind: "custom";
    customStepId: string;
    name?: string | undefined;
    config?: Record<string, any> | undefined;
}>, z.ZodObject<{
    kind: z.ZodLiteral<"date_filter">;
    name: z.ZodOptional<z.ZodString>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
    timeRange: z.ZodOptional<z.ZodEnum<["1h", "6h", "24h", "7d", "30d"]>>;
}, "strip", z.ZodTypeAny, {
    kind: "date_filter";
    timeRange?: "1h" | "6h" | "24h" | "7d" | "30d" | undefined;
    name?: string | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
}, {
    kind: "date_filter";
    timeRange?: "1h" | "6h" | "24h" | "7d" | "30d" | undefined;
    name?: string | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
}>, z.ZodObject<{
    kind: z.ZodLiteral<"keyword_filter">;
    name: z.ZodOptional<z.ZodString>;
    include: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    exclude: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    caseSensitive: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    kind: "keyword_filter";
    caseSensitive: boolean;
    name?: string | undefined;
    include?: string[] | undefined;
    exclude?: string[] | undefined;
}, {
    kind: "keyword_filter";
    name?: string | undefined;
    include?: string[] | undefined;
    exclude?: string[] | undefined;
    caseSensitive?: boolean | undefined;
}>, z.ZodObject<{
    kind: z.ZodLiteral<"limit_filter">;
    name: z.ZodOptional<z.ZodString>;
    maxItems: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    kind: "limit_filter";
    maxItems: number;
    name?: string | undefined;
}, {
    kind: "limit_filter";
    maxItems: number;
    name?: string | undefined;
}>, z.ZodObject<{
    kind: z.ZodLiteral<"sentiment_filter">;
    name: z.ZodOptional<z.ZodString>;
    sentiment: z.ZodEnum<["positive", "negative", "neutral"]>;
}, "strip", z.ZodTypeAny, {
    kind: "sentiment_filter";
    sentiment: "positive" | "negative" | "neutral";
    name?: string | undefined;
}, {
    kind: "sentiment_filter";
    sentiment: "positive" | "negative" | "neutral";
    name?: string | undefined;
}>, z.ZodObject<{
    kind: z.ZodLiteral<"length_filter">;
    name: z.ZodOptional<z.ZodString>;
    minLength: z.ZodOptional<z.ZodNumber>;
    maxLength: z.ZodOptional<z.ZodNumber>;
    measureBy: z.ZodDefault<z.ZodEnum<["characters", "words"]>>;
}, "strip", z.ZodTypeAny, {
    kind: "length_filter";
    measureBy: "characters" | "words";
    name?: string | undefined;
    minLength?: number | undefined;
    maxLength?: number | undefined;
}, {
    kind: "length_filter";
    name?: string | undefined;
    minLength?: number | undefined;
    maxLength?: number | undefined;
    measureBy?: "characters" | "words" | undefined;
}>, z.ZodObject<{
    kind: z.ZodLiteral<"score_filter">;
    name: z.ZodOptional<z.ZodString>;
    minScore: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    kind: "score_filter";
    minScore: number;
    name?: string | undefined;
}, {
    kind: "score_filter";
    minScore: number;
    name?: string | undefined;
}>, z.ZodObject<{
    kind: z.ZodLiteral<"regex_filter">;
    name: z.ZodOptional<z.ZodString>;
    pattern: z.ZodString;
    field: z.ZodDefault<z.ZodEnum<["title", "summary", "content"]>>;
}, "strip", z.ZodTypeAny, {
    kind: "regex_filter";
    pattern: string;
    field: "title" | "summary" | "content";
    name?: string | undefined;
}, {
    kind: "regex_filter";
    pattern: string;
    name?: string | undefined;
    field?: "title" | "summary" | "content" | undefined;
}>, z.ZodObject<{
    kind: z.ZodLiteral<"author_filter">;
    name: z.ZodOptional<z.ZodString>;
    include: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    exclude: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    kind: "author_filter";
    name?: string | undefined;
    include?: string[] | undefined;
    exclude?: string[] | undefined;
}, {
    kind: "author_filter";
    name?: string | undefined;
    include?: string[] | undefined;
    exclude?: string[] | undefined;
}>, z.ZodObject<{
    kind: z.ZodLiteral<"language_filter">;
    name: z.ZodOptional<z.ZodString>;
    languages: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    kind: "language_filter";
    languages: string[];
    name?: string | undefined;
}, {
    kind: "language_filter";
    languages: string[];
    name?: string | undefined;
}>, z.ZodObject<{
    kind: z.ZodLiteral<"top_n_filter">;
    name: z.ZodOptional<z.ZodString>;
    n: z.ZodNumber;
    sortBy: z.ZodEnum<["score", "publishedAt", "relevance"]>;
}, "strip", z.ZodTypeAny, {
    kind: "top_n_filter";
    sortBy: "publishedAt" | "score" | "relevance";
    n: number;
    name?: string | undefined;
}, {
    kind: "top_n_filter";
    sortBy: "publishedAt" | "score" | "relevance";
    n: number;
    name?: string | undefined;
}>, z.ZodObject<{
    kind: z.ZodLiteral<"random_sample_filter">;
    name: z.ZodOptional<z.ZodString>;
    sampleSize: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    kind: "random_sample_filter";
    sampleSize: number;
    name?: string | undefined;
}, {
    kind: "random_sample_filter";
    sampleSize: number;
    name?: string | undefined;
}>, z.ZodObject<{
    kind: z.ZodLiteral<"has_media_filter">;
    name: z.ZodOptional<z.ZodString>;
    mediaType: z.ZodDefault<z.ZodEnum<["image", "video", "any"]>>;
}, "strip", z.ZodTypeAny, {
    kind: "has_media_filter";
    mediaType: "image" | "video" | "any";
    name?: string | undefined;
}, {
    kind: "has_media_filter";
    name?: string | undefined;
    mediaType?: "image" | "video" | "any" | undefined;
}>, z.ZodObject<{
    kind: z.ZodLiteral<"sentiment_analysis">;
    name: z.ZodOptional<z.ZodString>;
    model: z.ZodDefault<z.ZodEnum<["simple", "advanced"]>>;
}, "strip", z.ZodTypeAny, {
    kind: "sentiment_analysis";
    model: "simple" | "advanced";
    name?: string | undefined;
}, {
    kind: "sentiment_analysis";
    name?: string | undefined;
    model?: "simple" | "advanced" | undefined;
}>, z.ZodObject<{
    kind: z.ZodLiteral<"entity_extraction">;
    name: z.ZodOptional<z.ZodString>;
    entityTypes: z.ZodDefault<z.ZodArray<z.ZodEnum<["person", "organization", "location", "date"]>, "many">>;
}, "strip", z.ZodTypeAny, {
    kind: "entity_extraction";
    entityTypes: ("date" | "person" | "organization" | "location")[];
    name?: string | undefined;
}, {
    kind: "entity_extraction";
    name?: string | undefined;
    entityTypes?: ("date" | "person" | "organization" | "location")[] | undefined;
}>, z.ZodObject<{
    kind: z.ZodLiteral<"category_classification">;
    name: z.ZodOptional<z.ZodString>;
    categories: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    kind: "category_classification";
    name?: string | undefined;
    categories?: string[] | undefined;
}, {
    kind: "category_classification";
    name?: string | undefined;
    categories?: string[] | undefined;
}>, z.ZodObject<{
    kind: z.ZodLiteral<"translation">;
    name: z.ZodOptional<z.ZodString>;
    targetLanguage: z.ZodString;
    translateFields: z.ZodDefault<z.ZodArray<z.ZodEnum<["title", "summary", "content"]>, "many">>;
}, "strip", z.ZodTypeAny, {
    kind: "translation";
    targetLanguage: string;
    translateFields: ("title" | "summary" | "content")[];
    name?: string | undefined;
}, {
    kind: "translation";
    targetLanguage: string;
    name?: string | undefined;
    translateFields?: ("title" | "summary" | "content")[] | undefined;
}>, z.ZodObject<{
    kind: z.ZodLiteral<"text_cleanup">;
    name: z.ZodOptional<z.ZodString>;
    removeHTML: z.ZodDefault<z.ZodBoolean>;
    normalizeWhitespace: z.ZodDefault<z.ZodBoolean>;
    removeEmojis: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    kind: "text_cleanup";
    removeHTML: boolean;
    normalizeWhitespace: boolean;
    removeEmojis: boolean;
    name?: string | undefined;
}, {
    kind: "text_cleanup";
    name?: string | undefined;
    removeHTML?: boolean | undefined;
    normalizeWhitespace?: boolean | undefined;
    removeEmojis?: boolean | undefined;
}>, z.ZodObject<{
    kind: z.ZodLiteral<"url_extraction">;
    name: z.ZodOptional<z.ZodString>;
    expandShortLinks: z.ZodDefault<z.ZodBoolean>;
    extractDomain: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    kind: "url_extraction";
    expandShortLinks: boolean;
    extractDomain: boolean;
    name?: string | undefined;
}, {
    kind: "url_extraction";
    name?: string | undefined;
    expandShortLinks?: boolean | undefined;
    extractDomain?: boolean | undefined;
}>, z.ZodObject<{
    kind: z.ZodLiteral<"scoring_rank">;
    name: z.ZodOptional<z.ZodString>;
    criteria: z.ZodString;
    model: z.ZodDefault<z.ZodEnum<["gpt-4", "gpt-3.5-turbo", "claude-3-opus", "claude-3-sonnet"]>>;
}, "strip", z.ZodTypeAny, {
    kind: "scoring_rank";
    model: "gpt-4" | "gpt-3.5-turbo" | "claude-3-opus" | "claude-3-sonnet";
    criteria: string;
    name?: string | undefined;
}, {
    kind: "scoring_rank";
    criteria: string;
    name?: string | undefined;
    model?: "gpt-4" | "gpt-3.5-turbo" | "claude-3-opus" | "claude-3-sonnet" | undefined;
}>, z.ZodObject<{
    kind: z.ZodLiteral<"field_mapping">;
    name: z.ZodOptional<z.ZodString>;
    mappings: z.ZodRecord<z.ZodString, z.ZodString>;
}, "strip", z.ZodTypeAny, {
    kind: "field_mapping";
    mappings: Record<string, string>;
    name?: string | undefined;
}, {
    kind: "field_mapping";
    mappings: Record<string, string>;
    name?: string | undefined;
}>, z.ZodObject<{
    kind: z.ZodLiteral<"merge_items">;
    name: z.ZodOptional<z.ZodString>;
    mergeBy: z.ZodDefault<z.ZodEnum<["title", "url", "id"]>>;
}, "strip", z.ZodTypeAny, {
    kind: "merge_items";
    mergeBy: "url" | "id" | "title";
    name?: string | undefined;
}, {
    kind: "merge_items";
    name?: string | undefined;
    mergeBy?: "url" | "id" | "title" | undefined;
}>, z.ZodObject<{
    kind: z.ZodLiteral<"enrich_data">;
    name: z.ZodOptional<z.ZodString>;
    apiUrl: z.ZodString;
    headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    fieldMapping: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    kind: "enrich_data";
    apiUrl: string;
    headers?: Record<string, string> | undefined;
    name?: string | undefined;
    fieldMapping?: Record<string, string> | undefined;
}, {
    kind: "enrich_data";
    apiUrl: string;
    headers?: Record<string, string> | undefined;
    name?: string | undefined;
    fieldMapping?: Record<string, string> | undefined;
}>, z.ZodObject<{
    kind: z.ZodLiteral<"claude_agent">;
    name: z.ZodOptional<z.ZodString>;
    systemPrompt: z.ZodString;
    userPromptTemplate: z.ZodString;
    model: z.ZodDefault<z.ZodEnum<["claude-3-5-sonnet-20241022", "claude-3-haiku-20240307"]>>;
    maxTokens: z.ZodDefault<z.ZodNumber>;
    outputField: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    kind: "claude_agent";
    model: "claude-3-5-sonnet-20241022" | "claude-3-haiku-20240307";
    maxTokens: number;
    systemPrompt: string;
    userPromptTemplate: string;
    outputField: string;
    name?: string | undefined;
}, {
    kind: "claude_agent";
    systemPrompt: string;
    userPromptTemplate: string;
    name?: string | undefined;
    model?: "claude-3-5-sonnet-20241022" | "claude-3-haiku-20240307" | undefined;
    maxTokens?: number | undefined;
    outputField?: string | undefined;
}>]>;
export type PipelineStep = z.infer<typeof PipelineStepSchema>;
export type FetchStep = z.infer<typeof FetchStepSchema>;
export type DedupeStep = z.infer<typeof DedupeStepSchema>;
export type FilterStep = z.infer<typeof FilterStepSchema>;
export type SortStep = z.infer<typeof SortStepSchema>;
export type SummarizeStep = z.infer<typeof SummarizeStepSchema>;
export type RankStep = z.infer<typeof RankStepSchema>;
export type TransformStep = z.infer<typeof TransformStepSchema>;
export type CustomStep = z.infer<typeof CustomStepSchema>;
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
