# TB-303 Cheat Sheet

## Quick Start

```javascript
import { TB303Engine } from '/303/dist/machines/tb303/engine.js';

const bass = new TB303Engine();
bass.setPattern(pattern);
bass.setBpm(128);
bass.startSequencer();

// Or render to WAV
const buffer = await bass.renderPattern({ bars: 4, bpm: 128 });
const wav = bass.audioBufferToWav(buffer);
```

## Pattern Format

```javascript
[
  { note: 'C2', gate: true, accent: true, slide: false },
  { note: 'C2', gate: false, accent: false, slide: false },  // rest
  { note: 'E2', gate: true, accent: false, slide: true },    // slide to next
  { note: 'G2', gate: true, accent: true, slide: false },
  // ... 16 steps total
]
```

| Field | Type | Description |
|-------|------|-------------|
| `note` | string | Note name: C2, D#2, G3, etc. |
| `gate` | bool | true = play, false = rest |
| `accent` | bool | Louder + extended filter sweep |
| `slide` | bool | Glide to next note |

## Parameters

```javascript
bass.setParameter('cutoff', 0.3);
bass.getParameter('cutoff');
```

| Param | Range | Default | Description |
|-------|-------|---------|-------------|
| `cutoff` | 0-1 | 0.5 | Filter frequency. Lower = darker |
| `resonance` | 0-1 | 0.5 | Filter resonance. High = squelch |
| `envMod` | 0-1 | 0.5 | Envelope to filter amount |
| `decay` | 0-1 | 0.5 | Filter envelope decay time |
| `accent` | 0-1 | 0.8 | Accent intensity |
| `level` | 0-1 | 1.0 | Output volume |

## Acid Sweet Spots

| Style | cutoff | resonance | envMod | decay |
|-------|--------|-----------|--------|-------|
| **Dark Dub** | 0.2-0.3 | 0.5-0.6 | 0.3 | 0.4 |
| **Classic Acid** | 0.3-0.4 | 0.7-0.8 | 0.6-0.8 | 0.3-0.5 |
| **Squelchy** | 0.2 | 0.85 | 0.9 | 0.2 |
| **Mellow** | 0.5-0.6 | 0.3 | 0.4 | 0.6 |

## Engine Versions

- **E1** = Simple biquad filter
- **E2** = Diode ladder (authentic, self-oscillation)

```javascript
bass.setEngine('E2');
bass.getEngine();  // 'E1' or 'E2'
```

## Waveform

```javascript
bass.setWaveform('sawtooth');  // default
bass.setWaveform('square');
```

## Preset Profiles

### Dark Dub Techno
```javascript
bass.setParameter('cutoff', 0.25);
bass.setParameter('resonance', 0.6);
bass.setParameter('envMod', 0.3);
bass.setParameter('decay', 0.4);
bass.setWaveform('sawtooth');
```

### Screaming Acid
```javascript
bass.setParameter('cutoff', 0.2);
bass.setParameter('resonance', 0.85);
bass.setParameter('envMod', 0.9);
bass.setParameter('decay', 0.25);
bass.setEngine('E2');
```

## Common Patterns

### Simple Acid Line
```javascript
[
  { note: 'C2', gate: true, accent: true, slide: false },
  { note: 'C2', gate: false, accent: false, slide: false },
  { note: 'C2', gate: true, accent: false, slide: false },
  { note: 'E2', gate: true, accent: false, slide: true },
  { note: 'G2', gate: true, accent: true, slide: false },
  { note: 'G2', gate: false, accent: false, slide: false },
  { note: 'E2', gate: true, accent: false, slide: true },
  { note: 'C2', gate: true, accent: false, slide: false },
  { note: 'C2', gate: true, accent: false, slide: false },
  { note: 'C2', gate: false, accent: false, slide: false },
  { note: 'D2', gate: true, accent: true, slide: false },
  { note: 'D2', gate: true, accent: false, slide: true },
  { note: 'G2', gate: true, accent: false, slide: false },
  { note: 'G2', gate: false, accent: false, slide: false },
  { note: 'A#2', gate: true, accent: true, slide: true },
  { note: 'C3', gate: true, accent: false, slide: false }
]
```

### Hypnotic Loop (4 notes)
```javascript
const loop = [
  { note: 'A1', gate: true, accent: true, slide: false },
  { note: 'A1', gate: true, accent: false, slide: true },
  { note: 'C2', gate: true, accent: false, slide: false },
  { note: 'A1', gate: true, accent: false, slide: true },
];
const pattern = [...loop, ...loop, ...loop, ...loop];
```

## API Reference

### TB303Engine

| Method | Description |
|--------|-------------|
| `setPattern(pattern)` | Set 16-step pattern |
| `setBpm(bpm)` | Set tempo |
| `setParameter(id, value)` | Set synth parameter |
| `getParameter(id)` | Get parameter value |
| `setWaveform('sawtooth'\|'square')` | Set oscillator |
| `setEngine('E1'\|'E2')` | Set filter engine |
| `startSequencer()` | Start playback |
| `stopSequencer()` | Stop playback |
| `playNote(note, velocity, time?)` | Trigger single note |
| `renderPattern({ bars, bpm })` | Render to AudioBuffer |
| `audioBufferToWav(buffer)` | Convert to WAV |

## Multi-Track

```javascript
import { TB303Engine } from '/303/dist/machines/tb303/engine.js';
import { TR909Engine } from '/909/dist/machines/tr909/engine.js';

const ctx = new AudioContext();
const bass = new TB303Engine({ context: ctx });
const drums = new TR909Engine({ context: ctx });

bass.setBpm(128);
drums.setBpm(128);
```

## File Locations

```
/303/
├── dist/machines/tb303/
│   ├── engine.js          # TB303Engine
│   ├── presets.js         # Built-in patterns
│   └── filter/            # Diode ladder filter
└── ui/tb303/index.html    # Interactive UI
```
