# TB-303 Bassline Synthesizer: Implementation Plan

## Overview

Build a faithful Roland TB-303 bass synthesizer with:
1. **Engine** - Accurate monophonic synth with the iconic acid filter
2. **Web UI** - Interface matching the real hardware aesthetic
3. **API** - Programmatic access for music production

Leverages the **existing TR-909 infrastructure** (core classes, UI patterns, responsive design).

---

## The TB-303: What Makes It Special

The TB-303 (Transistor Bass) was designed as a bass accompaniment machine but became the defining sound of acid house. Its distinctive "squelchy" character comes from:

1. **Simple VCO** - Sawtooth or square wave (one at a time)
2. **Diode Ladder Filter** - 4-pole (24dB/oct) lowpass with aggressive resonance
3. **Envelope** - Unique decay-only shape that modulates both VCA and VCF
4. **Accent** - Boosts volume AND increases filter modulation intensity
5. **Slide** - Glides between notes (portamento)
6. **Sequencer** - 16 steps with per-step accent, slide, and octave transpose

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Location** | `web/public/303/` | Parallel to 909, same deployment |
| **Core reuse** | `../909/dist/core/*` | SynthEngine, Voice, OutputManager |
| **Filter** | Custom diode ladder | TB-303 filter differs from Moog ladder |
| **UI** | Amber theme + 303 aesthetic | Silver/gray panel, orange accents |
| **Sequencer** | Extended StepSequencer | Add pitch, slide, accent per step |

---

## Reference Projects (from synth_library_catalog)

| Project | Stars | Use Case |
|---------|-------|----------|
| **Open303** | - | TB-303 specific emulation reference |
| **Roland50.studio** | - | Official Roland web recreation |
| **MoogLadders** | 371 | Filter algorithm reference |
| **Aciduino** | 295 | TB-303 sequencer behavior |
| **webaudioworklet-wasm** | 21 | WASM filter for performance |

---

## TB-303 Parameters (Authentic Ranges)

### Synth Voice
| Parameter | Range | Description |
|-----------|-------|-------------|
| **Waveform** | Saw / Square | Single oscillator, switchable |
| **Tuning** | ±1 octave | Master pitch adjustment |
| **Cutoff** | 0-100% | Filter cutoff frequency |
| **Resonance** | 0-100% | Filter resonance (self-oscillates at max) |
| **Env Mod** | 0-100% | Envelope → filter modulation depth |
| **Decay** | 0-100% | Envelope decay time |
| **Accent** | 0-100% | Accent intensity (global) |

### Per-Step Sequencer
| Parameter | Values | Description |
|-----------|--------|-------------|
| **Note** | C0-C3 | Pitch (limited range like original) |
| **Gate** | On/Off | Note plays or rest |
| **Accent** | On/Off | Boost this step |
| **Slide** | On/Off | Glide to next note |
| **Octave** | -1/0/+1 | Transpose this step |

---

## E1/E2 Voice Architecture

Following the TR-909 pattern, we implement two synthesis engines:

### E1 — Simple (Default for quick use)
- Standard Web Audio oscillator (saw/square)
- Biquad lowpass filter
- Simple ASR envelope
- Basic accent (volume boost only)
- Linear slide

### E2 — Authentic (Circuit-accurate)
- Band-limited oscillator with aliasing control
- Diode ladder filter emulation (4-pole, 18dB/oct like real 303)
- Accurate envelope curves (fast attack, variable decay)
- Accent affects both VCA AND filter envelope depth
- Exponential slide curves
- Filter self-oscillation at high resonance

### Voice Info (for info modal)
```javascript
const VOICE_INFO = {
  bass: {
    e1: 'Standard oscillator with biquad lowpass filter. Clean, predictable.',
    e2: 'Diode ladder filter with 18dB/oct slope. Accent modulates both VCA and VCF. Authentic squelch.',
  }
};
```

### Default Engine
- **Bass**: E2 (the authentic sound is what people want from a 303)

---

## Directory Structure

```
web/public/303/
├── index.html                      # Entry point (redirects to ui/tb303/)
├── PLAN.md                         # This file
├── ui/tb303/
│   ├── index.html                  # Web app
│   └── styles.css                  # TB-303 themed styles
├── dist/
│   ├── core/ → symlink to ../909/dist/core/  # Reuse TR-909 core
│   ├── machines/tb303/
│   │   ├── engine.js               # TB303Engine extends SynthEngine
│   │   ├── voices/
│   │   │   ├── bass.js             # E2: Authentic diode ladder
│   │   │   └── bass-e1.js          # E1: Simple biquad
│   │   ├── sequencer.js            # TB303Sequencer (pitched)
│   │   ├── filter/
│   │   │   └── diode-ladder.js     # Diode ladder filter implementation
│   │   └── presets.js              # Classic acid patterns
│   └── ui/tb303/
│       └── app.js                  # UI logic
└── projects/                       # Project tracking
    ├── INDEX.md
    └── 01-*/PROJECT.md, etc.
```

---

## What We Reuse from TR-909

### Direct Reuse (symlink or import)
- `core/engine.js` - SynthEngine base class
- `core/voice.js` - Voice base class
- `core/output.js` - OutputManager for WAV export
- `core/types.js` - Shared types

### Pattern Reuse (copy and adapt)
- `core/sequencer.js` → Extend for pitched sequencer
- UI CSS variables and responsive design patterns
- Info modal component
- Knob/slider interaction patterns

### New Implementation Required
- Diode ladder filter (different from any TR-909 filter)
- Pitched sequencer with slide/accent
- VCO with waveform switching
- Envelope with filter modulation

---

## UI Design

### Visual Language (borrowed from TR-909)
- Dark panel background
- Amber accent colors
- Monospace fonts for values
- Knobs with rotation indicators
- Mobile-first responsive grid

### TB-303 Specific Elements
- Waveform switch (saw/square toggle)
- Pitch display (note name)
- Slide indicator on sequencer steps
- Accent indicator on sequencer steps
- Keyboard or note input for pitch entry

### Layout Concept
```
┌─────────────────────────────────────────────────────────────┐
│  TB-303  BASSLINE                              [E1/E2] [i]  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [SAW|SQR]   [TUNE]   [CUTOFF]   [RESO]   [ENVMOD]   [DECAY] │
│   Waveform                                                   │
│                                                              │
│  [ACCENT]    [BPM ___]    [PLAY/STOP]                       │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Note:  C2   D2   E2   F2   G2   A2   B2   C3   ...        │
│  Gate:  [●]  [●]  [○]  [●]  [●]  [○]  [●]  [●]  ...        │
│  Accent:[▲]  [○]  [○]  [▲]  [○]  [○]  [○]  [▲]  ...        │
│  Slide: [/]  [○]  [○]  [○]  [/]  [○]  [○]  [○]  ...        │
│                                                              │
│         1    2    3    4    5    6    7    8    ...         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Foundation
1. Set up directory structure
2. Create symlinks to core/ from 909
3. Implement TB303Sequencer (pitched, with slide/accent)
4. Basic E1 voice (oscillator + biquad filter)

### Phase 2: Authentic Sound
5. Implement diode ladder filter
6. Create E2 voice with authentic envelope
7. Accent behavior (VCA + VCF modulation)
8. Slide/glide implementation

### Phase 3: Engine Integration
9. TB303Engine class
10. Pattern storage and presets
11. E1/E2 switching
12. Parameter descriptors

### Phase 4: Web UI
13. HTML structure
14. CSS styling (TB-303 theme)
15. Sequencer grid UI
16. Knob controls
17. Info modal

### Phase 5: Polish
18. Presets (classic acid patterns)
19. Mobile responsive
20. Keyboard input
21. WAV export

---

## Success Criteria

1. **Sound Accuracy** - Recognizable acid bassline character
2. **E1/E2 Toggle** - Clear difference between simple and authentic
3. **Slide/Accent** - Working per-step controls
4. **UI Parity** - Same quality as TR-909 interface
5. **Mobile** - Fully functional on iPhone
6. **Export** - Can render patterns to WAV

---

## Technical Notes

### Diode Ladder Filter
The TB-303 uses a diode ladder filter, not the transistor ladder of a Moog. Key differences:
- Slightly lower slope (~18dB/oct vs 24dB/oct)
- Different saturation character
- Unique resonance behavior near self-oscillation

Reference: Open303 source code, various DSP papers on 303 emulation.

### Slide Implementation
Slide (glide/portamento) in the 303:
- Only occurs when slide is ON for the current step
- Glide time is fixed (~60ms)
- Pitch slides exponentially, not linearly
- Gate stays open through the slide

### Accent Implementation
Accent in the 303:
- Increases VCA level by ~10dB
- Increases envelope modulation depth
- Shortens decay time slightly
- Creates the characteristic "spike" in the sound

---

## Next Steps

1. Create project INDEX.md and individual PROJECT.md files
2. Begin with Phase 1: Foundation
3. Test with simple patterns before adding complexity
