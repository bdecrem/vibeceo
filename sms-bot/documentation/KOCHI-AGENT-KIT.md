# Kochi Agent Kit

This guide explains how Kochi Developers can build SMS agents that plug into the existing Kochi infrastructure (Supabase storage, scheduler, viewer/player short-links, Claude-agent loops, and our SMS command router). Follow the steps below to create an agent, request a command keyword, and have your agent reviewed for launch.

## 1. What You Build

Every agent mirrors the crypto research pattern:

1. **Autonomous runner** (`agents/<slug>/agent.py`)  
   - Python 3.10+ script using `claude-agent-sdk` and the Claude Code CLI.  
   - Input: goal + optional context. Output: markdown report + summary.  
   - Handles its own websearch/read/write/bash actions.

2. **TypeScript wrapper** (`agents/<slug>/index.ts`)  
   - Spawns the Python runner, parses JSON, and calls `storeAgentReport()` (see `agents/report-storage.ts`).  
   - Exports:
     ```ts
     export async function runAndStore<Agent>(): Promise<StoredReportMetadata>;
     export async function getLatestStored<Agent>(): Promise<StoredReportMetadata | null>;
     export function register<Agent>DailyJob(twilioClient: TwilioClient): void;
     ```
   - Responsibilities: build report viewer/audio player URLs, create shortlinks via `createShortLink()`, and schedule Twilio broadcasts using the shared scheduler helpers.

3. **Command handler** (`commands/<slug>.ts`)  
   - One command keyword per agent (e.g., `KG`).  
   - Implements on-demand report fetch, `SUBSCRIBE` / `UNSUBSCRIBE`, optional `HELP`, and `RUN` (Bart-only).  
   - Uses `lib/agent-subscriptions.ts`, `buildReportViewerUrl`, `buildMusicPlayerUrl`, etc. No edits to `lib/sms/handlers.ts`.

## 2. Manifest

Each submission includes a `agent-manifest.yml` file describing the agent so Kochi reviewers can wire it up quickly:

```yaml
slug: kg-insights              # used for storage paths / scheduler / commands directory
title: "KG Daily Insights"
description: "Concise analysis on knowledge graphs"
command_keyword: "KG"          # requested SMS keyword (pending approval)
schedule:
  hour: 7                      # PT
  minute: 5
  broadcast_delay_ms: 150
outputs:
  report: true
  audio: false
contacts:
  author: "Jane Doe"
  email: "jane@example.com"
repo: "https://github.com/janedoe/kg-agent"
notes: "Needs access to datasets.csv in Supabase"
```

## 3. Submission Workflow

1. **Build + test locally**  
   - Use `npm run dev:sms` (or equivalent) to start the bot, run your scheduler job once via `register<Agent>DailyJob`, and verify Supabase uploads + shortlinks.  
   - Confirm your command handler responds to `KEYWORD`, `KEYWORD REPORT`, `KEYWORD SUBSCRIBE`, and `KEYWORD HELP`.

2. **Prepare PR / bundle**  
   - Add the runner, wrapper, command handler, and `agent-manifest.yml`.  
   - Document any required env vars (extra APIs) inside your README section.  
   - Include sample output (latest markdown report + SMS copy) for review.

3. **Request review**  
   - Submit PR or zip + manifest through the Kochi Developer Portal (coming soon) or via email/Slack as directed.  
   - We run automated lint/test + manual review.

4. **Approval & deployment**  
   - Reviewers verify: Claude loop safety, Supabase paths, viewer/player usage, manifest accuracy, Twilio messaging, and command keyword uniqueness.  
   - If approved, Kochi merges the PR, assigns the command keyword, and enables the scheduler job in production.  
   - If changes are needed, you’ll receive feedback and can resubmit.

## 4. Review Checklist (internal)

- Runner uses Claude agent safely (rate limits, no destructive commands).  
- Output markdown stored under `agent-reports/<slug>/reports/YYYY-MM-DD.md` with metadata JSON.  
- Command handler follows established pattern and uses viewer/player shortlinks (never raw Supabase URLs).  
- `agent_subscriptions` helpers manage opt-in/out; `last_sent_at` is updated after broadcast.  
- Scheduler job registered via `register<Agent>DailyJob()` with configurable hour/minute env vars.  
- Any audio uses Supabase `audio` bucket + music player shortlink.  
- Manifest complete; requested command keyword available.  
- No direct modifications to shared libs unless approved.

## 5. FAQs

**Are we exposing an API?**  
No. Agents run inside Kochi’s repository and rely on existing Supabase + Twilio credentials. Developers submit code that we run after review.

**Do builders get MCP access?**  
Not initially. Builders rely on Claude agent tooling locally; Kochi runs the approved agent in production. If we later expose MCP, we’ll update this doc.

**How do updates ship?**  
Developers submit PRs referencing their agent slug. Internal reviewers ensure backwards compatibility before restarting the SMS bot.

## 6. Next Steps for Builders

1. Clone the repo template or copy an existing agent folder.  
2. Implement your Python runner + TS wrapper + command handler.  
3. Fill out `agent-manifest.yml` and run smoke tests.  
4. Submit your package for review using the workflow above.
