import { z } from 'zod';
/**
 * Built-in source types
 */
export declare const BuiltInSourceKindSchema: z.ZodEnum<["arxiv", "reddit", "hackernews", "youtube", "twitter", "rss", "http_json", "web_scraper", "github", "producthunt", "news_api", "google_news", "crypto_price", "stock_price", "weather", "gmail", "podcast"]>;
export type BuiltInSourceKind = z.infer<typeof BuiltInSourceKindSchema>;
/**
 * Built-in source configuration
 */
export declare const BuiltInSourceConfigSchema: z.ZodObject<{
    kind: z.ZodLiteral<"builtin">;
    sourceType: z.ZodEnum<["arxiv", "reddit", "hackernews", "youtube", "twitter", "rss", "http_json", "web_scraper", "github", "producthunt", "news_api", "google_news", "crypto_price", "stock_price", "weather", "gmail", "podcast"]>;
    query: z.ZodOptional<z.ZodString>;
    maxItems: z.ZodDefault<z.ZodNumber>;
    timeRange: z.ZodOptional<z.ZodEnum<["1h", "6h", "24h", "7d", "30d"]>>;
    feedUrl: z.ZodOptional<z.ZodString>;
    url: z.ZodOptional<z.ZodString>;
    method: z.ZodOptional<z.ZodEnum<["GET", "POST"]>>;
    headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    jsonPath: z.ZodOptional<z.ZodString>;
    extractMode: z.ZodOptional<z.ZodEnum<["single", "list"]>>;
    selectors: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    kind: "builtin";
    sourceType: "arxiv" | "reddit" | "hackernews" | "youtube" | "twitter" | "rss" | "http_json" | "web_scraper" | "github" | "producthunt" | "news_api" | "google_news" | "crypto_price" | "stock_price" | "weather" | "gmail" | "podcast";
    maxItems: number;
    query?: string | undefined;
    timeRange?: "1h" | "6h" | "24h" | "7d" | "30d" | undefined;
    feedUrl?: string | undefined;
    url?: string | undefined;
    method?: "GET" | "POST" | undefined;
    headers?: Record<string, string> | undefined;
    jsonPath?: string | undefined;
    extractMode?: "single" | "list" | undefined;
    selectors?: Record<string, string> | undefined;
}, {
    kind: "builtin";
    sourceType: "arxiv" | "reddit" | "hackernews" | "youtube" | "twitter" | "rss" | "http_json" | "web_scraper" | "github" | "producthunt" | "news_api" | "google_news" | "crypto_price" | "stock_price" | "weather" | "gmail" | "podcast";
    query?: string | undefined;
    maxItems?: number | undefined;
    timeRange?: "1h" | "6h" | "24h" | "7d" | "30d" | undefined;
    feedUrl?: string | undefined;
    url?: string | undefined;
    method?: "GET" | "POST" | undefined;
    headers?: Record<string, string> | undefined;
    jsonPath?: string | undefined;
    extractMode?: "single" | "list" | undefined;
    selectors?: Record<string, string> | undefined;
}>;
/**
 * User-defined source reference (will be expanded in Sprint 2)
 */
export declare const UserSourceRefSchema: z.ZodObject<{
    kind: z.ZodLiteral<"user_source_ref">;
    userSourceId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    kind: "user_source_ref";
    userSourceId: string;
}, {
    kind: "user_source_ref";
    userSourceId: string;
}>;
/**
 * Union of all data source types
 */
export declare const DataSourceConfigSchema: z.ZodDiscriminatedUnion<"kind", [z.ZodObject<{
    kind: z.ZodLiteral<"builtin">;
    sourceType: z.ZodEnum<["arxiv", "reddit", "hackernews", "youtube", "twitter", "rss", "http_json", "web_scraper", "github", "producthunt", "news_api", "google_news", "crypto_price", "stock_price", "weather", "gmail", "podcast"]>;
    query: z.ZodOptional<z.ZodString>;
    maxItems: z.ZodDefault<z.ZodNumber>;
    timeRange: z.ZodOptional<z.ZodEnum<["1h", "6h", "24h", "7d", "30d"]>>;
    feedUrl: z.ZodOptional<z.ZodString>;
    url: z.ZodOptional<z.ZodString>;
    method: z.ZodOptional<z.ZodEnum<["GET", "POST"]>>;
    headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    jsonPath: z.ZodOptional<z.ZodString>;
    extractMode: z.ZodOptional<z.ZodEnum<["single", "list"]>>;
    selectors: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    kind: "builtin";
    sourceType: "arxiv" | "reddit" | "hackernews" | "youtube" | "twitter" | "rss" | "http_json" | "web_scraper" | "github" | "producthunt" | "news_api" | "google_news" | "crypto_price" | "stock_price" | "weather" | "gmail" | "podcast";
    maxItems: number;
    query?: string | undefined;
    timeRange?: "1h" | "6h" | "24h" | "7d" | "30d" | undefined;
    feedUrl?: string | undefined;
    url?: string | undefined;
    method?: "GET" | "POST" | undefined;
    headers?: Record<string, string> | undefined;
    jsonPath?: string | undefined;
    extractMode?: "single" | "list" | undefined;
    selectors?: Record<string, string> | undefined;
}, {
    kind: "builtin";
    sourceType: "arxiv" | "reddit" | "hackernews" | "youtube" | "twitter" | "rss" | "http_json" | "web_scraper" | "github" | "producthunt" | "news_api" | "google_news" | "crypto_price" | "stock_price" | "weather" | "gmail" | "podcast";
    query?: string | undefined;
    maxItems?: number | undefined;
    timeRange?: "1h" | "6h" | "24h" | "7d" | "30d" | undefined;
    feedUrl?: string | undefined;
    url?: string | undefined;
    method?: "GET" | "POST" | undefined;
    headers?: Record<string, string> | undefined;
    jsonPath?: string | undefined;
    extractMode?: "single" | "list" | undefined;
    selectors?: Record<string, string> | undefined;
}>, z.ZodObject<{
    kind: z.ZodLiteral<"user_source_ref">;
    userSourceId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    kind: "user_source_ref";
    userSourceId: string;
}, {
    kind: "user_source_ref";
    userSourceId: string;
}>]>;
export type DataSourceConfig = z.infer<typeof DataSourceConfigSchema>;
export type BuiltInSourceConfig = z.infer<typeof BuiltInSourceConfigSchema>;
export type UserSourceRef = z.infer<typeof UserSourceRefSchema>;
