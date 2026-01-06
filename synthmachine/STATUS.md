# SynthMachine TR-909 - Implementation Status

**Last Updated**: January 5, 2026

## Completed Features ✅

### Core Engine
- [x] Base `SynthEngine` class with audio routing
- [x] `Voice` base class with parameter descriptors
- [x] `StepSequencer` with 16-step patterns, BPM, swing
- [x] `LFSRNoise` generator (31-stage, authentic to 909)
- [x] `OutputManager` with WAV export
- [x] TypeScript types for patterns, voices, parameters

### TR-909 Voices (All 11 Working)
- [x] **Kick** - 3-layer synthesis: main body (160→30Hz), sub layer (50→35Hz), click transient
- [x] **Snare** - Body oscillator + LFSR noise with tone/snappy controls
- [x] **Clap** - Multiple noise bursts (4-layer)
- [x] **Rim Shot** - High-frequency resonant burst
- [x] **Toms** (Low/Mid/High) - Sine with pitch sweep
- [x] **Hi-Hats** (Closed/Open) - Real samples from Oramics
- [x] **Cymbals** (Crash/Ride) - Real samples from Oramics

### Samples
- [x] `ch.wav` - Closed hi-hat (32KB)
- [x] `oh.wav` - Open hi-hat (95KB)
- [x] `crash.wav` - Crash cymbal (341KB)
- [x] `ride.wav` - Ride cymbal (2.1MB)
- Source: https://oramics.github.io/sampled/DM/TR-909/Detroit/

### Web UI
- [x] 16-step sequencer grid with click-to-toggle
- [x] 3-state steps: off → soft (0.6) → accent (1.0)
- [x] Tempo control (BPM input)
- [x] Start/Stop/Export WAV buttons
- [x] **Preset selector dropdown** - All 8 patterns with auto-BPM sync
- [x] **Voice parameter panels** with sliders for each voice:
  - Tune, Decay, Attack, Level, Accent (kick)
  - Tone, Snappy, Level, Accent (snare)
  - Level, Spread, Accent (clap)
  - All voices have per-voice Accent control
- [x] Hardware-inspired styling (gray metal panel, orange LEDs, silk-screen labels)
- [x] Import map for browser ES modules
- [x] **Current step indicator** - LEDs highlight during playback
- [x] **Swing control** - 0-100% swing slider
- [x] **Flam control** - 0-100% flam timing slider
- [x] **Pattern save/load** - localStorage persistence with Save/Load/Delete
- [x] **Keyboard shortcuts** - Space for play/stop, 1-0 for voice triggers

### CLI Tool
- [x] `npm run cli -- list-presets` - Show available patterns
- [x] `npm run cli -- render --preset <id> --bars <n> --output <file>` - Render WAV
- [x] Pure JS offline renderer (no Web Audio API dependency)

### Presets (8 Patterns)
- [x] `techno-basic` - Four-on-floor, 130 BPM
- [x] `detroit-shuffle` - Syncopated, 125 BPM
- [x] `house-classic` - Chicago style, 122 BPM
- [x] `breakbeat` - Syncopated kick/snare, 135 BPM
- [x] `minimal` - Sparse, accent-driven, 128 BPM
- [x] `acid-house` - With tom fills, 126 BPM
- [x] `electro-funk` - Funky groove, 115 BPM
- [x] `industrial` - Relentless stomp, 140 BPM

### Python Bindings
- [x] `amber_tools.py` with `render_909_pattern()`, `quick_beat()`, `list_presets()`
- [x] Simple and full pattern formats supported

### Documentation
- [x] README.md with quick-start guide
- [x] This STATUS.md file

---

## Not Implemented / Future Work 🔮

### UI Enhancements ✅ (Completed Jan 2026)
- [x] Current step indicator during playback (LEDs lighting up)
- [x] Swing control in UI
- [x] Pattern save/load in browser (localStorage)
- [x] Keyboard shortcuts (space=play, 1-9=trigger)
- [x] Improved hardware styling (metal textures, silk-screen labels)

### Sound Improvements ✅ (Completed Jan 2026)
- [x] Per-voice accent parameters (each voice has adjustable accent boost 1.0-2.0x)
- [x] Flam timing control (0-100%, adds ghost note before main hit)
- [x] Hi-hat choke (open hat cuts when closed plays)
- [x] Sample playback with pitch/decay controls

### Sequencer
- [ ] Pattern chaining (A1→A2→B1 etc.)
- [ ] Song mode
- [ ] MIDI input/output
- [ ] Tap tempo

### API
- [ ] Real-time playback in Node.js (currently CLI renders offline only)
- [ ] REST API endpoint for web service usage

### Other Machines
- [ ] TR-808 (all-analog, different voices)
- [ ] Moog Sub37 (keyboard synth)

---

## How to Run

```bash
cd synthmachine

# Install deps
npm install

# Build TypeScript
npm run build

# Start web UI server
npm run serve
# Open http://localhost:3909/ui/tr909/

# CLI usage
npm run cli -- list-presets
npm run cli -- render --preset techno-basic --bars 4 --output beat.wav
```

---

## Key Files

| File | Purpose |
|------|---------|
| `machines/tr909/engine.ts` | Main TR-909 engine class |
| `machines/tr909/voices/*.ts` | Individual drum voice implementations |
| `machines/tr909/presets.ts` | 8 preset patterns |
| `machines/tr909/samples/*.wav` | Real TR-909 samples |
| `ui/tr909/app.ts` | Web UI logic |
| `ui/tr909/styles.css` | UI styling |
| `api/cli.ts` | CLI tool |
| `api/cli-renderer.ts` | Pure JS offline audio renderer |
| `api/amber_tools.py` | Python bindings |

---

## Known Issues

1. **Browser AudioContext**: Requires user gesture to start (click Start button)
2. **CLI uses pure JS renderer**: Sounds slightly different from Web UI (no Web Audio API in Node.js)
3. **Large sample files**: ride.wav is 2.1MB - could be compressed

---

## Architecture Notes

- **Browser**: Uses Web Audio API with real samples via import map
- **CLI**: Uses pure JavaScript synthesis (no samples) due to Node.js limitations
- **Shared**: Both use same pattern format and preset definitions
