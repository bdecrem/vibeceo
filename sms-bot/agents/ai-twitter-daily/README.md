# AI Twitter Daily Agent

Daily agent that monitors curated AI researcher Twitter accounts, analyzes discussions, generates a markdown report + audio podcast, and broadcasts to subscribers.

## SMS Commands

| Command | Description | Access |
|---------|-------------|--------|
| `AIT` / `AI TWITTER` | Get latest report + podcast | All users |
| `AIT SUB` | Subscribe to daily digest | Registered users |
| `AIT UNSUB` | Unsubscribe | Subscribers |
| `AIT ADD @handle` | Add account to sources | Admin only |
| `AIT LIST` | List all source accounts | Admin only |
| `AIT RUN` | Run the daily agent manually | Admin only |

## Architecture

```
sms-bot/agents/ai-twitter-daily/
├── index.ts              # Main orchestrator
├── twitter-fetcher.ts    # Fetch tweets via search API workaround
├── content-analyzer.ts   # AI analysis (topic grouping, insights)
└── README.md             # This file
```

## Daily Flow

1. **Fetch**: Load active handles from `content_sources` table, build search queries
2. **Filter**: Keep tweets from last 24 hours only
3. **Analyze**: Group by topic, extract key insights (OpenAI)
4. **Report**: Generate markdown → store via `storeAgentReport()`
5. **Podcast**: Generate script (OpenAI) → synthesize (ElevenLabs) → upload to storage
6. **Store**: Upsert episode to `episodes` table, covered tweets to `covered_content`
7. **Broadcast**: (Future) Send to subscribers via agent subscriptions

## Twitter API Workaround

**Problem**: Twitter free tier does NOT support reading timelines (requires $200/mo Basic).

**Solution**: Use `searchTweets("from:handle1 OR from:handle2 OR ...")` — search API works on free tier. The agent dynamically builds queries from the `content_sources` table, batching by 10 handles per query.

## Database Schema

### `content_sources` (universal source registry)
```sql
CREATE TABLE content_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_slug text NOT NULL,        -- 'ai-twitter-daily'
  source_type text NOT NULL,       -- 'twitter_account'
  identifier text NOT NULL,        -- 'karpathy' (no @)
  display_name text,
  priority int DEFAULT 50,
  metadata jsonb DEFAULT '{}',
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(agent_slug, source_type, identifier)
);
```

### `covered_content` (tracks analyzed tweets)
```sql
CREATE TABLE covered_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id int REFERENCES episodes(id),
  content_type text NOT NULL,      -- 'tweet'
  external_id text NOT NULL,       -- tweet_id
  title text,                      -- topic group name
  author text,                     -- @handle
  summary text,
  full_text text,
  url text,
  metadata jsonb DEFAULT '{}',
  covered_at timestamptz DEFAULT now()
);
```

## URL Pattern (IMPORTANT)

Follow AGENT-PIPELINE.md for all links in SMS:

```typescript
// Report link
const reportViewerUrl = buildReportViewerUrl({ path: reportMetadata.reportPath });
const reportLink = await createShortLink(reportViewerUrl, { context: 'ai-twitter-daily' });

// Podcast link
const musicPlayerUrl = buildMusicPlayerUrl({
  src: episode.audio_url,
  title: 'AI Twitter Daily',
  autoplay: true,
});
const podcastLink = await createShortLink(musicPlayerUrl, { context: 'ai-twitter-daily' });
```

**Never** expose raw Supabase storage URLs in SMS messages.

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `TWITTER_BEARER_TOKEN` | Twitter API access (search endpoint) |
| `OPENAI_API_KEY` | Analysis + podcast script generation |
| `ELEVENLABS_API_KEY` | Audio synthesis |
| `AI_TWITTER_ELEVENLABS_VOICE_ID` | Voice for podcast (default: MF3mGyEYCl7XYWbV9V6O) |
| `AI_TWITTER_ELEVENLABS_MODEL_ID` | Model for TTS (default: eleven_turbo_v2_5) |
| `AI_TWITTER_TOPIC_ID` | Override default topic UUID |

## Seeded Accounts

Initial sources (15 accounts):
- @karpathy, @ylecun, @goodlovelive, @fchollet, @sarahookr
- @srfrench, @EthanCaballero, @chelseabfinn, @NatFriedman, @VictorSanh
- @MattShumer_, @JaredKaplan0, @alexandr_wang, @daboross, @sama

Add more via `AIT ADD @handle` or direct DB insert.

## Files Modified

| File | Change |
|------|--------|
| `sms-bot/commands/ai-twitter.ts` | SMS command handler |
| `sms-bot/lib/sms/handlers.ts` | Auto-dispatched (no change needed) |
| `web/middleware.ts` | Bypass `/l/*`, `/music-player`, `/report-viewer` on kochi.to |

## Scheduling

**Registered and deployed.** Runs at 8:00 AM PT daily via `registerAITwitterDailyJob()` in `bot.ts`.

Environment variable overrides:
- `AI_TWITTER_REPORT_HOUR` — Hour to run (default: 8)
- `AI_TWITTER_REPORT_MINUTE` — Minute to run (default: 0)
- `AI_TWITTER_BROADCAST_DELAY_MS` — Delay between SMS sends (default: 150ms)

The job:
1. Runs `runAITwitterDaily()` to fetch, analyze, generate report + podcast
2. Calls `broadcastAITwitterDaily()` to send to all subscribers
3. Uses 20-hour dedup window to prevent double sends

## Related Files

- `sms-bot/documentation/AGENT-PIPELINE.md` — Standard agent patterns
- `sms-bot/agents/report-storage.ts` — Report storage utilities
- `sms-bot/lib/agent-subscriptions.ts` — Subscription management
- `sms-bot/lib/utils/report-viewer-link.ts` — Report viewer URL builder
- `sms-bot/lib/utils/music-player-link.ts` — Music player URL builder
