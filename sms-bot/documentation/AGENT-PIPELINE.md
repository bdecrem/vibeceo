# SMS Agent Pipeline (Crypto Research Reference)

This document captures the patterns introduced with the **crypto research agent** so future SMS agents can reuse the same infrastructure.

## Architecture Overview

1. **Agent runner (Python + Claude Agent SDK)**
   - Live code: `sms-bot/agents/crypto-research/agent.py`
   - Uses `claude_agent_sdk` with web-search, read, write, and bash tools to generate a markdown report each day.
   - The TypeScript wrapper (`sms-bot/agents/crypto-research/index.ts`) calls the Python script, captures the markdown + summary, and returns structured metadata.

2. **Report storage in Supabase**
   - Upload path: `agent-reports/<agent-slug>/reports/YYYY-MM-DD.md`
   - Metadata stored alongside each report (`metadata/YYYY-MM-DD.json`) includes summary, created timestamp, public URL, etc.
   - Helper: `sms-bot/agents/report-storage.ts`
   - Links are shared via Supabase’s public bucket URL, optionally shortened through the existing `SHORTLINK_SERVICE_URL` + `SHORTLINK_SERVICE_TOKEN` endpoint (b52s.me).

3. **Agent subscriptions table**
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

4. **Command handler (`sms-bot/commands/crypto.ts`)**
   - Lives in the shared `sms-bot/commands/` folder; `processIncomingSms` dispatches there automatically.
   - Supported commands (case-insensitive):
     - `CRYPTO`, `CRYPTO REPORT`: fetch latest stored report → one-sentence summary + short link.
     - `CRYPTO SUBSCRIBE` / `CRYPTO UNSUBSCRIBE`: toggle subscription via `agent_subscriptions`.
     - `CRYPTO HELP`: list available commands.
     - `CRYPTO RUN`: regenerate report manually (restricted to Bart’s number `+16508989508`).
   - **Handlers.ts stays clean:** no new keywords belong in `sms-bot/lib/sms/handlers.ts`; new commands live here so the dispatcher remains simple.

5. **Scheduler integration**
   - Shared scheduler lives in `sms-bot/lib/scheduler/index.ts`.
   - The crypto job registers via `registerCryptoDailyJob(twilioClient)` (now accepting the Twilio client after startup).
   - Daily flow (defaults to 7:05 AM PT):
     1. Run Python agent, upload markdown to Supabase, store metadata.
     2. Fetch active subscriptions with slug `crypto-daily`.
     3. Send SMS summary/link to each subscriber using the same message builder as the on-demand command.
     4. Update `last_sent_at` per subscriber.

6. **Environment variables to set in production**
   - Existing: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `CLAUDE_CODE_OAUTH_TOKEN`, `SHORTLINK_SERVICE_URL`, `SHORTLINK_SERVICE_TOKEN`.
   - Optional overrides:
     - `CRYPTO_REPORT_HOUR` / `CRYPTO_REPORT_MINUTE` (default 7:05 PT)
     - `CRYPTO_BROADCAST_DELAY_MS` (default 150 ms between SMS to avoid throttling)
     - `AGENT_REPORTS_BUCKET` (default `agent-reports`)
     - `PYTHON_BIN` if the runtime isn’t `python3`

## Steps to add a new daily agent

1. **Create the runner** (Python or TS) that generates the asset (HTML, markdown, etc.)—mirror `sms-bot/agents/crypto-research/agent.py`.
2. **Wrap the runner** in a TypeScript module (`agents/<slug>/index.ts`) that exposes:
   ```ts
   export async function runAndStore<Agent>(): Promise<StoredReportMetadata>
   export async function getLatestStored<Agent>(): Promise<StoredReportMetadata | null>
   export function register<Agent>DailyJob(twilioClient: TwilioClient): void
   ```
3. **Reuse Supabase storage helpers** (`sms-bot/agents/report-storage.ts`).
4. **Register daily job** in the wrapper: schedule time, store metadata, broadcast to subscribers using `agent_subscriptions`.
5. **Add command handler** under `sms-bot/commands/<agent>.ts` that:
   - Routes through `agent-subscriptions.ts` for subscribe/unsubscribe.
   - Uses the shared scheduler summary builder so SMS replies match the broadcast message.
6. **Link command handler** automatically via the dispatcher already in `handlers.ts` (no changes needed there once the file exports `CommandHandler`).
7. **Restart the SMS bot service** so the new agent job and commands load into the running process.

With these pieces in place, every new agent can share the same infrastructure—storage, scheduler, subscriptions, short links—without bloating the `sms_subscribers` table or duplicating logic.
