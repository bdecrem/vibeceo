import { z } from 'zod';
/**
 * NormalizedItem: The universal data format for all sources
 * Every data source is converted into this structure for pipeline processing
 */
export declare const NormalizedItemSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    title: z.ZodOptional<z.ZodString>;
    summary: z.ZodOptional<z.ZodString>;
    url: z.ZodOptional<z.ZodString>;
    publishedAt: z.ZodOptional<z.ZodString>;
    author: z.ZodOptional<z.ZodString>;
    score: z.ZodOptional<z.ZodNumber>;
    raw: z.ZodAny;
}, "strip", z.ZodTypeAny, {
    url?: string | undefined;
    id?: string | undefined;
    title?: string | undefined;
    publishedAt?: string | undefined;
    score?: number | undefined;
    summary?: string | undefined;
    author?: string | undefined;
    raw?: any;
}, {
    url?: string | undefined;
    id?: string | undefined;
    title?: string | undefined;
    publishedAt?: string | undefined;
    score?: number | undefined;
    summary?: string | undefined;
    author?: string | undefined;
    raw?: any;
}>;
export type NormalizedItem = z.infer<typeof NormalizedItemSchema>;
/**
 * Enriched item with LLM processing metadata
 */
export declare const EnrichedItemSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    title: z.ZodOptional<z.ZodString>;
    summary: z.ZodOptional<z.ZodString>;
    url: z.ZodOptional<z.ZodString>;
    publishedAt: z.ZodOptional<z.ZodString>;
    author: z.ZodOptional<z.ZodString>;
    raw: z.ZodAny;
} & {
    score: z.ZodOptional<z.ZodNumber>;
    relevanceReason: z.ZodOptional<z.ZodString>;
    categories: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    keyPoints: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    sentiment: z.ZodOptional<z.ZodEnum<["positive", "negative", "neutral"]>>;
}, "strip", z.ZodTypeAny, {
    url?: string | undefined;
    id?: string | undefined;
    title?: string | undefined;
    publishedAt?: string | undefined;
    score?: number | undefined;
    sentiment?: "positive" | "negative" | "neutral" | undefined;
    summary?: string | undefined;
    categories?: string[] | undefined;
    author?: string | undefined;
    raw?: any;
    relevanceReason?: string | undefined;
    keyPoints?: string[] | undefined;
}, {
    url?: string | undefined;
    id?: string | undefined;
    title?: string | undefined;
    publishedAt?: string | undefined;
    score?: number | undefined;
    sentiment?: "positive" | "negative" | "neutral" | undefined;
    summary?: string | undefined;
    categories?: string[] | undefined;
    author?: string | undefined;
    raw?: any;
    relevanceReason?: string | undefined;
    keyPoints?: string[] | undefined;
}>;
export type EnrichedItem = z.infer<typeof EnrichedItemSchema>;
