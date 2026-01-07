# TR-909 Project Index

## Status: WORKING
The TR-909 is functional and playable. Current work is improving authenticity and adding features.

## Project Progress
| # | Project | Status | Notes |
|---|---------|--------|-------|
| 01 | Kick Overhaul | 4/5 | Needs sound test only |
| 02 | Snare Overhaul | 0/6 | Not started |
| 03 | Shared Noise | 0/4 | Not started |
| 04 | Sample Tune | 0/6 | Not started |
| 05 | Sequencer Features | 0/7 | Not started |
| 06 | UI Polish | 0/10 | Depends on 01-05 |

## Current Focus
Project 01: Test kick sound against real 909 samples, verify punch and character.

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
