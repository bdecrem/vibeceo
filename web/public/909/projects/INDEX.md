# TR-909 Project Index

## Status: WORKING
The TR-909 is functional and playable. Current work is improving authenticity and adding features.

---

## PROJECT 1: Voice E1/E2 Overhauls (TODAY)

Each voice gets E1 (original) and E2 (research-based authentic) versions.
**Commit after each voice is complete.**

| # | Voice | Status | Notes |
|---|-------|--------|-------|
| 01 | Kick | DONE | E1: sine+softclip, E2: triangle+waveshaper |
| 02 | Snare | DONE | E1: single tri, E2: dual sine (180+330Hz) |
| 03 | Clap | DONE | E1: simple 4-burst, E2: 4-burst + reverb tail |
| 04 | Rimshot | DONE | E1: single square, E2: 3 bridged-T filters + noise |
| 05 | Toms (L/M/H) | DONE | E1: single sine, E2: 3 osc ratios (1:1.5:2.77) |
| 06 | Closed Hat | DONE | E1: noise+highpass, E2: 6 square oscillators |
| 07 | Open Hat | DONE | E1: noise+highpass, E2: 6 square oscillators |
| 08 | Crash | TODO | Research needed |
| 09 | Ride | TODO | Research needed |

**Current:** 08-Crash

---

## PROJECT 2: Features (TOMORROW)

| # | Project | Status | Notes |
|---|---------|--------|-------|
| 10 | Shared Noise | 0/4 | Snare/clap phasing effect |
| 11 | Sample Tune | 0/6 | Hi-hat/cymbal tune knobs |
| 12 | Sequencer Features | 0/7 | Pattern length, scale modes, tempo range |
| 13 | UI Polish | 0/10 | Final cleanup, depends on above |

---

## Current Focus
**Project 1, Voice 08: Crash E2** - research and implement.

## Key Decisions
- **Foundation**: Pure Web Audio API (no Tone.js) for maximum control
- **Hi-hats/Cymbals**: Use samples, not synthesis (authentic to original 909)
- **Snare/Clap**: Share noise source (authentic phasing effect)
- **Reference code**: ds909 (Teensy C++) downloaded to synthmachine/reference/

## File Locations

**Live Implementation:**
```
web/public/909/
├── index.html                      # Entry point
├── ui/tr909/                       # UI (HTML, CSS)
├── dist/core/                      # Engine, sequencer, voice base classes
├── dist/machines/tr909/voices/     # Individual drum voices (kick.js, snare.js, etc.)
├── dist/machines/tr909/engine.js   # TR909Engine
├── dist/api/                       # Programmatic API
└── projects/                       # This folder - project tracking
```

**Planning & Reference:**
```
synthmachine/
├── PLAN.md                         # Original architecture plan
├── STATUS.md                       # Implementation status notes
├── reference/ds909/                # Teensy 909 synth (C++ reference)
└── reference/ntr-808/              # 808 schematic-based synth
```

## Knowledge Base
Supabase table `synth_library_catalog` contains research on:
- Web Audio synth libraries (stars, npm downloads, features)
- Drum machine emulations (808, 909, DMX, etc.)
- Filter implementations, effects, utilities

Query: `SELECT * FROM synth_library_catalog WHERE category = 'drum_machine'`

## Quick Start for New Session
1. Read this file
2. Check "Current Focus" above
3. Read that project's PROJECT.md
4. Continue from first unchecked task
