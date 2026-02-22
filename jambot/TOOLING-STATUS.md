# Jambot Tooling Status

_Last updated: 2026-02-21_

## Summary

### ✅ Works reliably
- JB01
- JT90
- JT10
- JT30
- Delay effect
- Filter effect

### ⚠️ Needs tuning
- JB202 (waveform selection may not match — triangle renders as sine)
- Analyze tools (mud/resonance sensitivity, peak ordering)

### 🧪 Untested
- JP9000 (modular — not yet committed)
- Sampler (not yet committed)
- Sidechain
- EQ

### ❌ Broken
- Reverb (send bus not mixed into render output — bit-identical dry/wet)

### 🪦 Deprecated (do not use)
- JB200

---

## Detailed Status

| Area | Status | Notes | Next Action |
|---|---|---|---|
| JB01 | ✅ working | Core rendering and pattern workflows stable. | Keep regression tests running. |
| JT90 | ✅ working | Kick/hats and effect workflows working after latest fixes. | Keep sample-loading + voice tests in CI. |
| JT10 | ✅ working | Lead synth renders correctly. 16-step patterns, saw+pulse+sub oscs, filter, glide all functional. Tested 2026-02-21. | Test automation + glide more deeply. |
| JT30 | ✅ working | Acid bass synth renders correctly. Slides, accents, resonance, drive all functional. Tested 2026-02-21. | Test extreme reso + env mod ranges. |
| Delay effect | ✅ working | Ping-pong + feedback/mix behaving as expected in recent tests. | Add preset coverage tests (low/high feedback). |
| Filter effect | ✅ working | Lowpass insert on instrument output works. Cutoff automation confirmed working. Tested 2026-02-21. | Test highpass/bandpass modes. |
| JB202 | ⚠️ needs tuning | Waveform bug: triangle setting renders as sine (confirmed via oscilloscope). Octave/analysis validation still not fully trustworthy. | Fix waveform selection in headless path. |
| Analyze tools | ⚠️ needs tuning | Major fixes landed, but mud/resonance sensitivity and some peak interpretations still need calibration. Waveform detection low-confidence (57% sine vs 55% saw). | Continue test matrix + threshold/normalization tuning. |
| JP9000 | 🧪 untested | Modular synth stack — not yet committed. Modules: osc-saw, osc-square, osc-triangle, string (Karplus), filter-lp24, filter-biquad, env-adsr, vca, mixer, drive, sequencer. | Build per-module smoke patches + one integrated patch test. |
| Sampler | 🧪 untested | Kit loading/playback — not yet committed. | Run kit load, multi-slot trigger, tune/decay/level checks. |
| Sidechain | 🧪 untested | New DSP landed (`effects/sidechain.js`) but not validated in this round. | Build kick+bass ducking test and verify with analysis. |
| EQ | 🧪 untested | New DSP landed (`effects/eq.js`) but not validated in this round. | Run band gain/cut sweeps and compare spectra. |
| Reverb | ❌ broken | New reverb DSP landed (`effects/reverb.js`) but send bus is never mixed into render output. Dry vs wet renders are bit-identical (confirmed via SHA hash). Root cause: `render.js` processes effect chains but has no send/return bus mixing stage. | Add send processing stage to render.js — collect routed voice buffers, apply send effect, mix return into master. |
| JB200 | 🪦 deprecated | Legacy alias only. Do not use for new work. Prefer JB202. | Keep for compatibility only; no new tests unless regression requires. |

---

## Status Legend
- ✅ working = production-ready in current testing
- ⚠️ needs tuning = usable, but quality/reliability improvements required
- ❌ broken = blocked / unreliable
- 🧪 untested = not yet validated
- 🪦 deprecated = do not use
