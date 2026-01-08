# SH-101 Project Index

## Status: COMPLETE
All 20 projects implemented. SH-101 synthesizer fully functional.

---

## PROJECT 1: Foundation (COMPLETE)

Set up directory structure and core oscillator.

| # | Task | Status | Notes |
|---|------|--------|-------|
| 01 | Directory Setup | COMPLETE | Structure created, core files copied |
| 02 | VCO Oscillator | COMPLETE | Saw + pulse + PWM, octave range |
| 03 | Sub-Oscillator | COMPLETE | -1 oct, -2 oct, 25% pulse modes |

---

## PROJECT 2: Filter & Envelope (COMPLETE)

Implement the distinctive IR3109 filter and full ADSR envelope.

| # | Task | Status | Notes |
|---|------|--------|-------|
| 04 | IR3109 Filter | COMPLETE | 4-pole lowpass with resonance |
| 05 | ADSR Envelope | COMPLETE | Full A/D/S/R with curves |
| 06 | VCA & Modulation | COMPLETE | LFO with 3 waveforms + routing |

---

## PROJECT 3: Engine & Integration (COMPLETE)

Combine into working SH-101 engine.

| # | Task | Status | Notes |
|---|------|--------|-------|
| 07 | SH101Engine | COMPLETE | Full voice management |
| 08 | E1/E2 Switching | COMPLETE | Simple vs authentic toggle |
| 09 | Arpeggiator/Sequencer | COMPLETE | Up/down/up-down + hold |
| 10 | Presets | COMPLETE | 8 classic sounds |

---

## PROJECT 4: Web UI (COMPLETE)

Build the user interface.

| # | Task | Status | Notes |
|---|------|--------|-------|
| 11 | HTML Structure | COMPLETE | Full control panel layout |
| 12 | CSS Styling | COMPLETE | SH-101 gray theme |
| 13 | Sequencer UI | COMPLETE | 16-step grid with indicators |
| 14 | Knobs & Controls | COMPLETE | Drag-to-adjust knobs/sliders |
| 15 | Keyboard & Arpeggio | COMPLETE | 2-octave keyboard + arp controls |
| 16 | Info Modal | COMPLETE | Help documentation |

---

## PROJECT 5: Polish & API (COMPLETE)

Mobile support, API for creative agent, documentation.

| # | Task | Status | Notes |
|---|------|--------|-------|
| 17 | Mobile Responsive | COMPLETE | Responsive CSS breakpoints |
| 18 | API Layer | COMPLETE | SH101Controller + renderToWav |
| 19 | Documentation | COMPLETE | SH101-LIBRARY.md |
| 20 | Testing & Tuning | COMPLETE | Build passes |

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
