# Jambot Status

Last updated: 2025-01-23

See **PLATFORM.md** for architecture documentation.

---

## What Works

| Component | Status | Notes |
|-----------|--------|-------|
| **JB01** | ✅ | Drum machine, 8 voices, registered in ParamSystem |
| **JB200** | ✅ | Bass monosynth (2 osc, filter, drive), registered |
| **Sampler** | ✅ | 10-slot sample player, registered |
| **R9D9 (TR909)** | ✅ | 11-voice drum machine, registered |
| **R3D3 (TB303)** | ✅ | Acid bass, registered |
| **R1D1 (SH101)** | ✅ | Lead synth, registered |
| **ParamSystem** | ✅ | Unified `session.get()`/`session.set()` |
| **Clock** | ✅ | Single source of truth for timing |
| **Generic render** | ✅ | One loop over instruments, each calls `renderPattern()` |
| **Delay effect** | ✅ | Analog + ping-pong modes, tempo sync |
| **Reverb effect** | ✅ | Plate reverb with full controls |
| **Per-voice effects** | ✅ | Effects on `jb01.ch`, `jb01.kick`, etc. |
| **Instrument effects** | ✅ | Effects on whole instrument |
| **Master effects** | ✅ | Effects on final mix |
| **EQ/Filter inserts** | ✅ | Channel inserts with presets |
| **Sidechain ducking** | ✅ | Bass ducks on kick, etc. |
| **Song mode** | ✅ | Patterns A/B/C, arrangements |

## Architecture

**Canonical instruments:** `jb01`, `jb200`, `sampler`, `r9d9`, `r3d3`, `r1d1`

**Aliases:** `drums`→jb01, `bass`→jb200, `lead`→jb200, `synth`→jb200

**Patterns:** Stored by canonical ID only (no separate drums/bass/lead pattern slots)

**Rendering:** Generic loop in `render.js` calls each instrument's `renderPattern()`, applies effect chains (voice→instrument→master), and mixes buffers

**Effects flow:**
```
voice → [voice effects] → mix → [instrument effects] → [master effects] → output
```

## Recent Changes (Jan 2025)

- **Delay effect** — Analog (mono+saturation) and ping-pong (stereo bounce) modes
- **Flexible effect routing** — Effects can target instruments, individual voices, or master
- **Code cleanup** — Removed deprecated tool files, extracted tool definitions to separate file
- **Generic render loop** — Refactored from instrument-specific code to generic loop

## File Structure (Key Files)

```
jambot/
├── jambot.js                    # Agent loop (~540 lines)
├── tools/
│   ├── tool-definitions.js      # 65 tool schemas (~980 lines)
│   └── index.js                 # Tool registry + handlers
├── core/
│   ├── session.js               # Session manager, instruments, aliases
│   ├── render.js                # Generic render loop, effect processing
│   └── params.js                # ParamSystem
└── effects/
    ├── delay-node.js            # Delay effect
    └── reverb-node.js           # Reverb effect
```

## Known Issues

- None currently blocking

## What's Coming

| Feature | Priority | Notes |
|---------|----------|-------|
| **Tape loop effect** | Next | Analog memory machine |
| **More synth engines** | Low | Additional synth types |
