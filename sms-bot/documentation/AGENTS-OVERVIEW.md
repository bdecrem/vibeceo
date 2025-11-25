# SMS Agent System Overview

This document provides a high-level overview of how SMS agents work in the kochi.to/b52s.me platform.

## Agent Architecture

### Autonomous Agents (Python + Claude Agent SDK)

**Examples:** `crypto-research/`, `medical-daily/`

Our agents use the Claude Agent SDK to autonomously research topics and generate reports. Each agent consists of two components:

#### 1. Agent Runner (`agent.py`)
Fully autonomous Python script using `claude-agent-sdk`:
- Given high-level goal, figures out its own steps
- Uses tools: WebSearch, Read, Write, Bash
- Generates markdown reports autonomously
- No hardcoded workflows - agents decide their own research path

#### 2. TypeScript Wrapper (`index.ts`)
Handles execution and integration:
- Spawns Python process
- Captures markdown + summary output
- Stores results to Supabase
- Manages SMS delivery
- Returns structured metadata

**Requirements:**
- Python 3.10+
- claude-agent-sdk
- Claude Code CLI
- `CLAUDE_CODE_OAUTH_TOKEN`

---

## Shared Infrastructure

### Report Storage (`agents/report-storage.ts`)

All agent reports are stored consistently:
- **Path:** `agent-reports/<agent-slug>/reports/YYYY-MM-DD.md`
- **Metadata:** `metadata/YYYY-MM-DD.json` (includes summary, timestamp, public URL)
- **Public URLs:** Generated via Supabase, shortened through kochi.to
- **CRITICAL:** Always use branded viewer/player pages, never raw Supabase URLs

### Subscriptions (`agent_subscriptions` table)

```sql
create table agent_subscriptions (
  subscriber_id uuid references sms_subscribers,
  agent_slug text,
  subscribed_at timestamptz,
  last_sent_at timestamptz,
  active boolean
)
```

**Helper module:** `lib/agent-subscriptions.ts`

**Key functions:**
- `subscribeToAgent(subscriberId, agentSlug)`
- `unsubscribeFromAgent(subscriberId, agentSlug)`
- `isSubscribedToAgent(subscriberId, agentSlug)`
- `getAgentSubscribers(agentSlug)` - For broadcasts
- `markAgentReportSent(subscriberId, agentSlug)` - Track delivery

### Command Handlers (`commands/`)

All agents have command files that auto-dispatch from the `commands/` directory.

**Example pattern** (`commands/crypto.ts`):
- `CRYPTO` / `CRYPTO REPORT` → Fetch latest report
- `CRYPTO SUBSCRIBE` / `UNSUBSCRIBE` → Toggle subscription
- `CRYPTO HELP` → List commands
- `CRYPTO RUN` → Manual regeneration (admin only)

**Routing:** Commands in `commands/<agent>.ts` are automatically dispatched by `handlers.ts` - no manual routing needed.

### Scheduler (`lib/scheduler/index.ts`)

Manages daily agent execution:
- Registers daily jobs with timezone support (default: PT)
- Checks every minute for scheduled jobs
- Non-blocking execution (jobs run independently)

**Daily Flow:**
1. Run Python agent script
2. Upload markdown + metadata to Supabase
3. Generate podcast/audio if applicable (TTS via ElevenLabs)
4. Fetch active subscribers via `getAgentSubscribers(agent-slug)`
5. Send SMS summary + report link + audio link
6. Update `last_sent_at` per subscriber

---

## Report Viewer & Music Player Integration

**CRITICAL RULE:** Never link directly to raw Supabase URLs in SMS messages.

### For Markdown Reports:

```typescript
import { buildReportViewerUrl } from '../../lib/utils/report-viewer-link.js';
import { createShortLink } from '../../lib/utils/shortlink-service.js';

// After storing report to Supabase
const viewerUrl = buildReportViewerUrl({ path: stored.reportPath });
const shortLink = await createShortLink(viewerUrl, {
  context: 'agent-report',
  createdBy: 'sms-bot',
  createdFor: recipient,
});

// Use shortLink in SMS - it redirects to branded viewer
```

### For Audio Content:

```typescript
import { buildMusicPlayerUrl } from '../../lib/utils/music-player-link.js';

// After generating/uploading audio to Supabase
const playerUrl = buildMusicPlayerUrl({
  src: audioUrl,  // Raw MP3 URL from Supabase
  title: 'Agent Name Oct 7',
  description: 'One-sentence summary',
  autoplay: true,
});

const shortLink = await createShortLink(playerUrl, {
  context: 'agent-audio',
  createdBy: 'sms-bot',
  createdFor: recipient,
});

// Use shortLink in SMS - it redirects to branded player
```

### Web Routes:

- `/report-viewer` → Markdown viewer with Kochi branding
- `/music-player` → Audio player with controls
- `/api/report` → Fetches markdown from Supabase Storage

**Why use viewer/player pages?**
- Branded Kochi experience (not raw markdown/audio)
- Mobile-optimized with proper formatting
- Consistent UI/UX across all agents
- Can add analytics and tracking

---

## Adding a New Agent

### Step-by-Step Guide:

**1. Create Agent Runner**

Mirror the `crypto-research/agent.py` pattern:
- Use Claude Agent SDK for autonomous research
- Generate markdown report
- Output JSON with status, file path, date

**2. Create TypeScript Wrapper** (`agents/<slug>/index.ts`)

Export three key functions:
```typescript
export async function runAndStore<Agent>(): Promise<StoredReportMetadata>
export async function getLatestStored<Agent>(): Promise<StoredReportMetadata | null>
export function register<Agent>DailyJob(twilioClient: TwilioClient): void
```

The wrapper should:
- Spawn the Python agent script
- Parse JSON output
- Store report using `storeAgentReport()`
- Build viewer/player URLs
- Create shortlinks for SMS

**3. Add Command Handler** (`commands/<agent>.ts`)

Implement standard commands:
- Fetch latest report on demand
- Subscribe/unsubscribe management
- Help text with command list
- Manual run (optional, admin-only)

**4. Register Daily Job**

In your wrapper's `register<Agent>DailyJob()`:
- Schedule execution time (defaults to 7:05 AM PT)
- Run agent and store report
- Fetch subscribers via `getAgentSubscribers()`
- Broadcast to all active subscribers
- Update `last_sent_at` timestamps

**5. Restart SMS Bot**

Changes take effect after restarting the SMS bot service.

---

## Environment Variables

### Core Variables:

**Database & Storage:**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`

**SMS:**
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`

**AI & Agents:**
- `CLAUDE_CODE_OAUTH_TOKEN` (for autonomous agents)
- `ANTHROPIC_API_KEY` (for Claude API calls)

**Links & Audio:**
- `SHORTLINK_SERVICE_URL`
- `SHORTLINK_SERVICE_TOKEN`
- `SHORTLINK_BASE_URL` (defaults to `https://kochi.to`)
- `OPENAI_API_KEY` (if using OpenAI features)
- `ELEVENLABS_API_KEY` (for TTS/podcast generation)

### Per-Agent Overrides:

**Scheduling:**
- `<AGENT>_REPORT_HOUR` (default: 7)
- `<AGENT>_REPORT_MINUTE` (default: 5)
- `<AGENT>_BROADCAST_DELAY_MS` (default: 150ms between SMS)

**Storage:**
- `AGENT_REPORTS_BUCKET` (default: `agent-reports`)
- `<AGENT>_AUDIO_BUCKET` (default: `audio`)

**Agent-Specific:**
- `<AGENT>_PODCAST_TITLE`
- `<AGENT>_PODCAST_DESCRIPTION`
- `<AGENT>_TARGET_MINUTES`
- etc.

---

## Key Insights

**Reusable Infrastructure:**
The architecture allows any new agent to reuse:
- Report storage (Supabase + metadata)
- Subscription system (agent_subscriptions table)
- Scheduler (daily job registration)
- Shortlinks (kochi.to branded URLs)
- Viewer/player pages (consistent UX)

**No Infrastructure Duplication:**
- No need to modify `handlers.ts` - commands auto-dispatch
- No new database tables needed - use `agent_subscriptions`
- No new storage buckets needed - use `agent-reports`
- No new SMS broadcast code - use shared scheduler

**Pattern Consistency:**
Every agent follows the same pattern:
1. Python script generates content
2. TypeScript wrapper handles storage/SMS
3. Command file in `commands/<agent>.ts`
4. Daily job broadcasts to subscribers
5. Uses viewer/player for branded links

This consistency makes agents predictable, maintainable, and easy to extend.
