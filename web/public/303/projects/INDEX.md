# TB-303 Project Index

## Status: PLANNING
Ready to begin implementation.

---

## PROJECT 1: Foundation (PENDING)

Set up directory structure and core infrastructure.

| # | Task | Status | Notes |
|---|------|--------|-------|
| 01 | Directory Setup | PENDING | Create structure, symlink core/ |
| 02 | TB303 Sequencer | PENDING | Pitched sequencer with slide/accent |
| 03 | Bass Voice E1 | PENDING | Simple oscillator + biquad filter |

---

## PROJECT 2: Authentic Sound (PENDING)

Implement the distinctive TB-303 character.

| # | Task | Status | Notes |
|---|------|--------|-------|
| 04 | Diode Ladder Filter | PENDING | 18dB/oct, self-oscillation |
| 05 | Bass Voice E2 | PENDING | Authentic envelope, accent behavior |
| 06 | Slide/Glide | PENDING | Exponential pitch glide |

---

## PROJECT 3: Engine & Integration (PENDING)

Combine voices into working engine.

| # | Task | Status | Notes |
|---|------|--------|-------|
| 07 | TB303Engine | PENDING | Extends SynthEngine, voice management |
| 08 | E1/E2 Switching | PENDING | Per-voice engine toggle |
| 09 | Presets | PENDING | Classic acid patterns |

---

## PROJECT 4: Web UI (PENDING)

Build the user interface.

| # | Task | Status | Notes |
|---|------|--------|-------|
| 10 | HTML Structure | PENDING | Layout, controls, sequencer grid |
| 11 | CSS Styling | PENDING | TB-303 theme, amber accents |
| 12 | Sequencer UI | PENDING | Note/gate/accent/slide per step |
| 13 | Knobs & Controls | PENDING | Reuse TR-909 patterns |
| 14 | Info Modal | PENDING | E1/E2 synthesis descriptions |

---

## PROJECT 5: Polish (PENDING)

Final touches and mobile support.

| # | Task | Status | Notes |
|---|------|--------|-------|
| 15 | Mobile Responsive | PENDING | iPhone-friendly layout |
| 16 | Keyboard Input | PENDING | Play notes via keyboard |
| 17 | WAV Export | PENDING | Render patterns to audio file |
| 18 | Testing & Tuning | PENDING | Sound comparison, bug fixes |

---

## Current Focus
**PROJECT 1: Foundation** — Start with directory setup and basic voice.

## Key Decisions
- **Core reuse**: Symlink to `../909/dist/core/` for SynthEngine, Voice, Output
- **Filter**: Custom diode ladder (not Moog ladder)
- **Default engine**: E2 (authentic) — the squelch is what people want
- **UI theme**: Amber palette matching TR-909, silver panel accents

## File Locations

**Implementation:**
```
web/public/303/
├── index.html                      # Entry point
├── PLAN.md                         # Architecture plan
├── ui/tb303/                       # UI (HTML, CSS)
├── dist/core/ → ../909/dist/core/  # Symlink to shared core
├── dist/machines/tb303/            # TB303 engine and voices
└── projects/                       # This folder
```

**Reference:**
```
synthmachine/
├── PLAN.md                         # Original multi-synth plan
└── reference/                      # Reference implementations
```

## Quick Start for New Session
1. Read this file
2. Check "Current Focus" above
3. Read that project's PROJECT.md
4. Continue from first unchecked task
