# Mixer Project Index

## Status: COMPLETE
Session + Effects system for multi-track mixing with sidechain, EQ, and reverb.

---

## PROJECT 1: Foundation (COMPLETE)

Set up directory structure and core infrastructure.

| # | Task | Status | Notes |
|---|------|--------|-------|
| 01 | Directory Setup | COMPLETE | Structure, base class, test page |

---

## PROJECT 2: Effects (COMPLETE)

Build the three core effects.

| # | Task | Status | Notes |
|---|------|--------|-------|
| 02 | Ducker Effect | COMPLETE | Sidechain gain automation |
| 03 | EQ Effect | COMPLETE | BiquadFilter chain + presets |
| 04 | Reverb Effect | COMPLETE | ConvolverNode + synthetic IRs |

---

## PROJECT 3: Integration (COMPLETE)

Session class that ties everything together.

| # | Task | Status | Notes |
|---|------|--------|-------|
| 05 | Session Class | COMPLETE | Orchestration + combined render |
| 06 | Documentation | COMPLETE | SYNTHMACHINE-GUIDE.md + mixer/README.md |

---

## Current Focus
All projects complete.

## Key Decisions

1. **Thin abstraction** — Session wraps existing synth controllers, doesn't replace them
2. **No new instrument wrappers** — TR909Controller, TB303Controller, SH101Controller used directly
3. **Effect base class** — All effects implement `input`/`output` AudioNodes + `setParameter()`
4. **Musical presets** — EQ presets like 'acidBass', 'master' instead of raw frequencies
5. **Short impulse responses** — Reverb IRs < 1 second for iPhone/Twitter performance

## File Locations

**Target structure:**
```
web/public/mixer/
├── dist/
│   ├── session.js              # Session class - main orchestration
│   └── effects/
│       ├── base.js             # Effect base class
│       ├── ducker.js           # Sidechain gain automation
│       ├── eq.js               # BiquadFilter chain + presets
│       └── reverb.js           # ConvolverNode + presets
├── impulses/                   # Reverb impulse responses
│   ├── plate.wav               # Short plate reverb (<1s)
│   └── room.wav                # Small room (<1s)
├── projects/                   # This folder
└── README.md                   # Module documentation
```

**Related files:**
- `sms-bot/documentation/SYNTHMACHINE-GUIDE.md` — Will add Mixer section
- `web/public/909/dist/api/index.js` — TR909Controller
- `web/public/303/dist/api/index.js` — TB303Controller
- `web/public/101/dist/api/index.js` — SH101Controller

## API Design

**Usage pattern for Amber:**
```javascript
import { Session } from '/mixer/dist/session.js';
import { TR909Controller } from '/909/dist/api/index.js';
import { TB303Controller } from '/303/dist/api/index.js';

const session = new Session({ bpm: 128 });

// Add existing controllers (no wrapping)
session.add('drums', new TR909Controller());
session.add('bass', new TB303Controller());

// Effects on channels
session.channel('bass').duck({ trigger: 'drums.kick', amount: 0.6 });
session.channel('bass').eq({ preset: 'acidBass' });

// Master effects
session.master.eq({ preset: 'master' });
session.master.reverb({ preset: 'plate', mix: 0.15 });

// Combined render
const { wav } = await session.render({ bars: 8 });
```

## Effect Presets

**EQ Presets:**
| Preset | Description | Settings |
|--------|-------------|----------|
| `acidBass` | Cuts mud, adds bite | HP 60Hz, +3dB @ 800Hz, -2dB @ 6kHz |
| `crispHats` | Clean highs | HP 200Hz, +2dB @ 5kHz |
| `warmPad` | Smooth highs | LP 8kHz, +2dB @ 200Hz |
| `master` | Gentle polish | HP 30Hz, +1dB @ 12kHz |

**Reverb Presets:**
| Preset | IR File | Character |
|--------|---------|-----------|
| `plate` | plate.wav | Bright, tight, sits behind mix |
| `room` | room.wav | Natural small space |

**Ducker Presets:**
| Preset | Attack | Release | Description |
|--------|--------|---------|-------------|
| `tight` | 5ms | 100ms | Punchy, transparent |
| `pump` | 10ms | 250ms | Audible pumping effect |

## Quick Start for New Session

1. Read this file
2. Check "Current Focus" above
3. Read that project's PROJECT.md
4. Continue from first unchecked task
5. Commit after each task complete
