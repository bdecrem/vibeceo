# Jambot - Claude Code Instructions

AI-powered music creation CLI. Natural language → multi-synth tracks → WAV files.

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

| Tool | Synth | Description |
|------|-------|-------------|
| `create_session` | — | Set BPM (60-200), reset all patterns |
| `list_projects` | — | List all saved projects |
| `open_project` | — | Open a project by name/folder to continue working |
| `rename_project` | — | Rename current project |
| `list_909_kits` | R9D9 | Show available 909 kits (sound presets) |
| `load_909_kit` | R9D9 | Load a kit by ID (e.g., "bart-deep", "punchy") |
| `add_drums` | R9D9 | 11 voices: kick, snare, clap, ch, oh, ltom, mtom, htom, rimshot, crash, ride |
| `tweak_drums` | R9D9 | Adjust decay, tune, tone, level per voice |
| `add_bass` | R3D3 | 16-step pattern with note, gate, accent, slide |
| `tweak_bass` | R3D3 | waveform, cutoff, resonance, envMod, decay, accent, level |
| `list_101_presets` | R1D1 | Show available 101 presets (sound + pattern) |
| `load_101_preset` | R1D1 | Load a preset by ID (e.g., "acidLine", "fatBass") |
| `add_lead` | R1D1 | 16-step pattern with note, gate, accent, slide |
| `tweak_lead` | R1D1 | vcoSaw, vcoPulse, pulseWidth, subLevel, cutoff, resonance, envMod, attack, decay, sustain, release, level |
| `list_kits` | R9DS | Show available sample kits (bundled + user) |
| `load_kit` | R9DS | Load a kit by ID (e.g., "808", "amber") |
| `add_samples` | R9DS | Program sample hits on steps (slot, step, velocity) |
| `tweak_samples` | R9DS | Adjust level, tune, attack, decay, filter, pan per slot |
| `set_swing` | — | Groove amount 0-100% |
| `render` | — | Mix all synths to WAV file |
| `create_send` | Mixer | Create send bus with plate reverb (full param control) |
| `tweak_reverb` | Mixer | Adjust reverb parameters on existing send |
| `route_to_send` | Mixer | Route a voice to a send bus |
| `add_channel_insert` | Mixer | Add EQ/ducker to channel |
| `add_sidechain` | Mixer | Sidechain ducking (bass ducks on kick) |
| `add_master_insert` | Mixer | Add effect to master bus |
| `analyze_render` | Mixer | Analyze WAV: levels, frequency, recommendations |
| `show_mixer` | Mixer | Display current mixer config |

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

### Signal Flow
```
voice → [channel EQ] → [ducker] → channel gain → [send] → master → [master EQ] → output
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
}
```

## Genre Knowledge System

`genres.json` contains deep production knowledge for 17 genres. When users mention a genre, the system auto-injects relevant knowledge into the agent's context.

**How it works:**
1. `detectGenres(text)` scans user input for genre keywords
2. `buildGenreContext(keys)` formats the genre data for the system prompt
3. Agent receives: BPM range, keys, swing, drum/bass settings, production philosophy

**Supported genres:**
- Classic House, Chicago House, Deep House, Tech House
- Detroit Techno, Berlin Techno, Industrial Techno, Minimal
- Acid House, Acid Techno
- Electro, Breakbeat, Trance
- Drum & Bass, Jungle
- Ambient, IDM

**Aliases:** "house" → classic_house, "techno" → berlin_techno, "acid" → acid_house, etc.

**To add a genre:** Add entry to `genres.json` with name, bpm, keys, description, production, drums, bass, swing, references. Then add aliases to `GENRE_ALIASES` in `jambot.js`.

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
