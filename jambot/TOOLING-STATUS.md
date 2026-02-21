# Jambot Tooling Status

_Last updated: 2026-02-21_

## Summary

### ✅ Works reliably
- JB01
- JT90
- Delay effect

### ⚠️ Needs tuning
- JB202
- Analyze tools

### 🧪 Untested
- Sampler
- JT30
- JT10
- JP9000
- Sidechain
- Reverb
- EQ

### 🪦 Deprecated (do not use)
- JB200

---

## Detailed Status

| Area | Status | Notes | Next Action |
|---|---|---|---|
| JB01 | ✅ working | Core rendering and pattern workflows stable. | Keep regression tests running. |
| JT90 | ✅ working | Kick/hats and effect workflows working after latest fixes. | Keep sample-loading + voice tests in CI. |
| Delay effect | ✅ working | Ping-pong + feedback/mix behaving as expected in recent tests. | Add preset coverage tests (low/high feedback). |
| JB202 | ⚠️ needs tuning | Octave/analysis validation still not fully trustworthy. | Tighten octave test + peak/fundamental validation. |
| Analyze tools | ⚠️ needs tuning | Major fixes landed, but mud/resonance sensitivity and some peak interpretations still need calibration. | Continue test matrix + threshold/normalization tuning. |
| Sampler | 🧪 untested | Kit loading/playback not validated in current pass. | Run kit load, multi-slot trigger, tune/decay/level checks. |
| JT30 | 🧪 untested | Not yet validated in current pass. | Run synth + render + analyzer smoke tests. |
| JT10 | 🧪 untested | Not yet validated in current pass. | Run synth + render + analyzer smoke tests. |
| JP9000 | 🧪 untested | Modular synth stack not validated in this round. Modules to test: osc-saw, osc-square, osc-triangle, string (Karplus), filter-lp24, filter-biquad, env-adsr, vca, mixer, drive, sequencer. | Build per-module smoke patches + one integrated patch test. |
| Sidechain | 🧪 untested | Sidechain detection and behavior not yet validated in this round. | Build kick+bass ducking test and verify with analysis. |
| Reverb | 🧪 untested | Send/insert reverb workflows not validated in this round. | Run wet/dry, decay, damping, and routing checks. |
| EQ | 🧪 untested | EQ insert behavior and analyzer impact not yet validated. | Run band gain/cut sweeps and compare spectra. |
| JB200 | 🪦 deprecated | Legacy alias only. Do not use for new work. Prefer JB202. | Keep for compatibility only; no new tests unless regression requires. |

---

## Status Legend
- ✅ working = production-ready in current testing
- ⚠️ needs tuning = usable, but quality/reliability improvements required
- ❌ broken = blocked / unreliable
- 🧪 untested = not yet validated
