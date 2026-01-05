# SynthMachine: TR-909 Implementation Plan

## Overview

Build a faithful TR-909 drum machine with:
1. **Engine** - Accurate sound synthesis + sequencer logic
2. **Web UI** - Photorealistic interface matching the real hardware
3. **API/CLI** - Programmatic access for Amber's music production

Architecture designed for **reusability** - same patterns will power TR-808, Moog Sub37, etc.

## Key Decisions

- **Location**: `vibeceo/synthmachine/` (top-level, accessible from sms-bot + web)
- **Samples**: Source authentic 909 samples (Creative Commons) for cymbals/hats
- **Priority**: Sound accuracy first, then UI polish
- **Stack**: TypeScript + Tone.js foundation

---

## Directory Structure

```
synthmachine/
├── core/                      # Shared synth engine infrastructure
│   ├── engine.ts              # Base SynthEngine class
│   ├── voice.ts               # Base Voice class (oscillator + filter + envelope)
│   ├── sequencer.ts           # Step sequencer with pattern chaining
│   ├── noise.ts               # LFSR noise generator (31-stage like 909)
│   ├── filters/               # Filter implementations
│   │   ├── ladder.ts          # Moog-style ladder filter
│   │   ├── svf.ts             # State variable filter
│   │   └── biquad.ts          # Standard biquad wrapper
│   ├── output.ts              # Audio output (Web Audio + WAV export)
│   └── types.ts               # Shared TypeScript types
│
├── machines/                  # Individual synth implementations
│   └── tr909/
│       ├── engine.ts          # TR909Engine extends SynthEngine
│       ├── voices/            # Individual drum voices
│       │   ├── kick.ts        # Analog kick (tune, decay, attack)
│       │   ├── snare.ts       # Analog snare (tune, tone, snappy)
│       │   ├── clap.ts        # Analog clap (shared noise with snare)
│       │   ├── tom.ts         # Low/Mid/Hi tom (tune, decay)
│       │   ├── rimshot.ts     # Analog rim
│       │   ├── hihat.ts       # 6-bit sampled (closed/open)
│       │   └── cymbal.ts      # 6-bit sampled (crash/ride)
│       ├── sequencer.ts       # 909-specific sequencer (16 steps, accents)
│       ├── presets.ts         # Factory patterns
│       └── samples/           # 6-bit cymbal samples (18kHz)
│           ├── ch.wav         # Closed hi-hat
│           ├── oh.wav         # Open hi-hat
│           ├── crash.wav      # Crash cymbal
│           └── ride.wav       # Ride cymbal
│
├── ui/                        # Web interfaces
│   └── tr909/
│       ├── index.html         # Standalone TR-909 web app
│       ├── app.tsx            # React UI component
│       ├── styles.css         # Hardware-accurate styling
│       └── assets/            # Knob images, panel textures
│
├── api/                       # Programmatic interface
│   ├── index.ts               # Main API exports
│   ├── cli.ts                 # Command-line interface
│   └── amber-tools.py         # Python bindings for Amber agent
│
└── package.json               # Dependencies: tone, @types/tone
```

---

## Technology Stack

### Core Dependencies (from synth_library_catalog)

| Component | Library | Stars | Why |
|-----------|---------|-------|-----|
| **Foundation** | Tone.js | 14.6k | Industry standard, TypeScript, transport/scheduling |
| **Ladder Filter** | webaudioworklet-wasm | 21 | WASM Moog filter for authentic sound |
| **Effects** | Tuna.js | 1.8k | Reverb, delay, compression |
| **Export** | audiobuffer-to-wav | - | WAV file generation |

### Dev Stack
- TypeScript for type safety
- React for UI (CDN, no build step for standalone)
- Vite for development (optional)

---

## Phase 1: Core Engine (Reusable)

### 1.1 Base Classes

```typescript
// core/engine.ts
abstract class SynthEngine {
  protected audioContext: AudioContext;
  protected masterGain: GainNode;
  protected compressor: DynamicsCompressorNode;
  protected analyser: AnalyserNode;

  abstract start(): void;
  abstract stop(): void;
  abstract trigger(voice: string, time?: number, velocity?: number): void;

  // For WAV export
  abstract renderToBuffer(duration: number): Promise<AudioBuffer>;
}

// core/voice.ts
abstract class Voice {
  abstract trigger(time: number, velocity: number): void;
  abstract setParameter(param: string, value: number): void;
  abstract connect(destination: AudioNode): void;
}

// core/sequencer.ts
class StepSequencer {
  steps: number = 16;
  patterns: Map<string, Pattern>;
  currentStep: number = 0;
  bpm: number = 120;

  onStep?: (step: number, triggers: Trigger[]) => void;

  start(): void;
  stop(): void;
  setPattern(name: string, pattern: Pattern): void;
  chainPatterns(names: string[]): void;
}
```

### 1.2 Noise Generator (Critical for 909 authenticity)

```typescript
// core/noise.ts - 31-stage LFSR like real TR-909
class LFSRNoise {
  private register: number = 0x7FFFFFFF; // 31 bits
  private sampleRate: number;

  generateBuffer(duration: number): AudioBuffer;
  getNoiseNode(): AudioBufferSourceNode;
}
```

### 1.3 Output Manager

```typescript
// core/output.ts
class OutputManager {
  // Web Audio playback
  connectToDestination(): void;

  // WAV/MP3 export
  async exportWAV(buffer: AudioBuffer): Promise<Blob>;
  async exportMP3(buffer: AudioBuffer): Promise<Blob>;

  // Offline rendering
  async renderOffline(engine: SynthEngine, duration: number): Promise<AudioBuffer>;
}
```

---

## Phase 2: TR-909 Voices

### 2.1 Analog Voices (Synthesized)

**Kick Drum** - The signature 909 punch
```typescript
class Kick909 extends Voice {
  // Parameters (real 909 ranges)
  tune: number;    // -50 to +50 cents
  decay: number;   // 50ms to 2000ms
  attack: number;  // Click intensity 0-100%
  level: number;   // 0-100%

  trigger(time, velocity) {
    // Main body: sine 160Hz → 30Hz exponential sweep
    // Sub layer: sine 50Hz → 35Hz for weight
    // Attack click: noise burst filtered
  }
}
```

**Snare Drum** - Shares noise with clap (creates phasing)
```typescript
class Snare909 extends Voice {
  tune: number;    // Pitch
  tone: number;    // Body vs brightness
  snappy: number;  // Snare wire amount
  level: number;

  private sharedNoise: LFSRNoise; // Injected, shared with Clap
}
```

**Hand Clap** - Same noise source as snare
```typescript
class Clap909 extends Voice {
  level: number;
  private sharedNoise: LFSRNoise; // Same instance as Snare

  trigger(time, velocity) {
    // Multiple noise bursts (4-5) with slight delays
    // Creates the "clap" layered sound
  }
}
```

**Toms** (Low, Mid, Hi)
```typescript
class Tom909 extends Voice {
  tune: number;
  decay: number;
  level: number;

  constructor(type: 'low' | 'mid' | 'hi') {
    // Base frequencies: low=100Hz, mid=167Hz, hi=222Hz
  }
}
```

**Rim Shot**
```typescript
class Rimshot909 extends Voice {
  level: number;
  // High-frequency noise burst + resonant filter
}
```

### 2.2 Sampled Voices (6-bit PCM)

**Hi-Hats & Cymbals** - The distinctive 909 crunch
```typescript
class SampledVoice extends Voice {
  private buffer: AudioBuffer; // 6-bit, 18kHz sample
  tune: number;  // Playback rate adjustment
  level: number;

  static async loadSamples(): Promise<Map<string, AudioBuffer>>;
}

class HiHat909 extends SampledVoice {
  constructor(type: 'closed' | 'open');
}

class Cymbal909 extends SampledVoice {
  constructor(type: 'crash' | 'ride');
}
```

---

## Phase 3: TR-909 Sequencer

```typescript
class Sequencer909 extends StepSequencer {
  // 909-specific features
  accentA: boolean[]; // Total accent per step
  accentB: Map<string, boolean[]>; // Per-voice accent

  // Pattern structure
  patterns: Pattern909[]; // A1-A8, B1-B8, etc.
  currentBank: 'A' | 'B';

  // Dynamics (3-level per step)
  dynamics: ('off' | 'soft' | 'hard')[][];

  // Controls
  shuffle: number; // 0-100%
  flam: number;    // 0-100ms

  // Song mode
  chainPatterns(ids: string[]): void;
  savePattern(id: string): void;
  loadPattern(id: string): void;
}
```

---

## Phase 4: Web UI

### 4.1 Layout (Matches Real Hardware)

```
┌─────────────────────────────────────────────────────────────────────┐
│  ROLAND  TR-909  RHYTHM COMPOSER                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  [LEVEL] [TUNE] [DECAY] [ATTACK]    [TONE] [SNAPPY]    [LEVEL]     │
│    BASS DRUM                           SNARE            RIM SHOT    │
│                                                                      │
│  [LEVEL] [TUNE]  [LEVEL] [TUNE]  [LEVEL] [TUNE]       [LEVEL]      │
│   CLOSED HI-HAT   OPEN HI-HAT      CRASH              HAND CLAP    │
│                                                                      │
│  [LEVEL] [TUNE] [DECAY]  [LEVEL] [TUNE] [DECAY]  [LEVEL] [TUNE]    │
│       LOW TOM           MID TOM           HI TOM        RIDE       │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  [1] [2] [3] [4] [5] [6] [7] [8] [9] [10] [11] [12] [13] [14] [15] [16] │
│                    STEP BUTTONS (with LEDs)                          │
│                                                                      │
│  [TEMPO ●───────○]   [START/STOP]   [TAP]   [CLEAR]                │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 Styling
- Dark gray metal panel texture
- Orange/red LEDs for steps
- Silver rotary knobs with position indicators
- Silk-screened labels (white/yellow text)
- Amber-palette accents for consistency with intheamber.com

### 4.3 Interaction
- Click knobs + drag to adjust
- Click step buttons to toggle (soft → hard → off)
- Click instrument row to select for editing
- Keyboard shortcuts: Space=play/stop, 1-9=trigger sounds

---

## Phase 5: API & CLI

### 5.1 Programmatic API

```typescript
// api/index.ts
export class TR909 {
  constructor(options?: { sampleRate?: number });

  // Sound triggering
  trigger(voice: Voice909, velocity?: number): void;
  triggerAt(voice: Voice909, time: number, velocity?: number): void;

  // Parameter control
  setParameter(voice: Voice909, param: string, value: number): void;

  // Sequencer
  setPattern(pattern: PatternData): void;
  play(): void;
  stop(): void;
  setBPM(bpm: number): void;

  // Export
  async renderPattern(bars: number): Promise<AudioBuffer>;
  async exportWAV(bars: number, filename: string): Promise<void>;

  // Connect to Web Audio graph
  connect(destination: AudioNode): void;
}

// Usage in Amber's tracks:
const tr909 = new TR909();
tr909.setBPM(128);
tr909.setPattern({
  kick: [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
  snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
  closedHat: [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1],
});
tr909.connect(audioContext.destination);
tr909.play();
```

### 5.2 CLI

```bash
# Play pattern
synthmachine tr909 play --bpm 128 --pattern techno-basic

# Export to WAV
synthmachine tr909 export --bars 4 --output beat.wav

# Interactive mode
synthmachine tr909 interactive
```

### 5.3 Amber Python Bindings

```python
# api/amber-tools.py
def create_909_pattern(bpm: int, pattern: dict) -> str:
    """Create TR-909 pattern, returns URL to generated audio"""

def trigger_909(voice: str, velocity: float = 1.0):
    """Trigger single 909 voice"""
```

---

## Phase 6: Reusability for Future Synths

### Shared Components (use for TR-808, Moog, etc.)

| Component | Reusable? | Notes |
|-----------|-----------|-------|
| `SynthEngine` base class | ✅ | All synths extend this |
| `StepSequencer` | ✅ | 808, 909, drum machines |
| `Voice` base class | ✅ | All voices extend this |
| `LFSRNoise` | ✅ | 808 also uses this |
| `OutputManager` | ✅ | WAV export for all |
| `LadderFilter` | ✅ | Moog, 303, many synths |
| UI component library | ✅ | Knobs, sliders, LEDs |

### Next Synth: TR-808

After TR-909, the TR-808 would:
1. Reuse `core/*` entirely
2. Add `machines/tr808/` with different voice implementations
3. All-analog (no samples) - different from 909
4. Add cowbell, clave, maracas, congas (not in 909)

### Next Synth: Moog Sub37

1. Reuse `core/*` + `LadderFilter`
2. Add `machines/moog-sub37/` with:
   - Dual oscillators with waveform morphing
   - Arpeggiator/sequencer
   - Modulation matrix

---

## Implementation Order

### Week 1: Foundation
1. [ ] Create `synthmachine/` directory structure
2. [ ] Implement `core/engine.ts`, `core/voice.ts`, `core/types.ts`
3. [ ] Implement `core/noise.ts` (LFSR)
4. [ ] Implement `core/sequencer.ts`

### Week 2: TR-909 Voices
5. [ ] Kick drum voice (most important)
6. [ ] Snare + Clap (shared noise)
7. [ ] Toms (low, mid, hi)
8. [ ] Rimshot
9. [ ] Load/create 6-bit cymbal samples
10. [ ] Hi-hats + Cymbals (sampled voices)

### Week 3: Integration
11. [ ] TR909Engine class combining all voices
12. [ ] Sequencer909 with patterns, accents
13. [ ] Basic API (`trigger`, `setPattern`, `play`)
14. [ ] WAV export via OutputManager

### Week 4: UI
15. [ ] Static HTML/CSS layout matching hardware
16. [ ] React integration for knobs/buttons
17. [ ] Wire UI to engine
18. [ ] Step sequencer visualization

### Week 5: Polish
19. [ ] Presets (classic techno patterns)
20. [ ] CLI tool
21. [ ] Amber Python bindings
22. [ ] Documentation

---

## Critical Files to Create

1. `synthmachine/core/engine.ts` - Base synth engine
2. `synthmachine/core/sequencer.ts` - Step sequencer
3. `synthmachine/core/noise.ts` - LFSR noise generator
4. `synthmachine/machines/tr909/engine.ts` - TR-909 main class
5. `synthmachine/machines/tr909/voices/kick.ts` - Kick synthesis
6. `synthmachine/machines/tr909/voices/snare.ts` - Snare synthesis
7. `synthmachine/ui/tr909/index.html` - Web UI entry point
8. `synthmachine/api/index.ts` - Programmatic API

---

## Success Criteria

1. **Sound Accuracy**: Side-by-side comparison with real 909 samples
2. **Full Features**: All 11 voices, all parameters, sequencer with accents
3. **Dual Interface**: Web UI works standalone; API works in Amber's code
4. **Export**: Can generate WAV files for production use
5. **Reusable**: Clear path to add TR-808 with minimal new code
