# Jambot - Claude Code Instructions

AI-powered music creation CLI. Natural language → drum beats → WAV files.

## Quick Reference

```bash
npm start          # Run jambot
npm run build      # Build for release (only when cutting a release)
```

## Architecture

Single file app: `jambot.js` contains everything:
- Agent loop (Anthropic API)
- Tools (create_session, add_drums, tweak_drums, set_swing, render)
- Interactive CLI (readline + inquirer)
- WAV encoder
- Splash screen

## Key Files

| File | Purpose |
|------|---------|
| `jambot.js` | Main app - agent + tools + CLI |
| `build.js` | esbuild bundler for releases |
| `releases/v0.0.1/` | Separate git repo → github.com/bdecrem/jambot |

## Workflow

**Daily development**: Edit `jambot.js`, commit/push to vibeceo. No builds needed.

**Cutting a release**: See README.md for steps.

## Synth Source

TR-909 engine imported from: `../web/public/909/dist/machines/tr909/engine.js`

Do NOT duplicate synth code - always import from web/public/909/.

## Tools Available to Agent

| Tool | Description |
|------|-------------|
| `create_session` | Set BPM (60-200) |
| `add_drums` | Pattern with all 11 voices: kick, snare, clap, ch, oh, ltom, mtom, htom, rimshot, crash, ride |
| `tweak_drums` | Adjust decay, tune, tone, level per voice |
| `set_swing` | Groove amount 0-100% |
| `render` | Output to WAV file |

## Splash Screen

Must fit 80×24 terminal (default macOS). Currently 23 lines + prompt on line 24.

When updating splash, count lines to ensure it fits.
