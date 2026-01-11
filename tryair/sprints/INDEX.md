# TryAir v2: Inspiration

## Status: IN PROGRESS
Building web-based creative tool with comp selection and agent mode.

## Project Progress
| # | Project | Status | Notes |
|---|---------|--------|-------|
| 01 | Web Foundation | 6/6 ✓ | Route, middleware, basic UI |
| 02 | Two-Comp System | 5/5 ✓ | Storyboard 2 directions, parallel image gen |
| 03 | Wall of Text Mode | 4/4 ✓ | Audio API, video API, scrolling text |
| 04 | Agent Mode | 5/5 ✓ | Claude agent feedback loop |
| 05 | Polish | 4/4 ✓ | Error handling, mobile, performance |

## Current Focus
All projects complete! TryAir v2 Inspiration tool ready for testing.

## Key Decisions
- Location: `web/app/inspiration/` (Next.js app router)
- API routes in `web/app/inspiration/api/` (colocated)
- Audio: Hume AI TTS with warm podcast host voice
- Video: FFmpeg with Ken Burns zoom, crossfades, text overlays
- Image generation: OpenAI GPT Image API (gpt-image-1)

## File Locations
```
web/app/inspiration/           # Web UI
web/app/inspiration/api/       # API routes (storyboard, image, audio, video)
tryair/lib/                    # Core logic (shared with CLI)
tryair/agents/                 # Agent mode (future)
tryair/sprints/                # Project tracking
tryair/docs/V2-PLAN.md         # Full v2 plan
```

## Quick Start for New Session
1. Read this file
2. Check "Current Focus" above
3. Read that project's PROJECT.md
4. Continue from first unchecked task
