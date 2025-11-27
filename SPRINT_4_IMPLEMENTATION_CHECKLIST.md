# Sprint 4: Execution Engine - Implementation Checklist

## Overview
This checklist breaks down the Sprint 4 specification into actionable tasks with file-level granularity.

---

## 📁 File Structure

```
sms-bot/src/agents/
├── runtime.ts              [MODIFY] Main orchestrator
├── executor.ts             [CREATE]  Core execution logic
├── sources/
│   ├── fetch.ts           [EXISTS]  Generic source fetcher
│   ├── arxiv.ts           [EXISTS]  arXiv source
│   ├── rss.ts             [EXISTS]  RSS source
│   ├── http-json.ts       [EXISTS]  HTTP JSON source
│   ├── web-scraper.ts     [EXISTS]  Web scraper source
│   └── user-source.ts     [CREATE]  User-defined source executor
├── pipeline/
│   ├── dedupe.ts          [EXISTS]  Deduplication
│   ├── filter.ts          [CREATE]  Filtering logic
│   ├── sort.ts            [CREATE]  Sorting logic
│   ├── summarize.ts       [EXISTS]  LLM summarization
│   ├── rank.ts            [CREATE]  LLM ranking
│   ├── transform.ts       [CREATE]  LLM transformation
│   └── custom.ts          [CREATE]  Custom code execution
├── collation/
│   └── collate.ts         [CREATE]  Collation strategies
├── output/
│   ├── sms.ts             [CREATE]  SMS output generation
│   ├── report.ts          [CREATE]  Report generation
│   └── audio.ts           [CREATE]  Audio generation (stub for now)
├── api/
│   ├── admin.ts           [CREATE]  Admin API routes
│   └── webhooks.ts        [EXISTS]  Webhook handlers
└── monitoring/
    ├── metrics.ts         [CREATE]  Metrics tracking
    └── errors.ts          [CREATE]  Error tracking
```

---

## ✅ Implementation Tasks

### Phase 1: Source Execution (Priority 1)

#### Task 1.1: Update Runtime to Support All Sources
- [ ] File: `sms-bot/src/agents/runtime.ts`
- [ ] Update source fetching loop to handle all source types
- [ ] Add parallel execution with `Promise.allSettled`
- [ ] Add source-level error handling
- [ ] Test with multiple sources

**Code Snippet**:
```typescript
const fetchPromises = definition.sources.map(async (source) => {
  try {
    switch (source.kind) {
      case 'builtin':
        return await fetchBuiltinSource(source);
      case 'user_source_ref':
        return await fetchUserSource(source.userSourceId);
      default:
        throw new Error(`Unknown source kind: ${source.kind}`);
    }
  } catch (error) {
    errors.push({ source: source.kind, error: error.message });
    return [];
  }
});

const sourceResults = await Promise.allSettled(fetchPromises);
```

#### Task 1.2: Implement User Source Fetcher
- [ ] File: `sms-bot/src/agents/sources/user-source.ts` (NEW)
- [ ] Fetch user source definition from `user_sources` table
- [ ] Execute based on source type (RSS, HTTP JSON, Web Scraper)
- [ ] Normalize to `NormalizedItem[]`
- [ ] Handle errors gracefully

**Interface**:
```typescript
export async function fetchUserSource(
  userSourceId: string
): Promise<NormalizedItem[]>
```

#### Task 1.3: Verify Existing Source Implementations
- [ ] File: `sms-bot/src/agents/sources/rss.ts` - ✅ DONE
- [ ] File: `sms-bot/src/agents/sources/http-json.ts` - Test with JSONPath
- [ ] File: `sms-bot/src/agents/sources/web-scraper.ts` - Test with Cheerio
- [ ] File: `sms-bot/src/agents/sources/arxiv.ts` - ✅ DONE

---

### Phase 2: Pipeline Steps (Priority 1)

#### Task 2.1: Filter Step
- [ ] File: `sms-bot/src/agents/pipeline/filter.ts` (NEW)
- [ ] Filter by `maxItems`
- [ ] Filter by `minScore` (if items have score)
- [ ] Unit tests

**Interface**:
```typescript
export function filterItems(
  items: NormalizedItem[],
  config: { maxItems?: number; minScore?: number }
): NormalizedItem[]
```

#### Task 2.2: Sort Step
- [ ] File: `sms-bot/src/agents/pipeline/sort.ts` (NEW)
- [ ] Sort by `publishedAt` (date)
- [ ] Sort by `score` (number)
- [ ] Sort by `relevance` (number)
- [ ] Support `asc` and `desc` order
- [ ] Unit tests

**Interface**:
```typescript
export function sortItems(
  items: NormalizedItem[],
  sortBy: 'publishedAt' | 'score' | 'relevance',
  order: 'asc' | 'desc'
): NormalizedItem[]
```

#### Task 2.3: Rank Step (LLM)
- [ ] File: `sms-bot/src/agents/pipeline/rank.ts` (NEW)
- [ ] Call OpenAI API to score items
- [ ] Add `score` and `relevanceReason` to each item
- [ ] Handle API errors with retry
- [ ] Track token usage
- [ ] Unit tests with mocked API

**Interface**:
```typescript
export async function rankItems(
  items: NormalizedItem[],
  config: { model: string; promptTemplateId: string }
): Promise<EnrichedItem[]>
```

#### Task 2.4: Transform Step (LLM)
- [ ] File: `sms-bot/src/agents/pipeline/transform.ts` (NEW)
- [ ] Call OpenAI API to transform data
- [ ] Support JSON, text, markdown output
- [ ] Handle API errors with retry
- [ ] Track token usage
- [ ] Unit tests with mocked API

**Interface**:
```typescript
export async function transformItems(
  items: NormalizedItem[],
  config: { model: string; promptTemplateId: string; outputFormat: string }
): Promise<NormalizedItem[]>
```

#### Task 2.5: Custom Step
- [ ] File: `sms-bot/src/agents/pipeline/custom.ts` (NEW)
- [ ] Load custom step code from database or registry
- [ ] Execute in sandboxed environment (for security)
- [ ] Handle errors
- [ ] Unit tests

**Interface**:
```typescript
export async function executeCustomStep(
  items: NormalizedItem[],
  config: { customStepId: string; config?: Record<string, any> }
): Promise<NormalizedItem[]>
```

---

### Phase 3: Collation (Priority 2)

#### Task 3.1: Collation Strategies
- [ ] File: `sms-bot/src/agents/collation/collate.ts` (NEW)
- [ ] Implement `merge` strategy
- [ ] Implement `separate` strategy
- [ ] Implement `prioritize` strategy
- [ ] Unit tests for each strategy

**Interface**:
```typescript
export function collateItems(
  sourceResults: Map<string, NormalizedItem[]>,
  config: CollationConfig
): NormalizedItem[] | Record<string, NormalizedItem[]>
```

---

### Phase 4: Output Generation (Priority 1)

#### Task 4.1: SMS Output
- [ ] File: `sms-bot/src/agents/output/sms.ts` (NEW)
- [ ] Implement Handlebars template engine
- [ ] Support variables: `{{title}}`, `{{summary}}`, `{{url}}`, etc.
- [ ] Support loops: `{{#each items}}`
- [ ] Truncate to `maxLength` with "..."
- [ ] Unit tests

**Interface**:
```typescript
export function generateSMS(
  items: NormalizedItem[],
  config: { template: string; maxLength: number },
  agentMetadata: AgentMetadata
): string
```

#### Task 4.2: Report Output
- [ ] File: `sms-bot/src/agents/output/report.ts` (NEW)
- [ ] Generate markdown report
- [ ] Generate HTML report (with Tailwind CSS)
- [ ] Generate JSON report
- [ ] Include AI summary if `summarize` step exists
- [ ] Upload to Supabase storage
- [ ] Return public URL
- [ ] Unit tests

**Interface**:
```typescript
export async function generateReport(
  items: NormalizedItem[],
  definition: AgentDefinition,
  format: 'markdown' | 'html' | 'json'
): Promise<{ content: string; url: string }>
```

#### Task 4.3: Audio Output (Stub)
- [ ] File: `sms-bot/src/agents/output/audio.ts` (NEW)
- [ ] Create stub function that returns "Not implemented"
- [ ] Add TODO comment for future OpenAI TTS integration

**Interface**:
```typescript
export async function generateAudio(
  items: NormalizedItem[],
  config: { voice?: string }
): Promise<{ url: string | null }>
```

---

### Phase 5: Core Executor (Priority 1)

#### Task 5.1: Main Executor
- [ ] File: `sms-bot/src/agents/executor.ts` (NEW)
- [ ] Orchestrate full execution flow
- [ ] Handle errors at each step
- [ ] Track metrics
- [ ] Enforce safety limits
- [ ] Create `agent_runs` record
- [ ] Integration tests

**Interface**:
```typescript
export async function executeAgent(
  agentVersionId: string,
  context: RunContext
): Promise<RunResult>
```

**Flow**:
1. Load agent definition from DB
2. Validate schema
3. Fetch sources (parallel)
4. Execute pipeline (sequential)
5. Apply collation
6. Generate outputs
7. Upload artifacts
8. Create run record
9. Return result

---

### Phase 6: API Endpoints (Priority 2)

#### Task 6.1: Admin API
- [ ] File: `sms-bot/src/agents/api/admin.ts` (NEW)
- [ ] POST `/api/admin/agents/preview`
- [ ] POST `/api/admin/agents/execute`
- [ ] GET `/api/admin/agents/runs/:runId`
- [ ] API key authentication
- [ ] Rate limiting (basic)
- [ ] Integration tests

**Example**:
```typescript
export async function handlePreview(request: Request): Promise<Response> {
  // Verify API key
  // Parse request body
  // Execute agent in preview mode
  // Return preview result (no DB save)
}
```

#### Task 6.2: Server Setup
- [ ] File: `sms-bot/src/index.ts` (MODIFY)
- [ ] Add HTTP server alongside WebSocket server
- [ ] Mount admin API routes
- [ ] Add CORS headers
- [ ] Add error handling middleware

---

### Phase 7: Monitoring & Metrics (Priority 2)

#### Task 7.1: Metrics Tracking
- [ ] File: `sms-bot/src/agents/monitoring/metrics.ts` (NEW)
- [ ] Create `MetricsCollector` class
- [ ] Track: sources, items, LLM calls, tokens, duration
- [ ] Calculate estimated cost
- [ ] Serialize to JSON for DB storage

**Interface**:
```typescript
class MetricsCollector {
  incrementSources(): void;
  incrementItems(count: number): void;
  addLLMCall(model: string, tokens: number): void;
  setDuration(ms: number): void;
  toJSON(): RunMetrics;
}
```

#### Task 7.2: Error Tracking
- [ ] File: `sms-bot/src/agents/monitoring/errors.ts` (NEW)
- [ ] Create `ErrorCollector` class
- [ ] Store errors with step context
- [ ] Format for DB storage
- [ ] Log errors with structured logging

**Interface**:
```typescript
class ErrorCollector {
  addError(step: string, error: Error): void;
  hasErrors(): boolean;
  toJSON(): Array<{ step: string; message: string; stack?: string }>;
}
```

---

## 🧪 Testing Plan

### Unit Tests

Create test files in `sms-bot/src/__tests__/`:

- [ ] `sources/rss.test.ts`
- [ ] `sources/http-json.test.ts`
- [ ] `sources/web-scraper.test.ts`
- [ ] `sources/user-source.test.ts`
- [ ] `pipeline/dedupe.test.ts`
- [ ] `pipeline/filter.test.ts`
- [ ] `pipeline/sort.test.ts`
- [ ] `pipeline/summarize.test.ts`
- [ ] `pipeline/rank.test.ts`
- [ ] `pipeline/transform.test.ts`
- [ ] `collation/collate.test.ts`
- [ ] `output/sms.test.ts`
- [ ] `output/report.test.ts`
- [ ] `executor.test.ts`

### Integration Tests

- [ ] `integration/full-execution.test.ts` - End-to-end test
- [ ] `integration/error-handling.test.ts` - Error scenarios
- [ ] `integration/timeout.test.ts` - Timeout enforcement
- [ ] `integration/api.test.ts` - API endpoint tests

### Load Tests

- [ ] `load/concurrent-runs.test.ts` - 100 concurrent executions
- [ ] `load/memory-usage.test.ts` - Monitor memory leaks
- [ ] `load/database-connections.test.ts` - Connection pooling

---

## 📦 Dependencies

### Install Required Packages

```bash
cd sms-bot
npm install --save \
  handlebars \
  marked \
  cheerio \
  @types/handlebars \
  @types/marked
```

### Already Installed

- ✅ `@supabase/supabase-js`
- ✅ `openai`
- ✅ `rss-parser`
- ✅ `zod`

---

## 🚀 Execution Order

### Week 1: Core Functionality

**Day 1-2**: Sources & Pipeline
1. Task 1.2: User source fetcher
2. Task 2.1: Filter step
3. Task 2.2: Sort step
4. Task 1.1: Update runtime for all sources

**Day 3-4**: LLM Pipeline & Output
5. Task 2.3: Rank step
6. Task 2.4: Transform step
7. Task 4.1: SMS output
8. Task 4.2: Report output

**Day 5**: Collation & Executor
9. Task 3.1: Collation strategies
10. Task 5.1: Main executor

### Week 2: API, Monitoring, Testing

**Day 1-2**: API Endpoints
11. Task 6.1: Admin API
12. Task 6.2: Server setup

**Day 3-4**: Monitoring & Testing
13. Task 7.1: Metrics tracking
14. Task 7.2: Error tracking
15. Unit tests (all files)

**Day 5**: Integration & Load Testing
16. Integration tests
17. Load tests
18. Bug fixes and optimization

---

## ✓ Definition of Done

Sprint 4 is complete when:

- [ ] All source types execute without errors
- [ ] All pipeline steps pass unit tests
- [ ] SMS and report outputs generated correctly
- [ ] API endpoints return expected responses
- [ ] Metrics tracked accurately
- [ ] Errors handled gracefully
- [ ] Safety limits enforced
- [ ] 100 concurrent executions succeed
- [ ] Preview button in UI works end-to-end
- [ ] Documentation complete
- [ ] Code reviewed and merged

---

## 📝 Notes

- Use TypeScript strict mode
- Follow existing code style
- Add JSDoc comments to all public functions
- Log important steps with structured logging
- Handle all promises with try/catch or `.catch()`
- Never expose API keys in logs
- Test edge cases (empty arrays, null values, etc.)
- Profile performance for optimization opportunities

---

**Ready to implement!** 🎯
