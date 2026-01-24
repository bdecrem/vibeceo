# Kochito Labs Platform Overview

## What This Is

A monorepo that grew like a vine. Started as an SMS bot (**Kochi.to**), now it's... more.

**The basics:** Text a keyword, get an AI agent's output. Research papers, crypto prices, stock news, knowledge graph queries. Twilio webhook comes in, something happens, SMS goes out.

**The weird parts:**
- **Amber** — an AI sidekick with access to email, Twitter, and a "pulse" (mood influenced by lunar cycles, because why not). Posts existentialist art and trades stocks with friends over email. Sometimes works.
- **Token Tank** — we gave AI agents $500 and told them to build businesses. They held a Discord meeting and took notes. Experiment concluded.
- **Jambot** — Claude Code but for music production. Outputs MIDI, stems, full tracks. WIP.
- **Discord Bot** — AI coaches with distinct personalities having scheduled conversations in Discord. Micro-posts, staff meetings, weekend stories. Originally for AdvisorsFoundry. Probably still running somewhere.

6+ months of "what if we tried this." Some of it runs in production. Some of it is held together by duct tape and optimism.

---

## The Toolchest

### External Services & APIs

| Service | Purpose | Location |
|---------|---------|----------|
| **Supabase** | PostgreSQL database + object storage. The source of truth for subscribers, agent state, reports, content. | `sms-bot/lib/supabase.ts` |
| **Neo4j** | Knowledge graph for research paper relationships (arXiv metadata, citations, topic connections) | `sms-bot/lib/orchestrator.ts`, `agents/kg-query/` |
| **Redis (ioredis)** | In-memory cache, message queuing, pub/sub for alerts | `sms-bot/lib/`, `web/` |
| **Twilio** | SMS/MMS messaging with webhook handling | `sms-bot/lib/sms/webhooks.ts`, `/api/incoming-sms` |
| **SendGrid** | Bulk email, broadcasts, delivery tracking | `sms-bot/lib/email/sendgrid.ts` |
| **Anthropic Claude** | Primary LLM for orchestration, context analysis, content generation | Throughout codebase |
| **OpenAI GPT** | Secondary LLM for specific tasks | `sms-bot/lib/sms/ai.ts` |
| **Claude Agent SDK** | Python autonomous agents with WebSearch, file ops | `sms-bot/agents/*/agent.py` |
| **Hume AI (Octave TTS)** | Voice synthesis with acting direction, speed control | `sms-bot/lib/voice/hume.ts` |
| **ElevenLabs** | Text-to-speech (legacy/backup) | Various |
| **Twitter/X API** | OAuth 1.0a, multi-account posting | `sms-bot/lib/twitter-client.ts` |
| **Gmail API** | OAuth 2.0, email reading/searching/filtering | `sms-bot/lib/gmail-client.ts` |
| **Google Calendar** | Event creation via Gmail auth | Scripts |
| **Puppeteer** | Headless browser for screenshots, scraping, content extraction | `sms-bot/`, `web/` |
| **YouTube API** | Search, metadata, transcript extraction | `agents/youtube-search/` |

---

### Core Infrastructure

#### Message Routing & Orchestration
| Component | What It Does | File |
|-----------|--------------|------|
| **SMS Handlers** | Keyword dispatch (`AIR`, `CS`, `CRYPTO`, etc.) | `lib/sms/handlers.ts` |
| **Orchestrated Routing** | Context-aware routing for non-keyword messages | `lib/sms/orchestrated-routing.ts` |
| **Context Loader** | Thread state, conversation history, user preferences | `lib/context-loader.ts` |
| **Message Queue** | Delivery management, retry logic | `lib/sms/message-queue.ts` |
| **Notification Client** | SMS/email delivery abstraction | `notification-client.ts` |

#### Data & Storage
| Component | What It Does | File |
|-----------|--------------|------|
| **Storage Manager** | All database operations (single point of access) | `storage-manager.ts` |
| **Report Storage** | Agent reports to Supabase buckets with public URLs | `agents/report-storage.ts` |
| **Subscribers** | User management, roles (user/coder/admin/degen) | `lib/subscribers.ts` |
| **Agent Subscriptions** | Per-agent subscription tracking, last-sent timestamps | `lib/agent-subscriptions.ts` |
| **Credit Manager** | User credit/token accounting | `lib/credit-manager.ts` |

#### Scheduling & Automation
| Component | What It Does | File |
|-----------|--------------|------|
| **Scheduler** | Timezone-aware daily jobs, interval tasks, cron-like scheduling | `lib/scheduler/index.ts` |
| **Email Scheduler** | Broadcast scheduling | `lib/sms/scheduler.ts` |

---

### Agents

#### Autonomous Agents (Python + Claude Agent SDK)
These run multi-step research autonomously, using web search, file I/O, and API calls.

| Agent | Purpose | Key Capability |
|-------|---------|----------------|
| **arxiv-research** | Research paper discovery and analysis | arXiv API, web search |
| **arxiv-research-graph** | Paper relationships, citation networks | Neo4j knowledge graph |
| **medical-daily** | Daily medical research digest | Web search, filtering |
| **crypto-research** | Cryptocurrency market analysis | Market APIs, news |
| **code-agent** | Code analysis and generation | GitHub search, execution |
| **amber-email** | Email-based AI sidekick with thinkhard | Full Claude Agent SDK |
| **kg-query** | Knowledge graph querying | Neo4j, relationship traversal |
| **revision** | Text revision and improvement | Editing, rewriting |
| **discovery** | Content discovery across sources | Web search, RSS |
| **youtube-search** | YouTube content discovery | API, transcripts |

#### Scripted Agents (TypeScript)
Hardcoded workflows with AI for specific sub-tasks.

| Agent | Purpose |
|-------|---------|
| **amber** | Awareness scanning (Git, Gmail, logs) |
| **amber-social** | Twitter posting, content creation |
| **ai-twitter-daily** | AI researcher tweet curation and ranking |
| **stock-news** | Market news aggregation |
| **trader** | Trading algorithms with Python execution |
| **cs-chat** | Computer science Q&A via Neo4j |
| **token-tank** | Token Tank blog integration |
| **recruiting** | Candidate sourcing, scoring, filtering |
| **ticketmaster-events** | Event discovery |
| **rivalalert** | Competitor monitoring |

---

### SMS Commands

Auto-dispatched from `sms-bot/commands/`:

| Command | Triggers | What It Does |
|---------|----------|--------------|
| `AIR` | Research subscription | Personalized AI research delivery |
| `CS` | Computer science | Content from Neo4j knowledge base |
| `CRYPTO` | Crypto market | Market analysis, alerts |
| `AX` | Stock alerts | Stock news and monitoring |
| `KG` | Knowledge graph | Query paper relationships |
| `TT` | Token Tank | Blog posts, experiment logs |
| `AMBER` | Amber awareness | Creative sidekick interactions |
| `GMAIL` | Email access | Gmail reading/searching |
| `RECRUIT` | Recruiting | Candidate discovery |
| `DISCOVERY` | Content discovery | Cross-source content finding |
| `YOUTUBE` | YouTube search | Video/transcript search |
| `ARXIV` | arXiv papers | Paper search and analysis |

---

### Workflow Systems

| Mode | Trigger | What It Does |
|------|---------|--------------|
| **Thinkhard** | `thinkhard: [task]` | 5-iteration deep work with spec generation, criterion evaluation |
| **Thinkhard-Stophook** | `thinkhard-stophook: [task]` | Persistent deep work via Supabase (survives crashes) |
| **Project Mode** | `project: [description]` | Multi-session work with file-based state (`PROJECT.md`) |
| **Project Backlog** | `this is project [name]` | Named projects in Supabase, shelving/resuming |
| **Thread State** | Automatic | Multi-turn conversation flows with 5-minute timeout |

---

### Web Applications

#### Primary Apps
| App | Path | Purpose |
|-----|------|---------|
| **Kochi.to Landing** | `/kochi*` | SMS service signup, variants |
| **Amber** | `/amber/` | Creative tools, mood dashboard, gallery |
| **CTRL SHIFT** | `/cs/`, `/csc/` | Responsible AI knowledge repo |
| **Report Viewer** | `/report-viewer/` | Agent report display |
| **Jambot** | `/jb01/`, `/jb200/`, `/jb202/` | Music production tools |
| **Code Voice** | `/code-voice/` | Voice-based code assistant (Hume) |

#### Synthesizers (SynthMachine)
| Synth | Path | Type |
|-------|------|------|
| **TR-909** | `/909/` | Drum machine |
| **TB-303** | `/303/` | Acid bass |
| **SH-101** | `/101/` | Monophonic synth |
| **R9-DS** | `/90s/` | 90s drum sampler |
| **JB202** | `/jb202/` | Modular bass synth (custom DSP) |
| **Mixer** | Multiple | 4-band EQ, sidechain, reverb |

#### API Endpoints (70+)
Key routes in `web/app/api/`:
- `/api/amber/mood` - Pulse state
- `/api/hume-token` - Voice token generation
- `/api/code-session` - Code collaboration
- `/api/kochi-chat` - Chat interface
- `/api/short-links` - URL shortening
- `/api/generate-og*` - OpenGraph image generation (20+ variants)
- `/api/cs` - CS content fetching
- `/api/podcast-episodes` - Podcast integration

---

### Discord Bot

Lives in `/discord-bot/`. AI coaches with personalities having scheduled conversations.

| Component | What It Does | File |
|-----------|--------------|------|
| **Bot** | Discord client, webhooks, channel routing | `lib/discord/bot.ts` |
| **Scheduler** | Time-based events from schedule.txt | `lib/discord/scheduler.ts` |
| **Characters** | Coach personalities (Donte, Alex, Rohan, etc.) | `data/ceos.ts` |
| **Micro-Posts** | Quotes, masterclasses, crowd favorites | `lib/discord/microPosts.ts` |
| **Weekend Stories** | Narrative content for weekends | `lib/discord/weekend-story.ts` |
| **Staff Meetings** | Scheduled coach discussions | `lib/discord/staffMeeting.ts` |

Separate deployment. Uses webhooks so each character has their own avatar. Probably needs attention.

---

### Scripts & Automation

Located in `sms-bot/scripts/`:

| Category | Scripts | Purpose |
|----------|---------|---------|
| **SMS Testing** | `test-sms-flow.js`, `test-twilio.js` | Integration testing |
| **Email Testing** | `test-sendgrid.js`, `test-email-broadcast.js` | Delivery testing |
| **Broadcasting** | `broadcast-sms.js`, `broadcast-sms-and-email.js` | Bulk messaging |
| **Subscriber Management** | `list-subscribers.js`, `delete-subscriber.js` | User management |
| **OG Images** | `generate-og-html.js`, `replace-og-image.js`, `trending-og-workflow.js` | Social previews |
| **Development** | `dev-reroute.js`, `dev-reroute-v2.js` | Local message routing |
| **Validation** | `validate-architecture.cjs` | Architecture checks |

---

### Claude Code Subagents

Slash commands for Claude Code (`.claude/commands/`):

| Command | Purpose |
|---------|---------|
| `/auditor <path>` | Codebase health audit |
| `/amber` | Amber persona activation |
| `/forge` | Forge persona activation |
| `/i6` | Progressive search interface |

Documented in `sms-bot/documentation/subagents/`.

---

### Incubator (Token Tank)

Isolated experimental AI businesses in `/incubator/`:

| Folder | Status | Features |
|--------|--------|----------|
| `i1` - `i7` | Various iterations | Blog system, trading interfaces, dashboards |
| `BLOG.md` | Active | 68KB+ of experiment logs |
| `ARC.md` | Active | Archive research system |

Each agent is self-contained. External changes tracked in `EXTERNAL-CHANGES.md`.

---

### Voice & Audio

| Component | Purpose | File |
|-----------|---------|------|
| **Hume TTS Provider** | Voice synthesis with acting direction | `lib/voice/hume.ts` |
| **Voice Abstraction** | Provider-agnostic interface | `lib/voice/index.ts` |
| **Track Analyzer** | Frequency balance, sidechain detection | `synthmachine/tools/analyze-track.ts` |

---

### Key Patterns

| Pattern | Implementation |
|---------|----------------|
| **SMS Length** | Max 670 UCS-2 units (10 segments), auto-chunking |
| **URL Placement** | Always text after URLs to prevent iMessage splitting |
| **Report Distribution** | Store to Supabase → shorten via kochi.to → serve via `/report-viewer` |
| **Context Loading** | Full conversation history + thread state on every message |
| **Multi-Turn Flows** | `storeThreadState()` → route by `activeThread.handler` → `clearThreadState()` |
| **Agent Subscriptions** | `agent_subscriptions` table with last_sent tracking |

---

### Environment Variables

#### Core
- `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_ANON_KEY`
- `REDIS_URL`

#### AI/LLM
- `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`
- `CLAUDE_CODE_OAUTH_TOKEN` (Agent SDK)

#### Communication
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
- `SENDGRID_API_KEY`
- `TWILIO_ENABLED`, `SENDGRID_ENABLED` (bypass flags)

#### Social/Email
- `TWITTER_API_KEY`, `TWITTER_API_SECRET`, `TWITTER_ACCESS_TOKEN`, `TWITTER_ACCESS_SECRET`
- `TWITTER_<ACCOUNT>_*` (multi-account)
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`

#### Voice
- `HUME_API_KEY`, `HUME_VOICE_ID`

---

### Deployment

| Service | Platform | Port |
|---------|----------|------|
| **sms-bot** | Railway | 3030 |
| **web** | Railway | 3000 |

Push to `main` → auto-deploy. Build: `npm run build` in each directory.

---

## Summary

Supabase, Neo4j, Twilio, SendGrid, Anthropic, OpenAI, Hume. Message routing in the middle, agents around the edges. Push to main, Railway deploys it.

If you're reading this, you're probably trying to figure out how something works. Good luck. The answer is usually in `sms-bot/documentation/` or buried in a 400-line TypeScript file somewhere. Check the CLAUDE.md files first.
