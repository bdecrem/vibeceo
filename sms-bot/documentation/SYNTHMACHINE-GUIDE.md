# SynthMachine Guide

Web Audio synthesizer libraries for creating electronic music programmatically.

## Available Instruments

| Instrument | Type | Location | Detailed Docs |
|------------|------|----------|---------------|
| **TR-909** | Drum machine | `/909/` | `/909/dist/api/index.js` |
| **TB-303** | Bass synthesizer | `/303/` | [TB303-LIBRARY.md](/303/TB303-LIBRARY.md) |

## Quick Start

### TR-909 Drum Machine

```javascript
import { TR909Controller } from '/909/dist/api/index.js';

const drums = new TR909Controller();

// Load a preset
drums.setPattern(presetPattern);
drums.setBpm(128);

// Play
drums.play();
drums.stop();

// Render to WAV
const { wav } = await drums.exportCurrentPatternToWav({ bars: 2 });
```

**TR-909 Pattern Structure:**
```javascript
{
  kick: [{ velocity: 1 }, { velocity: 0 }, ...],   // 16 steps
  snare: [{ velocity: 0 }, { velocity: 0 }, ...],
  clap: [...],
  hihatClosed: [...],
  hihatOpen: [...],
  // ... other voices: tom1, tom2, tom3, rimshot, crash, ride
}
```

### TB-303 Bass Synthesizer

```javascript
import { TB303Controller, renderPresetToWav } from '/303/dist/api/index.js';

// Quick render
const { wav } = await renderPresetToWav('acidLine1', { bars: 2 });

// Or use controller
const bass = new TB303Controller();
bass.loadPreset('phuture');
bass.play();
```

**TB-303 Pattern Structure:**
```javascript
[
  { note: 'C2', gate: true, accent: true, slide: false },
  { note: 'C2', gate: false, accent: false, slide: false },
  // ... 16 steps total
]
```

See [TB303-LIBRARY.md](/303/TB303-LIBRARY.md) for full documentation.

---

## Using Both Together (Multi-Track)

To play TR-909 and TB-303 in sync, share the same `AudioContext`:

```javascript
import { TR909Engine } from '/909/dist/machines/tr909/engine.js';
import { TB303Engine } from '/303/dist/machines/tb303/engine.js';

// 1. Create ONE shared AudioContext
const audioContext = new AudioContext();

// 2. Pass to both engines
const drums = new TR909Engine({ context: audioContext });
const bass = new TB303Engine({ context: audioContext });

// 3. Set same BPM
const bpm = 130;
drums.setBpm(bpm);
bass.setBpm(bpm);

// 4. Load patterns
drums.setPattern('main', {
  kick: [{ velocity: 1 }, { velocity: 0 }, { velocity: 0 }, { velocity: 0 },
         { velocity: 1 }, { velocity: 0 }, { velocity: 0 }, { velocity: 0 },
         { velocity: 1 }, { velocity: 0 }, { velocity: 0 }, { velocity: 0 },
         { velocity: 1 }, { velocity: 0 }, { velocity: 0 }, { velocity: 0 }],
  hihatClosed: [{ velocity: 0.7 }, { velocity: 0 }, { velocity: 0.7 }, { velocity: 0 },
                { velocity: 0.7 }, { velocity: 0 }, { velocity: 0.7 }, { velocity: 0 },
                { velocity: 0.7 }, { velocity: 0 }, { velocity: 0.7 }, { velocity: 0 },
                { velocity: 0.7 }, { velocity: 0 }, { velocity: 0.7 }, { velocity: 0 }],
});

bass.setPattern([
  { note: 'C2', gate: true, accent: true, slide: false },
  { note: 'C2', gate: false, accent: false, slide: false },
  { note: 'C2', gate: true, accent: false, slide: false },
  { note: 'E2', gate: true, accent: false, slide: true },
  { note: 'G2', gate: true, accent: true, slide: false },
  { note: 'G2', gate: false, accent: false, slide: false },
  { note: 'A#2', gate: true, accent: false, slide: true },
  { note: 'C3', gate: true, accent: true, slide: false },
  { note: 'C2', gate: true, accent: false, slide: false },
  { note: 'C2', gate: false, accent: false, slide: false },
  { note: 'D#2', gate: true, accent: true, slide: false },
  { note: 'D#2', gate: true, accent: false, slide: true },
  { note: 'G2', gate: true, accent: false, slide: false },
  { note: 'G2', gate: false, accent: false, slide: false },
  { note: 'A#2', gate: true, accent: true, slide: true },
  { note: 'C3', gate: true, accent: false, slide: false },
]);

// 5. Start both together
async function play() {
  await audioContext.resume();
  drums.startSequencer();
  bass.startSequencer();
}

// 6. Stop both
function stop() {
  drums.stopSequencer();
  bass.stopSequencer();
}
```

### Why This Works

- **Shared AudioContext** = same audio clock = perfect sync
- **Web Audio auto-mixes** = both outputs combine automatically
- **No additional setup** = just share the context

---

## Available Presets

### TR-909 Presets

| ID | Name | BPM | Style |
|----|------|-----|-------|
| `techno-basic` | Techno Basic | 128 | Four-on-floor |
| `house-groove` | House Groove | 124 | Classic house |
| `breakbeat` | Breakbeat | 130 | Syncopated |

### TB-303 Presets

| ID | Name | BPM | Style |
|----|------|-----|-------|
| `acidLine1` | Acid Line 1 | 130 | Classic ascending |
| `phuture` | Phuture | 125 | Minimal, hypnotic |
| `squelch` | Squelch | 140 | Fast, aggressive |
| `darkAcid` | Dark Acid | 128 | Minor key, square |
| `rolling` | Rolling | 135 | Hardfloor-style |
| `hypnotic` | Hypnotic | 118 | Slower, spacious |
| `punchy` | Punchy | 145 | Aggressive, fast |

---

## Synth Parameters

### TB-303 Parameters (0-1 range)

| Parameter | Description | Acid Sweet Spot |
|-----------|-------------|-----------------|
| `cutoff` | Filter frequency | 0.2 - 0.4 |
| `resonance` | Filter resonance | 0.5 - 0.8 |
| `envMod` | Envelope to filter | 0.6 - 0.9 |
| `decay` | Envelope decay | 0.3 - 0.5 |
| `accent` | Accent intensity | 0.7 - 0.9 |

```javascript
bass.setParameter('cutoff', 0.3);
bass.setParameter('resonance', 0.75);
bass.setWaveform('sawtooth');  // or 'square'
bass.setEngine('E1');  // 'E1' (simple) or 'E2' (authentic diode ladder)
```

### TR-909 Voice Parameters

Each drum voice has tuning and character parameters accessible via:

```javascript
drums.setVoiceParameter('kick', 'tune', 0.5);
drums.setVoiceParameter('snare', 'tone', 0.6);
```

---

## Live Demos

- **TR-909**: [/909/](/909/)
- **TB-303**: [/303/](/303/)

---

## File Locations

```
web/public/
├── 909/
│   ├── dist/
│   │   ├── api/index.js          # TR909Controller
│   │   └── machines/tr909/
│   │       ├── engine.js         # TR909Engine
│   │       └── presets.js        # Preset patterns
│   └── ui/tr909/index.html       # Interactive UI
│
└── 303/
    ├── dist/
    │   ├── api/index.js          # TB303Controller, renderPresetToWav
    │   └── machines/tb303/
    │       ├── engine.js         # TB303Engine
    │       └── presets.js        # Preset patterns
    ├── ui/tb303/index.html       # Interactive UI
    └── TB303-LIBRARY.md          # Detailed documentation
```
