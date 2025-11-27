import { z } from 'zod';
/**
 * Agent metadata and identity
 */
export declare const AgentMetadataSchema: z.ZodObject<{
    name: z.ZodString;
    slug: z.ZodString;
    description: z.ZodString;
    icon: z.ZodOptional<z.ZodString>;
    category: z.ZodEnum<["research", "news", "finance", "crypto", "health", "technology", "recruiting", "education", "entertainment", "other"]>;
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    version: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    slug: string;
    description: string;
    category: "research" | "news" | "finance" | "crypto" | "health" | "technology" | "recruiting" | "education" | "entertainment" | "other";
    tags: string[];
    version: string;
    icon?: string | undefined;
}, {
    name: string;
    slug: string;
    description: string;
    category: "research" | "news" | "finance" | "crypto" | "health" | "technology" | "recruiting" | "education" | "entertainment" | "other";
    icon?: string | undefined;
    tags?: string[] | undefined;
    version?: string | undefined;
}>;
/**
 * Agent triggers: when and how the agent runs
 */
export declare const AgentTriggersSchema: z.ZodObject<{
    schedule: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        cron: z.ZodOptional<z.ZodString>;
        timezone: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        timezone: string;
        cron?: string | undefined;
    }, {
        enabled?: boolean | undefined;
        cron?: string | undefined;
        timezone?: string | undefined;
    }>>;
    commands: z.ZodArray<z.ZodObject<{
        keyword: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        keyword: string;
        description?: string | undefined;
    }, {
        keyword: string;
        description?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    commands: {
        keyword: string;
        description?: string | undefined;
    }[];
    schedule?: {
        enabled: boolean;
        timezone: string;
        cron?: string | undefined;
    } | undefined;
}, {
    commands: {
        keyword: string;
        description?: string | undefined;
    }[];
    schedule?: {
        enabled?: boolean | undefined;
        cron?: string | undefined;
        timezone?: string | undefined;
    } | undefined;
}>;
/**
 * User profile schema for personalization
 */
export declare const UserProfileSchema: z.ZodObject<{
    fields: z.ZodOptional<z.ZodArray<z.ZodObject<{
        key: z.ZodString;
        label: z.ZodString;
        type: z.ZodEnum<["text", "number", "select", "multiselect"]>;
        required: z.ZodDefault<z.ZodBoolean>;
        options: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        defaultValue: z.ZodOptional<z.ZodAny>;
    }, "strip", z.ZodTypeAny, {
        type: "number" | "text" | "select" | "multiselect";
        key: string;
        label: string;
        required: boolean;
        options?: string[] | undefined;
        defaultValue?: any;
    }, {
        type: "number" | "text" | "select" | "multiselect";
        key: string;
        label: string;
        options?: string[] | undefined;
        required?: boolean | undefined;
        defaultValue?: any;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    fields?: {
        type: "number" | "text" | "select" | "multiselect";
        key: string;
        label: string;
        required: boolean;
        options?: string[] | undefined;
        defaultValue?: any;
    }[] | undefined;
}, {
    fields?: {
        type: "number" | "text" | "select" | "multiselect";
        key: string;
        label: string;
        options?: string[] | undefined;
        required?: boolean | undefined;
        defaultValue?: any;
    }[] | undefined;
}>;
/**
 * Collation: how to combine results from multiple sources
 */
export declare const CollationConfigSchema: z.ZodObject<{
    strategy: z.ZodDefault<z.ZodEnum<["merge", "separate", "prioritize"]>>;
    maxTotalItems: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    strategy: "merge" | "separate" | "prioritize";
    maxTotalItems: number;
}, {
    strategy?: "merge" | "separate" | "prioritize" | undefined;
    maxTotalItems?: number | undefined;
}>;
/**
 * Output configuration
 */
export declare const OutputConfigSchema: z.ZodObject<{
    sms: z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        template: z.ZodString;
        maxLength: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        maxLength: number;
        enabled: boolean;
        template: string;
    }, {
        template: string;
        maxLength?: number | undefined;
        enabled?: boolean | undefined;
    }>;
    report: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        format: z.ZodDefault<z.ZodEnum<["markdown", "html", "json"]>>;
        sections: z.ZodOptional<z.ZodArray<z.ZodObject<{
            title: z.ZodString;
            content: z.ZodEnum<["summary", "items", "custom"]>;
            template: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            title: string;
            content: "custom" | "summary" | "items";
            template?: string | undefined;
        }, {
            title: string;
            content: "custom" | "summary" | "items";
            template?: string | undefined;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        format: "json" | "markdown" | "html";
        sections?: {
            title: string;
            content: "custom" | "summary" | "items";
            template?: string | undefined;
        }[] | undefined;
    }, {
        enabled?: boolean | undefined;
        format?: "json" | "markdown" | "html" | undefined;
        sections?: {
            title: string;
            content: "custom" | "summary" | "items";
            template?: string | undefined;
        }[] | undefined;
    }>>;
    audio: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        voice: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        voice?: string | undefined;
    }, {
        enabled?: boolean | undefined;
        voice?: string | undefined;
    }>>;
    email: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        to: z.ZodArray<z.ZodString, "many">;
        subject: z.ZodString;
        template: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        template: string;
        to: string[];
        subject: string;
    }, {
        template: string;
        to: string[];
        subject: string;
        enabled?: boolean | undefined;
    }>>;
    webhook: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        url: z.ZodString;
        method: z.ZodDefault<z.ZodEnum<["POST", "PUT"]>>;
        headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        url: string;
        method: "POST" | "PUT";
        enabled: boolean;
        headers?: Record<string, string> | undefined;
    }, {
        url: string;
        method?: "POST" | "PUT" | undefined;
        headers?: Record<string, string> | undefined;
        enabled?: boolean | undefined;
    }>>;
    slack: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        channel: z.ZodString;
        webhookUrl: z.ZodString;
        template: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        channel: string;
        webhookUrl: string;
        template?: string | undefined;
    }, {
        channel: string;
        webhookUrl: string;
        enabled?: boolean | undefined;
        template?: string | undefined;
    }>>;
    discord: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        webhookUrl: z.ZodString;
        template: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        webhookUrl: string;
        template?: string | undefined;
    }, {
        webhookUrl: string;
        enabled?: boolean | undefined;
        template?: string | undefined;
    }>>;
    twitter: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        template: z.ZodString;
        maxLength: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        maxLength: number;
        enabled: boolean;
        template: string;
    }, {
        template: string;
        maxLength?: number | undefined;
        enabled?: boolean | undefined;
    }>>;
    notification: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        title: z.ZodString;
        body: z.ZodString;
        deviceTokens: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        title: string;
        enabled: boolean;
        body: string;
        deviceTokens?: string[] | undefined;
    }, {
        title: string;
        body: string;
        enabled?: boolean | undefined;
        deviceTokens?: string[] | undefined;
    }>>;
    database: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        connectionString: z.ZodString;
        table: z.ZodString;
        fieldMapping: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        connectionString: string;
        table: string;
        fieldMapping?: Record<string, string> | undefined;
    }, {
        connectionString: string;
        table: string;
        fieldMapping?: Record<string, string> | undefined;
        enabled?: boolean | undefined;
    }>>;
    sheets: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        spreadsheetId: z.ZodString;
        sheetName: z.ZodString;
        appendMode: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        spreadsheetId: string;
        sheetName: string;
        appendMode: boolean;
    }, {
        spreadsheetId: string;
        sheetName: string;
        enabled?: boolean | undefined;
        appendMode?: boolean | undefined;
    }>>;
    file: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        format: z.ZodDefault<z.ZodEnum<["csv", "json", "markdown"]>>;
        filename: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        format: "json" | "markdown" | "csv";
        filename?: string | undefined;
    }, {
        enabled?: boolean | undefined;
        format?: "json" | "markdown" | "csv" | undefined;
        filename?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    sms: {
        maxLength: number;
        enabled: boolean;
        template: string;
    };
    twitter?: {
        maxLength: number;
        enabled: boolean;
        template: string;
    } | undefined;
    report?: {
        enabled: boolean;
        format: "json" | "markdown" | "html";
        sections?: {
            title: string;
            content: "custom" | "summary" | "items";
            template?: string | undefined;
        }[] | undefined;
    } | undefined;
    audio?: {
        enabled: boolean;
        voice?: string | undefined;
    } | undefined;
    email?: {
        enabled: boolean;
        template: string;
        to: string[];
        subject: string;
    } | undefined;
    webhook?: {
        url: string;
        method: "POST" | "PUT";
        enabled: boolean;
        headers?: Record<string, string> | undefined;
    } | undefined;
    slack?: {
        enabled: boolean;
        channel: string;
        webhookUrl: string;
        template?: string | undefined;
    } | undefined;
    discord?: {
        enabled: boolean;
        webhookUrl: string;
        template?: string | undefined;
    } | undefined;
    notification?: {
        title: string;
        enabled: boolean;
        body: string;
        deviceTokens?: string[] | undefined;
    } | undefined;
    database?: {
        enabled: boolean;
        connectionString: string;
        table: string;
        fieldMapping?: Record<string, string> | undefined;
    } | undefined;
    sheets?: {
        enabled: boolean;
        spreadsheetId: string;
        sheetName: string;
        appendMode: boolean;
    } | undefined;
    file?: {
        enabled: boolean;
        format: "json" | "markdown" | "csv";
        filename?: string | undefined;
    } | undefined;
}, {
    sms: {
        template: string;
        maxLength?: number | undefined;
        enabled?: boolean | undefined;
    };
    twitter?: {
        template: string;
        maxLength?: number | undefined;
        enabled?: boolean | undefined;
    } | undefined;
    report?: {
        enabled?: boolean | undefined;
        format?: "json" | "markdown" | "html" | undefined;
        sections?: {
            title: string;
            content: "custom" | "summary" | "items";
            template?: string | undefined;
        }[] | undefined;
    } | undefined;
    audio?: {
        enabled?: boolean | undefined;
        voice?: string | undefined;
    } | undefined;
    email?: {
        template: string;
        to: string[];
        subject: string;
        enabled?: boolean | undefined;
    } | undefined;
    webhook?: {
        url: string;
        method?: "POST" | "PUT" | undefined;
        headers?: Record<string, string> | undefined;
        enabled?: boolean | undefined;
    } | undefined;
    slack?: {
        channel: string;
        webhookUrl: string;
        enabled?: boolean | undefined;
        template?: string | undefined;
    } | undefined;
    discord?: {
        webhookUrl: string;
        enabled?: boolean | undefined;
        template?: string | undefined;
    } | undefined;
    notification?: {
        title: string;
        body: string;
        enabled?: boolean | undefined;
        deviceTokens?: string[] | undefined;
    } | undefined;
    database?: {
        connectionString: string;
        table: string;
        fieldMapping?: Record<string, string> | undefined;
        enabled?: boolean | undefined;
    } | undefined;
    sheets?: {
        spreadsheetId: string;
        sheetName: string;
        enabled?: boolean | undefined;
        appendMode?: boolean | undefined;
    } | undefined;
    file?: {
        enabled?: boolean | undefined;
        format?: "json" | "markdown" | "csv" | undefined;
        filename?: string | undefined;
    } | undefined;
}>;
/**
 * Safety and resource limits
 */
export declare const SafetyConfigSchema: z.ZodObject<{
    maxSourcesPerRun: z.ZodDefault<z.ZodNumber>;
    maxItemsPerSource: z.ZodDefault<z.ZodNumber>;
    maxLLMCalls: z.ZodDefault<z.ZodNumber>;
    maxTokensPerRun: z.ZodDefault<z.ZodNumber>;
    timeout: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    maxSourcesPerRun: number;
    maxItemsPerSource: number;
    maxLLMCalls: number;
    maxTokensPerRun: number;
    timeout: number;
}, {
    maxSourcesPerRun?: number | undefined;
    maxItemsPerSource?: number | undefined;
    maxLLMCalls?: number | undefined;
    maxTokensPerRun?: number | undefined;
    timeout?: number | undefined;
}>;
/**
 * Complete Agent Definition
 */
export declare const AgentDefinitionSchema: z.ZodObject<{
    metadata: z.ZodObject<{
        name: z.ZodString;
        slug: z.ZodString;
        description: z.ZodString;
        icon: z.ZodOptional<z.ZodString>;
        category: z.ZodEnum<["research", "news", "finance", "crypto", "health", "technology", "recruiting", "education", "entertainment", "other"]>;
        tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        version: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        slug: string;
        description: string;
        category: "research" | "news" | "finance" | "crypto" | "health" | "technology" | "recruiting" | "education" | "entertainment" | "other";
        tags: string[];
        version: string;
        icon?: string | undefined;
    }, {
        name: string;
        slug: string;
        description: string;
        category: "research" | "news" | "finance" | "crypto" | "health" | "technology" | "recruiting" | "education" | "entertainment" | "other";
        icon?: string | undefined;
        tags?: string[] | undefined;
        version?: string | undefined;
    }>;
    triggers: z.ZodObject<{
        schedule: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            cron: z.ZodOptional<z.ZodString>;
            timezone: z.ZodDefault<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            timezone: string;
            cron?: string | undefined;
        }, {
            enabled?: boolean | undefined;
            cron?: string | undefined;
            timezone?: string | undefined;
        }>>;
        commands: z.ZodArray<z.ZodObject<{
            keyword: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            keyword: string;
            description?: string | undefined;
        }, {
            keyword: string;
            description?: string | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        commands: {
            keyword: string;
            description?: string | undefined;
        }[];
        schedule?: {
            enabled: boolean;
            timezone: string;
            cron?: string | undefined;
        } | undefined;
    }, {
        commands: {
            keyword: string;
            description?: string | undefined;
        }[];
        schedule?: {
            enabled?: boolean | undefined;
            cron?: string | undefined;
            timezone?: string | undefined;
        } | undefined;
    }>;
    userProfile: z.ZodOptional<z.ZodObject<{
        fields: z.ZodOptional<z.ZodArray<z.ZodObject<{
            key: z.ZodString;
            label: z.ZodString;
            type: z.ZodEnum<["text", "number", "select", "multiselect"]>;
            required: z.ZodDefault<z.ZodBoolean>;
            options: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            defaultValue: z.ZodOptional<z.ZodAny>;
        }, "strip", z.ZodTypeAny, {
            type: "number" | "text" | "select" | "multiselect";
            key: string;
            label: string;
            required: boolean;
            options?: string[] | undefined;
            defaultValue?: any;
        }, {
            type: "number" | "text" | "select" | "multiselect";
            key: string;
            label: string;
            options?: string[] | undefined;
            required?: boolean | undefined;
            defaultValue?: any;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        fields?: {
            type: "number" | "text" | "select" | "multiselect";
            key: string;
            label: string;
            required: boolean;
            options?: string[] | undefined;
            defaultValue?: any;
        }[] | undefined;
    }, {
        fields?: {
            type: "number" | "text" | "select" | "multiselect";
            key: string;
            label: string;
            options?: string[] | undefined;
            required?: boolean | undefined;
            defaultValue?: any;
        }[] | undefined;
    }>>;
    sources: z.ZodArray<z.ZodDiscriminatedUnion<"kind", [z.ZodObject<{
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
    }>]>, "many">;
    pipeline: z.ZodArray<z.ZodDiscriminatedUnion<"kind", [z.ZodObject<{
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
    }>]>, "many">;
    collation: z.ZodObject<{
        strategy: z.ZodDefault<z.ZodEnum<["merge", "separate", "prioritize"]>>;
        maxTotalItems: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        strategy: "merge" | "separate" | "prioritize";
        maxTotalItems: number;
    }, {
        strategy?: "merge" | "separate" | "prioritize" | undefined;
        maxTotalItems?: number | undefined;
    }>;
    output: z.ZodObject<{
        sms: z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            template: z.ZodString;
            maxLength: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            maxLength: number;
            enabled: boolean;
            template: string;
        }, {
            template: string;
            maxLength?: number | undefined;
            enabled?: boolean | undefined;
        }>;
        report: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            format: z.ZodDefault<z.ZodEnum<["markdown", "html", "json"]>>;
            sections: z.ZodOptional<z.ZodArray<z.ZodObject<{
                title: z.ZodString;
                content: z.ZodEnum<["summary", "items", "custom"]>;
                template: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                title: string;
                content: "custom" | "summary" | "items";
                template?: string | undefined;
            }, {
                title: string;
                content: "custom" | "summary" | "items";
                template?: string | undefined;
            }>, "many">>;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            format: "json" | "markdown" | "html";
            sections?: {
                title: string;
                content: "custom" | "summary" | "items";
                template?: string | undefined;
            }[] | undefined;
        }, {
            enabled?: boolean | undefined;
            format?: "json" | "markdown" | "html" | undefined;
            sections?: {
                title: string;
                content: "custom" | "summary" | "items";
                template?: string | undefined;
            }[] | undefined;
        }>>;
        audio: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            voice: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            voice?: string | undefined;
        }, {
            enabled?: boolean | undefined;
            voice?: string | undefined;
        }>>;
        email: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            to: z.ZodArray<z.ZodString, "many">;
            subject: z.ZodString;
            template: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            template: string;
            to: string[];
            subject: string;
        }, {
            template: string;
            to: string[];
            subject: string;
            enabled?: boolean | undefined;
        }>>;
        webhook: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            url: z.ZodString;
            method: z.ZodDefault<z.ZodEnum<["POST", "PUT"]>>;
            headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
        }, "strip", z.ZodTypeAny, {
            url: string;
            method: "POST" | "PUT";
            enabled: boolean;
            headers?: Record<string, string> | undefined;
        }, {
            url: string;
            method?: "POST" | "PUT" | undefined;
            headers?: Record<string, string> | undefined;
            enabled?: boolean | undefined;
        }>>;
        slack: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            channel: z.ZodString;
            webhookUrl: z.ZodString;
            template: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            channel: string;
            webhookUrl: string;
            template?: string | undefined;
        }, {
            channel: string;
            webhookUrl: string;
            enabled?: boolean | undefined;
            template?: string | undefined;
        }>>;
        discord: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            webhookUrl: z.ZodString;
            template: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            webhookUrl: string;
            template?: string | undefined;
        }, {
            webhookUrl: string;
            enabled?: boolean | undefined;
            template?: string | undefined;
        }>>;
        twitter: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            template: z.ZodString;
            maxLength: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            maxLength: number;
            enabled: boolean;
            template: string;
        }, {
            template: string;
            maxLength?: number | undefined;
            enabled?: boolean | undefined;
        }>>;
        notification: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            title: z.ZodString;
            body: z.ZodString;
            deviceTokens: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            title: string;
            enabled: boolean;
            body: string;
            deviceTokens?: string[] | undefined;
        }, {
            title: string;
            body: string;
            enabled?: boolean | undefined;
            deviceTokens?: string[] | undefined;
        }>>;
        database: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            connectionString: z.ZodString;
            table: z.ZodString;
            fieldMapping: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            connectionString: string;
            table: string;
            fieldMapping?: Record<string, string> | undefined;
        }, {
            connectionString: string;
            table: string;
            fieldMapping?: Record<string, string> | undefined;
            enabled?: boolean | undefined;
        }>>;
        sheets: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            spreadsheetId: z.ZodString;
            sheetName: z.ZodString;
            appendMode: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            spreadsheetId: string;
            sheetName: string;
            appendMode: boolean;
        }, {
            spreadsheetId: string;
            sheetName: string;
            enabled?: boolean | undefined;
            appendMode?: boolean | undefined;
        }>>;
        file: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            format: z.ZodDefault<z.ZodEnum<["csv", "json", "markdown"]>>;
            filename: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            format: "json" | "markdown" | "csv";
            filename?: string | undefined;
        }, {
            enabled?: boolean | undefined;
            format?: "json" | "markdown" | "csv" | undefined;
            filename?: string | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        sms: {
            maxLength: number;
            enabled: boolean;
            template: string;
        };
        twitter?: {
            maxLength: number;
            enabled: boolean;
            template: string;
        } | undefined;
        report?: {
            enabled: boolean;
            format: "json" | "markdown" | "html";
            sections?: {
                title: string;
                content: "custom" | "summary" | "items";
                template?: string | undefined;
            }[] | undefined;
        } | undefined;
        audio?: {
            enabled: boolean;
            voice?: string | undefined;
        } | undefined;
        email?: {
            enabled: boolean;
            template: string;
            to: string[];
            subject: string;
        } | undefined;
        webhook?: {
            url: string;
            method: "POST" | "PUT";
            enabled: boolean;
            headers?: Record<string, string> | undefined;
        } | undefined;
        slack?: {
            enabled: boolean;
            channel: string;
            webhookUrl: string;
            template?: string | undefined;
        } | undefined;
        discord?: {
            enabled: boolean;
            webhookUrl: string;
            template?: string | undefined;
        } | undefined;
        notification?: {
            title: string;
            enabled: boolean;
            body: string;
            deviceTokens?: string[] | undefined;
        } | undefined;
        database?: {
            enabled: boolean;
            connectionString: string;
            table: string;
            fieldMapping?: Record<string, string> | undefined;
        } | undefined;
        sheets?: {
            enabled: boolean;
            spreadsheetId: string;
            sheetName: string;
            appendMode: boolean;
        } | undefined;
        file?: {
            enabled: boolean;
            format: "json" | "markdown" | "csv";
            filename?: string | undefined;
        } | undefined;
    }, {
        sms: {
            template: string;
            maxLength?: number | undefined;
            enabled?: boolean | undefined;
        };
        twitter?: {
            template: string;
            maxLength?: number | undefined;
            enabled?: boolean | undefined;
        } | undefined;
        report?: {
            enabled?: boolean | undefined;
            format?: "json" | "markdown" | "html" | undefined;
            sections?: {
                title: string;
                content: "custom" | "summary" | "items";
                template?: string | undefined;
            }[] | undefined;
        } | undefined;
        audio?: {
            enabled?: boolean | undefined;
            voice?: string | undefined;
        } | undefined;
        email?: {
            template: string;
            to: string[];
            subject: string;
            enabled?: boolean | undefined;
        } | undefined;
        webhook?: {
            url: string;
            method?: "POST" | "PUT" | undefined;
            headers?: Record<string, string> | undefined;
            enabled?: boolean | undefined;
        } | undefined;
        slack?: {
            channel: string;
            webhookUrl: string;
            enabled?: boolean | undefined;
            template?: string | undefined;
        } | undefined;
        discord?: {
            webhookUrl: string;
            enabled?: boolean | undefined;
            template?: string | undefined;
        } | undefined;
        notification?: {
            title: string;
            body: string;
            enabled?: boolean | undefined;
            deviceTokens?: string[] | undefined;
        } | undefined;
        database?: {
            connectionString: string;
            table: string;
            fieldMapping?: Record<string, string> | undefined;
            enabled?: boolean | undefined;
        } | undefined;
        sheets?: {
            spreadsheetId: string;
            sheetName: string;
            enabled?: boolean | undefined;
            appendMode?: boolean | undefined;
        } | undefined;
        file?: {
            enabled?: boolean | undefined;
            format?: "json" | "markdown" | "csv" | undefined;
            filename?: string | undefined;
        } | undefined;
    }>;
    safety: z.ZodOptional<z.ZodObject<{
        maxSourcesPerRun: z.ZodDefault<z.ZodNumber>;
        maxItemsPerSource: z.ZodDefault<z.ZodNumber>;
        maxLLMCalls: z.ZodDefault<z.ZodNumber>;
        maxTokensPerRun: z.ZodDefault<z.ZodNumber>;
        timeout: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        maxSourcesPerRun: number;
        maxItemsPerSource: number;
        maxLLMCalls: number;
        maxTokensPerRun: number;
        timeout: number;
    }, {
        maxSourcesPerRun?: number | undefined;
        maxItemsPerSource?: number | undefined;
        maxLLMCalls?: number | undefined;
        maxTokensPerRun?: number | undefined;
        timeout?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    metadata: {
        name: string;
        slug: string;
        description: string;
        category: "research" | "news" | "finance" | "crypto" | "health" | "technology" | "recruiting" | "education" | "entertainment" | "other";
        tags: string[];
        version: string;
        icon?: string | undefined;
    };
    triggers: {
        commands: {
            keyword: string;
            description?: string | undefined;
        }[];
        schedule?: {
            enabled: boolean;
            timezone: string;
            cron?: string | undefined;
        } | undefined;
    };
    sources: ({
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
    } | {
        kind: "user_source_ref";
        userSourceId: string;
    })[];
    pipeline: ({
        kind: "fetch";
        name?: string | undefined;
    } | {
        kind: "dedupe";
        dedupeBy: "url" | "id" | "title";
        name?: string | undefined;
    } | {
        kind: "filter";
        maxItems?: number | undefined;
        name?: string | undefined;
        minScore?: number | undefined;
    } | {
        kind: "sort";
        sortBy: "publishedAt" | "score" | "relevance";
        order: "asc" | "desc";
        name?: string | undefined;
    } | {
        kind: "summarize";
        promptTemplateId: string;
        model: "gpt-4" | "gpt-3.5-turbo" | "claude-3-opus" | "claude-3-sonnet";
        maxTokens: number;
        perItem: boolean;
        name?: string | undefined;
    } | {
        kind: "rank";
        promptTemplateId: string;
        model: "gpt-4" | "gpt-3.5-turbo" | "claude-3-opus" | "claude-3-sonnet";
        name?: string | undefined;
    } | {
        kind: "transform";
        promptTemplateId: string;
        model: "gpt-4" | "gpt-3.5-turbo" | "claude-3-opus" | "claude-3-sonnet";
        outputFormat: "json" | "text" | "markdown";
        name?: string | undefined;
    } | {
        kind: "custom";
        customStepId: string;
        name?: string | undefined;
        config?: Record<string, any> | undefined;
    } | {
        kind: "date_filter";
        timeRange?: "1h" | "6h" | "24h" | "7d" | "30d" | undefined;
        name?: string | undefined;
        startDate?: string | undefined;
        endDate?: string | undefined;
    } | {
        kind: "keyword_filter";
        caseSensitive: boolean;
        name?: string | undefined;
        include?: string[] | undefined;
        exclude?: string[] | undefined;
    } | {
        kind: "limit_filter";
        maxItems: number;
        name?: string | undefined;
    } | {
        kind: "sentiment_filter";
        sentiment: "positive" | "negative" | "neutral";
        name?: string | undefined;
    } | {
        kind: "length_filter";
        measureBy: "characters" | "words";
        name?: string | undefined;
        minLength?: number | undefined;
        maxLength?: number | undefined;
    } | {
        kind: "score_filter";
        minScore: number;
        name?: string | undefined;
    } | {
        kind: "regex_filter";
        pattern: string;
        field: "title" | "summary" | "content";
        name?: string | undefined;
    } | {
        kind: "author_filter";
        name?: string | undefined;
        include?: string[] | undefined;
        exclude?: string[] | undefined;
    } | {
        kind: "language_filter";
        languages: string[];
        name?: string | undefined;
    } | {
        kind: "top_n_filter";
        sortBy: "publishedAt" | "score" | "relevance";
        n: number;
        name?: string | undefined;
    } | {
        kind: "random_sample_filter";
        sampleSize: number;
        name?: string | undefined;
    } | {
        kind: "has_media_filter";
        mediaType: "image" | "video" | "any";
        name?: string | undefined;
    } | {
        kind: "sentiment_analysis";
        model: "simple" | "advanced";
        name?: string | undefined;
    } | {
        kind: "entity_extraction";
        entityTypes: ("date" | "person" | "organization" | "location")[];
        name?: string | undefined;
    } | {
        kind: "category_classification";
        name?: string | undefined;
        categories?: string[] | undefined;
    } | {
        kind: "translation";
        targetLanguage: string;
        translateFields: ("title" | "summary" | "content")[];
        name?: string | undefined;
    } | {
        kind: "text_cleanup";
        removeHTML: boolean;
        normalizeWhitespace: boolean;
        removeEmojis: boolean;
        name?: string | undefined;
    } | {
        kind: "url_extraction";
        expandShortLinks: boolean;
        extractDomain: boolean;
        name?: string | undefined;
    } | {
        kind: "scoring_rank";
        model: "gpt-4" | "gpt-3.5-turbo" | "claude-3-opus" | "claude-3-sonnet";
        criteria: string;
        name?: string | undefined;
    } | {
        kind: "field_mapping";
        mappings: Record<string, string>;
        name?: string | undefined;
    } | {
        kind: "merge_items";
        mergeBy: "url" | "id" | "title";
        name?: string | undefined;
    } | {
        kind: "enrich_data";
        apiUrl: string;
        headers?: Record<string, string> | undefined;
        name?: string | undefined;
        fieldMapping?: Record<string, string> | undefined;
    } | {
        kind: "claude_agent";
        model: "claude-3-5-sonnet-20241022" | "claude-3-haiku-20240307";
        maxTokens: number;
        systemPrompt: string;
        userPromptTemplate: string;
        outputField: string;
        name?: string | undefined;
    })[];
    collation: {
        strategy: "merge" | "separate" | "prioritize";
        maxTotalItems: number;
    };
    output: {
        sms: {
            maxLength: number;
            enabled: boolean;
            template: string;
        };
        twitter?: {
            maxLength: number;
            enabled: boolean;
            template: string;
        } | undefined;
        report?: {
            enabled: boolean;
            format: "json" | "markdown" | "html";
            sections?: {
                title: string;
                content: "custom" | "summary" | "items";
                template?: string | undefined;
            }[] | undefined;
        } | undefined;
        audio?: {
            enabled: boolean;
            voice?: string | undefined;
        } | undefined;
        email?: {
            enabled: boolean;
            template: string;
            to: string[];
            subject: string;
        } | undefined;
        webhook?: {
            url: string;
            method: "POST" | "PUT";
            enabled: boolean;
            headers?: Record<string, string> | undefined;
        } | undefined;
        slack?: {
            enabled: boolean;
            channel: string;
            webhookUrl: string;
            template?: string | undefined;
        } | undefined;
        discord?: {
            enabled: boolean;
            webhookUrl: string;
            template?: string | undefined;
        } | undefined;
        notification?: {
            title: string;
            enabled: boolean;
            body: string;
            deviceTokens?: string[] | undefined;
        } | undefined;
        database?: {
            enabled: boolean;
            connectionString: string;
            table: string;
            fieldMapping?: Record<string, string> | undefined;
        } | undefined;
        sheets?: {
            enabled: boolean;
            spreadsheetId: string;
            sheetName: string;
            appendMode: boolean;
        } | undefined;
        file?: {
            enabled: boolean;
            format: "json" | "markdown" | "csv";
            filename?: string | undefined;
        } | undefined;
    };
    userProfile?: {
        fields?: {
            type: "number" | "text" | "select" | "multiselect";
            key: string;
            label: string;
            required: boolean;
            options?: string[] | undefined;
            defaultValue?: any;
        }[] | undefined;
    } | undefined;
    safety?: {
        maxSourcesPerRun: number;
        maxItemsPerSource: number;
        maxLLMCalls: number;
        maxTokensPerRun: number;
        timeout: number;
    } | undefined;
}, {
    metadata: {
        name: string;
        slug: string;
        description: string;
        category: "research" | "news" | "finance" | "crypto" | "health" | "technology" | "recruiting" | "education" | "entertainment" | "other";
        icon?: string | undefined;
        tags?: string[] | undefined;
        version?: string | undefined;
    };
    triggers: {
        commands: {
            keyword: string;
            description?: string | undefined;
        }[];
        schedule?: {
            enabled?: boolean | undefined;
            cron?: string | undefined;
            timezone?: string | undefined;
        } | undefined;
    };
    sources: ({
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
    } | {
        kind: "user_source_ref";
        userSourceId: string;
    })[];
    pipeline: ({
        kind: "fetch";
        name?: string | undefined;
    } | {
        kind: "dedupe";
        name?: string | undefined;
        dedupeBy?: "url" | "id" | "title" | undefined;
    } | {
        kind: "filter";
        maxItems?: number | undefined;
        name?: string | undefined;
        minScore?: number | undefined;
    } | {
        kind: "sort";
        name?: string | undefined;
        sortBy?: "publishedAt" | "score" | "relevance" | undefined;
        order?: "asc" | "desc" | undefined;
    } | {
        kind: "summarize";
        promptTemplateId: string;
        name?: string | undefined;
        model?: "gpt-4" | "gpt-3.5-turbo" | "claude-3-opus" | "claude-3-sonnet" | undefined;
        maxTokens?: number | undefined;
        perItem?: boolean | undefined;
    } | {
        kind: "rank";
        promptTemplateId: string;
        name?: string | undefined;
        model?: "gpt-4" | "gpt-3.5-turbo" | "claude-3-opus" | "claude-3-sonnet" | undefined;
    } | {
        kind: "transform";
        promptTemplateId: string;
        name?: string | undefined;
        model?: "gpt-4" | "gpt-3.5-turbo" | "claude-3-opus" | "claude-3-sonnet" | undefined;
        outputFormat?: "json" | "text" | "markdown" | undefined;
    } | {
        kind: "custom";
        customStepId: string;
        name?: string | undefined;
        config?: Record<string, any> | undefined;
    } | {
        kind: "date_filter";
        timeRange?: "1h" | "6h" | "24h" | "7d" | "30d" | undefined;
        name?: string | undefined;
        startDate?: string | undefined;
        endDate?: string | undefined;
    } | {
        kind: "keyword_filter";
        name?: string | undefined;
        include?: string[] | undefined;
        exclude?: string[] | undefined;
        caseSensitive?: boolean | undefined;
    } | {
        kind: "limit_filter";
        maxItems: number;
        name?: string | undefined;
    } | {
        kind: "sentiment_filter";
        sentiment: "positive" | "negative" | "neutral";
        name?: string | undefined;
    } | {
        kind: "length_filter";
        name?: string | undefined;
        minLength?: number | undefined;
        maxLength?: number | undefined;
        measureBy?: "characters" | "words" | undefined;
    } | {
        kind: "score_filter";
        minScore: number;
        name?: string | undefined;
    } | {
        kind: "regex_filter";
        pattern: string;
        name?: string | undefined;
        field?: "title" | "summary" | "content" | undefined;
    } | {
        kind: "author_filter";
        name?: string | undefined;
        include?: string[] | undefined;
        exclude?: string[] | undefined;
    } | {
        kind: "language_filter";
        languages: string[];
        name?: string | undefined;
    } | {
        kind: "top_n_filter";
        sortBy: "publishedAt" | "score" | "relevance";
        n: number;
        name?: string | undefined;
    } | {
        kind: "random_sample_filter";
        sampleSize: number;
        name?: string | undefined;
    } | {
        kind: "has_media_filter";
        name?: string | undefined;
        mediaType?: "image" | "video" | "any" | undefined;
    } | {
        kind: "sentiment_analysis";
        name?: string | undefined;
        model?: "simple" | "advanced" | undefined;
    } | {
        kind: "entity_extraction";
        name?: string | undefined;
        entityTypes?: ("date" | "person" | "organization" | "location")[] | undefined;
    } | {
        kind: "category_classification";
        name?: string | undefined;
        categories?: string[] | undefined;
    } | {
        kind: "translation";
        targetLanguage: string;
        name?: string | undefined;
        translateFields?: ("title" | "summary" | "content")[] | undefined;
    } | {
        kind: "text_cleanup";
        name?: string | undefined;
        removeHTML?: boolean | undefined;
        normalizeWhitespace?: boolean | undefined;
        removeEmojis?: boolean | undefined;
    } | {
        kind: "url_extraction";
        name?: string | undefined;
        expandShortLinks?: boolean | undefined;
        extractDomain?: boolean | undefined;
    } | {
        kind: "scoring_rank";
        criteria: string;
        name?: string | undefined;
        model?: "gpt-4" | "gpt-3.5-turbo" | "claude-3-opus" | "claude-3-sonnet" | undefined;
    } | {
        kind: "field_mapping";
        mappings: Record<string, string>;
        name?: string | undefined;
    } | {
        kind: "merge_items";
        name?: string | undefined;
        mergeBy?: "url" | "id" | "title" | undefined;
    } | {
        kind: "enrich_data";
        apiUrl: string;
        headers?: Record<string, string> | undefined;
        name?: string | undefined;
        fieldMapping?: Record<string, string> | undefined;
    } | {
        kind: "claude_agent";
        systemPrompt: string;
        userPromptTemplate: string;
        name?: string | undefined;
        model?: "claude-3-5-sonnet-20241022" | "claude-3-haiku-20240307" | undefined;
        maxTokens?: number | undefined;
        outputField?: string | undefined;
    })[];
    collation: {
        strategy?: "merge" | "separate" | "prioritize" | undefined;
        maxTotalItems?: number | undefined;
    };
    output: {
        sms: {
            template: string;
            maxLength?: number | undefined;
            enabled?: boolean | undefined;
        };
        twitter?: {
            template: string;
            maxLength?: number | undefined;
            enabled?: boolean | undefined;
        } | undefined;
        report?: {
            enabled?: boolean | undefined;
            format?: "json" | "markdown" | "html" | undefined;
            sections?: {
                title: string;
                content: "custom" | "summary" | "items";
                template?: string | undefined;
            }[] | undefined;
        } | undefined;
        audio?: {
            enabled?: boolean | undefined;
            voice?: string | undefined;
        } | undefined;
        email?: {
            template: string;
            to: string[];
            subject: string;
            enabled?: boolean | undefined;
        } | undefined;
        webhook?: {
            url: string;
            method?: "POST" | "PUT" | undefined;
            headers?: Record<string, string> | undefined;
            enabled?: boolean | undefined;
        } | undefined;
        slack?: {
            channel: string;
            webhookUrl: string;
            enabled?: boolean | undefined;
            template?: string | undefined;
        } | undefined;
        discord?: {
            webhookUrl: string;
            enabled?: boolean | undefined;
            template?: string | undefined;
        } | undefined;
        notification?: {
            title: string;
            body: string;
            enabled?: boolean | undefined;
            deviceTokens?: string[] | undefined;
        } | undefined;
        database?: {
            connectionString: string;
            table: string;
            fieldMapping?: Record<string, string> | undefined;
            enabled?: boolean | undefined;
        } | undefined;
        sheets?: {
            spreadsheetId: string;
            sheetName: string;
            enabled?: boolean | undefined;
            appendMode?: boolean | undefined;
        } | undefined;
        file?: {
            enabled?: boolean | undefined;
            format?: "json" | "markdown" | "csv" | undefined;
            filename?: string | undefined;
        } | undefined;
    };
    userProfile?: {
        fields?: {
            type: "number" | "text" | "select" | "multiselect";
            key: string;
            label: string;
            options?: string[] | undefined;
            required?: boolean | undefined;
            defaultValue?: any;
        }[] | undefined;
    } | undefined;
    safety?: {
        maxSourcesPerRun?: number | undefined;
        maxItemsPerSource?: number | undefined;
        maxLLMCalls?: number | undefined;
        maxTokensPerRun?: number | undefined;
        timeout?: number | undefined;
    } | undefined;
}>;
export type AgentDefinition = z.infer<typeof AgentDefinitionSchema>;
export type AgentMetadata = z.infer<typeof AgentMetadataSchema>;
export type AgentTriggers = z.infer<typeof AgentTriggersSchema>;
export type UserProfile = z.infer<typeof UserProfileSchema>;
export type CollationConfig = z.infer<typeof CollationConfigSchema>;
export type OutputConfig = z.infer<typeof OutputConfigSchema>;
export type SafetyConfig = z.infer<typeof SafetyConfigSchema>;
