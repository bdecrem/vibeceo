# AI Daily SMS Integration Overview

## High-Level
- Crash backend (running on the iMac) exposes `GET /api/ai-daily/latest` via the active ngrok URL; that endpoint must return the latest episode JSON (title, snippet, `audioUrl`, etc.).
- Webtoys SMS bot (Mac mini) reads the base URL from `AI_DAILY_BASE_URL` and runs the scheduler inside `startSmsBot()`.
- Every minute the scheduler checks Pacific Time (`AI_DAILY_SEND_HOUR`, `AI_DAILY_SEND_MINUTE`; defaults 7:00). When the clock matches, it fetches the latest episode (2 second timeout, 1 retry, 5 minute cache), builds the `/music-player` deep link with the episode metadata, mints a `kochi.to/l/{slug}` short link for that player URL, formats the SMS, and sends it via Twilio to any subscriber with `ai_daily_subscribed = true`. After sending, it updates `ai_daily_last_sent_at` to avoid duplicates.
  - Production builds run `npm run lint:music-player` before compiling, then set `NEXT_DISABLE_ESLINT=1` for `next build` so legacy pages no longer break the deploy.
- On-demand command `AI DAILY` fetches the episode immediately without updating `ai_daily_last_sent_at` (still cached). `AI DAILY SUBSCRIBE` toggles the flag, confirms, and sends the latest episode right away. `AI DAILY STOP` clears the flag and confirmation.
- If Crash returns an error (timeout / 404 / offline ngrok), the scheduler and command handler both send a fallback message (“AI Daily is temporarily unavailable…”) and log the failure. Once Crash is reachable again, no code changes are needed; the next fetch succeeds automatically.

## Crash Responsibilities
- Ensure the ngrok tunnel is running and matches `AI_DAILY_BASE_URL`. When ngrok restarts, update the env var on Webtoys and restart the SMS bot.
- `/api/ai-daily/latest` must ship the current episode JSON. During development a static payload is fine, but production should include the real episode data (topic info, title, snippet, `audioUrl`, timestamps).
- Crash decides when the JSON updates (after generating a new episode). Webtoys only calls the endpoint.

## Webtoys SMS Bot Details
- Code lives under `sms-bot/lib/sms`: `ai-daily.ts`, `ai-daily-scheduler.ts`, `handlers.ts` (command logic), `subscribers.ts` (new columns).
- New env variables:
  - `AI_DAILY_BASE_URL` – required (ngrok host or LAN URL).
  - `AI_DAILY_SEND_HOUR`, `AI_DAILY_SEND_MINUTE` – optional overrides (defaults 7:00 PT).
  - `AI_DAILY_TIMEOUT_MS`, `AI_DAILY_CACHE_TTL_MS`, `AI_DAILY_PER_MESSAGE_DELAY_MS` – optional tuning.
  - `SHORTLINK_SERVICE_URL` – points to the Web short-link API (`https://kochi.to/api/short-links`). (Falls back to `SHORTLINK_BASE_URL` for compatibility.)
  - `SHORTLINK_SERVICE_TOKEN` – bearer token that authenticates the SMS bot when it requests short links. (Falls back to `SHORTLINK_API_TOKEN`.)
  - `SHORTLINK_SERVICE_TIMEOUT_MS` – optional override (default 2000ms).
  - `URL_SHORTENER_ENDPOINT` / `WEBTOYS_SHORTENER_ENDPOINT` – legacy; can be removed once the in-house short links are live.
- `sms_subscribers` now has `ai_daily_subscribed` (boolean) and `ai_daily_last_sent_at` (timestamp). `AI DAILY SUBSCRIBE/STOP` updates these fields.
- Restart workflow: `cd sms-bot && npm run build`, then restart the listener (port 3030). Scheduler spins up automatically.

## Commands
- `AI DAILY` – On-demand episode pull. Uses 5-minute cache, doesnt change subscription state.
- `AI DAILY SUBSCRIBE` – Opt-in. Sets flag, replies with confirmation + latest episode.
- `AI DAILY STOP` (or `AI DAILY UNSUBSCRIBE`) – Opt-out. Clears flag, confirms unsubscribe.
- All commands run through `processIncomingSms` and respect the duplicate-processing guard.

## Short Link Service

- A new Supabase table `short_links` stores `slug`, `target_url`, and metadata. Slugs are 4-character case-sensitive codes (e.g., `kochi.to/l/6kVj`). Apply `sms-bot/migrations/create-short-links-table.sql` in Supabase.
- The web app exposes `POST /api/short-links` (protected by `SHORTLINK_API_TOKEN`) to mint links and `GET /l/[slug]` to redirect.
- Configure DNS so `kochi.to` points at the deployed Next.js site; HTTPS is required for Twilio-compatible links.
- Set in web deployment:
  - `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` (existing)
  - `SHORTLINK_API_TOKEN` (same value as the SMS bot’s `SHORTLINK_SERVICE_TOKEN`)
  - `SHORTLINK_BASE_URL=https://kochi.to`
- The SMS bot calls the service whenever an episode has an `audioUrl`. On success, AI Daily texts include `Listen: https://kochi.to/l/{slug}` that resolves into `/music-player` with title/description/autoplay. If shortening fails, the SMS falls back to the full player URL so the deep link still works.

## Failure Handling
- Failed fetch → fallback SMS, log entry. No state change (unless the command success path already updated). Next successful fetch resumes normal behaviour automatically.
- If you need to disable the broadcast temporarily, set `AI_DAILY_SEND_HOUR` to a time that wont be reached (or comment out the scheduler call) and restart the bot.

## Checklist for Future Agents
1. Crash endpoint live and reachable from Mac mini (curl the `AI_DAILY_BASE_URL/api/ai-daily/latest`).
2. `.env.local` on Webtoys has the correct base URL, optional timing overrides, and any shortener endpoint.
3. `sms-bot/migrations/add-ai-daily-columns.sql` and `sms-bot/migrations/create-short-links-table.sql` applied in Supabase.
4. After env changes, rebuild + restart SMS bot.
5. Test via `curl http://localhost:3030/dev/webhook -d "From=+15551234567&Body=AI DAILY"` to verify payload.
6. Monitor logs for `AI Daily scheduler:` entries around the scheduled time; check Twilio deliveries if running in production.
