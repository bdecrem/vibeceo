# SH-101 Project Index

## Status: NOT STARTED
Beginning implementation of Roland SH-101 monophonic synthesizer.

---

## PROJECT 1: Foundation (NOT STARTED)

Set up directory structure and core oscillator.

| # | Task | Status | Notes |
|---|------|--------|-------|
| 01 | Directory Setup | NOT STARTED | Create structure, copy core files |
| 02 | VCO Oscillator | NOT STARTED | CEM3340-style: saw + pulse + PWM |
| 03 | Sub-Oscillator | NOT STARTED | CD4013-style: -1 oct, -2 oct, 25% pulse |

---

## PROJECT 2: Filter & Envelope (NOT STARTED)

Implement the distinctive IR3109 filter and full ADSR envelope.

| # | Task | Status | Notes |
|---|------|--------|-------|
| 04 | IR3109 Filter | NOT STARTED | Roland-style 24dB/oct lowpass |
| 05 | ADSR Envelope | NOT STARTED | Full attack/decay/sustain/release |
| 06 | VCA & Modulation | NOT STARTED | Filter env amount, LFO routing |

---

## PROJECT 3: Engine & Integration (NOT STARTED)

Combine into working SH-101 engine.

| # | Task | Status | Notes |
|---|------|--------|-------|
| 07 | SH101Engine | NOT STARTED | Extends SynthEngine, voice management |
| 08 | E1/E2 Switching | NOT STARTED | Simple vs authentic toggle |
| 09 | Arpeggiator/Sequencer | NOT STARTED | Up/down/up-down modes + hold |
| 10 | Presets | NOT STARTED | Classic SH-101 sounds |

---

## PROJECT 4: Web UI (NOT STARTED)

Build the user interface.

| # | Task | Status | Notes |
|---|------|--------|-------|
| 11 | HTML Structure | NOT STARTED | Layout, controls, keyboard |
| 12 | CSS Styling | NOT STARTED | SH-101 theme (gray body, colored buttons) |
| 13 | Sequencer UI | NOT STARTED | Pattern editor with arp display |
| 14 | Knobs & Controls | NOT STARTED | Drag-to-adjust knobs |
| 15 | Keyboard & Arpeggio | NOT STARTED | On-screen keyboard + arp controls |
| 16 | Info Modal | NOT STARTED | E1/E2 synthesis descriptions |

---

## PROJECT 5: Polish & API (NOT STARTED)

Mobile support, API for creative agent, documentation.

| # | Task | Status | Notes |
|---|------|--------|-------|
| 17 | Mobile Responsive | NOT STARTED | iPhone-friendly layout |
| 18 | API Layer | NOT STARTED | SH101Controller, renderToWav |
| 19 | Documentation | NOT STARTED | SH101-LIBRARY.md (full API docs) |
| 20 | Testing & Tuning | NOT STARTED | All features functional, tuned |

---

## Implementation Summary

**Based on Roland SH-101 architecture:**
- Single VCO (CEM3340-style): Sawtooth + Pulse with PWM
- Sub-oscillator: -1 octave square, -2 octave square, -2 octave 25% pulse
- IR3109 filter: 24dB/oct lowpass with resonance (Juno/Jupiter family)
- Full ADSR envelope for VCA
- Filter envelope with amount control
- LFO with rate and multiple destinations (pitch, filter, PWM)
- Arpeggiator: Up, Down, Up-Down modes
- 100-step sequencer (simplified to 16-step for web)

**Reusing from 909/303:**
- `dist/core/engine.js` — Base SynthEngine class
- `dist/core/voice.js` — Base Voice class
- `dist/core/output.js` — WAV rendering
- UI patterns: knob controls, mobile responsive design
- API patterns: Controller class + render functions
- Middleware pattern for routing

**Key Differences from TB-303:**
- Full ADSR (not just decay envelope)
- Sub-oscillator (not just single osc)
- LFO modulation destinations
- Arpeggiator (303 only has sequencer)
- More complex modulation routing

## File Locations

**Implementation:**
```
web/public/101/
├── index.html                      # Entry point (redirect)
├── ui/sh101/                       # UI (HTML, CSS, JS)
├── dist/core/                      # Engine, voice base classes (copy from 303)
├── dist/machines/sh101/            # SH-101 specific
│   ├── engine.js                   # SH101Engine
│   ├── sequencer.js                # Arpeggiator/sequencer
│   ├── presets.js                  # Preset sounds
│   ├── filter/
│   │   └── ir3109.js               # IR3109 filter emulation
│   └── voices/
│       ├── synth-e1.js             # E1 simple voice
│       └── synth-e2.js             # E2 authentic voice
├── dist/api/
│   └── index.js                    # API for creative agent
└── projects/                       # This folder - project tracking
```

## Knowledge Base

**SH-101 Research:**
- VCO: CEM3340 chip (sawtooth + pulse)
- Sub-oscillator: CD4013 dual flip-flop circuit
- Filter: IR3109 (same family as Juno-60, Jupiter-8)
- Full ADSR for VCA, separate envelope for filter

**Sources:**
- Electric Druid: https://electricdruid.net/category/vintage-synths/roland/sh-101/
- Roland articles on SH-101 sound design

## Quick Start for New Session

1. Read this file
2. Check "Current Focus" above
3. Read that project's PROJECT.md
4. Continue from first unchecked task
5. Commit after each project phase complete
