# Jambot Tooling Status

_Last updated: 2026-02-21_

## Summary

### ✅ Fully working
- JB01
- JT90
- Delay effect

### ⚠️ Needs tuning
- JB202
- Analyze tools

### 🧪 Untested
- JT30
- JT10
- Sidechain
- Reverb
- EQ

---

## Detailed Status

| Area | Status | Notes | Next Action |
|---|---|---|---|
| JB01 | ✅ working | Core rendering and pattern workflows stable. | Keep regression tests running. |
| JT90 | ✅ working | Kick/hats and effect workflows working after latest fixes. | Keep sample-loading + voice tests in CI. |
| Delay effect | ✅ working | Ping-pong + feedback/mix behaving as expected in recent tests. | Add preset coverage tests (low/high feedback). |
| JB202 | ⚠️ needs tuning | Octave/analysis validation still not fully trustworthy. | Tighten octave test + peak/fundamental validation. |
| Analyze tools | ⚠️ needs tuning | Major fixes landed, but mud/resonance sensitivity and some peak interpretations still need calibration. | Continue test matrix + threshold/normalization tuning. |
| JT30 | 🧪 untested | Not yet validated in current pass. | Run synth + render + analyzer smoke tests. |
| JT10 | 🧪 untested | Not yet validated in current pass. | Run synth + render + analyzer smoke tests. |
| Sidechain | 🧪 untested | Sidechain detection and behavior not yet validated in this round. | Build kick+bass ducking test and verify with analysis. |
| Reverb | 🧪 untested | Send/insert reverb workflows not validated in this round. | Run wet/dry, decay, damping, and routing checks. |
| EQ | 🧪 untested | EQ insert behavior and analyzer impact not yet validated. | Run band gain/cut sweeps and compare spectra. |

---

## Status Legend
- ✅ working = production-ready in current testing
- ⚠️ needs tuning = usable, but quality/reliability improvements required
- ❌ broken = blocked / unreliable
- 🧪 untested = not yet validated
