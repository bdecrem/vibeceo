 # SMS Agent Pipeline (Crypto Research Reference)

This document captures the patterns introduced with the **crypto research agent** so future SMS agents can reuse the same infrastructure—and so our SMS flows and the Crash podcast app stay in sync.

## Architecture Overview

1. **Agent runner (Python + Claude Agent SDK)**
   - Live code: `sms-bot/agents/crypto-research/agent.py`
   - Uses `claude_agent_sdk` with web-search, read, write, and bash tools to generate a markdown report each day.
   - The TypeScript wrapper (`sms-bot/agents/crypto-research/index.ts`) calls the Python script, captures the markdown + summary, and returns structured metadata.

2. **Report storage in Supabase**
   - Upload path: `agent-reports/<agent-slug>/reports/YYYY-MM-DD.md` (bucket defaults to `agent-reports`).
   - Metadata stored alongside each report (`metadata/YYYY-MM-DD.json`) includes summary, created timestamp, public URL, etc.
   - Helper: `sms-bot/agents/report-storage.ts` handles storage bucket creation + metadata JSON.
   - Links are shared via Supabase’s public bucket URL, optionally shortened through `createShortLink()` (backed by the `SHORTLINK_SERVICE_URL` / `SHORTLINK_SERVICE_TOKEN` endpoint at kochi.to).

3. **Podcast + Crash App integration**
   - Module: `sms-bot/agents/crypto-research/podcast.ts`.
   - Generates a narrated episode (TTS via ElevenLabs) and saves the MP3 to Supabase Storage (bucket `audio` unless overridden by `CRYPTO_PODCAST_AUDIO_BUCKET`).
   - Ensures the shared Supabase tables (`topics`, `episodes`, and related metadata) contain the latest crypto episode so both the SMS bot and the Crash iOS app pull identical content.
   - Handles short-link creation for the audio, migrates any legacy assets out of the old `audio-files` bucket, and keeps `show_notes_json` aligned with the new audio URL.
   - Returns the generated episode metadata (`audioUrl`, `shortLink`, duration, etc.) so SMS commands can include “🎧 Listen” links and the Crash app can surface the episode immediately.

4. **Agent subscriptions table**
   - New table: `agent_subscriptions`
     ```sql
     create table agent_subscriptions (
       id uuid primary key default uuid_generate_v4(),
       subscriber_id uuid not null references sms_subscribers(id) on delete cascade,
       agent_slug text not null,
       subscribed_at timestamptz not null default now(),
       last_sent_at timestamptz,
       active boolean not null default true,
       unique (subscriber_id, agent_slug)
     );
     ```
   - Helper module: `sms-bot/lib/agent-subscriptions.ts`
     - `subscribeToAgent`, `unsubscribeFromAgent`, `isSubscribedToAgent`
     - `getAgentSubscribers` for broadcasts
     - `markAgentReportSent` to track last delivery per user
   - This replaces the previous “one boolean per agent” approach in `sms_subscribers`.
   - Supabase bucket + shortlink service continue to provide the final shareable URL (make sure `SHORTLINK_SERVICE_URL` / `SHORTLINK_SERVICE_TOKEN` are configured).

5. **Command handler (`sms-bot/commands/crypto.ts`)**
   - Lives in the shared `sms-bot/commands/` folder; `processIncomingSms` dispatches there automatically.
   - Supported commands (case-insensitive):
     - `CRYPTO`, `CRYPTO REPORT`: fetch latest stored report → one-sentence summary + short link.
     - `CRYPTO SUBSCRIBE` / `CRYPTO UNSUBSCRIBE`: toggle subscription via `agent_subscriptions`.
     - `CRYPTO HELP`: list available commands.
     - `CRYPTO RUN`: regenerate report manually (restricted to Bart’s number `+16508989508`).
   - **Handlers.ts stays clean:** no new keywords belong in `sms-bot/lib/sms/handlers.ts`; new commands live here so the dispatcher remains simple.

6. **Scheduler integration**
   - Shared scheduler lives in `sms-bot/lib/scheduler/index.ts`.
   - The crypto job registers via `registerCryptoDailyJob(twilioClient)` (now accepting the Twilio client after startup).
   - Daily flow (defaults to 7:05 AM PT):
     1. Run Python agent, upload markdown + metadata to Supabase.
     2. Generate/update the podcast episode and Crash app metadata (topics/episodes/audio storage/short links).
     3. Fetch active subscriptions with slug `crypto-daily`.
     4. Send SMS summary + report link + “🎧 Listen” link using the same composer as the on-demand command.
     5. Update `last_sent_at` per subscriber.

7. **Report Viewer & Music Player Integration**
   - **DO NOT link directly to raw Supabase URLs in SMS messages.** Always use the branded viewer/player pages.
   - Helper modules:
     - `sms-bot/lib/utils/report-viewer-link.ts` - Creates URLs to `/report-viewer` page
     - `sms-bot/lib/utils/music-player-link.ts` - Creates URLs to `/music-player` page
   - Web routes (Next.js):
     - `web/app/report-viewer/page.tsx` - Markdown viewer with Kochi branding
     - `web/app/music-player/page.tsx` - Audio player with Kochi branding and controls
     - `web/app/api/report/route.ts` - API endpoint to fetch markdown from Supabase Storage

   ### Pattern for Markdown Reports:
   ```typescript
   import { buildReportViewerUrl } from '../../lib/utils/report-viewer-link.js';
   import { createShortLink } from '../../lib/utils/shortlink-service.js';

   // After storing report to Supabase
   const stored = await storeAgentReport({
     agent: 'your-agent-slug',
     date: '2025-10-07',
     markdown: reportMarkdown,
     summary: reportSummary,
   });

   // Build viewer URL from the storage path
   const viewerUrl = buildReportViewerUrl({
     path: stored.reportPath  // e.g., "your-agent-slug/reports/2025-10-07.md"
   });

   // Create shortlink for SMS
   const reportShortLink = await createShortLink(viewerUrl, {
     context: 'your-agent-report',
     createdBy: 'sms-bot',
     createdFor: recipient,
   });

   // Use in SMS: reportShortLink will redirect to viewer
   ```

   ### Pattern for Audio Content:
   ```typescript
   import { buildMusicPlayerUrl } from '../../lib/utils/music-player-link.js';
   import { createShortLink } from '../../lib/utils/shortlink-service.js';

   // After generating/uploading audio to Supabase
   const audioUrl = 'https://...supabase.co/storage/v1/object/public/audio/file.mp3';

   // Build player URL with metadata
   const playerUrl = buildMusicPlayerUrl({
     src: audioUrl,           // Raw MP3 URL from Supabase
     title: 'Agent Name Oct 7',
     description: 'One-sentence summary for player UI',
     autoplay: true,          // Start playing immediately
   });

   // Create shortlink for SMS
   const audioShortLink = await createShortLink(playerUrl, {
     context: 'your-agent-audio',
     createdBy: 'sms-bot',
     createdFor: recipient,
   });

   // Use in SMS: audioShortLink will redirect to player
   ```

   ### Real Examples:

   **Medical Daily** (`sms-bot/agents/medical-daily/index.ts:407-450`):
   ```typescript
   // Report viewer
   const viewerUrl = buildReportViewerUrl({ path: stored.reportPath });
   const reportShortLink = await createShortLink(viewerUrl, {
     context: 'medical-daily-report',
     createdBy: 'sms-bot',
     createdFor: 'medical-daily',
   });

   // Audio player
   const playerUrl = buildMusicPlayerUrl({
     src: audioCandidate,
     title: `Medical Daily ${result.date}`,
     description: summary,
     autoplay: true,
   });
   const audioShortLink = await createShortLink(playerUrl, {
     context: 'medical-daily-audio',
     createdBy: 'sms-bot',
     createdFor: 'medical-daily',
   });
   ```

   **Crypto Research** (`sms-bot/agents/crypto-research/index.ts:369-390`):
   ```typescript
   const viewerUrl = buildReportViewerUrl({ path: reportPath });
   const short = await createShortLink(viewerUrl, {
     context: 'crypto-report-viewer',
     createdFor: recipient,
     createdBy: 'sms-bot',
   });
   ```

   **Crypto Podcast** (`sms-bot/agents/crypto-research/podcast.ts:150-166`):
   ```typescript
   const playerUrl = buildMusicPlayerUrl({
     src: audioUrl,
     title: episodeTitle,
     description: input.summary,
     autoplay: true,
   });
   const shortLink = await createShortLink(playerUrl, {
     context: 'crypto-podcast',
     createdBy: 'sms-bot',
     createdFor: 'crypto-agent',
   });
   ```

   **AI Daily** (`sms-bot/lib/sms/ai-daily.ts:149-167`):
   ```typescript
   const playerUrl = buildAiDailyMusicPlayerUrl(episode);  // Wrapper around buildMusicPlayerUrl
   const shortLink = await createShortLink(playerUrl, {
     context: 'ai_daily',
     createdFor,
     createdBy: 'sms-bot'
   });
   ```

   **Peer Review** (`sms-bot/lib/crash/peer-review.ts:187-245`):
   ```typescript
   const playerUrl = buildMusicPlayerUrl({
     src: episode.audioUrl,
     title: buildPeerReviewPlayerTitle(episode),
     description: buildPeerReviewPlayerDescription(episode),
     autoplay: true,
   });
   const shortLink = await createShortLink(playerUrl, {
     context: 'peer_review_fight_club',
     createdFor,
     createdBy: 'sms-bot',
   });
   ```

   ### Why Use Viewer/Player Pages?
   - **Branded experience**: Kochi design, not raw markdown/audio
   - **Better UX**: Formatted markdown with clickable links, audio controls with scrubbing
   - **Mobile-optimized**: Works on all devices, iOS Safari audio issues handled
   - **Consistent**: All agents use same UI/UX
   - **Tracking**: Can add analytics to viewer/player pages

8. **Environment variables to set in production**
   - Core: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `CLAUDE_CODE_OAUTH_TOKEN`, `SHORTLINK_SERVICE_URL`, `SHORTLINK_SERVICE_TOKEN`, `OPENAI_API_KEY`, `ELEVENLABS_API_KEY`, `SHORTLINK_BASE_URL` (defaults to `https://kochi.to` - used by viewer/player link builders).
   - Optional overrides:
     - `CRYPTO_REPORT_HOUR` / `CRYPTO_REPORT_MINUTE` (default 7:05 PT)
     - `CRYPTO_BROADCAST_DELAY_MS` (default 150 ms between SMS to avoid throttling)
     - `AGENT_REPORTS_BUCKET` (default `agent-reports`)
     - `CRYPTO_PODCAST_AUDIO_BUCKET` (defaults to `audio`; legacy `audio-files` is auto-migrated but no longer recommended)
     - `CRYPTO_PODCAST_TITLE`, `CRYPTO_PODCAST_DESCRIPTION`, `CRYPTO_PODCAST_DEVICE_TOKEN`, etc. for fine-tuning Crash metadata
     - `CRYPTO_PODCAST_TARGET_MINUTES`, `CRYPTO_PODCAST_ELEVENLABS_*` for speech synthesis tuning
     - `PYTHON_BIN` if the runtime isn't `python3`

## Steps to add a new daily agent

1. **Create the runner** (Python or TS) that generates the asset (HTML, markdown, etc.)—mirror `sms-bot/agents/crypto-research/agent.py`.
2. **Wrap the runner** in a TypeScript module (`agents/<slug>/index.ts`) that exposes:
   ```ts
   export async function runAndStore<Agent>(): Promise<StoredReportMetadata>
   export async function getLatestStored<Agent>(): Promise<StoredReportMetadata | null>
   export function register<Agent>DailyJob(twilioClient: TwilioClient): void
   ```
3. **Reuse Supabase storage helpers** (`sms-bot/agents/report-storage.ts`).
4. **Register daily job** in the wrapper: schedule time, store metadata, update Crash podcast data (if applicable), broadcast to subscribers using `agent_subscriptions`.
5. **Add command handler** under `sms-bot/commands/<agent>.ts` that:
   - Routes through `agent-subscriptions.ts` for subscribe/unsubscribe.
   - Uses the shared scheduler summary builder so SMS replies match the broadcast message.
6. **Link command handler** automatically via the dispatcher already in `handlers.ts` (no changes needed there once the file exports `CommandHandler`).
7. **Restart the SMS bot service** so the new agent job and commands load into the running process.

With these pieces in place, every new agent can share the same infrastructure—storage, scheduler, subscriptions, short links—without bloating the `sms_subscribers` table or duplicating logic.
