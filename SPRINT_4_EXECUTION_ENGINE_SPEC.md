# Sprint 4: Execution Engine - Comprehensive Specification

## Executive Summary

The execution engine is the core runtime that brings agent definitions to life. It takes an `AgentDefinition` (created in Sprint 3), executes all sources, processes items through the pipeline, generates outputs, and tracks execution metrics.

**Current Status**: Sprint 1-3 Complete
- ✅ Sprint 1: Agent schema and runtime skeleton
- ✅ Sprint 2: User-defined sources system
- ✅ Sprint 3: n8n-style workflow builder
- 🔨 Sprint 4: Execution engine (this specification)

---

## 1. Architecture Overview

### 1.1 High-Level Flow

```
┌──────────────────┐
│  Trigger Event   │ (Schedule, SMS Command, Manual, Preview)
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Load Agent Def  │ (from agent_versions table)
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Validate Schema │ (Zod validation)
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Fetch Sources   │ (RSS, arXiv, HTTP JSON, Web Scraper, User Sources)
│                  │ → NormalizedItem[]
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Execute Pipeline │ (Dedupe, Filter, Sort, Summarize, Transform, etc.)
│                  │ → ProcessedItem[]
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Apply Collation  │ (Merge, Separate, Prioritize)
│                  │ → CollatedItem[]
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Generate Outputs │ (SMS, Report, Audio)
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Create Run Record│ (agent_runs table with metrics)
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Return Results   │ (RunResult object)
└──────────────────┘
```

### 1.2 Component Architecture

```
sms-bot/src/agents/
├── runtime.ts              # Main orchestrator (EXISTING - needs enhancement)
├── executor.ts             # NEW: Core execution logic
├── sources/
│   ├── fetch.ts           # EXISTING: Generic source fetcher
│   ├── arxiv.ts           # EXISTING: arXiv source
│   ├── rss.ts             # EXISTING: RSS source
│   ├── http-json.ts       # EXISTING: HTTP JSON source
│   ├── web-scraper.ts     # EXISTING: Web scraper source
│   └── user-source.ts     # NEW: User-defined source executor
├── pipeline/
│   ├── dedupe.ts          # EXISTING: Deduplication
│   ├── filter.ts          # NEW: Filtering logic
│   ├── sort.ts            # NEW: Sorting logic
│   ├── summarize.ts       # EXISTING: LLM summarization
│   ├── rank.ts            # NEW: LLM ranking
│   ├── transform.ts       # NEW: LLM transformation
│   └── custom.ts          # NEW: Custom code execution
├── collation/
│   └── collate.ts         # NEW: Collation strategies
├── output/
│   ├── sms.ts             # NEW: SMS output generation
│   ├── report.ts          # NEW: Report generation (markdown/html/json)
│   └── audio.ts           # NEW: Audio generation (TTS)
├── api/
│   ├── admin.ts           # NEW: Admin API routes
│   └── webhooks.ts        # EXISTING: Webhook handlers
└── monitoring/
    ├── metrics.ts         # NEW: Metrics tracking
    └── errors.ts          # NEW: Error tracking and reporting
```

---

## 2. Data Flow & Types

### 2.1 Core Data Types

```typescript
// Input: Trigger context
interface RunContext {
  triggerType: 'scheduled' | 'command' | 'manual' | 'preview';
  userId?: string;
  phoneNumber?: string;
  triggerData?: Record<string, any>;
}

// Processing: Normalized data from sources
interface NormalizedItem {
  id?: string;
  title?: string;
  summary?: string;
  url?: string;
  publishedAt?: string;
  author?: string;
  raw: any; // Original data
}

// Processing: Enriched data after pipeline
interface EnrichedItem extends NormalizedItem {
  score?: number;
  relevanceReason?: string;
  categories?: string[];
  keyPoints?: string[];
  sentiment?: 'positive' | 'negative' | 'neutral';
}

// Output: Execution result
interface RunResult {
  success: boolean;
  agentRunId?: string;
  outputs: {
    sms?: string;
    reportUrl?: string;
    audioUrl?: string;
  };
  metrics: RunMetrics;
  errors?: Array<{ step: string; message: string; stack?: string }>;
}

// Metrics: Performance tracking
interface RunMetrics {
  sourcesFetched: number;
  itemsProcessed: number;
  llmCallsMade: number;
  tokensUsed: number;
  durationMs: number;
  estimatedCost?: number;
}
```

### 2.2 Data Transformation Pipeline

```
Raw Source Data → NormalizedItem → EnrichedItem → OutputItem
```

**Example Flow:**

1. **RSS Feed (Raw)**:
   ```xml
   <item>
     <title>New AI Model Released</title>
     <link>https://example.com/ai</link>
     <pubDate>2025-11-23</pubDate>
   </item>
   ```

2. **Normalized**:
   ```typescript
   {
     id: "https://example.com/ai",
     title: "New AI Model Released",
     url: "https://example.com/ai",
     publishedAt: "2025-11-23",
     author: "Example Blog",
     raw: { /* original item */ }
   }
   ```

3. **Enriched** (after LLM processing):
   ```typescript
   {
     ...normalized,
     score: 0.92,
     relevanceReason: "Discusses recent developments in AI",
     categories: ["AI", "Machine Learning"],
     keyPoints: ["New model architecture", "Improved performance"],
     sentiment: "positive"
   }
   ```

4. **Output** (SMS):
   ```
   📰 New AI Model Released

   Key Points:
   • New model architecture
   • Improved performance

   Read more: https://example.com/ai
   ```

---

## 3. Source Execution

### 3.1 Source Types

| Source Type | Status | Description | Implementation |
|------------|--------|-------------|----------------|
| `rss` | ✅ EXISTS | RSS/Atom feeds | `sources/rss.ts` |
| `http_json` | ✅ EXISTS | HTTP JSON APIs with JSONPath | `sources/http-json.ts` |
| `web_scraper` | ✅ EXISTS | Web scraping with selectors | `sources/web-scraper.ts` |
| `arxiv` | ✅ EXISTS | arXiv academic papers | `sources/arxiv.ts` |
| `user_source_ref` | 🔨 NEEDS | User-defined sources from DB | `sources/user-source.ts` (NEW) |

### 3.2 Source Execution Strategy

**Parallel Execution**: All sources run in parallel for performance
```typescript
const fetchResults = await Promise.allSettled(
  definition.sources.map(source => fetchSource(source))
);
```

**Error Handling**: Failed sources don't block execution
```typescript
const items = fetchResults
  .filter(r => r.status === 'fulfilled')
  .flatMap(r => r.value);

const sourceErrors = fetchResults
  .filter(r => r.status === 'rejected')
  .map(r => ({ source: '...', error: r.reason }));
```

### 3.3 Source Configuration Examples

**RSS Source**:
```typescript
{
  kind: 'builtin',
  sourceType: 'rss',
  feedUrl: 'https://hnrss.org/frontpage',
  maxItems: 10
}
```

**arXiv Source**:
```typescript
{
  kind: 'builtin',
  sourceType: 'arxiv',
  query: 'cat:cs.AI OR cat:cs.LG',
  maxItems: 20
}
```

**HTTP JSON Source**:
```typescript
{
  kind: 'builtin',
  sourceType: 'http_json',
  url: 'https://api.example.com/posts',
  method: 'GET',
  headers: { 'Authorization': 'Bearer token' },
  jsonPath: '$.data.items[*]',
  maxItems: 15
}
```

**User-Defined Source**:
```typescript
{
  kind: 'user_source_ref',
  userSourceId: 'uuid-of-user-source'
}
```

---

## 4. Pipeline Processing

### 4.1 Pipeline Steps

| Step | Purpose | LLM Required | Cost Impact |
|------|---------|--------------|-------------|
| `dedupe` | Remove duplicates by URL/ID/title | ❌ No | None |
| `filter` | Filter by maxItems, minScore, keywords | ❌ No | None |
| `sort` | Sort by publishedAt, score, relevance | ❌ No | None |
| `summarize` | Generate AI summaries | ✅ Yes | High |
| `rank` | Score items by relevance | ✅ Yes | Medium |
| `transform` | Transform data with LLM | ✅ Yes | Medium |
| `custom` | Run custom code | ❌ No | None |

### 4.2 Pipeline Execution

**Sequential Execution**: Steps run in order, each transforming the data
```typescript
let items: NormalizedItem[] = sourceItems;

for (const step of definition.pipeline) {
  items = await executeStep(step, items, context);
}
```

### 4.3 Step Implementations

#### Dedupe Step
```typescript
export function dedupeItems(
  items: NormalizedItem[],
  dedupeBy: 'url' | 'id' | 'title'
): NormalizedItem[] {
  const seen = new Set<string>();
  return items.filter(item => {
    const key = item[dedupeBy];
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
```

#### Filter Step
```typescript
export function filterItems(
  items: NormalizedItem[],
  config: { maxItems?: number; minScore?: number }
): NormalizedItem[] {
  let filtered = items;

  // Filter by score
  if (config.minScore !== undefined) {
    filtered = filtered.filter(item =>
      (item as EnrichedItem).score >= config.minScore!
    );
  }

  // Limit items
  if (config.maxItems) {
    filtered = filtered.slice(0, config.maxItems);
  }

  return filtered;
}
```

#### Sort Step
```typescript
export function sortItems(
  items: NormalizedItem[],
  sortBy: 'publishedAt' | 'score' | 'relevance',
  order: 'asc' | 'desc'
): NormalizedItem[] {
  return [...items].sort((a, b) => {
    const aVal = a[sortBy] || 0;
    const bVal = b[sortBy] || 0;
    return order === 'asc' ? aVal - bVal : bVal - aVal;
  });
}
```

#### Summarize Step (LLM)
```typescript
export async function summarizeItems(
  items: NormalizedItem[],
  config: {
    model: string;
    maxTokens: number;
    perItem: boolean;
    promptTemplateId: string;
  }
): Promise<string | NormalizedItem[]> {
  if (config.perItem) {
    // Summarize each item individually
    return await Promise.all(
      items.map(item => summarizeItem(item, config))
    );
  } else {
    // Summarize all items together
    return await summarizeAll(items, config);
  }
}
```

---

## 5. Collation Strategies

### 5.1 Strategy Types

**Merge** (default):
```typescript
// Combine all source items into single array
{
  strategy: 'merge',
  maxTotalItems: 20
}
// Result: [item1, item2, item3, ...] (max 20)
```

**Separate**:
```typescript
// Keep sources separate
{
  strategy: 'separate',
  maxTotalItems: 30 // 30 per source
}
// Result: {
//   source1: [items...],
//   source2: [items...]
// }
```

**Prioritize**:
```typescript
// Use first source, fallback to others if needed
{
  strategy: 'prioritize',
  maxTotalItems: 15
}
// Result: source1 items first, then source2, etc. until maxTotalItems
```

### 5.2 Implementation

```typescript
export function collateItems(
  sourceResults: Map<string, NormalizedItem[]>,
  config: CollationConfig
): NormalizedItem[] | Record<string, NormalizedItem[]> {
  switch (config.strategy) {
    case 'merge':
      const merged = Array.from(sourceResults.values()).flat();
      return merged.slice(0, config.maxTotalItems);

    case 'separate':
      return Object.fromEntries(
        Array.from(sourceResults.entries()).map(([key, items]) => [
          key,
          items.slice(0, config.maxTotalItems)
        ])
      );

    case 'prioritize':
      const prioritized: NormalizedItem[] = [];
      for (const items of sourceResults.values()) {
        prioritized.push(...items);
        if (prioritized.length >= config.maxTotalItems) break;
      }
      return prioritized.slice(0, config.maxTotalItems);
  }
}
```

---

## 6. Output Generation

### 6.1 SMS Output

**Template Variables**:
```
{{title}}        - Item title
{{summary}}      - Item summary
{{url}}          - Item URL
{{author}}       - Item author
{{publishedAt}}  - Publication date
{{keyPoints}}    - AI-generated key points (array)
{{count}}        - Total item count
```

**Example Template**:
```
📊 {{agentName}}

Found {{count}} items:

{{#each items}}
• {{title}}
  {{#if keyPoints}}Key: {{keyPoints.0}}{{/if}}
  🔗 {{url}}
{{/each}}

Full report: {{reportUrl}}
```

**SMS Constraints**:
- Max length: 1600 characters (configurable)
- Auto-truncation with "..." if exceeds limit
- Link shortening for long URLs

### 6.2 Report Output

**Format Options**: `markdown`, `html`, `json`

**Markdown Report Structure**:
```markdown
# Agent Name

_Description goes here_

**Generated**: 2025-11-23 10:30 AM PST

---

## AI Summary

[LLM-generated executive summary if summarize step enabled]

---

## Items (15)

### Item 1 Title

**Author**: John Doe
**Published**: 2025-11-22
**URL**: https://example.com/item1

[Item summary or AI-generated key points]

**Tags**: AI, Machine Learning, Research

---

### Item 2 Title

...
```

**HTML Report**: Same content, styled with Tailwind CSS

**JSON Report**: Machine-readable format for integrations

### 6.3 Audio Output (Future)

```typescript
{
  audio: {
    enabled: true,
    voice: 'alloy' // OpenAI TTS voice
  }
}
```

Generate podcast-style audio report using OpenAI TTS.

---

## 7. API Endpoints

### 7.1 Admin API (sms-bot/src/agents/api/admin.ts)

**Base URL**: `http://localhost:3001/api/admin`

#### POST /api/admin/agents/preview

**Purpose**: Preview agent execution without sending SMS or saving run

**Request**:
```typescript
{
  definition: AgentDefinition,
  context?: {
    userId?: string,
    phoneNumber?: string
  }
}
```

**Response**:
```typescript
{
  success: true,
  preview: {
    smsOutput: string,
    reportMarkdown: string,
    reportUrl: null, // Not saved in preview mode
    itemsProcessed: number,
    metrics: RunMetrics
  }
}
```

**Error Response**:
```typescript
{
  success: false,
  error: string,
  details: any
}
```

#### POST /api/admin/agents/execute

**Purpose**: Execute agent and create run record

**Request**:
```typescript
{
  agentVersionId: string,
  context: RunContext
}
```

**Response**:
```typescript
{
  success: true,
  agentRunId: string,
  outputs: {
    sms: string,
    reportUrl: string,
    audioUrl?: string
  },
  metrics: RunMetrics
}
```

#### GET /api/admin/agents/runs/:runId

**Purpose**: Get run details and metrics

**Response**:
```typescript
{
  id: string,
  agentId: string,
  versionId: string,
  status: 'running' | 'success' | 'failed' | 'timeout',
  startedAt: string,
  finishedAt: string,
  outputs: {...},
  metrics: {...},
  errors: [...]
}
```

### 7.2 Webhook API (EXISTING)

Handled by `sms-bot/src/agents/webhooks.ts`

---

## 8. Error Handling

### 8.1 Error Categories

| Category | Handling | User Impact |
|----------|----------|-------------|
| **Source Fetch Error** | Log, continue with other sources | Partial results |
| **Pipeline Step Error** | Abort pipeline, return items so far | Degraded results |
| **LLM API Error** | Retry 3x, then skip step | Missing AI features |
| **Validation Error** | Abort execution | No results |
| **Storage Error** | Retry 3x, then fail | No saved report |
| **Timeout** | Abort after safety.timeout seconds | Partial results |

### 8.2 Error Tracking

**Database**: Store errors in `agent_runs` table
```sql
UPDATE agent_runs SET
  status = 'failed',
  error_message = 'Failed to fetch source: RSS timeout',
  error_stack = '...'
WHERE id = run_id;
```

**Logging**: Structured logging with Winston or Pino
```typescript
logger.error('Agent execution failed', {
  agentId,
  versionId,
  step: 'fetch_sources',
  error: error.message,
  stack: error.stack,
  duration: Date.now() - startTime
});
```

### 8.3 Retry Logic

**LLM Calls**:
```typescript
async function callLLM(params: any, maxRetries = 3): Promise<any> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await openai.chat.completions.create(params);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(1000 * (i + 1)); // Exponential backoff
    }
  }
}
```

**Network Requests**:
```typescript
async function fetchWithRetry(url: string, maxRetries = 3): Promise<Response> {
  // Similar retry logic
}
```

---

## 9. Monitoring & Metrics

### 9.1 Per-Run Metrics

Stored in `agent_runs.metrics_jsonb`:
```typescript
{
  sourcesFetched: 3,
  itemsProcessed: 45,
  llmCallsMade: 12,
  tokensUsed: 8540,
  durationMs: 15234,
  estimatedCost: 0.12, // USD
  steps: {
    fetch_sources: 3200,
    pipeline_dedupe: 45,
    pipeline_filter: 12,
    pipeline_summarize: 9800,
    generate_report: 1100,
    upload_report: 892
  }
}
```

### 9.2 Aggregated Metrics (Future)

```typescript
// Daily rollup
{
  date: '2025-11-23',
  totalRuns: 342,
  successfulRuns: 328,
  failedRuns: 14,
  avgDuration: 12500,
  totalTokens: 1250000,
  totalCost: 45.67
}
```

### 9.3 Cost Tracking

**LLM Costs** (approximate):
```typescript
const COST_PER_1K_TOKENS = {
  'gpt-4': { input: 0.03, output: 0.06 },
  'gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
  'claude-3-opus': { input: 0.015, output: 0.075 },
  'claude-3-sonnet': { input: 0.003, output: 0.015 }
};

function estimateCost(model: string, tokensUsed: number): number {
  const pricing = COST_PER_1K_TOKENS[model];
  return (tokensUsed / 1000) * pricing.output;
}
```

---

## 10. Safety & Resource Limits

### 10.1 Default Limits

```typescript
{
  maxSourcesPerRun: 3,
  maxItemsPerSource: 10,
  maxLLMCalls: 10,
  maxTokensPerRun: 10000,
  timeout: 120 // seconds
}
```

### 10.2 Enforcement

**Sources**:
```typescript
if (definition.sources.length > safety.maxSourcesPerRun) {
  throw new Error(`Too many sources (max ${safety.maxSourcesPerRun})`);
}
```

**LLM Calls**:
```typescript
let llmCallCount = 0;

async function makeLLMCall(params: any): Promise<any> {
  if (llmCallCount >= safety.maxLLMCalls) {
    throw new Error('LLM call limit exceeded');
  }
  llmCallCount++;
  return await callLLM(params);
}
```

**Timeout**:
```typescript
const timeout = setTimeout(() => {
  throw new Error('Execution timeout');
}, safety.timeout * 1000);

try {
  const result = await runAgent(definition, context);
  clearTimeout(timeout);
  return result;
} catch (error) {
  clearTimeout(timeout);
  throw error;
}
```

---

## 11. Database Schema (agent_runs)

```sql
CREATE TABLE agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id),
  version_id UUID NOT NULL REFERENCES agent_versions(id),

  -- User context
  user_id UUID REFERENCES auth.users(id),
  phone_number TEXT,

  -- Run type
  run_type TEXT NOT NULL CHECK (run_type IN ('scheduled', 'command', 'manual', 'preview')),
  trigger_data JSONB,

  -- Execution status
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'failed', 'timeout')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,

  -- Error tracking
  error_message TEXT,
  error_stack TEXT,

  -- Outputs
  sms_content TEXT,
  report_url TEXT,
  audio_url TEXT,

  -- Performance metrics
  metrics_jsonb JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 12. Implementation Plan

### Phase 1: Core Execution (Week 1)
- ✅ Enhance `runtime.ts` with new source types
- ✅ Implement all pipeline steps (filter, sort, rank, transform)
- ✅ Add collation logic
- ✅ Improve error handling and retry logic

### Phase 2: Output Generation (Week 1)
- ✅ SMS template engine with Handlebars
- ✅ Report generation (markdown, HTML, JSON)
- ✅ Upload to Supabase storage
- ⏭️ Audio generation (deferred to later sprint)

### Phase 3: API Endpoints (Week 2)
- ✅ POST /api/admin/agents/preview
- ✅ POST /api/admin/agents/execute
- ✅ GET /api/admin/agents/runs/:runId
- ✅ Authentication with API keys

### Phase 4: Monitoring & Metrics (Week 2)
- ✅ Detailed metrics tracking
- ✅ Cost estimation
- ✅ Performance logging
- ⏭️ Aggregated analytics (future sprint)

### Phase 5: Testing & Validation (Week 2)
- ✅ Unit tests for each pipeline step
- ✅ Integration tests for full execution flow
- ✅ Load testing with multiple concurrent runs
- ✅ Cost validation

---

## 13. Example: End-to-End Execution

### Input: AgentDefinition

```typescript
{
  metadata: {
    name: "AI Research Digest",
    slug: "ai-research-digest",
    description: "Daily digest of AI research papers",
    category: "research",
    version: "1.0.0"
  },
  triggers: {
    schedule: {
      enabled: true,
      cron: "0 9 * * *",
      timezone: "America/Los_Angeles"
    },
    commands: [
      { keyword: "RESEARCH", description: "Get latest research" }
    ]
  },
  sources: [
    {
      kind: "builtin",
      sourceType: "arxiv",
      query: "cat:cs.AI OR cat:cs.LG",
      maxItems: 20
    }
  ],
  pipeline: [
    { kind: "dedupe", dedupeBy: "url" },
    { kind: "filter", maxItems: 10 },
    {
      kind: "summarize",
      promptTemplateId: "inline-summarize",
      model: "gpt-4",
      maxTokens: 1000,
      perItem: false
    },
    { kind: "sort", sortBy: "publishedAt", order: "desc" }
  ],
  collation: {
    strategy: "merge",
    maxTotalItems: 10
  },
  output: {
    sms: {
      enabled: true,
      template: "📚 {{title}}\\n\\n{{summary}}\\n\\n🔗 {{url}}",
      maxLength: 1600
    },
    report: {
      enabled: true,
      format: "markdown"
    }
  }
}
```

### Execution Steps

1. **Fetch Sources**: arXiv API → 20 papers
2. **Dedupe**: 20 → 18 (2 duplicates removed)
3. **Filter**: 18 → 10 (limited to maxItems)
4. **Summarize**: LLM call → Executive summary generated
5. **Sort**: Sort by publishedAt (descending)
6. **Collate**: Already merged (single source)
7. **Generate Outputs**:
   - SMS: 480 characters
   - Report: 5,234 characters (markdown)
8. **Upload Report**: Supabase storage → URL
9. **Create Run Record**: Database insert
10. **Return Result**: RunResult object

### Output: RunResult

```typescript
{
  success: true,
  agentRunId: "uuid-123",
  outputs: {
    sms: "📊 AI Research Digest\\n\\n10 new papers:\\n\\n• Deep Learning for...",
    reportUrl: "https://storage.supabase.co/reports/uuid-123.md",
    audioUrl: null
  },
  metrics: {
    sourcesFetched: 1,
    itemsProcessed: 10,
    llmCallsMade: 1,
    tokensUsed: 2340,
    durationMs: 8450,
    estimatedCost: 0.14
  }
}
```

---

## 14. Testing Strategy

### Unit Tests

- Each source fetcher (`rss`, `arxiv`, `http-json`, etc.)
- Each pipeline step (`dedupe`, `filter`, `sort`, `summarize`, etc.)
- Each collation strategy
- Each output generator

### Integration Tests

- Full execution flow with mock sources
- Error handling and recovery
- Timeout enforcement
- Resource limit enforcement

### Load Tests

- 100 concurrent executions
- Monitor memory usage and CPU
- Verify database connection pooling

### Cost Tests

- Track actual LLM costs
- Validate cost estimation accuracy
- Test with different models (GPT-4, GPT-3.5, Claude)

---

## 15. Security Considerations

### API Authentication

```typescript
// Verify API key from request headers
const apiKey = request.headers.get('Authorization')?.replace('Bearer ', '');
if (apiKey !== process.env.ADMIN_API_KEY) {
  return Response.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### SQL Injection Prevention

- ✅ Using Supabase client (parameterized queries)
- ✅ All user input validated with Zod

### XSS Prevention

- ✅ Sanitize HTML in report generation
- ✅ Escape special characters in SMS templates

### Rate Limiting

```typescript
// Limit to 10 executions per minute per user
const key = `rate_limit:${userId}`;
const count = await redis.incr(key);
if (count === 1) await redis.expire(key, 60);
if (count > 10) {
  throw new Error('Rate limit exceeded');
}
```

---

## 16. Future Enhancements (Post-Sprint 4)

- **Caching**: Cache source results for 5-10 minutes
- **Webhooks**: Allow agents to trigger webhooks
- **Streaming**: Stream LLM responses for real-time updates
- **Multi-language**: Support for non-English content
- **Analytics Dashboard**: Visual metrics and insights
- **A/B Testing**: Test different agent configurations
- **Cost Optimization**: Auto-select cheapest model that meets requirements

---

## 17. Success Criteria

Sprint 4 is complete when:

- ✅ All source types execute correctly (RSS, arXiv, HTTP JSON, Web Scraper, User Sources)
- ✅ All pipeline steps work (dedupe, filter, sort, summarize, rank, transform, custom)
- ✅ All collation strategies implemented (merge, separate, prioritize)
- ✅ All output formats generated (SMS, markdown report, HTML report, JSON report)
- ✅ API endpoints functional (/preview, /execute, /runs/:id)
- ✅ Metrics tracked accurately (sources, items, LLM calls, tokens, cost, duration)
- ✅ Errors handled gracefully with retry logic
- ✅ Safety limits enforced (max sources, items, LLM calls, tokens, timeout)
- ✅ Database records created correctly in `agent_runs`
- ✅ 100% test coverage for critical paths
- ✅ Load tested with 100+ concurrent executions
- ✅ Preview button in workflow builder works end-to-end

---

## 18. Dependencies

### External Services
- ✅ Supabase (database + storage)
- ✅ OpenAI API (GPT-4, GPT-3.5)
- ⏭️ Anthropic API (Claude 3 - future)
- ⏭️ Redis (rate limiting, caching - future)

### NPM Packages
- ✅ `@supabase/supabase-js` (Supabase client)
- ✅ `openai` (OpenAI API client)
- ✅ `rss-parser` (RSS feed parsing)
- ✅ `cheerio` (HTML parsing for web scraper)
- ✅ `handlebars` (Template engine for SMS/reports)
- ✅ `zod` (Schema validation)
- ⏭️ `@anthropic-ai/sdk` (Claude API - future)

---

## 19. Conclusion

This specification provides a complete blueprint for building the execution engine. The implementation will:

1. Build on existing Sprint 1 runtime skeleton
2. Complete all missing pipeline steps
3. Add comprehensive error handling
4. Implement all output formats
5. Create production-ready API endpoints
6. Track detailed metrics and costs
7. Ensure safety and security

**Estimated Time**: 2 weeks (80 hours)

**Risk Areas**:
- LLM API rate limits and costs
- Handling large volumes of source data
- Storage costs for reports
- Timeout edge cases

**Mitigation**:
- Implement aggressive caching
- Use cheaper models where possible (GPT-3.5 instead of GPT-4)
- Compress reports before storage
- Extensive timeout testing

---

**Ready to begin implementation!** 🚀
