# TryAir v2: Inspiration

## Status: IN PROGRESS
Building web-based creative tool with comp selection and agent mode.

## Project Progress
| # | Project | Status | Notes |
|---|---------|--------|-------|
| 01 | Web Foundation | 6/6 | Route, middleware, basic UI - TASKS DONE, needs Playwright verify |
| 02 | Two-Comp System | 0/5 | Storyboard 2 directions, parallel gen |
| 03 | Wall of Text Mode | 0/4 | Scrolling text over moving background |
| 04 | Agent Mode | 0/5 | claude-agent-sdk feedback loop |
| 05 | Polish | 0/4 | Error handling, mobile, performance |

## Current Focus
Project 01: Web Foundation — Run Playwright test and verify storyboard generation works

## Key Decisions
- Location: `web/app/inspiration/` (Next.js app router)
- API routes in `web/app/inspiration/api/` (colocated)
- Core logic stays in `tryair/lib/` (shared with CLI)
- Middleware bypass required for Webtoys

## File Locations
```
web/app/inspiration/     # Web UI
tryair/lib/              # Core logic (storyboard, image, video)
tryair/agents/           # Agent mode (future)
tryair/projects/         # This project tracking
tryair/docs/V2-PLAN.md   # Full v2 plan
```

## Quick Start for New Session
1. Read this file
2. Check "Current Focus" above
3. Read that project's PROJECT.md
4. Continue from first unchecked task
