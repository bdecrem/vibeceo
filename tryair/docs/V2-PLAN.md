# TryAir v2 Plan: Inspiration

Transform TryAir from CLI tool to web-based creative tool with comp selection and agent mode.

## Overview

| Component | Description |
|-----------|-------------|
| **Web UI** | Internal tool at `/inspiration`, simple but tasteful |
| **Wall of Text Mode** | Full-screen scrolling text over moving background + narrator |
| **Two-Comp System** | Present 2 creative directions, user picks or discusses |
| **Agent Mode** | Claude-agent-sdk interprets feedback, generates new comps |

---

## Phase 1: Web Infrastructure

### 1.1 Route Setup

**Location**: `web/app/inspiration/`

```
web/app/inspiration/
├── page.tsx          # Main UI
├── layout.tsx        # Layout wrapper
├── components/       # UI components
│   ├── ModeSelector.tsx
│   ├── CompSelector.tsx
│   ├── PreviewCard.tsx
│   └── AgentChat.tsx
└── api/
    ├── storyboard/route.ts    # Generate storyboard
    ├── image/route.ts         # Generate images
    ├── audio/route.ts         # Generate narration
    └── video/route.ts         # Render video
```

### 1.2 Middleware Bypass

**File**: `web/middleware.ts`

Add to bypass list (~line 133):
```typescript
pathname.startsWith('/inspiration') ||
```

**Playwright Test**: Verify route works, not hijacked by Webtoys.

```typescript
// web/test-inspiration-route.mjs
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

// Test 1: Route loads (not redirected)
await page.goto('http://localhost:3000/inspiration');
const title = await page.title();
assert(title.includes('Inspiration'), 'Route should load Inspiration page');

// Test 2: Not Webtoys
const isWebtoys = await page.locator('[data-webtoys]').count();
assert(isWebtoys === 0, 'Should not be Webtoys page');

console.log('✓ Middleware bypass working');
await browser.close();
```

### 1.3 UI Design

**Aesthetic**: Internal tool, clean, functional. Not flashy. Think Linear or Notion.

```
┌─────────────────────────────────────────────────────────────┐
│  ✦ Inspiration                                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  What's the topic?                                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ how acai bowls became all the rage                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Mode                          Style                        │
│  ○ Image                       ○ Illuminated Wellness       │
│  ○ Video (2 scenes)            ○ Paper Cut                  │
│  ● Wall of Text                ○ Tech Dark                  │
│                                                             │
│  [ Generate Comps ]                                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase 2: Wall of Text Mode

### 2.1 Output Format

**What the user sees**: Full-screen scrolling text over a slowly-moving background image, with narrator voice synced to scroll.

```
┌────────────────────────────────────────┐
│                                        │
│    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   │  ← Moving background
│    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   │    (Ken Burns)
│                                        │
│    Remember when breakfast             │  ← Scrolling text
│    was just cereal and toast?          │    (synced to audio)
│                                        │
│    Then Instagram happened,            │
│    and suddenly everyone               │
│    needed their morning meal           │
│    to look like edible art.            │
│                                        │
│    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   │
│                                        │
└────────────────────────────────────────┘
        🔊 Narrator speaking
```

### 2.2 Pipeline Changes

| Step | Current (Video) | Wall of Text |
|------|-----------------|--------------|
| Storyboard | 2 scenes, 2 images | 1 scene, 1 image (mood/atmosphere) |
| Script | Split into parts | Full continuous script |
| Images | 2 scene images | 1 background image |
| Audio | Full narration | Full narration (same) |
| Video | Ken Burns + crossfade | Ken Burns + text scroll overlay |

### 2.3 Text Scroll Implementation

**FFmpeg approach**: Use `drawtext` filter with scrolling y-position.

```bash
ffmpeg -i background.png -i narration.mp3 \
  -filter_complex "
    [0:v]zoompan=z='1.03':d=600:s=1080x1920[bg];
    [bg]drawtext=textfile=script.txt:
      fontsize=60:fontcolor=white:
      x=(w-text_w)/2:
      y=h-t*80:  # Scroll speed synced to audio duration
      font='Arial'
  " \
  -map 0:a output.mp4
```

**Alternative**: HTML/CSS animation rendered to video (more control).

---

## Phase 3: Two-Comp System

### 3.1 Storyboard Changes

Current storyboard output:
```json
{
  "scene1": { "image": "...", "overlay": "...", "narration": "..." },
  "scene2": { "image": "...", "overlay": "...", "narration": "..." }
}
```

New storyboard output (for Wall of Text):
```json
{
  "script": "Full narration text...",
  "compA": {
    "imageDescription": "Vibrant acai bowl in golden morning light...",
    "mood": "warm, inviting, aspirational"
  },
  "compB": {
    "imageDescription": "Overhead shot of cafe with multiple acai bowls...",
    "mood": "social, trendy, FOMO-inducing"
  }
}
```

### 3.2 Comp Selection UI

```
┌─────────────────────────────────────────────────────────────┐
│  Choose your direction                                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────┐    ┌─────────────────────────┐    │
│  │                     │    │                         │    │
│  │   [Preview A]       │    │   [Preview B]           │    │
│  │                     │    │                         │    │
│  │   "warm, inviting"  │    │   "social, trendy"      │    │
│  │                     │    │                         │    │
│  │   [ Select A ]      │    │   [ Select B ]          │    │
│  └─────────────────────┘    └─────────────────────────┘    │
│                                                             │
│  Not quite right?  [ Let's discuss... ]                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 Static Preview Generation

Before full video render, generate quick static previews:
1. Generate image from comp description
2. Composite text overlay (first few lines)
3. Display as preview card

This is fast (~10 sec per image) vs full video render (~30-60 sec).

---

## Phase 4: Agent Mode

### 4.1 Trigger

User clicks "Let's discuss..." button.

### 4.2 Interface

```
┌─────────────────────────────────────────────────────────────┐
│  What would you like to change?                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ I like the warm feeling of A but want it to feel    │   │
│  │ more premium and exclusive, less "Instagram basic"  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [ Generate New Comps ]                                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 Agent Architecture

**Location**: `tryair/agents/creative-director/`

```python
# agent.py - claude-agent-sdk agent

from claude_code_sdk import Claude

agent = Claude(
    tools=[
        "generate_storyboard",   # Call Sonnet for new creative direction
        "generate_image",        # Call GPT Image
        "read_current_comps",    # See what user has already
    ]
)

# Agent receives:
# - Original topic
# - Current comp A and B descriptions
# - User feedback
#
# Agent outputs:
# - Two NEW comp descriptions (C and D)
# - Reasoning for changes
```

### 4.4 Agent Flow

```
User feedback
     │
     ▼
┌─────────────────────────────────────────┐
│  Agent (claude-agent-sdk)               │
│                                         │
│  1. Interpret feedback                  │
│  2. Decide what to change:              │
│     - Script? Image direction? Both?    │
│  3. Generate 2 new directions           │
│  4. Call image generator for each       │
└─────────────────────────────────────────┘
     │
     ▼
Comp C + Comp D previews
     │
     ▼
User now sees A, B, C, D
     │
     ├─→ Select one → Generate video
     │
     └─→ "Start over" → Back to beginning
```

---

## Phase 5: Testing Plan

### 5.1 Playwright Tests

| Test | What it verifies |
|------|------------------|
| `test-middleware.mjs` | `/inspiration` route loads correctly |
| `test-ui-flow.mjs` | Topic → Mode → Style → Generate flow |
| `test-comp-selection.mjs` | Two comps appear, selection works |
| `test-agent-mode.mjs` | "Let's discuss" triggers agent, returns new comps |
| `test-video-render.mjs` | Selected comp generates video |

### 5.2 Manual Testing

- [ ] Mobile responsive layout
- [ ] Video playback works in preview
- [ ] Download button works
- [ ] Error states display correctly

---

## Implementation Order

### Sprint 1: Web Foundation
1. [ ] Create `/inspiration` route structure
2. [ ] Add middleware bypass
3. [ ] **Playwright test**: Route works
4. [ ] Build basic UI (topic, mode, style inputs)
5. [ ] Wire up existing storyboard API
6. [ ] **Playwright test**: Basic flow works

### Sprint 2: Two-Comp System
1. [ ] Update storyboard prompt for 2 creative directions
2. [ ] Generate 2 images in parallel
3. [ ] Build comp selection UI
4. [ ] Static preview generation
5. [ ] **Playwright test**: Two comps appear

### Sprint 3: Wall of Text Mode
1. [ ] Update storyboard for single-image mode
2. [ ] Implement text scroll in FFmpeg
3. [ ] Sync scroll speed to audio duration
4. [ ] **Playwright test**: Wall of text renders

### Sprint 4: Agent Mode
1. [ ] Create agent in `tryair/agents/creative-director/`
2. [ ] Build agent chat UI
3. [ ] Implement feedback → new comps flow
4. [ ] 4-comp selection UI (A/B/C/D)
5. [ ] **Playwright test**: Agent generates new comps

### Sprint 5: Polish
1. [ ] Error handling and loading states
2. [ ] Mobile responsive
3. [ ] Performance optimization
4. [ ] Final Playwright test suite

---

## Files to Create

```
web/
├── middleware.ts                    # ADD bypass for /inspiration
└── app/inspiration/
    ├── page.tsx
    ├── layout.tsx
    ├── components/
    │   ├── TopicInput.tsx
    │   ├── ModeSelector.tsx
    │   ├── StyleSelector.tsx
    │   ├── CompCard.tsx
    │   ├── CompSelector.tsx
    │   ├── AgentChat.tsx
    │   ├── VideoPreview.tsx
    │   └── GenerateButton.tsx
    └── api/
        ├── storyboard/route.ts
        ├── image/route.ts
        ├── audio/route.ts
        ├── video/route.ts
        └── agent/route.ts

tryair/
├── agents/
│   └── creative-director/
│       ├── agent.py
│       └── tools.py
└── lib/
    ├── wall-of-text.ts              # New video mode
    └── storyboard-v2.ts             # Updated for 2 comps

web/
├── test-inspiration-middleware.mjs
├── test-inspiration-flow.mjs
├── test-inspiration-comps.mjs
└── test-inspiration-agent.mjs
```

---

## Open Questions

1. **Text scroll styling**: Use FFmpeg drawtext or render HTML to video?
2. **Agent memory**: Should agent remember previous sessions?
3. **Comp history**: Save all comps or just selected?
4. **Video storage**: Local filesystem or Supabase storage?

---

## Next Step

Set up `PROJECT.md` workflow and begin Sprint 1.
