# Jambot Inventory — what works, verified when

**Authoritative status file.** Every row below was exercised on the date shown, through the headless tool layer (the same surface the agent uses), rendered to WAV, and measured — not just "didn't throw". Re-verify with:

```bash
node jambot/tests/inventory.js [outDir]     # ~90 s; prints PASS/FAIL per check + a summary table, writes inventory-results.json
node jambot/tests/run-tests.js              # architecture suite (params, interface contract, defaults, oscillators, analyzer)
```

When you change an instrument or effect: re-run, fix the date on the rows you re-verified, and move anything that regressed to ❌ with a note. Machine for the 2026-09-02 run: iMac M1, macOS, Node 25.2.1, `node-web-audio-api` per package.json. Older status docs (`STATUS.md` 2025-01, `TOOLING-STATUS.md` 2026-02) are superseded by this file.

Legend: ✅ works as designed · ⚠️ works with a caveat you must know · ❌ broken · 🪦 deprecated · 🧪 not covered by the inventory yet

## Instruments

| Instrument | ID | Status | Verified | Checks | What was verified / caveats |
|---|---|---|---|---|---|
| JB01 drum machine | `jb01` | ✅ | 2026-09-02 | 9/9 | All 8 voices render solo with the expected hit count; full kit renders 2 bars without clipping (peak −1.5 dBFS). |
| JT90 909-style drums | `jt90` | ✅ | 2026-09-02 | 12/12 | All 11 voices incl. the 4 sample-based ones (ch/oh/crash/ride load from `web/public/jt90/samples`); full kit peaks −0.2 dBFS — hot, no clipping. |
| JB202 bass synth | `jb202` | ✅ | 2026-09-02 | 3/3 | C2 pattern renders at the right fundamental (f0 26 dB above decoys); accent+slide renders; filter cutoff 200→6000 Hz raises >2 kHz by 12.6 dB. |
| JT30 acid bass | `jt30` | ✅ | 2026-09-02 | 3/3 | C2 fundamental correct; accent+slide renders; cutoff sweep is dramatic (+48.6 dB above 2 kHz). |
| JT10 lead/bass | `jt10` | ✅ | 2026-09-02 | 3/3 | C3 pattern renders; strongest partial is one octave below C3 (the sub-oscillator is on by default — expected, but know it when analyzing); cutoff sweep +9 dB. |
| JP9000 modular | `jp9000` | ⚠️ | 2026-09-02 | 5/5 | Presets `basic`, `pluck`, `dualBass` and a custom `add_module`/`connect_modules` patch all render at the right pitch. **Caveat: default output is ~12 dB too hot — `basic`/`dualBass` clip thousands of samples at `jp9000.level = 0`.** Set `jp9000.level` to −14 dB or lower before rendering (verified clean at −14; still clipped at −9). |
| JB-S sampler | `jbs` | ✅ | 2026-09-02 | 22/22 | Both bundled kits (`808`, `amber`) load; all 10 slots of each render; per-hit velocity works (vel 1.0 vs 0.25 = 12 dB apart). |
| JB200 | `jb200` | 🪦 | 2026-09-02 | 1/1 | Deprecated alias. `add_jb200` reports "4 notes" but the render is digital silence. Do not use; use `jb202`. |
| TR909 / TB303 / SH101 node classes | — | 🧪 | — | — | Exported from `instruments/index.js` as legacy wrappers but not reachable through any tool. Not tested. |

## Effects

| Effect | How it's added | Status | Verified | Checks | What was verified / caveats |
|---|---|---|---|---|---|
| Delay | `add_effect` (instrument, voice, or master) | ✅ | 2026-09-02 | 4/4 | Analog mode: echoes at 375 and 750 ms; ping-pong: strong L/R alternation (side/mid 0.66); tempo sync `8th` lands at 234 ms @128; works on a single voice (`jb01.ch`). |
| Reverb | `add_effect` | ✅ | 2026-09-02 | 3/3 | Tail present and wet≠dry on `jt10`, `jb01`, and `master`. (Was ❌ in the Feb 2026 status; fixed since.) |
| EQ insert | `add_channel_insert` / `add_master_insert` | ⚠️ | 2026-09-02 | 2/3 | Works on a whole instrument (`jb01` highGain −18 → −7 dB above 4 kHz, lows untouched) and on master (lowGain −18 → −12 dB below 120 Hz). **Per-voice insert (`channel: 'ch'`) is silently ignored** — output bit-identical to dry. |
| Filter insert | `add_channel_insert` | ⚠️ | 2026-09-02 | 3/4 | Lowpass, highpass, bandpass and the `telephone` preset all work on a whole instrument (lowpass 400 Hz: −50 dB above 3 kHz; highpass 2 kHz: −60 dB below 120 Hz). **Per-voice insert (`channel: 'ch'`) is silently ignored.** For per-voice processing use `add_effect` with a `jb01.ch`-style target (delay verified) — inserts don't reach voices. |
| Sidechain | `add_sidechain` | ✅ | 2026-09-02 | 1/1 | Kick ducks a sustained JB202 line: 4.5 dB deeper after-kick dip than the dry render (300–2 kHz band). |
| Analyze node | `effects/analyze-node.js` | 🧪 | — | — | Not exercised as an effect; see the analysis tools row. |

## Services and tools

| Area | Status | Verified | Checks | What was verified / caveats |
|---|---|---|---|---|
| Automation (`automate`) | ✅ | 2026-09-02 | 1/1 | `jb01.ch.decay` 100→5 over 16 steps: step-1 tail is 33 dB louder than step-16 tail. |
| Song mode (`save_pattern`, `set_arrangement`) | ✅ | 2026-09-02 | 1/1 | A×2 + B×2 bars renders 7.5 s + tail; the B-only hats appear only in the second half. |
| Session `save()` / `load()` | ✅ | 2026-09-02 | 1/1 | Reloaded state renders bit-identical audio. |
| Params (`tweak`, `get_param`, `list_params`) | ⚠️ | 2026-09-02 | 1/3 | Instrument paths round-trip (`jb01.kick.decay` = 33). **`fx.*` paths are broken both ways:** `get_param fx.jb01.filter1.cutoff` returns `InfinitykHz` and `fx.jb01.eq1.highGain` returns `-60dB` regardless of the value (the audio *is* processed with the right values); `tweak` on an `fx.*` path fails with `Unknown node "fx"`. Use `tweak_effect` for effect chains; channel inserts have no working post-creation tweak. `list_params` takes `{ node }`, not `{ instrument }`. |
| Analysis tools (`check_sox`, `analyze_render`, `get_spectral_peaks`, `detect_waveform`) | ⚠️ | 2026-09-02 | 4/4 | All respond and sox is installed. **Quality caveat:** `get_spectral_peaks` works on a ~21.5 Hz bin grid and on a JT10 A2 line ranked a 22 Hz artifact first (A2 came third, −37 cents); `detect_waveform` called the same JT10 line "triangle 70% / sawtooth 68%". Reliable on pure test tones (architecture suite passes 32/32), not on real synth output. Matches the Feb 2026 "needs tuning" note. |
| Routing / tracks / sends (`list_tracks`, `show_routing`, `list_sends`, `show_mixer`, `show`, `get_state`) | ✅ | 2026-09-02 | 1/1 | All respond sanely (smoke only — sends/routes were not rendered through). `show` and `get_state` require an instrument/node argument. |
| Render (`render`) | ✅ | 2026-09-02 | — | Every render above wrote a valid 16-bit stereo WAV. Note: **renders append a 2 s tail**, so a 1-bar render at 128 BPM is 3.875 s, not 1.875 s. |
| Architecture suite (`tests/run-tests.js`) | ✅ | 2026-09-02 | 32/32 | param round-trip, interface contract, defaults consistency, oscillators, analyzer. |
| Terminal UI (`npm start`), agent loop, MIDI export, project persistence | 🧪 | — | — | Not covered by the inventory script. |

## Web UIs (browser build of the same engines)

Checked 2026-09-02 in headless Chromium: page loads, every referenced asset 200, no console errors, transport toggles.

| UI | Working URL | Status | Notes |
|---|---|---|---|
| JB01 | https://webtoys.ai/jb01/ui/jb01/index.html | ✅ | Clean load, play toggles. |
| JB202 | https://webtoys.ai/jb202/ui/jb202/index.html | ✅ | Clean load, play toggles. |
| JT10 | https://webtoys.ai/jt10/ui/jt10/index.html | ✅ | Clean load. |
| JT30 | https://webtoys.ai/jt30/ui/jt30/index.html | ✅ | Clean load. |
| JB-S | https://webtoys.ai/jbs/ui/jbs/index.html | ✅ | Clean load. |
| JT90 | https://webtoys.ai/jt90/ui/jt90/index.html | ✅ | Fixed 2026-09-03: the Railway service `www.kochi.to` (which serves webtoys.ai) carried the pre-rotation Supabase service key; replaced via `railway variables --set`, redeployed, `/api/synth-kits` and `/api/synth-patterns` return 200 and the UI loads with no failed requests. |
| SynthMachine index | https://webtoys.ai/synthmachine/index.html | ✅ | Landing page. |

**The `kochi.to/...` URLs in CLAUDE.md and the DK docs are dead** (Vercel NOT_FOUND for every path but the root, as of 2026-09-02). The same deployment serves everything under `webtoys.ai`.

## Open defects (from this run)

1. Per-voice channel inserts (`add_channel_insert` with a voice like `ch`) are accepted and listed in `show_mixer` but never applied — EQ and filter both. Whole-instrument and master inserts work.
2. `get_param` on `fx.*` paths returns nonsense (`InfinitykHz`, `-60dB`); `tweak` on `fx.*` paths errors with `Unknown node "fx"`. The ParamSystem registers inserts under `fx.<channel>.<id>` but neither read nor write resolves through that prefix.
3. JP9000 default output level clips (see instrument row). Not a crash, but every `basic`/`dualBass` render at level 0 is distorted.
4. `add_jb200` renders silence (deprecated, but it should probably refuse loudly instead).
5. JT90 web UI preset APIs return 500.

## 2026-09-02, later: reconciled with the 2026-07-27 audit wave

This file was first written against a stale checkout. Re-run on origin/main (b67cc9d02): 84/85 checks pass out of the box — upstream already had the `fx.*` param fix, JP9000 headroom, the JB200 retirement, and effect correctness. Still needed and applied here: per-voice channel inserts (bare `ch`/`kick` targets now namespace to `jb01.<voice>` in `canonicalTargetId`), the native-FFT spectral analyzer + slope-imbalance waveform scoring.

New finding from building `silt` (hilma `scripts/dub-tribal/`): **JB01's render cost grows with the square of its hit count** — it schedules Web Audio nodes per hit and the graph never sheds them: 16 bars of 16ths render in 0.3 s, 32 bars in 75 s, 64 bars in minutes. JT90, JT30, JB202, JP9000 and JB-S are linear (256 bars in 4–45 s). Workaround: render JB01 in ≤4-bar chunks and overlap-add. Also: a turned-down instrument still renders in full, so stem renders belong in separate sessions.

## Appendix — every check from the 2026-09-02 run

| Group | Check | Result | Measurement |
|---|---|---|---|
| jb01 | voice kick | PASS | peak -5.4 dBFS, rms -17.3, clip 0, 3.875s, onsets 20/4 at 0.005,0.085,0.175,0.276 |
| jb01 | voice snare | PASS | peak -3.6 dBFS, rms -28, clip 0, 3.875s, onsets 4/4 at 0.005,0.476,0.942,1.413 |
| jb01 | voice clap | PASS | peak -12 dBFS, rms -36.4, clip 0, 3.875s, onsets 8/4 at 0.005,0.085,0.476,0.566 |
| jb01 | voice ch | PASS | peak -18.6 dBFS, rms -51.2, clip 0, 3.875s, onsets 4/4 at 0.005,0.476,0.942,1.413 |
| jb01 | voice oh | PASS | peak -17.6 dBFS, rms -45.6, clip 0, 3.875s, onsets 4/4 at 0.005,0.476,0.942,1.413 |
| jb01 | voice lowtom | PASS | peak -4 dBFS, rms -22.3, clip 0, 3.875s, onsets 13/4 at 0.01,0.105,0.185,0.476 |
| jb01 | voice hitom | PASS | peak -4.8 dBFS, rms -24.5, clip 0, 3.875s, onsets 8/4 at 0.01,0.11,0.476,0.556 |
| jb01 | voice cymbal | PASS | peak -16.5 dBFS, rms -40.4, clip 0, 3.875s, onsets 4/4 at 0.005,0.476,0.942,1.413 |
| jb01 | full kit (2 bars) | PASS | peak -1.5 dBFS, rms -15.9, clip 0, 5.75s (2 bars + 2 s tail) |
| jt90 | voice kick | PASS | peak -4.1 dBFS, rms -18.5, clip 0, 3.875s, onsets 20/4 at 0.035,0.125,0.226,0.326 |
| jt90 | voice snare | PASS | peak -8.1 dBFS, rms -33.7, clip 0, 3.875s, onsets 3/4 at 0.466,0.937,1.403 |
| jt90 | voice clap | PASS | peak -9.3 dBFS, rms -34.2, clip 0, 3.875s, onsets 5/4 at 0.025,0.466,0.581,0.937 |
| jt90 | voice rimshot | PASS | peak -5.8 dBFS, rms -32.4, clip 0, 3.875s, onsets 3/4 at 0.466,0.937,1.403 |
| jt90 | voice lowtom | PASS | peak -2.7 dBFS, rms -16.6, clip 0, 3.875s, onsets 16/4 at 0.005,0.09,0.18,0.266 |
| jt90 | voice midtom | PASS | peak -2.8 dBFS, rms -17.3, clip 0, 3.875s, onsets 3/4 at 0.466,0.937,1.403 |
| jt90 | voice hitom | PASS | peak -2.7 dBFS, rms -18.5, clip 0, 3.875s, onsets 3/4 at 0.466,0.937,1.403 |
| jt90 | voice ch | PASS | peak -7.1 dBFS, rms -34, clip 0, 3.875s, onsets 3/4 at 0.466,0.937,1.403 |
| jt90 | voice oh | PASS | peak -7.1 dBFS, rms -31.4, clip 0, 3.875s, onsets 3/4 at 0.466,0.937,1.403 |
| jt90 | voice crash | PASS | peak -7.1 dBFS, rms -25.4, clip 0, 3.875s, onsets 8/4 at 0.005,0.471,0.717,0.797 |
| jt90 | voice ride | PASS | peak -7.1 dBFS, rms -26.8, clip 0, 3.875s, onsets 7/4 at 0.256,0.361,0.466,0.937 |
| jt90 | full kit (2 bars) | PASS | peak -0.2 dBFS, rms -13.6, clip 0, 5.75s (2 bars + 2 s tail) |
| jb202 | pattern renders + pitch (C2) | PASS | peak -2.4 dBFS, rms -18, clip 0, 3.875s; f0 -36.5 dB vs decoys -62.7 dB, strongest: f0 |
| jb202 | accent + slide pattern | PASS | peak -2.4 dBFS, rms -14.7, clip 0, 3.875s |
| jb202 | filter tweak audible (bright vs dark >2kHz) | PASS | high-band +12.6 dB brighter with cutoff 6000 vs 200 |
| jt30 | pattern renders + pitch (C2) | PASS | peak -4.1 dBFS, rms -20.5, clip 0, 3.875s; f0 -47 dB vs decoys -65 dB, strongest: f0 |
| jt30 | accent + slide pattern | PASS | peak -4.1 dBFS, rms -15.7, clip 0, 3.875s |
| jt30 | filter tweak audible (bright vs dark >2kHz) | PASS | high-band +48.6 dB brighter with cutoff 6000 vs 200 |
| jt10 | pattern renders + pitch (C3) | PASS | peak -8.4 dBFS, rms -27.2, clip 0, 3.875s; f0 -49.4 dB vs decoys -61.9 dB, strongest: oct-1 |
| jt10 | accent + slide pattern | PASS | peak -8.4 dBFS, rms -23.6, clip 0, 3.875s |
| jt10 | filter tweak audible (bright vs dark >2kHz) | PASS | high-band +9.0 dB brighter with cutoff 8000 vs 200 |
| jp9000 | preset basic | PASS | peak 0 dBFS, rms -15.2, clip 4128, 3.875s; pitch C3 ok (strongest f0) |
| jp9000 | preset pluck | PASS | peak 0 dBFS, rms -17.7, clip 0, 3.875s; pitch C3 ok (strongest f0) |
| jp9000 | preset dualBass | PASS | peak 0 dBFS, rms -12.4, clip 3354, 3.875s; pitch C3 ok (strongest oct-1) |
| jp9000 | custom patch (add_module/connect_modules) | PASS | peak 0 dBFS, rms -18.7, clip 56, 3.875s; Added ADSR Envelope as "env1" / Connected env1.cv → filter1.cutoffCV |
| jp9000 | preset basic with jp9000.level −14 dB (clip workaround) | PASS | peak -2 dBFS, rms -26.5, clip 0, 3.875s |
| jbs | list_jbs_kits | PASS | Available kits: 808 - 808 Kit (bundled) amber - Amber Kit (bundled) User kits folder: /Users/bart/Documents/Jambot/kits |
| jbs | kit 808 slot s1 | PASS | peak -8.9 dBFS, rms -26.1, clip 0, 3.875s |
| jbs | kit 808 slot s2 | PASS | peak -6 dBFS, rms -25.1, clip 0, 3.875s |
| jbs | kit 808 slot s3 | PASS | peak -12 dBFS, rms -37.5, clip 0, 3.875s |
| jbs | kit 808 slot s4 | PASS | peak -14.6 dBFS, rms -45.5, clip 0, 3.875s |
| jbs | kit 808 slot s5 | PASS | peak -21.8 dBFS, rms -44.6, clip 0, 3.875s |
| jbs | kit 808 slot s6 | PASS | peak -9 dBFS, rms -25.1, clip 0, 3.875s |
| jbs | kit 808 slot s7 | PASS | peak -9 dBFS, rms -24.1, clip 0, 3.875s |
| jbs | kit 808 slot s8 | PASS | peak -18.7 dBFS, rms -39.1, clip 0, 3.875s |
| jbs | kit 808 slot s9 | PASS | peak -17.6 dBFS, rms -44.6, clip 0, 3.875s |
| jbs | kit 808 slot s10 | PASS | peak -12 dBFS, rms -36.5, clip 0, 3.875s |
| jbs | kit amber slot s1 | PASS | peak -10.9 dBFS, rms -23.6, clip 0, 3.875s |
| jbs | kit amber slot s2 | PASS | peak -11.2 dBFS, rms -30.3, clip 0, 3.875s |
| jbs | kit amber slot s3 | PASS | peak -9.2 dBFS, rms -22, clip 0, 3.875s |
| jbs | kit amber slot s4 | PASS | peak -25.9 dBFS, rms -43.8, clip 0, 3.875s |
| jbs | kit amber slot s5 | PASS | peak -9.8 dBFS, rms -41.1, clip 0, 3.875s |
| jbs | kit amber slot s6 | PASS | peak -6.9 dBFS, rms -19.3, clip 0, 3.875s |
| jbs | kit amber slot s7 | PASS | peak -10.3 dBFS, rms -22.9, clip 0, 3.875s |
| jbs | kit amber slot s8 | PASS | peak -10.8 dBFS, rms -24, clip 0, 3.875s |
| jbs | kit amber slot s9 | PASS | peak -8.8 dBFS, rms -29, clip 0, 3.875s |
| jbs | kit amber slot s10 | PASS | peak -8.6 dBFS, rms -21.2, clip 0, 3.875s |
| jbs | per-hit velocity | PASS | vel 1.0 hit -19.3 dB vs vel 0.25 hit -31.4 dB |
| jb200 | deprecated alias (expected: no audio) | PASS | renders silence — deprecated, do not use; peak -240 dBFS, rms -240, clip 0, 3.875s; JB200 bass: 4 notes |
| delay | analog: echoes at 375/750 ms | PASS | echo1 +60.6 dB, echo2 +210.8 dB over dry; Added delay (analog) to jt10 [mode=analog, time=375, sync=of |
| delay | pingpong: stereo bounce | PASS | side/mid 0.66; L−R at echo1 35.8 dB, echo2 -26.0 dB |
| delay | tempo sync (8th = 234 ms) | PASS | energy at 8th-note echo +11.1 dB vs just before |
| delay | per-voice target (jb01.ch) | PASS | echo +40.9 dB over dry at 300 ms |
| reverb | target jt10: tail + wet≠dry | PASS | tail +224.0 dB over dry (0.5–1.2 s), mean \|wet−dry\| 5.2e-2; Added reverb to jt10 [decay=3, size=70, mix=60] (a |
| reverb | target jb01: tail + wet≠dry | PASS | tail +220.0 dB over dry (0.5–1.2 s), mean \|wet−dry\| 3.6e-2; Added reverb to jb01 [decay=3, size=70, mix=60] (a |
| reverb | target master: tail + wet≠dry | PASS | tail +220.0 dB over dry (0.5–1.2 s), mean \|wet−dry\| 3.8e-2; Added reverb to master [decay=3, size=70, mix=60]  |
| eq | channel insert jb01 highGain −18 | PASS | >4 kHz -7.1 dB, <150 Hz -0.3 dB; Added eq insert to jb01 (addressable as fx.jb01.eq1) |
| eq | master insert lowGain −18 | PASS | <120 Hz -11.7 dB, >4 kHz -0.0 dB; Added eq to master bus (addressable as fx.master.eq1) |
| eq | per-voice insert (channel ch) highGain −18 | FAIL | >4 kHz 0.0 dB vs dry (identical = insert ignored); Added eq insert to ch (addressable as fx.ch.eq1) |
| filter | per-voice lowpass 400 Hz on ch | FAIL | >3 kHz 0.0 dB vs dry; Added filter insert to ch (addressable as fx.ch.filter1) |
| filter | preset 'telephone' (bandpass 1.5 kHz) on jb01 | PASS | vs dry: <120 Hz -28.1 dB, 800–2.5k 5.7 dB, >3 kHz -15.7 dB; Added filter (telephone) insert to jb01  |
| filter | whole-channel lowpass 400 Hz on jb01 | PASS | >3 kHz -49.7 dB vs dry; readback fx.jb01.filter1.cutoff = InfinitykHz |
| filter | whole-channel highpass 2 kHz on jb01 | PASS | <120 Hz -59.8 dB vs dry |
| params | get_param on fx.* paths reads back what was set | FAIL | fx.jb01.filter1.cutoff = InfinitykHz \| fx.jb01.eq1.highGain = -60dB |
| params | tweak fx.jb01.filter1.cutoff 12k→300 changes audio | FAIL | >3 kHz 0.0 dB after tweak; Error: Unknown node "fx". Available: jb01, jb202, jbs, sampl |
| params | tweak → get_param roundtrip, list_params | PASS | jb01.kick.decay = 33; list_params 50 lines |
| sidechain | kick ducks jb202 (300–2k band, after-kick vs recovered) | PASS | dry 24.3 dB → wet 19.8 dB (4.5 dB more duck); Added sidechain: jb202 ducks when kick plays (90%  |
| automation | automate jb01.ch.decay (long→short) | PASS | step1 tail -34.4 dB vs step16 tail -67.7 dB; jb01 ch.decay automation set: 16/16 steps |
| song | save_pattern + set_arrangement (A ×2, B ×2) | PASS | 9.5s (expect 7.5 + 2 s tail); hats only in B: +12.6 dB; Arrangement set: 2 sections, 4 bars total |
| session | save() → load() reproduces render | PASS | mean \|a−b\| 0.0e+0 |
| analysis | check_sox | PASS | sox is installed and available for audio analysis. |
| analysis | get_spectral_peaks finds A2 (110 Hz) | PASS | SPECTRAL PEAKS (Dominant Frequencies): \|  \|   1. 22Hz (F0, -23 cents): 106.1dB |
| analysis | detect_waveform | PASS | WAVEFORM DETECTION: \|   Type: TRIANGLE \|   Confidence: 70% |
| analysis | analyze_render | PASS | File: analysis-a2.wav \| Duration: 3.87s |
| routing | list_tracks/show_routing/list_sends/show_mixer/show/get_state respond | PASS | list_tracks: TRACKS: jb01 jb202 jbs sampler jt10 jt30 jt90 jp9000 drums bass lead s \|\| show_routing: ROUTING: TRACKS: jb01: vol=0dB jb202: vol=0dB jbs: vol=0dB sampler: vo \|\| list_sends: No sends. Use add_send({ id: "delay1", effect: "delay" }) to create on \|\| show_mixer: MIXER CONFIGURATION: OUTPUT LEVELS: drums: 0dB bass: 0dB lead: 0dB jbs \|\| show: JB01 DRUM MACHINE PATTERN: KICK: 1, 5, 9, 13 \|\| |

Totals: 80 passed, 4 failed. Raw data: `inventory-results.json` written next to the WAVs by the script.
