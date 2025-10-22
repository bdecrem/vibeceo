# Peer Review Fight Club SMS Integration

Peer Review Fight Club now mirrors the AI Daily experience while sourcing data directly from our consolidated Supabase database.

## Topic & Data Sources
- **Topic ID**: `5c6c2fd7-fcec-417b-ab48-27db253443b8`
- Episodes are read straight from the Supabase `topics`/`episodes` tables. We first try `topics.current_episode_id` and fall back to the most recent `episodes.created_at` entry.
- Show notes and story links come from `episodes.show_notes_json.links` (when present) and `episodes.stories_data`.

## Commands (handled in `sms-bot/commands/peer-review.ts`)
- `PEER REVIEW` – Fetch the latest episode summary + listening link
- `PEER REVIEW LINKS` / `PR LINKS` – Return source links for the current episode
- `PEER REVIEW SUBSCRIBE` – Opt in to the daily text (stored in `agent_subscriptions` under slug `peer-review-fight-club`)
- `PEER REVIEW STOP` / `PEER REVIEW UNSUBSCRIBE` – Opt out
- `PEER REVIEW HELP` – Quick reference guide

## Scheduler
- Registered in `lib/sms/peer-review-scheduler.ts` and loaded from `lib/sms/bot.ts`
- Defaults: `PEER_REVIEW_SEND_HOUR=7`, `PEER_REVIEW_SEND_MINUTE=15`, `PEER_REVIEW_PER_MESSAGE_DELAY_MS=150`
- Uses shared cron infrastructure (`lib/scheduler/index.ts`) and Twilio client to broadcast
- Delivery tracking: `agent_subscriptions.last_sent_at` via `markAgentReportSent`

## Audio Player & Short Links
- The SMS bot now deep-links to the shared `/music-player` page (same experience as AI Daily).
- `getPeerReviewShortLink` builds the player URL (`https://kochi.to/music-player?...`) with title, description snippet, autoplay, and then shortens it via `SHORTLINK_SERVICE_URL` + `SHORTLINK_SERVICE_TOKEN`.
- If the short link service is unavailable, the raw player URL is sent (never the legacy `audio_url`).
- The player metadata mirrors the SMS headline (title fallback + summary snippet) so Crash and SMS stay in lockstep.

## Required Environment
Make sure these variables are configured (all already used elsewhere):
- `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
- `SHORTLINK_SERVICE_URL`, `SHORTLINK_SERVICE_TOKEN`
- Optional overrides: `PEER_REVIEW_SEND_HOUR`, `PEER_REVIEW_SEND_MINUTE`, `PEER_REVIEW_PER_MESSAGE_DELAY_MS`

With these pieces in place, Peer Review Fight Club subscriptions run through the same orderly workflow as our other agents while relying entirely on Supabase for content.
