# Project 01: Web Foundation

## Context
Transform TryAir from CLI to web interface. Set up /inspiration route with basic UI for topic, mode, and style selection.

## Tasks
- [x] Task 1: Create route structure at `web/app/inspiration/`
- [x] Task 2: Add middleware bypass in `web/middleware.ts`
- [x] Task 3: Playwright test — verify route loads, not hijacked by Webtoys
- [x] Task 4: Build basic UI (topic input, mode selector, style selector)
- [x] Task 5: Create API route for storyboard generation
- [x] Task 6: Wire up UI to API, show storyboard result

## Completion Criteria
- [x] `npm run build` passes
- [ ] Playwright test passes: route loads correctly
- [ ] Can enter topic, select mode/style, see storyboard output

## Notes
- Keep UI simple, internal-tool aesthetic (Linear/Notion style)
- API routes call into tryair/lib/ for actual logic
- For now, just Image and Video modes (Wall of Text in Project 03)
