# SynthMachine - ARCHIVED

This folder contained the original TypeScript source for the TR-909 drum machine. **It has been deprecated.**

## Where the Real Source Code Lives

All synth source code now lives directly in `web/public/`:

| Instrument | Source Location | Notes |
|------------|-----------------|-------|
| **TR-909** | `web/public/909/dist/*.js` | Drum machine (synthesized) |
| **R9-DS** | `web/public/90s/dist/*.js` | Drum machine (sample-based) |
| **TB-303** | `web/public/303/dist/*.js` | Acid bass synthesizer |
| **SH-101** | `web/public/101/dist/*.js` | Lead synthesizer |
| **Mixer** | `web/public/mixer/dist/*.js` | Session + effects |

**Edit these JavaScript files directly.** No build step required.

## Documentation

See: `sms-bot/documentation/SYNTHMACHINE-GUIDE.md`

This guide covers:
- All 5 instruments and their APIs
- Pattern formats for each synth
- Mixer & effects (sidechain, EQ, reverb)
- DAW workflow for creative sessions
- Voice parameters and presets

## Why This Was Archived

The original TypeScript in this folder compiled to `synthmachine/dist/`, but the web app uses `web/public/909/dist/`. They diverged and required manual copying.

To simplify:
1. All synths now use JavaScript source directly (no build step)
2. This matches how 303, 101, 90s, and mixer already worked
3. Amber/Claude can edit files directly without rebuilding

## Archived Contents

The `_archived/` subfolder contains the original TypeScript source:
- `core/` - Reusable synthesis foundation
- `machines/tr909/` - TR-909 implementation
- `api/` - CLI and Python bindings
- `tools/` - Audio analysis utilities
- `PLAN.md`, `STATUS.md` - Original design docs

This code is preserved for reference but should not be used.
