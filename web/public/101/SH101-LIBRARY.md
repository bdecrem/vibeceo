# SH-101 Cheat Sheet

## Quick Start

```javascript
import { SH101Engine } from '/101/dist/machines/sh101/engine.js';

const synth = new SH101Engine();
synth.setPattern(pattern);
synth.setBpm(128);
synth.startSequencer();

// Or render to WAV
const buffer = await synth.renderPattern({ bars: 4, bpm: 128 });
const wav = synth.audioBufferToWav(buffer);
```

## Pattern Format

```javascript
[
  { note: 'C3', gate: true, accent: true, slide: false },
  { note: 'C3', gate: false, accent: false, slide: false },  // rest
  { note: 'E3', gate: true, accent: false, slide: true },    // slide to next
  { note: 'G3', gate: true, accent: false, slide: false },
  // ... 16 steps total
]
```

| Field | Type | Description |
|-------|------|-------------|
| `note` | string | Note name: C3, D#3, G4, etc. |
| `gate` | bool | true = play, false = rest |
| `accent` | bool | Louder note |
| `slide` | bool | Glide to next note |

## Parameters

```javascript
synth.setParameter('cutoff', 0.3);
synth.getParameter('cutoff');
```

### Oscillator

| Param | Range | Default | Description |
|-------|-------|---------|-------------|
| `vcoSaw` | 0-1 | 0.5 | Sawtooth level |
| `vcoPulse` | 0-1 | 0.5 | Pulse wave level |
| `pulseWidth` | 0-1 | 0.5 | Pulse width (PWM) |
| `subLevel` | 0-1 | 0.3 | Sub-oscillator level |
| `subMode` | 0-2 | 0 | 0=-1oct, 1=-2oct, 2=pulse |

### Filter

| Param | Range | Default | Description |
|-------|-------|---------|-------------|
| `cutoff` | 0-1 | 0.5 | Filter frequency |
| `resonance` | 0-1 | 0.3 | Filter resonance |
| `envMod` | 0-1 | 0.5 | Envelope to filter |

### Envelope (ADSR)

| Param | Range | Default | Description |
|-------|-------|---------|-------------|
| `attack` | 0-1 | 0.01 | Attack time |
| `decay` | 0-1 | 0.3 | Decay time |
| `sustain` | 0-1 | 0.7 | Sustain level |
| `release` | 0-1 | 0.3 | Release time |

### LFO

| Param | Range | Default | Description |
|-------|-------|---------|-------------|
| `lfoRate` | 0-1 | 0.3 | LFO speed |
| `lfoWaveform` | string | 'triangle' | 'triangle', 'square', 'sah' |
| `lfoToPitch` | 0-1 | 0 | LFO to pitch amount |
| `lfoToFilter` | 0-1 | 0 | LFO to filter amount |
| `lfoToPW` | 0-1 | 0 | LFO to pulse width |

### Output

| Param | Range | Default | Description |
|-------|-------|---------|-------------|
| `volume` | 0-1 | 0.8 | Output volume |

## Sound Profiles

### Dub Techno Pad
```javascript
synth.setParameter('cutoff', 0.25);
synth.setParameter('resonance', 0.6);
synth.setParameter('envMod', 0.3);
synth.setParameter('attack', 0.02);
synth.setParameter('decay', 0.4);
synth.setParameter('sustain', 0.3);
synth.setParameter('release', 0.5);
synth.setParameter('vcoSaw', 0.7);
synth.setParameter('vcoPulse', 0.3);
synth.setParameter('subLevel', 0.4);
```

### Classic Lead
```javascript
synth.setParameter('vcoSaw', 1.0);
synth.setParameter('vcoPulse', 0);
synth.setParameter('cutoff', 0.6);
synth.setParameter('resonance', 0.4);
synth.setParameter('envMod', 0.5);
synth.setParameter('attack', 0.01);
synth.setParameter('decay', 0.2);
synth.setParameter('sustain', 0.8);
synth.setParameter('release', 0.2);
```

### Fat Bass
```javascript
synth.setParameter('vcoSaw', 0.5);
synth.setParameter('vcoPulse', 0.5);
synth.setParameter('subLevel', 0.8);
synth.setParameter('subMode', 1);  // -2 octaves
synth.setParameter('cutoff', 0.3);
synth.setParameter('resonance', 0.5);
synth.setParameter('envMod', 0.7);
synth.setParameter('decay', 0.3);
```

### PWM Strings
```javascript
synth.setParameter('vcoSaw', 0);
synth.setParameter('vcoPulse', 1.0);
synth.setParameter('pulseWidth', 0.3);
synth.setParameter('lfoRate', 0.2);
synth.setParameter('lfoToPW', 0.4);
synth.setParameter('attack', 0.2);
synth.setParameter('release', 0.5);
```

### Wobble Bass
```javascript
synth.setParameter('cutoff', 0.3);
synth.setParameter('resonance', 0.7);
synth.setParameter('lfoRate', 0.5);
synth.setParameter('lfoToFilter', 0.6);
synth.setParameter('lfoWaveform', 'triangle');
synth.setParameter('subLevel', 0.6);
```

## Engine Versions

- **E1** = Simple filter
- **E2** = IR3109 ladder filter (authentic)

```javascript
synth.setEngine('E2');
```

## Common Patterns

### Hypnotic Arp (4-note loop)
```javascript
const loop = [
  { note: 'A2', gate: true, accent: true, slide: false },
  { note: 'C3', gate: true, accent: false, slide: true },
  { note: 'E3', gate: true, accent: false, slide: false },
  { note: 'C3', gate: true, accent: false, slide: true },
];
const pattern = [...loop, ...loop, ...loop, ...loop];
```

### Rising Sequence
```javascript
[
  { note: 'C3', gate: true, accent: true, slide: false },
  { note: 'D3', gate: true, accent: false, slide: true },
  { note: 'E3', gate: true, accent: false, slide: false },
  { note: 'G3', gate: true, accent: false, slide: true },
  { note: 'A3', gate: true, accent: true, slide: false },
  { note: 'G3', gate: true, accent: false, slide: true },
  { note: 'E3', gate: true, accent: false, slide: false },
  { note: 'D3', gate: true, accent: false, slide: true },
  // repeat...
]
```

## API Reference

### SH101Engine

| Method | Description |
|--------|-------------|
| `setPattern(pattern)` | Set 16-step pattern |
| `setBpm(bpm)` | Set tempo |
| `setParameter(id, value)` | Set synth parameter |
| `getParameter(id)` | Get parameter value |
| `getAllParameters()` | Get all parameters |
| `setEngine('E1'\|'E2')` | Set filter engine |
| `startSequencer()` | Start playback |
| `stopSequencer()` | Stop playback |
| `playNote(note, velocity, time?)` | Trigger single note |
| `releaseNote(time?)` | Release current note |
| `renderPattern({ bars, bpm })` | Render to AudioBuffer |
| `audioBufferToWav(buffer)` | Convert to WAV |

## Multi-Track

```javascript
import { SH101Engine } from '/101/dist/machines/sh101/engine.js';
import { TR909Engine } from '/909/dist/machines/tr909/engine.js';

const ctx = new AudioContext();
const synth = new SH101Engine({ context: ctx });
const drums = new TR909Engine({ context: ctx });

synth.setBpm(128);
drums.setBpm(128);
```

## File Locations

```
/101/
├── dist/machines/sh101/
│   ├── engine.js          # SH101Engine
│   ├── presets.js         # Built-in sounds
│   ├── oscillator.js      # VCO
│   ├── filter/ir3109.js   # Ladder filter
│   ├── envelope.js        # ADSR
│   └── lfo.js             # LFO
└── ui/sh101/index.html    # Interactive UI
```
