# Sprint 4: Execution Engine - Implementation Ready

## 📋 What's Been Delivered

I've created a **comprehensive specification** for the execution engine that will power your agent platform. This specification includes:

### 1. [SPRINT_4_EXECUTION_ENGINE_SPEC.md](SPRINT_4_EXECUTION_ENGINE_SPEC.md)
**1,000+ lines** of detailed technical specification covering:
- Complete architecture with visual diagrams
- Data flow and type definitions
- All 8 source types (RSS, arXiv, HTTP JSON, Web Scraper, User Sources, etc.)
- All 8 pipeline steps (dedupe, filter, sort, summarize, rank, transform, custom)
- 3 collation strategies (merge, separate, prioritize)
- 3 output formats (SMS, markdown/HTML/JSON reports, audio stub)
- 3 API endpoints (preview, execute, get run)
- Error handling with retry logic
- Metrics tracking and cost estimation
- Safety limits and resource constraints
- Security considerations
- Testing strategy
- 15+ code examples

### 2. [SPRINT_4_IMPLEMENTATION_CHECKLIST.md](SPRINT_4_IMPLEMENTATION_CHECKLIST.md)
**800+ lines** of actionable implementation tasks:
- Detailed file structure (what to create vs modify)
- 40+ granular tasks organized by priority
- Code interfaces for every function
- 2-week execution timeline (Week 1: Core, Week 2: API/Testing)
- Unit test plan (15+ test files)
- Integration and load test requirements
- Dependencies to install
- Definition of done criteria

---

## 🎯 Quick Start

### If You're Ready to Build:
1. Read **Section 1-6** of the spec (architecture, data flow, sources, pipeline, collation, outputs)
2. Follow the **Implementation Checklist** in order
3. Start with **Phase 1: Sources** → **Phase 2: Pipeline** → **Phase 5: Executor**

### If You Want to Understand First:
1. Read **Section 13** of the spec (Example: End-to-End Execution)
2. Read **Section 1** (Architecture Overview)
3. Skim the checklist to see the file structure

---

## 🏗️ What Exists vs What Needs Building

### ✅ Already Built (Sprint 1-3)
- Agent schema and data types
- Basic runtime skeleton (`sms-bot/src/agents/runtime.ts`)
- RSS source fetcher
- arXiv source fetcher
- HTTP JSON source fetcher
- Web scraper source fetcher
- Dedupe pipeline step
- Summarize pipeline step (basic)
- Database schema (`agents`, `agent_versions`, `agent_runs`)
- Workflow builder UI (Sprint 3)

### 🔨 Needs Building (Sprint 4)
- **Sources**: User-defined source executor
- **Pipeline**: Filter, Sort, Rank, Transform, Custom steps
- **Collation**: Merge, Separate, Prioritize strategies
- **Outputs**: SMS template engine, Report generator (markdown/HTML/JSON)
- **API**: Admin endpoints (preview, execute, runs)
- **Monitoring**: Metrics collector, Error tracker
- **Executor**: Core orchestration logic

**Estimated**: ~30-40 files to create/modify

---

## 📊 Architecture at a Glance

```
User Creates Agent in UI (Sprint 3)
         ↓
Agent Definition Saved to DB
         ↓
Trigger Event (Schedule/SMS/Manual)
         ↓
┌─────────────────────────────────────┐
│      EXECUTION ENGINE (Sprint 4)    │
│                                     │
│  1. Load Definition                 │
│  2. Fetch Sources (parallel) ────┐  │
│  3. Execute Pipeline (sequential) │  │
│  4. Apply Collation               │  │
│  5. Generate Outputs              │  │
│  6. Track Metrics                 │  │
│  7. Save Run Record               │  │
└─────────────────────────────────────┘
         ↓
SMS Sent + Report URL + Metrics Logged
```

---

## 💡 Key Technical Decisions

### 1. Parallel Source Fetching
**Why**: Dramatically improves performance
**How**: `Promise.allSettled()` to fetch all sources concurrently
**Benefit**: 3 sources in 3 seconds instead of 9 seconds

### 2. Sequential Pipeline Processing
**Why**: Each step depends on previous step's output
**How**: `for...of` loop executing steps in order
**Trade-off**: Can't parallelize, but correct data flow

### 3. Template-Based SMS Generation
**Why**: Flexibility for users to customize output
**How**: Handlebars template engine
**Example**: `"📰 {{title}}\n\n{{summary}}\n\n🔗 {{url}}"`

### 4. Storage-Based Reports
**Why**: Reports can be large (10KB-1MB)
**How**: Upload to Supabase storage, store URL in DB
**Benefit**: SMS only contains link, not full content

### 5. LLM Cost Tracking
**Why**: OpenAI API costs can add up quickly
**How**: Track tokens per call, estimate cost per run
**Benefit**: Users can see cost before approving agent

---

## 🎢 Data Transformation Journey

**Example**: Hacker News RSS Feed → AI Research Digest SMS

1. **Raw RSS** (XML):
   ```xml
   <item>
     <title>Show HN: I built a new AI model</title>
     <link>https://news.ycombinator.com/item?id=123</link>
     <pubDate>Sat, 23 Nov 2025 10:00:00 GMT</pubDate>
   </item>
   ```

2. **Normalized** (TypeScript):
   ```typescript
   {
     id: "https://news.ycombinator.com/item?id=123",
     title: "Show HN: I built a new AI model",
     url: "https://news.ycombinator.com/item?id=123",
     publishedAt: "2025-11-23T10:00:00Z",
     author: "Hacker News",
     raw: { /* original */ }
   }
   ```

3. **Enriched** (after LLM pipeline):
   ```typescript
   {
     ...normalized,
     score: 0.95,
     relevanceReason: "Discusses novel AI architecture",
     categories: ["AI", "Show HN"],
     keyPoints: ["New transformer variant", "Open source"]
   }
   ```

4. **SMS Output**:
   ```
   📰 Show HN: I built a new AI model

   Discusses novel AI architecture

   • New transformer variant
   • Open source

   🔗 https://news.ycombinator.com/item?id=123

   Full report: https://storage.supabase.co/...
   ```

---

## 📈 Performance & Cost Targets

### Performance
- **Source Fetching**: < 5 seconds (parallel, 3 sources)
- **Pipeline Processing**: < 3 seconds (20 items, no LLM)
- **LLM Summarization**: < 10 seconds (GPT-4, 500 tokens)
- **Total Execution**: < 20 seconds (end-to-end)

### Cost (per run)
- **No LLM**: $0.00 (RSS fetch, dedupe, filter, sort)
- **With GPT-3.5**: ~$0.01 (summarize 20 items)
- **With GPT-4**: ~$0.10-0.15 (summarize + rank + transform)
- **Storage**: ~$0.001 per report (1MB)

### Scale Targets
- **Concurrent Runs**: 100+
- **Daily Runs**: 10,000+
- **Monthly Cost**: < $500 (at 10K runs/day with GPT-3.5)

---

## 🔒 Security & Safety

### Authentication
- Admin API requires `Authorization: Bearer <API_KEY>`
- API key stored in `process.env.ADMIN_API_KEY`
- No authentication for webhook endpoints (validated via Twilio signature)

### Resource Limits (per run)
- Max sources: 3
- Max items per source: 10
- Max LLM calls: 10
- Max tokens: 10,000
- Timeout: 120 seconds

### Safety Checks
- ✅ SQL injection prevented (Supabase parameterized queries)
- ✅ XSS prevented (HTML sanitization in reports)
- ✅ Rate limiting (10 requests/minute per user)
- ✅ Input validation (Zod schema validation)
- ✅ Error sanitization (no stack traces to users)

---

## 🧪 Testing Approach

### Unit Tests (85% coverage target)
- Test each source fetcher in isolation
- Test each pipeline step with mock data
- Test collation strategies
- Test output generators
- **Tools**: Jest, Mock Service Worker

### Integration Tests (Critical paths)
- Test full execution flow with real sources
- Test error handling and recovery
- Test timeout enforcement
- Test safety limit enforcement
- **Tools**: Jest, Test database

### Load Tests (Scalability)
- 100 concurrent executions
- Monitor memory usage
- Monitor database connections
- Verify no memory leaks
- **Tools**: Artillery, Clinic.js

---

## 📦 Dependencies to Install

```bash
cd sms-bot
npm install --save handlebars marked cheerio
npm install --save-dev @types/handlebars @types/marked
```

**Already Installed**:
- `@supabase/supabase-js`
- `openai`
- `rss-parser`
- `zod`

---

## 🚀 Recommended Implementation Order

### Week 1: Core Engine
1. **Day 1**: Sources (RSS, arXiv, HTTP JSON, Web Scraper, User Source)
2. **Day 2**: Basic pipeline (dedupe, filter, sort)
3. **Day 3**: LLM pipeline (summarize, rank, transform)
4. **Day 4**: Output generation (SMS, report)
5. **Day 5**: Core executor + collation

### Week 2: API & Production
1. **Day 1**: Admin API endpoints (preview, execute, runs)
2. **Day 2**: Monitoring (metrics, errors, logging)
3. **Day 3**: Unit tests (all modules)
4. **Day 4**: Integration tests + bug fixes
5. **Day 5**: Load tests + optimization

---

## 📚 Document Reference

| Document | Purpose | Read Time |
|----------|---------|-----------|
| [SPRINT_4_EXECUTION_ENGINE_SPEC.md](SPRINT_4_EXECUTION_ENGINE_SPEC.md) | Complete technical specification | 30-45 min |
| [SPRINT_4_IMPLEMENTATION_CHECKLIST.md](SPRINT_4_IMPLEMENTATION_CHECKLIST.md) | Task-by-task implementation guide | 15-20 min |
| This file | Quick overview and getting started | 5-10 min |

---

## ✅ Success Criteria

Sprint 4 is **DONE** when:

1. ✅ User can create an agent in the workflow builder (Sprint 3 ✅)
2. ✅ User can click "Preview" and see generated SMS + report
3. ✅ User can save agent as draft
4. ✅ System can execute agent on schedule
5. ✅ System can execute agent via SMS command
6. ✅ Execution creates record in `agent_runs` table
7. ✅ SMS is sent to user with content + report link
8. ✅ Report is accessible via public URL
9. ✅ Metrics are tracked and saved (sources, items, LLM calls, tokens, cost, duration)
10. ✅ Errors are handled gracefully (retries, fallbacks, logging)
11. ✅ Safety limits are enforced (timeout, max tokens, max sources)
12. ✅ 100 concurrent runs succeed without issues
13. ✅ Test coverage > 85%
14. ✅ Documentation complete

---

## 🎯 Next Steps

1. **Read the spec** ([SPRINT_4_EXECUTION_ENGINE_SPEC.md](SPRINT_4_EXECUTION_ENGINE_SPEC.md)) - Start with Section 13 (example)
2. **Review the checklist** ([SPRINT_4_IMPLEMENTATION_CHECKLIST.md](SPRINT_4_IMPLEMENTATION_CHECKLIST.md))
3. **Set up your dev environment**:
   ```bash
   cd sms-bot
   npm install --save handlebars marked cheerio
   npm run dev # Terminal 1
   ```
   ```bash
   cd web
   npm run dev # Terminal 2
   ```
4. **Start building** - Follow the checklist tasks in order
5. **Test as you go** - Write unit tests alongside implementation
6. **Ship it!** - Deploy when all tests pass

---

**Questions?** Check the spec for detailed explanations or ask me!

**Ready to build!** 🚀
