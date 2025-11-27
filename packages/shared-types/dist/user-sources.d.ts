import { z } from 'zod';
/**
 * RSS Source Configuration
 */
export declare const RssSourceConfigSchema: z.ZodObject<{
    feedUrl: z.ZodString;
    maxItems: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    maxItems: number;
    feedUrl: string;
}, {
    feedUrl: string;
    maxItems?: number | undefined;
}>;
export type RssSourceConfig = z.infer<typeof RssSourceConfigSchema>;
/**
 * HTTP JSON Source Configuration
 */
export declare const HttpJsonSourceConfigSchema: z.ZodObject<{
    url: z.ZodString;
    method: z.ZodDefault<z.ZodEnum<["GET", "POST"]>>;
    headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    body: z.ZodOptional<z.ZodString>;
    jsonPath: z.ZodString;
    maxItems: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    maxItems: number;
    url: string;
    method: "GET" | "POST";
    jsonPath: string;
    headers?: Record<string, string> | undefined;
    body?: string | undefined;
}, {
    url: string;
    jsonPath: string;
    maxItems?: number | undefined;
    method?: "GET" | "POST" | undefined;
    headers?: Record<string, string> | undefined;
    body?: string | undefined;
}>;
export type HttpJsonSourceConfig = z.infer<typeof HttpJsonSourceConfigSchema>;
/**
 * Web Scraper Source Configuration
 * Fetches and extracts structured content from web pages
 */
export declare const WebScraperSourceConfigSchema: z.ZodObject<{
    url: z.ZodString;
    refreshInterval: z.ZodDefault<z.ZodNumber>;
    selectors: z.ZodOptional<z.ZodObject<{
        container: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        summary: z.ZodOptional<z.ZodString>;
        content: z.ZodOptional<z.ZodString>;
        author: z.ZodOptional<z.ZodString>;
        publishedAt: z.ZodOptional<z.ZodString>;
        links: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        title?: string | undefined;
        publishedAt?: string | undefined;
        summary?: string | undefined;
        content?: string | undefined;
        author?: string | undefined;
        container?: string | undefined;
        links?: string | undefined;
    }, {
        title?: string | undefined;
        publishedAt?: string | undefined;
        summary?: string | undefined;
        content?: string | undefined;
        author?: string | undefined;
        container?: string | undefined;
        links?: string | undefined;
    }>>;
    extractMode: z.ZodDefault<z.ZodEnum<["single", "list"]>>;
    maxItems: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    maxItems: number;
    url: string;
    extractMode: "single" | "list";
    refreshInterval: number;
    selectors?: {
        title?: string | undefined;
        publishedAt?: string | undefined;
        summary?: string | undefined;
        content?: string | undefined;
        author?: string | undefined;
        container?: string | undefined;
        links?: string | undefined;
    } | undefined;
}, {
    url: string;
    maxItems?: number | undefined;
    extractMode?: "single" | "list" | undefined;
    selectors?: {
        title?: string | undefined;
        publishedAt?: string | undefined;
        summary?: string | undefined;
        content?: string | undefined;
        author?: string | undefined;
        container?: string | undefined;
        links?: string | undefined;
    } | undefined;
    refreshInterval?: number | undefined;
}>;
export type WebScraperSourceConfig = z.infer<typeof WebScraperSourceConfigSchema>;
/**
 * Normalization Configuration
 * Maps source fields to NormalizedItem fields
 */
export declare const NormalizationConfigSchema: z.ZodObject<{
    idPath: z.ZodOptional<z.ZodString>;
    titlePath: z.ZodOptional<z.ZodString>;
    summaryPath: z.ZodOptional<z.ZodString>;
    urlPath: z.ZodOptional<z.ZodString>;
    publishedAtPath: z.ZodOptional<z.ZodString>;
    authorPath: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    idPath?: string | undefined;
    titlePath?: string | undefined;
    summaryPath?: string | undefined;
    urlPath?: string | undefined;
    publishedAtPath?: string | undefined;
    authorPath?: string | undefined;
}, {
    idPath?: string | undefined;
    titlePath?: string | undefined;
    summaryPath?: string | undefined;
    urlPath?: string | undefined;
    publishedAtPath?: string | undefined;
    authorPath?: string | undefined;
}>;
export type NormalizationConfig = z.infer<typeof NormalizationConfigSchema>;
/**
 * User Source Definition (database model)
 */
export declare const UserSourceDefinitionSchema: z.ZodObject<{
    id: z.ZodString;
    owner_user_id: z.ZodOptional<z.ZodString>;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    kind: z.ZodEnum<["rss", "http_json", "web_scraper"]>;
    config_jsonb: z.ZodUnion<[z.ZodObject<{
        feedUrl: z.ZodString;
        maxItems: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        maxItems: number;
        feedUrl: string;
    }, {
        feedUrl: string;
        maxItems?: number | undefined;
    }>, z.ZodObject<{
        url: z.ZodString;
        method: z.ZodDefault<z.ZodEnum<["GET", "POST"]>>;
        headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
        body: z.ZodOptional<z.ZodString>;
        jsonPath: z.ZodString;
        maxItems: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        maxItems: number;
        url: string;
        method: "GET" | "POST";
        jsonPath: string;
        headers?: Record<string, string> | undefined;
        body?: string | undefined;
    }, {
        url: string;
        jsonPath: string;
        maxItems?: number | undefined;
        method?: "GET" | "POST" | undefined;
        headers?: Record<string, string> | undefined;
        body?: string | undefined;
    }>, z.ZodObject<{
        url: z.ZodString;
        refreshInterval: z.ZodDefault<z.ZodNumber>;
        selectors: z.ZodOptional<z.ZodObject<{
            container: z.ZodOptional<z.ZodString>;
            title: z.ZodOptional<z.ZodString>;
            summary: z.ZodOptional<z.ZodString>;
            content: z.ZodOptional<z.ZodString>;
            author: z.ZodOptional<z.ZodString>;
            publishedAt: z.ZodOptional<z.ZodString>;
            links: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            title?: string | undefined;
            publishedAt?: string | undefined;
            summary?: string | undefined;
            content?: string | undefined;
            author?: string | undefined;
            container?: string | undefined;
            links?: string | undefined;
        }, {
            title?: string | undefined;
            publishedAt?: string | undefined;
            summary?: string | undefined;
            content?: string | undefined;
            author?: string | undefined;
            container?: string | undefined;
            links?: string | undefined;
        }>>;
        extractMode: z.ZodDefault<z.ZodEnum<["single", "list"]>>;
        maxItems: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        maxItems: number;
        url: string;
        extractMode: "single" | "list";
        refreshInterval: number;
        selectors?: {
            title?: string | undefined;
            publishedAt?: string | undefined;
            summary?: string | undefined;
            content?: string | undefined;
            author?: string | undefined;
            container?: string | undefined;
            links?: string | undefined;
        } | undefined;
    }, {
        url: string;
        maxItems?: number | undefined;
        extractMode?: "single" | "list" | undefined;
        selectors?: {
            title?: string | undefined;
            publishedAt?: string | undefined;
            summary?: string | undefined;
            content?: string | undefined;
            author?: string | undefined;
            container?: string | undefined;
            links?: string | undefined;
        } | undefined;
        refreshInterval?: number | undefined;
    }>]>;
    normalization_jsonb: z.ZodOptional<z.ZodObject<{
        idPath: z.ZodOptional<z.ZodString>;
        titlePath: z.ZodOptional<z.ZodString>;
        summaryPath: z.ZodOptional<z.ZodString>;
        urlPath: z.ZodOptional<z.ZodString>;
        publishedAtPath: z.ZodOptional<z.ZodString>;
        authorPath: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        idPath?: string | undefined;
        titlePath?: string | undefined;
        summaryPath?: string | undefined;
        urlPath?: string | undefined;
        publishedAtPath?: string | undefined;
        authorPath?: string | undefined;
    }, {
        idPath?: string | undefined;
        titlePath?: string | undefined;
        summaryPath?: string | undefined;
        urlPath?: string | undefined;
        publishedAtPath?: string | undefined;
        authorPath?: string | undefined;
    }>>;
    visibility: z.ZodDefault<z.ZodEnum<["private", "shared", "public"]>>;
    created_at: z.ZodOptional<z.ZodString>;
    updated_at: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    kind: "rss" | "http_json" | "web_scraper";
    name: string;
    id: string;
    config_jsonb: {
        maxItems: number;
        feedUrl: string;
    } | {
        maxItems: number;
        url: string;
        method: "GET" | "POST";
        jsonPath: string;
        headers?: Record<string, string> | undefined;
        body?: string | undefined;
    } | {
        maxItems: number;
        url: string;
        extractMode: "single" | "list";
        refreshInterval: number;
        selectors?: {
            title?: string | undefined;
            publishedAt?: string | undefined;
            summary?: string | undefined;
            content?: string | undefined;
            author?: string | undefined;
            container?: string | undefined;
            links?: string | undefined;
        } | undefined;
    };
    visibility: "private" | "shared" | "public";
    description?: string | undefined;
    owner_user_id?: string | undefined;
    normalization_jsonb?: {
        idPath?: string | undefined;
        titlePath?: string | undefined;
        summaryPath?: string | undefined;
        urlPath?: string | undefined;
        publishedAtPath?: string | undefined;
        authorPath?: string | undefined;
    } | undefined;
    created_at?: string | undefined;
    updated_at?: string | undefined;
}, {
    kind: "rss" | "http_json" | "web_scraper";
    name: string;
    id: string;
    config_jsonb: {
        feedUrl: string;
        maxItems?: number | undefined;
    } | {
        url: string;
        jsonPath: string;
        maxItems?: number | undefined;
        method?: "GET" | "POST" | undefined;
        headers?: Record<string, string> | undefined;
        body?: string | undefined;
    } | {
        url: string;
        maxItems?: number | undefined;
        extractMode?: "single" | "list" | undefined;
        selectors?: {
            title?: string | undefined;
            publishedAt?: string | undefined;
            summary?: string | undefined;
            content?: string | undefined;
            author?: string | undefined;
            container?: string | undefined;
            links?: string | undefined;
        } | undefined;
        refreshInterval?: number | undefined;
    };
    description?: string | undefined;
    owner_user_id?: string | undefined;
    normalization_jsonb?: {
        idPath?: string | undefined;
        titlePath?: string | undefined;
        summaryPath?: string | undefined;
        urlPath?: string | undefined;
        publishedAtPath?: string | undefined;
        authorPath?: string | undefined;
    } | undefined;
    visibility?: "private" | "shared" | "public" | undefined;
    created_at?: string | undefined;
    updated_at?: string | undefined;
}>;
export type UserSourceDefinition = z.infer<typeof UserSourceDefinitionSchema>;
