# SynthMachine Guide

Web Audio synthesizer libraries for creating electronic music programmatically.

## What's New (January 2026)

**Mixer module added.** You can now combine multiple synths (909 + 303 + 101) with professional effects and render to a single mixed WAV file.

**New capabilities:**
- **Sidechain ducking** — Make the kick cut through the bass
- **4-band EQ** — Clean up mud, add presence (`acidBass`, `crispHats`, `master` presets)
- **Convolution reverb** — Add space (`plate`, `room` presets)
- **Combined render** — `session.render({ bars: 8 })` outputs one mixed WAV

**Quick example:**
```javascript
import { Session } from '/mixer/dist/session.js';
import { TR909Engine } from '/909/dist/machines/tr909/engine.js';
import { TB303Engine } from '/303/dist/machines/tb303/engine.js';

const session = new Session({ bpm: 128 });
session.add('drums', new TR909Engine({ context: session.context }));
session.add('bass', new TB303Engine({ context: session.context }));

// Sidechain the bass to the kick
session.channel('bass').duck({
  trigger: session.channel('drums').getVoiceOutput('kick'),
  amount: 0.6
});

// EQ and reverb
session.channel('bass').eq({ preset: 'acidBass' });
await session.master.reverb({ preset: 'plate', mix: 0.15 });

// Render full mix
const { wav } = await session.render({ bars: 8 });
```

See [Mixer & Effects](#mixer--effects) section below for full documentation.

---

## Available Instruments

| Instrument | Type | Location | Detailed Docs |
|------------|------|----------|---------------|
| **TR-909** | Drum machine | `/909/` | `/909/dist/api/index.js` |
| **TB-303** | Bass synthesizer | `/303/` | [TB303-LIBRARY.md](/303/TB303-LIBRARY.md) |
| **SH-101** | Lead synthesizer | `/101/` | [SH101-LIBRARY.md](/101/SH101-LIBRARY.md) |
| **Mixer** | Session + Effects | `/mixer/` | [README.md](/mixer/README.md) |

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

## Mixer & Effects

For multi-track mixing with sidechain, EQ, reverb, and combined rendering to WAV.

### Quick Start with Session

```javascript
import { Session } from '/mixer/dist/session.js';
import { TR909Engine } from '/909/dist/machines/tr909/engine.js';
import { TB303Engine } from '/303/dist/machines/tb303/engine.js';

// Session manages shared context, BPM, and routing
const session = new Session({ bpm: 128 });

// Add instruments
const drums = new TR909Engine({ context: session.context });
const bass = new TB303Engine({ context: session.context });

session.add('drums', drums);
session.add('bass', bass);

// Sidechain: bass ducks when kick hits
const kickOutput = session.channel('drums').getVoiceOutput('kick');
session.channel('bass').duck({ trigger: kickOutput, amount: 0.6 });

// EQ on bass
session.channel('bass').eq({ preset: 'acidBass' });

// Master reverb
await session.master.reverb({ preset: 'plate', mix: 0.15 });

// Volume control
session.channel('drums').volume = 0.9;
session.channel('bass').volume = 0.75;

// Play live
await session.play();

// Or render to single WAV
const { wav } = await session.render({ bars: 8 });
```

### Available Effects

| Effect | Description | Presets |
|--------|-------------|---------|
| **Ducker** | Sidechain gain ducking | `tight`, `pump` |
| **EQ** | 4-band parametric | `acidBass`, `crispHats`, `warmPad`, `master` |
| **Reverb** | Convolution reverb | `plate`, `room` |

### Effect Examples

**Sidechain Ducking:**
```javascript
session.channel('bass').duck({
  trigger: session.channel('drums').getVoiceOutput('kick'),
  amount: 0.6,    // Duck 60%
  release: 150,   // 150ms release
});
```

**EQ with Preset:**
```javascript
session.channel('bass').eq({ preset: 'acidBass' });
// Or custom: eq({ highpass: 60, midGain: 3, midFreq: 800 })
```

**Reverb:**
```javascript
await session.master.reverb({ preset: 'plate', mix: 0.15 });
```

### Effect Presets Reference

**EQ Presets:**
| Preset | Description |
|--------|-------------|
| `acidBass` | Cuts <60Hz mud, +3dB at 800Hz bite, -2dB harsh highs |
| `crispHats` | Highpass 200Hz, +2dB presence at 5kHz |
| `warmPad` | Low-end warmth, smooth highs |
| `master` | Gentle 30Hz lowcut, +1dB air at 12kHz |

**Ducker Presets:**
| Preset | Character |
|--------|-----------|
| `tight` | Fast attack/release, transparent |
| `pump` | Slower release, audible pumping |

**Reverb Presets:**
| Preset | Character |
|--------|-----------|
| `plate` | Bright, tight, sits behind mix |
| `room` | Natural small space |

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
├── 303/
│   ├── dist/
│   │   ├── api/index.js          # TB303Controller, renderPresetToWav
│   │   └── machines/tb303/
│   │       ├── engine.js         # TB303Engine
│   │       └── presets.js        # Preset patterns
│   ├── ui/tb303/index.html       # Interactive UI
│   └── TB303-LIBRARY.md          # Detailed documentation
│
├── 101/
│   ├── dist/
│   │   ├── api/index.js          # SH101Controller
│   │   └── machines/sh101/
│   │       ├── engine.js         # SH101Engine
│   │       └── presets.js        # Preset sounds
│   ├── ui/sh101/index.html       # Interactive UI
│   └── SH101-LIBRARY.md          # Detailed documentation
│
└── mixer/
    ├── dist/
    │   ├── session.js            # Session class
    │   └── effects/
    │       ├── base.js           # Effect base class
    │       ├── ducker.js         # Sidechain ducking
    │       ├── eq.js             # 4-band EQ
    │       └── reverb.js         # Convolution reverb
    └── README.md                 # Mixer documentation
```
