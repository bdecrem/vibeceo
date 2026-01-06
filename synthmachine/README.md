# SynthMachine TR-909

A virtual Roland TR-909 drum machine with accurate sound synthesis.

## Quick Start

```bash
# Install dependencies
npm install

# Build
npm run build

# Render a beat
npm run cli -- render --preset techno-basic --bars 4 --output beat.wav

# Start the web UI
npm run serve
# Open http://localhost:3909/ui/tr909/
```

## Features

- **11 Authentic Voices**: Kick, Snare, Clap, Rimshot, 3 Toms, Closed/Open Hi-Hat, Crash, Ride
- **Real TR-909 Samples**: Hi-hats and cymbals from actual hardware
- **8 Preset Patterns**: Techno, House, Breakbeat, Minimal, Acid, Electro, Industrial
- **Web UI**: 16-step sequencer with click-to-program grid
- **CLI Tool**: Render patterns to WAV from command line
- **Python Bindings**: Integration for Amber AI agent

## CLI Usage

```bash
# List available presets
npm run cli -- list-presets

# Render a preset pattern
npm run cli -- render --preset house-classic --bars 4 --output house.wav

# Render with custom BPM
npm run cli -- render --preset techno-basic --bpm 140 --bars 2 --output fast.wav
```

### Available Presets

| ID | Name | BPM | Description |
|----|------|-----|-------------|
| `techno-basic` | Techno Basic | 130 | Classic four-on-floor with offbeat hats |
| `detroit-shuffle` | Detroit Shuffle | 125 | Syncopated Detroit groove with rim shots |
| `house-classic` | House Classic | 122 | Chicago house with open hats on upbeats |
| `breakbeat` | Breakbeat | 135 | Syncopated kick and snare pattern |
| `minimal` | Minimal | 128 | Sparse, accent-driven pattern |
| `acid-house` | Acid House | 126 | Driving acid pattern with tom accents |
| `electro-funk` | Electro Funk | 115 | Funky electro groove with snare rolls |
| `industrial` | Industrial | 140 | Relentless industrial stomp |

## Python Integration (Amber)

```python
from api.amber_tools import render_909_pattern, quick_beat

# Quick one-liner
wav_path = quick_beat('techno', bars=4)

# Using a preset
wav_path = render_909_pattern(preset='house-classic', bars=2)

# Custom pattern (1 = hit, 0 = rest)
pattern = {
    'kick': [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
    'snare': [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    'ch': [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
}
wav_path = render_909_pattern(pattern=pattern, bpm=140, bars=4)
```

## Web UI

Start the server and open http://localhost:3909/ui/tr909/

- Click steps to toggle hits (orange = on)
- Click again for accent (darker orange)
- Adjust tempo with the BPM input
- **Start/Stop** controls playback
- **Export WAV** downloads the pattern

## Project Structure

```
synthmachine/
├── api/
│   ├── cli.ts           # CLI tool
│   ├── cli-renderer.ts  # Pure JS offline renderer
│   └── amber_tools.py   # Python bindings
├── core/
│   ├── engine.ts        # Base synth engine
│   ├── sequencer.ts     # Step sequencer
│   ├── voice.ts         # Voice base class
│   └── types.ts         # TypeScript types
├── machines/tr909/
│   ├── engine.ts        # TR-909 engine
│   ├── presets.ts       # Pattern presets
│   ├── samples/         # WAV samples (hi-hats, cymbals)
│   └── voices/          # Voice implementations
└── ui/tr909/
    ├── index.html       # Web UI
    ├── app.ts           # UI logic
    └── styles.css       # Styling
```

## Voice Parameters

Each voice has tunable parameters:

- **Kick**: tune, decay, attack, level
- **Snare**: tune, snappy, tone, decay, level
- **Clap**: decay, tone, level
- **Toms**: tune, decay, level
- **Hi-Hats**: tune, decay, level
- **Cymbals**: tune, decay, level

## Development

```bash
# Type check
npm run lint

# Build
npm run build

# Serve UI for development
npm run serve
```

## License

MIT
