# CTRL Shift (CS) - Link Sharing System

**CS** = CTRL Shift — a private link-sharing feed for Kochi subscribers.

## What It Does

- Users share links via SMS → broadcasted to all CS subscribers
- Links are auto-fetched and summarized by AI
- Web UI at `kochi.to/cs` shows the feed with comments
- AI-powered search/chat to query the shared content

## Architecture

```
SMS Side (sms-bot/)
├── commands/cs.ts              # SMS command handlers
├── agents/cs-chat/index.ts     # AI chat agent (this folder)
└── lib/cs-content-fetcher.ts   # Async content fetch + summarization

Web Side (web/)
├── app/cs/page.tsx             # Web UI (React)
└── app/api/cs/
    ├── route.ts                # GET links
    ├── auth.ts                 # Session token utils
    ├── send-code/route.ts      # SMS verification
    ├── verify-code/route.ts    # Code verification
    ├── set-handle/route.ts     # Handle setup
    ├── chat/route.ts           # AI search endpoint
    ├── comment/route.ts        # Add comment
    ├── delete-comment/route.ts # Delete comment
    └── delete-post/route.ts    # Delete post
```

## SMS Commands

| Command | Description |
|---------|-------------|
| `CS <url>` | Share a link (broadcasts to subscribers) |
| `CS <url> your note` | Share with a comment |
| `CS <url> person: Name` | Tag a link as being "about" someone |
| `CS <text>` | Comment on recent link (30-min rolling window) |
| `CS KOCHI <question>` | AI-powered Q&A — broadcasts question + answer to all |
| `CS SUBSCRIBE` / `CS SUB` | Request invite (adds to waitlist) |
| `CS UNSUBSCRIBE` / `CS UNSUB` | Unsubscribe |
| `CS LIST` | See 5 most recent links |
| `CS HELP` | Show commands |
| `CS APPROVE <phone>` | **Admin only**: Approve waitlist request |
| `CS Y` / `CS OK` | **Admin only**: Approve most recent waitlist request |

**Invite-only system:**
- CS is invite-only. `CS SUBSCRIBE` adds user to waitlist
- Admin receives SMS notification for each invite request
- Admin approves via `CS APPROVE +1234567890` or `CS Y` (for most recent)
- Approved user receives "You're in!" message and is subscribed

**Special handling:**
- LinkedIn profile URLs auto-detect `about_person` from the URL slug
- If user just texts `CS` (no URL), waits 30s for URL follow-up (iMessage splitting workaround)
- Comments have a 30-min rolling window — each new comment resets the timer
- KOCHI broadcasts both the question and AI answer to all subscribers

## Database Schema

### `cs_content` — Link posts (owned by CS)
| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| subscriber_id | UUID FK | References sms_subscribers(id) |
| posted_by_phone | TEXT NOT NULL | Normalized phone (+1...) |
| posted_by_name | TEXT | User's handle at post time |
| url | TEXT NOT NULL | The shared URL |
| domain | TEXT | Extracted hostname |
| title | TEXT | Page title (unused currently) |
| notes | TEXT | User's comment when sharing |
| about_person | TEXT | Person filter tag |
| posted_at | TIMESTAMPTZ | |
| content_text | TEXT | Extracted page text (max 5000 chars) |
| content_summary | TEXT | AI 2-sentence summary |
| content_fetched_at | TIMESTAMPTZ | When content was fetched |
| comments | JSONB | `[{id, author, text, created_at}]` |

### `verification_codes` — Phone auth (owned by CS web)
| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| phone | TEXT NOT NULL | Normalized phone |
| code | TEXT NOT NULL | 6-digit code |
| created_at | TIMESTAMPTZ | |
| expires_at | TIMESTAMPTZ NOT NULL | 10 min from creation |
| verified_at | TIMESTAMPTZ | Set when code verified |

### `sms_subscribers` — User accounts (shared table, CS uses these fields)
| Column | Type | CS Usage |
|--------|------|----------|
| id | UUID PK | FK for cs_content.subscriber_id |
| phone_number | TEXT NOT NULL | Lookup by phone |
| personalization | JSONB | `{handle: "roxi", name: "..."}` |

### `agent_subscriptions` — Broadcast subscriptions (shared table)
| Column | Type | CS Usage |
|--------|------|----------|
| id | UUID PK | |
| subscriber_id | UUID FK | References sms_subscribers(id) |
| agent_slug | TEXT | `'cs'` for CTRL Shift |
| subscribed_at | TIMESTAMPTZ | |
| active | BOOLEAN | Whether subscribed |

### `cs_waitlist` — Invite waitlist (owned by CS)
| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| phone | TEXT NOT NULL | Normalized phone (+1...) |
| name | TEXT | User's name/handle at request time |
| status | TEXT NOT NULL | `'pending'`, `'approved'`, or `'rejected'` |
| requested_at | TIMESTAMPTZ | When invite was requested |

Used via `lib/agent-subscriptions.ts` helpers: `subscribeToAgent()`, `unsubscribeFromAgent()`, `getAgentSubscribers()`, `isSubscribedToAgent()`

## Key Flows

### Posting a Link
1. User texts `CS https://example.com nice article`
2. `commands/cs.ts` parses → inserts into `cs_content`
3. `cs-content-fetcher.ts` runs async: fetches page, extracts text, generates summary
4. Broadcasts to all CS subscribers (skips the poster)
5. Confirms to poster: `✓ Shared to N subscribers`

### Handle Setup (Multi-Turn)
1. User texts `CS SUBSCRIBE`
2. If no handle, stores thread state `{handler: 'cs-handle-setup'}`
3. User's next message is routed to `handleCSHandleSetup()` via `orchestrated-routing.ts`
4. Saves handle to `sms_subscribers.personalization.handle`

### Web Authentication
1. User enters phone → `send-code` generates 6-digit code, sends via SMS
2. User enters code → `verify-code` validates, returns session token
3. Token is HMAC-signed, expires in 24h
4. If no handle, prompts to set one via `set-handle`

### AI Chat Agent
The chat agent (`index.ts`) uses Anthropic tool_use in an agentic loop:

**Tools:**
- `get_all_links` — Returns all links with summaries (for broad questions)
- `search_links` — Keyword search in content/summary/notes (for specific questions)

Max 5 tool call iterations. Returns 2-4 sentence answer with source citations.

## Content Fetcher

`lib/cs-content-fetcher.ts` runs asynchronously after a post:

1. Fetches URL with 15s timeout
2. Strips HTML tags, scripts, nav, footer
3. Sends first 8000 chars to Claude for 2-sentence summary
4. Stores `content_text` (5000 chars max) and `content_summary`

**Backfill:** `backfillUnfetchedLinks(limit)` can process missed links.

## Web UI Features

- **Link feed** with domain, notes, AI summary, poster, timestamp
- **Person filter** — chips to filter by `about_person`
- **Comments** — authenticated users can comment/delete
- **AI search** — expandable panel to ask questions about the feed
- **Phone auth** — SMS code verification, handle setup

## Environment Variables

Required:
- `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` — Database access
- `ANTHROPIC_API_KEY` — AI summaries and chat
- Twilio credentials (from main Kochi config) — SMS sending

## Development Notes

- SMS bot changes need rebuild: `cd sms-bot && npm run build`
- Web changes auto-reload in dev
- Content fetcher is fire-and-forget (doesn't block SMS response)
- Comments stored as JSONB array on the post (no separate table)
