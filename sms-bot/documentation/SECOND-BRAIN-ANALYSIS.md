# Kochi.to Second Brain Analysis

**Purpose:** Analysis of existing kochi.to infrastructure to identify opportunities for "second brain" features that can be built quickly.

**Date:** November 27, 2025

---

## Executive Summary

Kochi.to already has **significant infrastructure** for building second brain features:

| Capability | Status | Leverage Potential |
|------------|--------|-------------------|
| User Personalization | ✅ Built | High - extend with notes |
| Conversation Memory | ✅ Built | High - 12hr sliding window |
| Gmail Integration | ✅ Built | High - auto context injection |
| Report Storage | ✅ Built | Medium - query past reports |
| Subscription System | ✅ Built | High - daily digests |
| Knowledge Graph | ✅ Built | High - Neo4j arXiv graph |
| Thread Tracking | ✅ Built | Medium - multi-turn convos |

**Bottom line:** Most infrastructure exists. We need ~3 new commands and 1-2 new tables to have a working second brain MVP.

---

## Current Architecture Overview

### Data Storage for Memory

```
sms_subscribers
├── personalization: JSONB
│   ├── name
│   ├── interests[]
│   ├── timezone
│   ├── location
│   ├── twitter
│   ├── linkedin
│   └── notes (underutilized!)
│
conversation_context
├── subscriber_id
├── context_type ('general', 'air', 'kg_query', etc.)
├── conversation_history: JSONB[]
├── metadata: JSONB
├── thread_id
├── active_handler
└── expires_at (12 hours sliding window)

user_oauth_tokens
├── provider ('gmail')
├── encrypted_access_token (AES-256-GCM)
├── encrypted_refresh_token
├── scopes[]
└── last_used_at

agent_subscriptions
├── agent_slug
├── preferences: JSONB (per-agent settings)
└── last_sent_at
```

### Gmail Integration (Already Built!)

**File:** `sms-bot/lib/gmail-client.ts`

```typescript
// ALREADY WORKING:
GMAIL CONNECT          // OAuth flow
GMAIL SEARCH [query]   // Search with Gmail operators
GMAIL STATUS           // Check connection
GMAIL DISCONNECT       // Revoke

// ALREADY BUILT (auto-injection):
getGmailContext(subscriberId, userQuery)
// - Analyzes query
// - Generates Gmail search terms via Claude
// - Returns relevant emails for prompt injection
// - ~2 second overhead
```

### Existing Agents That Generate Content

| Agent | Content Type | Storage Location |
|-------|-------------|------------------|
| crypto-research | Daily crypto report | `agent-reports` bucket |
| medical-daily | Medical news | `agent-reports` bucket |
| arxiv-research | Paper summaries | `agent-reports` bucket |
| air-personalized | Personalized research | `ai_research_reports_personalized` table |
| youtube-search | Video recommendations | Response only |
| kg-query | Graph insights | Conversation context |

---

## Quick Win Features (1-2 Days Each)

### 1. NOTES Command

**Effort:** ~4 hours

**What:** Simple persistent notes storage per user

**Implementation:**
```
NOTES                    → Show all notes
NOTES ADD [text]         → Save a note with timestamp
NOTES SEARCH [query]     → Search notes
NOTES [number] DELETE    → Delete specific note
```

**Storage Option A - Use existing personalization.notes:**
```typescript
// In sms_subscribers.personalization JSONB:
{
  "notes": [
    {"id": "uuid", "text": "...", "created_at": "..."}
  ]
}
```

**Storage Option B - New user_notes table (recommended for scale):**
```sql
CREATE TABLE user_notes (
  id uuid PRIMARY KEY,
  subscriber_id uuid REFERENCES sms_subscribers,
  content text NOT NULL,
  tags text[],           -- Optional categorization
  source text,           -- 'sms', 'gmail', 'agent'
  created_at timestamptz DEFAULT now()
);
```

### 2. REMEMBER / RECALL Commands

**Effort:** ~6 hours

**What:** Explicit memory storage that persists beyond 12hr context window

```
REMEMBER [fact/info]     → Store permanently
RECALL [topic]           → Search memories
RECALL RECENT            → Last 10 memories
FORGET [id]              → Delete memory
```

**How it works:**
- `REMEMBER` extracts key info via Claude, stores structured
- `RECALL` does semantic search or keyword matching
- Auto-inject recent memories into general agent prompts

### 3. DIGEST Command

**Effort:** ~4 hours

**What:** Aggregate all recent agent reports into one summary

```
DIGEST                   → Today's digest across all subscribed agents
DIGEST WEEK              → Last 7 days summary
DIGEST [agent]           → Specific agent history
```

**Implementation:**
1. Query user's subscriptions
2. Fetch recent reports from `agent-reports` bucket
3. Use Claude to synthesize key points
4. Return SMS-friendly summary with links

### 4. MY EMAILS Command Enhancement

**Effort:** ~3 hours

**What:** Smarter email context integration

```
MY EMAILS TODAY          → Today's important emails
MY EMAILS FROM [person]  → Recent from specific sender
MY EMAILS ABOUT [topic]  → Topic-based search
MY EMAILS SUMMARY        → AI summary of recent inbox
```

**Already have:** `GMAIL SEARCH` works, just needs friendlier UX

---

## Medium Effort Features (3-5 Days Each)

### 5. CANVAS / DOC Command

**What:** Persistent collaborative documents

```
DOC NEW [title]          → Create new document
DOC [title] ADD [text]   → Append to document
DOC [title] EDIT [text]  → AI-assisted edit
DOC [title] VIEW         → Get document link
DOC LIST                 → Show all documents
```

**Storage:** New `user_documents` table with versioning

### 6. Daily Personal Digest

**What:** Automated morning summary combining:
- Weather (location from personalization)
- Calendar summary (need Google Calendar OAuth)
- Important emails (Gmail integration exists)
- Agent report highlights
- Saved notes/memories

**Subscription:** `DIGEST SUBSCRIBE` adds to scheduler

### 7. Smart Capture from Conversation

**What:** Automatically extract and save:
- Action items mentioned
- Key facts/information
- People/contacts mentioned
- Dates/deadlines

**Implementation:**
- Post-process every conversation
- Use Claude to extract structured data
- Store to relevant tables
- Confirm with "I saved: [items]"

### 8. Cross-Agent Memory

**What:** Share context between agents

Example: Crypto agent knows you mentioned interest in ETH in general chat

**Implementation:**
- Central `user_facts` table
- All agents read/write facts
- Facts have source attribution
- Expire based on type

---

## Existing Infrastructure to Leverage

### Personalization System

**File:** `sms-bot/lib/personalization-extractor.ts`

```typescript
// Already built:
extractPersonalizationFromMessage(message) // Extract name, interests, etc.
updateUserPersonalization(phone, newData)   // Merge into profile
getPersonalizationForPrompt(subscriberId)   // Format for injection

// Auto-detection in general agent:
if (containsPersonalInfo(message)) {
  await extractAndSave(message);
}
```

### Context Loading

**File:** `sms-bot/lib/context-loader.ts`

```typescript
interface UserContext {
  phoneNumber: string;
  subscriberId: string;
  personalization: UserPersonalization;
  subscriptions: UserSubscription[];
  recentMessages: RecentMessage[];  // 12hr window
  hasRecentActivity: boolean;
  activeThread?: ActiveThread;
}

const context = await loadUserContext(phoneNumber);
```

### Report Storage Pattern

**File:** `sms-bot/agents/report-storage.ts`

```typescript
// Store:
await storeReport(agentSlug, {
  content: markdownContent,
  metadata: { summary, date, paper_count }
});

// Retrieve:
const report = await getLatestReport(agentSlug);
const history = await getReportHistory(agentSlug, days);
```

### Subscription & Scheduler

**Files:**
- `sms-bot/lib/agent-subscriptions.ts`
- `sms-bot/lib/scheduler/index.ts`

```typescript
// Subscribe user:
await subscribeToAgent(phoneNumber, 'digest-daily');

// Register daily job:
registerDailyJob({
  name: 'personal-digest',
  hour: 7,
  minute: 0,
  timezone: 'America/Los_Angeles',
  run: async () => {
    const subscribers = await getAgentSubscribers('digest-daily');
    for (const sub of subscribers) {
      const digest = await generatePersonalDigest(sub);
      await sendSms(sub.phone_number, digest);
    }
  }
});
```

---

## Proposed Database Schema Additions

### user_notes table (for NOTES command)

```sql
CREATE TABLE user_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id uuid NOT NULL REFERENCES sms_subscribers(id),
  content text NOT NULL,
  tags text[] DEFAULT '{}',
  source text DEFAULT 'sms',  -- 'sms', 'gmail', 'auto'
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_user_notes_subscriber ON user_notes(subscriber_id);
CREATE INDEX idx_user_notes_created ON user_notes(created_at DESC);
CREATE INDEX idx_user_notes_tags ON user_notes USING gin(tags);
```

### user_memories table (for REMEMBER command)

```sql
CREATE TABLE user_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id uuid NOT NULL REFERENCES sms_subscribers(id),
  memory_type text NOT NULL,  -- 'fact', 'preference', 'task', 'contact'
  content text NOT NULL,
  structured_data jsonb,       -- Extracted entities
  source text DEFAULT 'explicit',  -- 'explicit', 'inferred', 'agent'
  confidence float DEFAULT 1.0,
  last_accessed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_user_memories_subscriber ON user_memories(subscriber_id);
CREATE INDEX idx_user_memories_type ON user_memories(memory_type);
```

---

## Implementation Priority

### Phase 1: Quick Wins (Week 1)
1. **NOTES** - Simple, high value, ~4 hours
2. **DIGEST** - Aggregates existing content, ~4 hours
3. **MY EMAILS** - Polish existing Gmail UX, ~3 hours

### Phase 2: Core Memory (Week 2)
4. **REMEMBER/RECALL** - Explicit memory, ~6 hours
5. **Auto-capture** - Extract facts from conversations, ~8 hours

### Phase 3: Advanced (Week 3+)
6. **DOC/CANVAS** - Persistent documents
7. **Daily Personal Digest** - Morning automation
8. **Cross-agent memory** - Shared context

---

## Key Files Reference

| Purpose | File Path |
|---------|-----------|
| Command handler pattern | `sms-bot/commands/*.ts` |
| Personalization | `sms-bot/lib/personalization-extractor.ts` |
| Context loading | `sms-bot/lib/context-loader.ts` |
| Gmail client | `sms-bot/lib/gmail-client.ts` |
| Subscriptions | `sms-bot/lib/agent-subscriptions.ts` |
| Scheduler | `sms-bot/lib/scheduler/index.ts` |
| Report storage | `sms-bot/agents/report-storage.ts` |
| Agent pipeline docs | `sms-bot/documentation/AGENT-PIPELINE.md` |
| Gmail docs | `sms-bot/documentation/GMAIL-INTEGRATION.md` |
| Database migrations | `sms-bot/migrations/` |

---

## Technical Considerations

### SMS Length Limits
All responses must stay under 670 UCS-2 code units (10 segments). For longer content:
- Return summary + link to full content
- Use branded viewer pages (`/report-viewer`)

### Security
- Never expose tokens in SMS
- Use existing encryption patterns for any new OAuth
- RLS policies on all new tables

### Performance
- Gmail context injection adds ~2 seconds
- Memory lookups should be indexed
- Consider caching frequently accessed memories

---

## Questions for Brainstorming

1. **What's the primary use case?** Personal productivity, research aggregation, or conversational memory?

2. **How explicit vs automatic?** Should we infer memories or require explicit REMEMBER commands?

3. **Integration priority?** Gmail is done - what's next? Google Calendar? Notion? Slack?

4. **Retention policy?** How long do we keep memories? Forever? Decay over time?

5. **Privacy controls?** Should users be able to see/delete everything we've stored about them?

---

*This document is for internal agent use. Update as features are implemented.*
