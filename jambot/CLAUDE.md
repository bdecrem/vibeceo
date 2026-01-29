# Jambot - Claude Code Instructions

## THE SYSTEM (Read This First)

**Jambot is a modular music production platform where any component can be added, removed, or swapped, and everything connects the same way.**

- **Instruments** are plugins. Add a new synth → it exposes voices and parameters through the standard interface. The system doesn't care if it's a 909, FM synth, or something that doesn't exist yet.

- **Effects** are plugins. Add a new effect → it exposes parameters the same way. Reverb, delay, granular — all plug in identically.

- **Tracks and routing** are dynamic. Create a track, route a voice to a bus, add a send — operations on a graph, not hardcoded paths.

- **Services** work on anything. Automation doesn't know about "drums" — it knows about parameters. Analysis doesn't know about "kick" — it knows about audio signals. Generic capabilities that work across the whole system.

- **The agent** is just a user. It sees the current configuration, reads and writes parameters, renders audio. No special code per instrument — same interface for everything.

**The Core Requirement:** The agent must be able to **read and write ANY parameter** in the system. Everything is addressable (drums.kick.decay, mixer.reverb.decay, master.volume). One way to read, one way to write. If a value exists, the agent can see it.

**When adding anything new:** It plugs into the existing architecture. New synth? Same interface. New effect? Same interface. New service? Works on everything. Never write bespoke code that only works for one thing.

---

## Quick Reference

```bash
npm start          # Run jambot
npm run build      # Build for release (only when cutting a release)
```

## Architecture

Core files:
- `jambot.js` — Agent loop, tools, WAV encoder, synth integration
- `ui.tsx` — Ink-based terminal UI
- `project.js` — Project persistence

## The Droid Quartet

| Synth | Engine | Description |
|-------|--------|-------------|
| **R9D9** | TR-909 | Drum machine (11 voices) |
| **R3D3** | TB-303 | Acid bass synth |
| **R1D1** | SH-101 | Lead/poly synth |
| **R9DS** | Sampler | 10-slot sample player with kits |

## Synth Sources

Engines imported from `web/public/`:
- R9D9: `../web/public/909/dist/machines/tr909/engine-v3.js`
- R3D3: `../web/public/303/dist/machines/tb303/engine.js`
- R1D1: `../web/public/101/dist/machines/sh101/engine.js`

R9DS uses local files:
- `kit-loader.js` — Loads kits from filesystem
- `sample-voice.js` — Sample playback engine
- `samples/` — Bundled sample kits

**Do NOT duplicate synth code** - always import from web/public/ (except R9DS which is local).

## Parameter Units (Producer-Friendly)

Synth parameters use producer-friendly units instead of raw 0-1 engine values. The system converts automatically.

### The 5 Unit Types

| Unit | Range | Examples |
|------|-------|----------|
| **dB** | -60 to +6 | Level, volume (0 = unity gain) |
| **0-100** | 0 to 100 | Decay, attack, resonance, envMod (like hardware knobs) |
| **semitones** | ±12 or ±24 | Tune, pitch (+12 = 1 octave up) |
| **Hz** | varies | Filter cutoff, hi-hat tone (log scale) |
| **pan** | -100 to +100 | Stereo position (L=-100, C=0, R=+100) |

Plus `choice` for discrete options (waveform: "sawtooth"/"square").

### File Structure

```
params/
  r9d9-params.json   # TR-909 drum voices
  r3d3-params.json   # TB-303 bass
  r1d1-params.json   # SH-101 lead
  r9ds-params.json   # Sampler slots
  converters.js      # toEngine(), fromEngine(), etc.
```

### Per-Synth Parameters

**R9D9 (drums):**
- `level` (dB): -60 to +6
- `tune` (semitones): -12 to +12
- `decay` (0-100): 0=tight/punchy, 100=boomy
- `attack` (0-100): 0=soft, 100=clicky
- `tone` (Hz): 4000-16000 for hi-hats

**R3D3 (bass):**
- `level` (dB): -60 to +6
- `cutoff` (Hz): 100-10000
- `resonance` (0-100): 0=clean, 100=screaming
- `envMod`, `decay`, `accent` (0-100)

**R1D1 (lead):**
- `level` (dB): -60 to +6
- `cutoff` (Hz): 20-16000
- `vcoSaw`, `vcoPulse`, `pulseWidth` (0-100)
- `attack`, `decay`, `sustain`, `release` (0-100)
- `lfoToPitch` (semitones): 0-24 vibrato depth

**R9DS (sampler):**
- `level` (dB): -60 to +6
- `tune` (semitones): -24 to +24
- `attack`, `decay` (0-100)
- `filter` (Hz): 200-20000 lowpass
- `pan` (-100 to +100)

### How It Works

1. Agent passes producer values (e.g., `level: -3` dB)
2. `converters.js` converts to engine units (0-1)
3. Synth engine receives normalized values

```javascript
import { convertTweaks } from './params/converters.js';

// Producer-friendly input
const tweaks = { level: -6, decay: 80, cutoff: 2000 };

// Convert to engine units
const engineTweaks = convertTweaks('r3d3', 'bass', tweaks);
// → { level: 0.25, decay: 0.8, cutoff: 0.65 }
```

## R9DS Sample Kits

Kit locations (checked in order, user can override bundled):
1. **Bundled**: `./samples/` (ships with app)
2. **User**: `~/Documents/Jambot/kits/` (user adds their own)

Kit structure:
```
my-kit/
  kit.json          # { name, slots: [{id, name, short}] }
  samples/
    s1.wav ... s10.wav
```

Bundled kits: 808, amber

## Tools Available to Agent

**Muting voices:**
- **Mute a voice**: Use `mute: true` in any tweak tool (e.g., `tweak_drums` with `voice: "kick", mute: true`)
- **Mute entire instrument in song mode**: Omit it from the section's pattern assignment
- Mute is equivalent to `level: -60` (minimum dB, effectively silent)

| Tool | Synth | Description |
|------|-------|-------------|
| `create_session` | — | Set BPM (60-200), reset all patterns |
| `list_projects` | — | List all saved projects |
| `open_project` | — | Open a project by name/folder to continue working |
| `rename_project` | — | Rename current project |
| `list_909_kits` | R9D9 | Show available 909 kits (sound presets) |
| `load_909_kit` | R9D9 | Load a kit by ID (e.g., "bart-deep", "punchy") |
| `add_drums` | R9D9 | 11 voices: kick, snare, clap, ch, oh, ltom, mtom, htom, rimshot, crash, ride |
| `tweak_drums` | R9D9 | Adjust level (dB), tune (semitones), decay/attack (0-100), tone (Hz), engine, useSample per voice |
| `set_drum_groove` | R9D9 | Set flam, patternLength (1-16), scale (16th/triplets/32nd), globalAccent |
| `automate_drums` | R9D9 | Per-step parameter automation ("knob mashing") - array of 16 values per param |
| `add_bass` | R3D3 | 16-step pattern with note, gate, accent, slide |
| `tweak_bass` | R3D3 | level (dB), cutoff (Hz), resonance/envMod/decay/accent (0-100), waveform |
| `list_101_presets` | R1D1 | Show available 101 presets (sound + pattern) |
| `load_101_preset` | R1D1 | Load a preset by ID (e.g., "acidLine", "fatBass") |
| `add_lead` | R1D1 | 16-step pattern with note, gate, accent, slide |
| `tweak_lead` | R1D1 | level (dB), cutoff (Hz), osc/envelope params (0-100), lfoToPitch (semitones) |
| `list_kits` | R9DS | Show available sample kits (bundled + user) |
| `load_kit` | R9DS | Load a kit by ID (e.g., "808", "amber") |
| `add_samples` | R9DS | Program sample hits on steps (slot, step, velocity) |
| `tweak_samples` | R9DS | level (dB), tune (semitones), attack/decay (0-100), filter (Hz), pan (-100 to +100) |
| `show_sampler` | R9DS | Show current kit, slots, and pattern (what's loaded now) |
| `set_swing` | — | Groove amount 0-100% |
| `render` | — | Mix all synths to WAV file (uses arrangement if set) |
| `save_pattern` | Song | Save current pattern for an instrument to a named slot (A, B, C...) |
| `load_pattern` | Song | Load a saved pattern into current working pattern |
| `copy_pattern` | Song | Copy a pattern to a new name (for variations) |
| `list_patterns` | Song | List all saved patterns per instrument |
| `set_arrangement` | Song | Set song arrangement: sections with bar counts and pattern assignments |
| `clear_arrangement` | Song | Clear arrangement, return to single-pattern mode |
| `show_arrangement` | Song | Display current patterns and arrangement |
| `create_send` | Mixer | Create send bus with plate reverb (full param control) |
| `tweak_reverb` | Mixer | Adjust reverb parameters on existing send |
| `route_to_send` | Mixer | Route a voice to a send bus |
| `add_channel_insert` | Mixer | Add EQ/filter/ducker to channel OR individual drum voice (kick, snare, ch, etc.) |
| `remove_channel_insert` | Mixer | Remove EQ/filter/ducker from channel or drum voice |
| `add_sidechain` | Mixer | Sidechain ducking (bass ducks on kick) |
| `add_master_insert` | Mixer | Add effect to master bus |
| `analyze_render` | Mixer | Analyze WAV: levels, frequency, recommendations |
| `show_mixer` | Mixer | Display current mixer config |
| `save_preset` | Preset | Save current instrument settings as a user preset |
| `load_preset` | Preset | Load a user preset for any instrument |
| `list_presets` | Preset | List available user presets |

## User Presets

Save and load your own sound presets for any instrument. Presets are stored in `~/Documents/Jambot/presets/`.

```
# Save current drum settings
save_preset(instrument: 'drums', id: 'my-deep-kick', name: 'My Deep Kick')

# Save current bass settings
save_preset(instrument: 'bass', id: 'acid-screamer', name: 'Acid Screamer', description: 'High resonance, short decay')

# Load a preset
load_preset(instrument: 'drums', id: 'my-deep-kick')

# List all presets
list_presets()

# List presets for one instrument
list_presets(instrument: 'bass')
```

**What gets saved per instrument:**
- **drums**: voice params (level, tune, decay, etc.), kit/engine, sample modes
- **bass**: all synth params (cutoff, resonance, envMod, etc.)
- **lead**: all synth params, arp settings
- **sampler**: slot params (level, tune, filter, pan, etc.) — note: kit must be loaded separately

## Mixer (DAW-like Routing)

Jambot includes a virtual mixer for professional mixing:

### Send Buses (Reverb)
```
create_send(name: 'reverb', effect: 'reverb', decay: 2, damping: 0.5)
route_to_send(voice: 'ch', send: 'reverb', level: 0.4)
route_to_send(voice: 'clap', send: 'reverb', level: 0.3)
tweak_reverb(send: 'reverb', decay: 3, highcut: 6000)
```

Reverb parameters (Dattorro plate algorithm):
- `decay` (0.5-10s) - Tail length
- `damping` (0-1) - High-frequency rolloff (0=bright, 1=dark)
- `predelay` (0-100ms) - Gap before reverb
- `modulation` (0-1) - Pitch wobble for shimmer
- `lowcut` (20-500Hz) - Remove mud
- `highcut` (2000-20000Hz) - Tame harshness
- `width` (0-1) - Stereo spread
- `mix` (0-1) - Wet/dry balance

### Channel EQ
```
add_channel_insert(channel: 'bass', effect: 'eq', preset: 'acidBass')
add_channel_insert(channel: 'drums', effect: 'eq', preset: 'punchyKick')
```

EQ presets: `acidBass`, `crispHats`, `warmPad`, `punchyKick`, `cleanSnare`

EQ parameters (can override preset):
- `highpass` (Hz) - Cut frequencies below this
- `lowGain` (dB) - Low shelf boost/cut
- `midGain` (dB) - Mid peak boost/cut
- `midFreq` (Hz) - Mid peak frequency
- `highGain` (dB) - High shelf boost/cut

### Channel Filter
```
add_channel_insert(channel: 'bass', effect: 'filter', preset: 'dubDelay')
add_channel_insert(channel: 'drums', effect: 'filter', params: { mode: 'lowpass', cutoff: 2000, resonance: 40 })
```

Filter presets: `dubDelay` (LP 800Hz), `telephone` (BP 1500Hz), `lofi` (LP 3000Hz), `darkRoom` (LP 400Hz), `airFilter` (HP 500Hz), `thinOut` (HP 1000Hz)

Filter parameters:
- `mode` - lowpass, highpass, or bandpass
- `cutoff` (Hz) - Filter frequency
- `resonance` (0-100) - Filter Q/resonance (0=gentle, 100=screaming)

Use filter for: dub effects, lo-fi warmth, breakdown sweeps, telephone/radio sounds, dramatic frequency cuts.

### Per-Section Channel Inserts (Song Mode)

Channel inserts (filter, EQ) are saved with patterns. Supports individual drum voices (kick, snare, ch, oh, etc.).

```
# Apply highpass to ONLY THE KICK in part C
load_pattern(drums, C)
add_channel_insert(channel: 'kick', effect: 'filter', params: {mode: 'highpass', cutoff: 500})
save_pattern(drums, C)

# Apply filter to ALL drums in part C
load_pattern(drums, C)
add_channel_insert(channel: 'drums', effect: 'filter', params: {mode: 'lowpass', cutoff: 2000})
save_pattern(drums, C)

# Change filter settings on C
load_pattern(drums, C)
add_channel_insert(channel: 'kick', effect: 'filter', params: {mode: 'highpass', cutoff: 800})  # Replaces existing
save_pattern(drums, C)

# Remove filter from kick in A and D
load_pattern(drums, A)
remove_channel_insert(channel: 'kick', effect: 'filter')
save_pattern(drums, A)

load_pattern(drums, D)
remove_channel_insert(channel: 'kick', effect: 'filter')
save_pattern(drums, D)
```

Parts without filters in their saved state play without the filter. Always: **load → modify → save** for EACH part.

### Sidechain Ducking
```
add_sidechain(target: 'bass', trigger: 'kick', amount: 0.5)
```

### Master EQ
```
add_master_insert(effect: 'eq', preset: 'master')
```

### Analysis
```
analyze_render()  // Returns levels, frequency balance, recommendations
```

### Node Output Levels (Mixer)

Each instrument has a node-level output gain for balancing the mix:

```
tweak({ path: 'drums.level', value: -3 })    // Drums down 3dB
tweak({ path: 'sampler.level', value: 0 })   // Sampler at unity
tweak({ path: 'bass.level', value: -6 })     // Bass down 6dB
tweak({ path: 'lead.level', value: -3 })     // Lead down 3dB
```

Use `show_mixer` to see current output levels:
```
OUTPUT LEVELS:
  drums: 0dB  bass: -3dB  lead: -6dB  sampler: +2dB
```

Note: For multi-voice instruments (drums, sampler), this is separate from per-voice levels (`drums.kick.level`, `sampler.s1.level`). For single-voice instruments (bass, lead), this IS the voice level.

### Signal Flow
```
voice → [voice level] → [channel EQ/Filter] → [ducker] → node level → [send] → master → [master EQ/Filter] → output
                                                                         ↓
                                                                   send bus (reverb) → master
```

## Session State

```javascript
session = {
  bpm, swing, bars,
  // R9D9
  drumKit: 'default',  // Kit ID (e.g., 'bart-deep', 'punchy')
  drumPattern: { kick: [...], snare: [...], ... },
  drumParams: { kick: { decay, tune, ... }, ... },
  drumFlam: 0,              // Flam amount 0-1
  drumPatternLength: 16,    // Pattern length 1-16 steps
  drumScale: '16th',        // '16th', '8th-triplet', '16th-triplet', '32nd'
  drumGlobalAccent: 1,      // Global accent multiplier 0-1
  drumVoiceEngines: {},     // Per-voice engine { kick: 'E1', snare: 'E2', ... }
  drumUseSample: {},        // Sample mode for hats/cymbals { ch: true, oh: false, ... }
  drumAutomation: {},       // Per-step automation { ch: { decay: [0.1, 0.2, ...], level: [...] }, ... }
  // R3D3
  bassPattern: [{ note, gate, accent, slide }, ...],
  bassParams: { waveform, cutoff, resonance, envMod, decay, accent, level },
  // R1D1
  leadPreset: null,  // Preset ID (e.g., 'acidLine', 'fatBass')
  leadPattern: [{ note, gate, accent, slide }, ...],
  leadParams: { vcoSaw, vcoPulse, pulseWidth, subLevel, subMode, cutoff, resonance, envMod, attack, decay, sustain, release, lfoRate, lfoWaveform, lfoToPitch, lfoToFilter, lfoToPW, level },
  leadArp: { mode: 'off', octaves: 1, hold: false },  // mode: 'off', 'up', 'down', 'updown'
  // R9DS
  samplerKit: { id, name, slots: [{ id, name, short, buffer }] },
  samplerPattern: { s1: [{step, vel}, ...], s2: [...], ... },
  samplerParams: { s1: { level, tune, attack, decay, filter, pan }, ... },
  // Mixer
  mixer: {
    sends: { 'reverb': { effect: 'reverb', params: { mix: 0.3 } } },
    voiceRouting: { 'ch': { sends: { 'reverb': 0.4 } } },
    channelInserts: { 'bass': [{ type: 'ducker', params: { trigger: 'kick', amount: 0.5 } }] },
    masterInserts: [{ type: 'eq', preset: 'master' }],
    masterVolume: 0.8,
  },
  // Song Mode
  patterns: {
    drums: { 'A': {...}, 'B': {...} },   // Named patterns with full state
    bass: { 'A': {...}, 'B': {...} },
    lead: { 'A': {...} },
    sampler: { 'A': {...} },
  },
  currentPattern: { drums: 'A', bass: 'A', lead: 'A', sampler: 'A' },
  arrangement: [
    { bars: 4, patterns: { drums: 'A', bass: 'A' } },
    { bars: 8, patterns: { drums: 'B', bass: 'A', lead: 'A' } },
  ],
}
```

## Song Mode

Song mode enables multi-section arrangements with reusable patterns.

### Workflow

1. **Create patterns**: Program drums/bass/lead/sampler as usual
2. **Save patterns**: `save_pattern(instrument: 'drums', name: 'A')` — saves current state to named slot
3. **Create variations**: Load pattern, modify, save as new name (B, C, etc.)
4. **Set arrangement**: Define sections with bar counts and pattern assignments
5. **Render**: Outputs full song with patterns looping within each section

### How Patterns Loop

Each 16-step pattern loops to fill its section. A 16-step kick pattern playing over 8 bars loops 8 times. This matches hardware behavior (TR-909, MPC) and works musically — a 4-on-floor kick IS a loop.

### Example

```javascript
// 1. Create verse pattern
add_drums({ kick: [0,4,8,12], ch: [0,2,4,6,8,10,12,14] })
save_pattern({ instrument: 'drums', name: 'A' })

// 2. Create chorus with more energy
add_drums({ kick: [0,4,8,12], snare: [4,12], oh: [2,6,10,14] })
save_pattern({ instrument: 'drums', name: 'B' })

// 3. Arrange
set_arrangement({
  sections: [
    { bars: 4, drums: 'A', bass: 'A' },           // Intro
    { bars: 8, drums: 'B', bass: 'A', lead: 'A' }, // Main
    { bars: 4, drums: 'A' },                       // Breakdown (no bass/lead)
    { bars: 8, drums: 'B', bass: 'A', lead: 'A' }, // Main
  ]
})

// 4. Render full 24-bar song
render({ filename: 'full-track' })
```

### Pattern Contents

Each saved pattern captures the full state for that instrument:

- **drums**: pattern, params, automation, flam, length, scale, accent, engines, useSample
- **bass**: pattern, params
- **lead**: pattern, params, arp settings
- **sampler**: pattern, params

## Producer Library (Genres, Artists, Moods)

`library.json` is a unified knowledge base for production styles. Each entry has a `type` field: genre, artist, or mood. When users mention a style, the system auto-injects relevant knowledge into the agent's context.

**How it works:**
1. `detectLibraryKeys(text)` scans user input for keywords
2. `buildLibraryContext(keys)` formats entries by type for the system prompt
3. Agent receives: BPM range, drum/bass settings, philosophy, patterns, references

### Entry Types

**Genres** (17 entries):
- Classic House, Chicago House, Deep House, Tech House
- Detroit Techno, Berlin Techno, Industrial Techno, Minimal
- Acid House, Acid Techno
- Electro, Breakbeat, Trance
- Drum & Bass, Jungle
- Ambient, IDM

**Artists** (detailed style guides):
- Jeff Mills — minimalist Detroit techno, stripped patterns, relentless momentum

**Moods** (coming soon):
- Dark, Euphoric, Hypnotic, etc.

### Aliases

`LIBRARY_ALIASES` in `jambot.js` maps keywords to library keys:
- "house" → classic_house
- "techno" → berlin_techno
- "acid" → acid_house
- "jeff mills", "mills", "the wizard" → jeff_mills

### Adding Entries

**Genre:**
```json
"my_genre": {
  "type": "genre",
  "name": "My Genre",
  "bpm": [120, 130],
  "keys": ["minor"],
  "description": "...",
  "production": "...",
  "drums": { ... },
  "bass": { ... },
  "swing": 20,
  "references": ["Track 1", "Track 2"]
}
```

**Artist:**
```json
"artist_name": {
  "type": "artist",
  "name": "Artist Name",
  "genre": "detroit_techno",
  "bpm": [125, 138],
  "swing": 0,
  "description": "...",
  "philosophy": "...",
  "drums": { ... },
  "patterns": {
    "pattern_id": { "name": "...", "description": "...", "kick": [...], "ch": [...] }
  },
  "keywords": ["word1", "word2"],
  "references": ["Track 1", "Track 2"]
}
```

After adding, add aliases to `LIBRARY_ALIASES` in `jambot.js`.

## Slash Commands

| Command | Description |
|---------|-------------|
| `/r9d9` | R9D9 drum machine guide |
| `/r3d3` | R3D3 acid bass guide |
| `/r1d1` | R1D1 lead synth guide |
| `/r9ds` | R9DS sampler guide |
| `/kits` | List available sample kits |
| `/status` | Show current session |
| `/clear` | Reset session |
| `/new` | New project |
| `/open` | Open project |

## Splash Screen

Must fit 80x24 terminal. Currently 21 lines + prompt.

## Workflow

**Daily development**: Edit `jambot.js` / `ui.tsx`, commit/push. No builds needed.

**Cutting a release**: See README.md.
