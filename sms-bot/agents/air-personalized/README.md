# AIR (AI Research) - Personalized Research Assistant

**Status:** Production Ready
**Agent Slug:** `air`
**Launch:** November 2025

## Overview

AIR delivers personalized daily AI/ML research reports by running each user's standing natural language query through the kg-query agent. Users express their research interests naturally, and we run that query daily against the arXiv knowledge graph.

**Core Architecture:** AIR = Scheduled KG-Query + Memory

## Key Features

- **Natural Language Subscriptions**: "AIR give me papers about physical ai"
- **Daily Automated Reports**: Run kg-query for each user's standing query
- **Persistent Preferences**: Stored in Supabase `agent_subscriptions.preferences`
- **Broadcast Fallback**: Non-subscribers get arxiv-graph general report
- **Custom Notification Times**: Users set delivery time in PT timezone
- **Conversation Context**: KG follow-up questions with AIR context
- **Non-Blocking Scheduler**: Runs at 9 AM PT (after arxiv-graph), doesn't interfere with other agents

## Commands

Users can type **"AIR"** or **"AI RESEARCH"** (we normalize to AIR in responses)

### Primary Commands

**`AIR`** - Show today's report
- If subscribed: Return personalized report
- If not subscribed: Return arxiv-graph broadcast + personalization prompt

**`AIR {natural language query}`** - Subscribe with query
- Examples:
  - `AIR give me papers about physical ai`
  - `AIR researchers in california`
  - `AIR multimodal learning by Stanford researchers`
- Stores query in preferences, confirms subscription
- First report arrives next morning

**`AIR TIME HH:MM`** - Change notification time
- Format: 24-hour time in PT timezone
- Example: `AIR TIME 08:00`

**`AIR SETTINGS`** - View current configuration
- Shows query, notification time, status, last report date

**`AIR HELP`** - Show full command reference
- Lists all commands, explains AIR vs KG

**`AIR STOP`** or **`AIR UNSUBSCRIBE`** - Stop daily reports
- Deactivates subscription
- Can resubscribe anytime

### Interactive Follow-up

**`KG {question}`** - Ask questions about papers
- Handled by kg-query agent with AIR context
- Examples:
  - `KG tell me more about paper 3`
  - `KG who are the authors?`
  - `KG what else has this team published?`

## Architecture

### Data Flow

```
User: AIR physical ai
  ↓
Store in Supabase: preferences.natural_language_query = "physical ai"
  ↓
Daily at 9 AM PT: For each subscriber (after arxiv-graph loads new papers)
  ↓
Query = "Show me papers from today about: {user's query}"
  ↓
Run kg-query agent (iterative Neo4j queries via Claude Agent SDK)
  ↓
Format results as markdown report
  ↓
Store in ai_research_reports_personalized
  ↓
Send SMS at user's notification_time
```

### Database Schema

#### `agent_subscriptions.preferences` (JSONB column)
```json
{
  "natural_language_query": "physical ai",
  "notification_time": "10:00",
  "last_delivery_status": "success",
  "consecutive_failures": 0
}
```

#### `ai_research_reports_personalized` table
```sql
CREATE TABLE ai_research_reports_personalized (
  id uuid PRIMARY KEY,
  subscriber_id uuid REFERENCES sms_subscribers(id),
  report_date date NOT NULL,
  markdown_content text,
  audio_url text,
  paper_count int,
  query_used text,
  created_at timestamptz,
  UNIQUE(subscriber_id, report_date)
);
```

#### `conversation_context` table (general purpose)
```sql
CREATE TABLE conversation_context (
  id uuid PRIMARY KEY,
  subscriber_id uuid REFERENCES sms_subscribers(id),
  context_type text NOT NULL,              -- 'air' for this agent
  conversation_history jsonb DEFAULT '[]',
  metadata jsonb DEFAULT '{}',
  expires_at timestamptz,
  UNIQUE(subscriber_id, context_type)
);
```

**For AIR:**
- `context_type = 'air'`
- `conversation_history`: KG query messages
- `metadata`: { last_report_date, last_report_preview, standing_query }
- `expires_at`: 24 hours

### Integration with kg-query

AIR reuses the kg-query agent entirely:

```typescript
// Daily for each subscriber
const query = `Show me papers from today about: ${preferences.natural_language_query}`;

const kgResponse = await runKGQuery(
  query,
  [], // Empty conversation history
  '', // No previous report context
  cleanDataBoundary
);

const markdown = formatKGResponseAsReport(kgResponse, ...);
```

**Why this works:**
- kg-query already handles complex Neo4j graph queries
- Claude Agent SDK provides iterative query refinement
- No need to build custom Neo4j query logic
- Same quality as interactive KG queries

## Scheduler

### Registration
Registered in `lib/sms/bot.ts`:
```typescript
registerAIRDailyJob(twilioClient);
```

### Schedule
- **Time:** 9:00 AM PT (after arxiv-graph completes around 8:15 AM)
- **Frequency:** Daily
- **Non-blocking:** Won't prevent other agents from running

### Execution Flow
```typescript
registerDailyJob({
  name: 'air-personalized-reports',
  hour: 9,
  minute: 0,
  timezone: 'America/Los_Angeles',
  run: async () => {
    const subscribers = await getAgentSubscribers('air');

    for (each subscriber) {
      // 1. Load preferences
      // 2. Run kg-query with user's standing query
      // 3. Format as report
      // 4. Store in ai_research_reports_personalized
      // 5. Send SMS at user's notification_time
    }
  }
});
```

### Performance
- **Sequential generation**: One report at a time
- **50 users**: ~21 minutes (25 sec/user)
- **100 users**: ~42 minutes (25 sec/user)
- **Start time**: 9:00 AM PT (after arxiv-graph completes)
- **Buffer**: Completes by ~9:45 AM, well before user notifications
- **Rate limiting**: 150ms delay between SMS sends

## Cost Analysis

**Per-user daily cost:**
- kg-query execution: ~$0.02 (Claude API via Agent SDK)
- Audio generation: ~$0.03 (ElevenLabs) *[Not yet implemented]*
- SMS delivery: ~$0.008 (Twilio)
- **Total: ~$0.058/user/day**

**Monthly costs:**
- 50 users: $87/month
- 100 users: $174/month
- Well within budget: $150-360/month

**Cheaper than original plan because:**
- No separate curation agent needed
- Reuses kg-query infrastructure
- Less Claude API usage overall

## Error Handling

### Per-User Failures
```typescript
try {
  await generateAndSendReport(subscriber);
  await updateSubscriptionStatus(subscriber.id, 'success');
} catch (error) {
  await updateSubscriptionStatus(subscriber.id, 'failed', String(error));
  // Continue to next user - one failure doesn't stop the batch
}
```

### Graceful Degradation
- **kg-query timeout**: Skip user, log error, continue
- **Audio generation fails**: Send text-only report *(future)*
- **SMS delivery fails**: Log failure, update preferences.consecutive_failures

### Monitoring
- Logs success/fail counts for each batch
- Tracks `preferences.consecutive_failures`
- Reports duration: `Complete: 45 success, 5 failed in 21m`

## Setup

### Prerequisites
1. Supabase migration 002 applied (preferences column, context table, reports table)
2. kg-query agent configured and working
3. Neo4j database accessible (for kg-query)
4. Environment variables set

### Environment Variables
```bash
AIR_REPORT_HOUR=9              # Optional, defaults to 9 AM PT
AIR_REPORT_MINUTE=0            # Optional, defaults to 0
AIR_SMS_DELAY_MS=150           # Optional, rate limiting between SMS
```

### Deployment
1. Build: `npm run build`
2. Deploy to Railway (auto-deploys on push to main)
3. Verify scheduler registration in logs: `[AIR] Daily job registered for 9:00 AM PT`
4. Test with real phone number: `AIR physical ai`

## Testing

### Local Testing
```bash
# Build
npm run build

# Test subscription
# Send SMS: AIR physical ai
# Verify stored in agent_subscriptions.preferences

# Test commands
# AIR TIME 08:00
# AIR SETTINGS
# AIR HELP
```

### Production Testing
1. Subscribe with test account
2. Wait for next morning's delivery
3. Verify report received at correct time
4. Test KG follow-up: `KG tell me more about paper 1`
5. Test unsubscribe: `AIR STOP`

## Future Enhancements

### Audio Narration
- Integrate ElevenLabs podcast generation (like crypto-research)
- Add `preferences.include_audio` flag
- Store `audio_url` in ai_research_reports_personalized

### Report Viewer
- Generate short links for web viewer
- Format reports as HTML (reuse report-viewer infrastructure)

### Query Refinement
- Allow users to refine queries: `AIR REFINE exclude theory papers`
- Track query performance (paper counts, user engagement)

### Intent Detection
- Remove "KO" trigger requirement
- Auto-detect conversation intent from message content
- Route to KG with AIR context automatically

### Learning Loop
- Track which papers users ask about (via KG)
- Refine future report rankings based on interest
- Personalize beyond initial query

## Comparison with Other Agents

| Feature | arxiv-graph | AIR (ai-research) |
|---------|-------------|-------------------|
| Reports | One broadcast for all | Individual per user |
| Query | Fixed categories | Natural language |
| Filtering | Broad (all cs.AI, etc) | User's specific interest |
| Scheduling | Same time for everyone | User-configurable time |
| Audio | One podcast for all | Personal narration *(future)* |
| Conversations | Via separate KG command | KG with AIR context |
| Cost | Amortized across users | Per-user cost |

## Maintenance

### Monitoring
- Check scheduler logs for daily batch status
- Monitor `consecutive_failures` in preferences
- Track cost per user (kg-query tokens)

### Updates
- **kg-query changes**: Automatically inherited (shared agent)
- **Neo4j schema changes**: Test with AIR queries
- **Preference schema**: Add fields to JSONB, backward compatible

### Troubleshooting

**Problem:** Reports not generating
- Check: AIR scheduler registered in bot.ts
- Check: Automation enabled (`ENABLE_SUBSCRIPTION_AUTOMATION=true`)
- Check: kg-query agent working (test with `KG` command)

**Problem:** Empty reports
- Check: Neo4j database has recent papers
- Check: User's query returns results (test with KG)
- Check: Clean data boundary (papers from last 24 hours)

**Problem:** Wrong delivery time
- Check: Preferences.notification_time format (HH:MM)
- Check: Timezone (all times in PT)
- Check: Scheduler hour (9 AM PT start time, after arxiv-graph)

## Files

**Core:**
- `agents/air-personalized/index.ts` - Main orchestrator, report generation, scheduler
- `commands/air.ts` - Command handler, SMS interface
- `commands/index.ts` - Command registration

**Integration:**
- `lib/sms/bot.ts` - Scheduler registration
- `lib/agent-subscriptions.ts` - Preference loading (extended with preferences field)
- `agents/kg-query/` - Query engine (reused, not modified)

**Database:**
- `migrations/002_air_personalized_schema.sql` - Schema setup

**Documentation:**
- `agents/air-personalized/README.md` - This file

## Resources

- **kg-query Agent**: `agents/kg-query/README.md`
- **Agent SDK Guide**: `documentation/CLAUDE-AGENT-SDK-GUIDE.md`
- **Agent Pipeline**: `documentation/AGENT-PIPELINE.md`
- **Scheduler**: `lib/scheduler/index.ts`

## License

Part of the VibeCEO/kochi.to project.
