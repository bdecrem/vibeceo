# TR-909 Project Index

## Status: WORKING
The TR-909 is functional and playable. All voice overhauls and sequencer features complete.

---

## PROJECT 1: Voice E1/E2 Overhauls (COMPLETE)

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
| 08 | Crash | DONE | E1: noise+bandpass, E2: 6 square oscillators |
| 09 | Ride | DONE | E1: noise+bandpass, E2: 6 square oscillators |

**Current:** COMPLETE

---

## PROJECT 2: Features (COMPLETE)

| # | Project | Status | Notes |
|---|---------|--------|-------|
| 10 | Shared Noise | 4/4 | Already implemented (snare/clap share buffer) |
| 11 | Sample Tune | 6/6 | Tune inherited from SampleVoice, removed from rimshot |
| 12 | Sequencer Features | 7/7 | Pattern length, scale modes, BPM 37-290, global accent |
| 13 | UI Polish | 13/13 | Info icons, per-voice defaults, engine toggle colors |

---

## Current Focus
**All projects complete!** TR-909 is fully functional with E1/E2 engines, sample support, and polished UI.

## Key Decisions
- **Foundation**: Pure Web Audio API (no Tone.js) for maximum control
- **Hi-hats/Cymbals**: Use samples, not synthesis (authentic to original 909)
- **Snare/Clap**: Share noise source (authentic phasing effect)
- **Reference code**: ds909 (Teensy C++) downloaded to synthmachine/reference/
- **Rimshot**: Removed tune parameter (original 909 only had Level)
- **Scale modes**: 16th, 8th-triplet, 16th-triplet, 32nd for different feels

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
