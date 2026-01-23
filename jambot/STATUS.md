# Jambot Status

Last updated: 2025-01-22

See **PLATFORM.md** for architecture documentation.

---

## What Works

| Component | Notes |
|-----------|-------|
| **JB01** | Drum machine, registered in ParamSystem |
| **JB200** | Bass monosynth, registered in ParamSystem |
| **Sampler** | 10-slot sample player, registered |
| **R9D9 (TR909)** | 11-voice drum machine, registered |
| **R3D3 (TB303)** | Acid bass, registered |
| **R1D1 (SH101)** | Lead synth, registered |
| **ParamSystem** | Unified `session.get()`/`session.set()` |
| **Clock** | Single source of truth for timing |
| **Generic render** | One loop over instruments, each calls `renderPattern()` |

## Architecture

**Canonical instruments:** `jb01`, `jb200`, `sampler`, `r9d9`, `r3d3`, `r1d1`

**Aliases:** `drums`→jb01, `bass`→jb200, `lead`→jb200, `synth`→jb200

**Patterns:** Stored by canonical ID only (no separate drums/bass/lead pattern slots)

**Rendering:** Generic loop in `render.js` (~160 lines) calls each instrument's `renderPattern()` and mixes buffers

## What's Coming

| Feature | Status | Notes |
|---------|--------|-------|
| **Effects/Sends** | Config exists, processing not wired | `session.mixer` has structure ready |
| **Delay pedal** | Next | Will add processing code to render.js |
| **Channel inserts** | Planned | EQ, filter per instrument |
| **Master inserts** | Planned | Effects on final mix |

## Next Steps

1. **Build delay pedal** — Create effect that processes buffers
2. **Add effect processing to render.js** — Loop over `session.mixer.masterInserts`, apply effects
3. **Channel inserts** — Per-instrument effect chains
