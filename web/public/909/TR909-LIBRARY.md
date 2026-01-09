# TR-909 Cheat Sheet

## Quick Start

```javascript
import { TR909Controller } from '/909/dist/api/index.js';

const drums = new TR909Controller();
drums.setPattern(pattern);
drums.setBpm(128);
const { wav } = await drums.exportCurrentPatternToWav({ bars: 4 });
```

## Pattern Format

```javascript
{
  kick: [{ velocity: 1.0, accent: true }, { velocity: 0 }, ...],  // 16 steps
  snare: [{ velocity: 0.9 }, { velocity: 0 }, ...],
  // ... other voices
}
```

## Voice IDs

| Voice | ID | Engine Default |
|-------|-----|----------------|
| Kick | `kick` | E1 |
| Snare | `snare` | E2 |
| Clap | `clap` | E1 |
| Rimshot | `rimshot` | E2 |
| Low Tom | `ltom` | E2 |
| Mid Tom | `mtom` | E2 |
| High Tom | `htom` | E2 |
| Closed Hat | `ch` | E1 |
| Open Hat | `oh` | E1 |
| Crash | `crash` | E2 |
| Ride | `ride` | E2 |

## Voice Parameters

Access via: `drums.engine.voices.get('voiceId').paramName = value`

### Kick
| Param | Range | Description |
|-------|-------|-------------|
| `tune` | ±1200 | Pitch in cents. +400 = punchy mid-lows |
| `decay` | 0-1 | Tail length. 0.15 = tight, 0.8 = boomy |
| `attack` | 0-1 | Click intensity. 0.8 = sharp transient |
| `level` | 0-1 | Volume |

### Snare
| Param | Range | Description |
|-------|-------|-------------|
| `tune` | ±1200 | Pitch |
| `tone` | 0-1 | Body vs snap balance |
| `snappy` | 0-1 | Snare wire intensity |

### Clap
| Param | Range | Description |
|-------|-------|-------------|
| `tone` | 0-1 | Brightness |
| `decay` | 0-1 | Tail length |

### Hi-Hats (ch, oh)
| Param | Range | Description |
|-------|-------|-------------|
| `tune` | 0-1 | Pitch/brightness |
| `decay` | 0-1 | Length (oh only) |

### Toms (ltom, mtom, htom)
| Param | Range | Description |
|-------|-------|-------------|
| `tune` | ±1200 | Pitch |
| `decay` | 0-1 | Tail length |

## Engine Versions

- **E1** = Simple (sine/triangle, soft-clipped)
- **E2** = Authentic (circuit-accurate modeling)

```javascript
// Switch engine for a voice
drums.engine.setVoiceEngine('kick', 'E2');

// Check current engine
drums.engine.getVoiceEngine('kick');  // 'E1' or 'E2'
```

## Preset Profiles

### Sharp Techno Kick
```javascript
const kick = drums.engine.voices.get('kick');
kick.tune = 400;     // Punch in mid-lows
kick.decay = 0.15;   // Tight
kick.attack = 0.8;   // Strong click
// Keep E1 engine
```

### Boomy 808-style Kick
```javascript
const kick = drums.engine.voices.get('kick');
kick.tune = -200;    // Sub-heavy
kick.decay = 0.8;    // Long tail
kick.attack = 0.3;   // Soft click
drums.engine.setVoiceEngine('kick', 'E2');
```

### Crisp Hats
```javascript
const ch = drums.engine.voices.get('ch');
ch.tune = 0.7;  // Brighter
drums.engine.setVoiceEngine('ch', 'E2');  // Metallic
```

## Common Patterns

### Four on the Floor
```javascript
{ kick: [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0].map(v => ({velocity: v})) }
```

### Snare on 2 & 4
```javascript
{ snare: [0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0].map(v => ({velocity: v * 0.9})) }
```

### 8th Note Hats
```javascript
{ ch: [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0].map(v => ({velocity: v * 0.5})) }
```

### Offbeat Open Hat
```javascript
{ oh: [0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1].map(v => ({velocity: v * 0.6})) }
```

## API Reference

### TR909Controller

| Method | Description |
|--------|-------------|
| `setPattern(pattern)` | Set drum pattern |
| `setBpm(bpm)` | Set tempo (37-290) |
| `play()` | Start real-time playback |
| `stop()` | Stop playback |
| `exportCurrentPatternToWav({ bars })` | Render to WAV, returns `{ wav }` |

### TR909Engine (via drums.engine)

| Method | Description |
|--------|-------------|
| `setPattern(id, pattern)` | Set named pattern |
| `setBpm(bpm)` | Set tempo |
| `setVoiceEngine(voiceId, 'E1'|'E2')` | Switch engine |
| `renderPattern(pattern, { bars, bpm })` | Render to AudioBuffer |
| `audioBufferToWav(buffer)` | Convert to WAV ArrayBuffer |
| `voices.get(voiceId)` | Access voice for parameters |

## Multi-Track (with other synths)

```javascript
import { TR909Engine } from '/909/dist/machines/tr909/engine.js';
import { SH101Engine } from '/101/dist/machines/sh101/engine.js';

// Shared context = sync
const ctx = new AudioContext();
const drums = new TR909Engine({ context: ctx });
const synth = new SH101Engine({ context: ctx });

// Same BPM
drums.setBpm(128);
synth.setBpm(128);
```

## File Locations

```
/909/
├── dist/api/index.js           # TR909Controller
├── dist/machines/tr909/
│   ├── engine.js               # TR909Engine
│   ├── presets.js              # Built-in patterns
│   └── voices/*.js             # Voice synthesis
└── ui/tr909/index.html         # Interactive UI
```
