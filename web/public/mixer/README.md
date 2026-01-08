# SynthMachine Mixer

Multi-track mixer with sidechain, EQ, and reverb. Combine R9-D9, R3-D3, and R1-D1 into one mixed output.

**Part of [SynthMachine](https://kochi.to/909)**

## Quick Start

```javascript
import { Session } from '/mixer/dist/session.js';
import { TR909Engine } from '/909/dist/machines/tr909/engine.js';
import { TB303Engine } from '/303/dist/machines/tb303/engine.js';

// Create session with shared context
const session = new Session({ bpm: 128 });

// Add instruments (pass session.context for shared timing)
const drums = new TR909Engine({ context: session.context });
const bass = new TB303Engine({ context: session.context });

session.add('drums', drums);
session.add('bass', bass);

// Load patterns
drums.setPattern('main', { kick: [...], snare: [...] });
bass.loadPreset('acidLine1');

// Add effects
const kickOutput = session.channel('drums').getVoiceOutput('kick');
session.channel('bass').duck({ trigger: kickOutput, amount: 0.6 });
session.channel('bass').eq({ preset: 'acidBass' });

// Master effects
await session.master.reverb({ preset: 'plate', mix: 0.15 });

// Play
await session.play();

// Or render to WAV with manifest
const { buffer, wav, manifest } = await session.render({
  bars: 8,
  title: 'acid-techno-jam'
});
```

## Session API

### Constructor

```javascript
new Session({ bpm?: number, context?: AudioContext })
```

### Properties

- `bpm` — Get/set tempo (updates all instruments)
- `context` — Shared AudioContext
- `master` — Master bus for effects

### Methods

- `add(name, engine)` — Add an instrument engine
- `channel(name)` — Get channel by name
- `getChannels()` — List all channel names
- `play()` — Start all sequencers
- `stop()` — Stop all sequencers
- `render({ bars, title })` — Render to WAV with manifest (see below)
- `dispose()` — Clean up

## Channel API

### Properties

- `volume` — Channel volume (0-1)
- `output` — Output AudioNode

### Methods

- `duck(options)` — Add sidechain ducker
- `eq(options)` — Add EQ
- `reverb(options)` — Add reverb
- `getVoiceOutput(voiceId)` — Get specific voice output (for sidechain trigger)

## Effects

### Ducker (Sidechain)

Gain ducking triggered by another signal.

```javascript
channel.duck({
  trigger: kickNode,  // AudioNode to trigger ducking
  amount: 0.6,        // 0-1, how much to duck
  attack: 5,          // ms
  release: 150,       // ms
  preset: 'tight',    // or 'pump'
});
```

**Presets:**
- `tight` — Fast, transparent (amount: 0.5, attack: 5, release: 100)
- `pump` — Audible pumping (amount: 0.7, attack: 10, release: 250)

### EQ

4-band parametric EQ.

```javascript
channel.eq({
  preset: 'acidBass',  // or params below
  highpass: 60,        // Hz (20-500)
  lowGain: 0,          // dB (-12 to +12)
  lowFreq: 100,        // Hz (60-300)
  midGain: 3,          // dB (-12 to +12)
  midFreq: 800,        // Hz (200-5000)
  midQ: 1.5,           // Q (0.5-4)
  highGain: -2,        // dB (-12 to +12)
  highFreq: 6000,      // Hz (2000-12000)
});
```

**Presets:**
- `acidBass` — Cuts mud, adds bite at 800Hz
- `crispHats` — Highpass 200Hz, presence at 5kHz
- `warmPad` — Smooth highs, low-end warmth
- `master` — Gentle lowcut, +1dB air at 12kHz
- `flat` — No processing

### Reverb

Convolution reverb with synthetic impulse responses.

```javascript
await channel.reverb({
  preset: 'plate',  // or 'room'
  mix: 0.2,         // 0-1 (0 = dry, 1 = wet)
});
```

**Presets:**
- `plate` — Bright, tight, EMT-style (mix: 0.15)
- `room` — Natural small space (mix: 0.2)

## Render & Manifest

The `render()` method returns three things:

```javascript
const { buffer, wav, manifest } = await session.render({
  bars: 4,
  title: 'my-track'
});
```

- `buffer` — AudioBuffer for playback
- `wav` — ArrayBuffer of WAV file data
- `manifest` — JSON object with full track recipe

### Manifest Format

The manifest contains everything needed to recreate or remix the track:

```json
{
  "format": "synthmachine-track",
  "version": 1,
  "title": "acid-techno-jam",
  "createdAt": "2026-01-08T12:34:56.789Z",
  "bpm": 128,
  "bars": 4,
  "duration": 7.5,
  "instruments": {
    "drums": {
      "type": "909",
      "volume": 0.8,
      "pattern": { "kick": [...], "snare": [...] },
      "parameters": {}
    },
    "bass": {
      "type": "303",
      "volume": 0.6,
      "pattern": [
        { "note": "C2", "accent": true, "slide": false },
        { "note": "rest" }
      ],
      "parameters": {
        "cutoff": 0.4,
        "resonance": 0.7,
        "envMod": 0.6,
        "decay": 0.3,
        "waveform": "sawtooth",
        "engineType": "E2"
      }
    }
  },
  "effects": {
    "bass": [
      { "type": "ducker", "amount": 0.6, "attack": 5, "release": 150 },
      { "type": "eq", "preset": "acidBass" }
    ]
  },
  "master": {
    "volume": 1.0,
    "effects": [
      { "type": "reverb", "preset": "plate", "mix": 0.15 }
    ]
  },
  "files": {
    "mix": "acid-techno-jam.wav"
  }
}
```

### Use Cases

1. **Remix Links** — Save manifest as JSON, share URL with `?load=` param
2. **Track Metadata** — Embed in blog posts, tweets, or player UIs
3. **Reproducibility** — Recreate exact track from manifest data
4. **Stem Export** — Use `instruments` to identify which stems to render

## File Structure

```
mixer/
├── dist/
│   ├── session.js          # Main Session class
│   └── effects/
│       ├── base.js         # Effect base class
│       ├── ducker.js       # Sidechain ducking
│       ├── eq.js           # 4-band EQ
│       └── reverb.js       # Convolution reverb
├── impulses/               # Reverb IR files (if using file-based)
├── index.html              # Test harness
└── README.md               # This file
```

## Notes

- All effects use native Web Audio nodes — minimal CPU overhead
- Reverb uses synthetic impulse responses — no file loading required
- Effects can be chained on both channels and master
- Render produces 16-bit 44.1kHz stereo WAV

## License

MIT - Do whatever you want.

---

*Built by [Kochi.to](https://kochi.to). This is a code dump, not a maintained project. Use it, fork it, learn from it.*
