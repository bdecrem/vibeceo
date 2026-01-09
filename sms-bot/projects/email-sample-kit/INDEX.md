# Email Sample Kit to Amber

## Status: DEPLOYED
Users can email audio samples to Amber, who creates a sample kit for the 90s sampler, generates a jam page, and replies with links.

## Project Progress
| # | Project | Status | Notes |
|---|---------|--------|-------|
| 01 | Supabase Storage Setup | 2/2 | Complete |
| 02 | Webhook Attachment Handling | 5/5 | Complete |
| 03 | Agent Interface | 3/3 | Complete |
| 04 | Agent Prompt | 3/3 | Complete |
| 05 | Testing & Verification | 1/3 | Build passed, needs live test |

## Current Focus
Project 05: Build, verify, and test

## Key Decisions
- Bucket name: `90s-kits`
- Permission model: Anyone can email samples, strangers require approval
- Samples stored temporarily in Supabase, then committed to git as static files
- Agent handles all intelligence (naming, ordering, jam creation) via prompt

## File Locations
| Purpose | Path |
|---------|------|
| Full plan | `sms-bot/documentation/PLAN-EMAIL-SAMPLE-KIT.md` |
| Email webhook | `sms-bot/lib/sms/email-webhooks.ts` |
| Agent interface | `sms-bot/agents/amber-email/index.ts` |
| Agent logic | `sms-bot/agents/amber-email/agent.py` |
| Kit destination | `web/public/90s/kits/{kit-id}/` |
| Jam pages | `web/public/90s/{kit-id}-jam.html` |

## Quick Start for New Session
1. Read this file
2. Check "Current Focus" above
3. Read that project's PROJECT.md
4. Continue from first unchecked task
