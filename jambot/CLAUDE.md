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

## The Droid Trio

| Synth | Engine | Description |
|-------|--------|-------------|
| **R9D9** | TR-909 | Drum machine (11 voices) |
| **R3D3** | TB-303 | Acid bass synth |
| **R1D1** | SH-101 | Lead/poly synth |

## Synth Sources

Engines imported from `web/public/`:
- R9D9: `../web/public/909/dist/machines/tr909/engine-v3.js`
- R3D3: `../web/public/303/dist/machines/tb303/engine.js`
- R1D1: `../web/public/101/dist/machines/sh101/engine.js`

**Do NOT duplicate synth code** - always import from web/public/.

## Tools Available to Agent

| Tool | Synth | Description |
|------|-------|-------------|
| `create_session` | — | Set BPM (60-200), reset all patterns |
| `add_drums` | R9D9 | 11 voices: kick, snare, clap, ch, oh, ltom, mtom, htom, rimshot, crash, ride |
| `tweak_drums` | R9D9 | Adjust decay, tune, tone, level per voice |
| `add_bass` | R3D3 | 16-step pattern with note, gate, accent, slide |
| `tweak_bass` | R3D3 | waveform, cutoff, resonance, envMod, decay, accent |
| `add_lead` | R1D1 | 16-step pattern with note, gate, accent, slide |
| `tweak_lead` | R1D1 | vcoSaw, vcoPulse, pulseWidth, subLevel, cutoff, resonance, envMod, attack, decay, sustain, release |
| `set_swing` | — | Groove amount 0-100% |
| `render` | — | Mix all synths to WAV file |

## Session State

```javascript
session = {
  bpm, swing, bars,
  // R9D9
  drumPattern: { kick: [...], snare: [...], ... },
  drumParams: { kick: { decay, tune, ... }, ... },
  // R3D3
  bassPattern: [{ note, gate, accent, slide }, ...],
  bassParams: { waveform, cutoff, resonance, envMod, decay, accent },
  // R1D1
  leadPattern: [{ note, gate, accent, slide }, ...],
  leadParams: { vcoSaw, vcoPulse, ... },
}
```

## Slash Commands

| Command | Description |
|---------|-------------|
| `/r9d9` | R9D9 drum machine guide |
| `/r3d3` | R3D3 acid bass guide |
| `/r1d1` | R1D1 lead synth guide |
| `/status` | Show current session |
| `/clear` | Reset session |
| `/new` | New project |
| `/open` | Open project |

## Splash Screen

Must fit 80x24 terminal. Currently 21 lines + prompt.

## Workflow

**Daily development**: Edit `jambot.js` / `ui.tsx`, commit/push. No builds needed.

**Cutting a release**: See README.md.
