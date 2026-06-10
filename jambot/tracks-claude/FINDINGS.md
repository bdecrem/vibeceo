# Jambot — what was actually blocking good tracks (2026-06-09)

Reviewed the engine + the daskollektiv (DK) track history to find why output
never sounded great. Two classes of problem: **engine footguns** and a
**missing creative loop**. Concrete findings, with the fixes I used to make
`haze.wav`.

## Engine footguns (the "parameters that can't be controlled" complaints)

1. **Output level only responds on the NODE path, not the voice path.**
   `ses.set('jt30.level', -18)` works (peak 0.51 → 0.06, verified).
   `ses.set('jt30.bass.level', -18)` does **nothing** — it's silently stored as
   an ignored voice param (and auto-"converted" from producer units, masking the
   no-op). Same shape for every synth: use `<inst>.level` for output gain.
   → This is THE bug behind "can't control parameters" + everything clipping:
   if you set levels on the wrong path, mixing is impossible.

2. **No gain staging → everything clips at peak 1.000.** A bare
   `jam-kick-bass.js` renders at peak 1.000 / RMS 0.85 — slammed into the rail,
   distorting. Even a *solo* JT30 at unity peaks ~0.51. There's no master
   limiter/headroom. You must set each instrument well below 0 dB and leave
   master headroom. `haze.mjs` sums to peak ~0.42, then trims to 0.89.

3. **Voice params are 0-100 producer units** (`jt30.bass.cutoff` etc.); the node
   auto-converts and warns. Fine once you know, noisy in logs.

4. **Untested instruments actually work.** JT30 (acid/sub bass) and JT10 (lead/
   stab) both render real sound — they were marked "untested" but are usable.
   JB01 + JT90 drums solid. Reverb/sidechain still broken (didn't need them).

5. **`mode: 0` (analog) delay is mono; `mode: 1` (pingpong) gives stereo.**
   Verified: pingpong drops stereo correlation 1.00 → 0.45. The DK tracks were
   all mono — pingpong delay on a stab is the dub-techno width move.

## The creative gap (why DK tracks were hollow)

- The rich taste docs (`library.json`, `richie-hawtin.txt`, `musical-knowledge/`)
  were **never wired into generation** — DK tracks are hand-coded HTML using
  browser engines on kochi.to, not the Node engine, and never consulted them.
- **No feedback loop**: code once → ship. Nobody (human or agent) rendered,
  measured, and iterated. First take = final take.
- **Undersynthesized**: kick+hat OR one arpeggio; one key; no breakdown; rarely
  3+ simultaneous voices. Minimal to the point of empty.

## What `haze.wav` does differently (the template)

- 4 simultaneous layers: kick + offbeat hats + round mono sub + delay-drenched
  stab. Centered low end, wide stab echoes (pingpong).
- Real arrangement: intro build → sub enters → main groove → **true breakdown**
  (kick/sub drop, delay washes; measured: RMS 0.12 → 0.028, low-end gone) →
  rebuild with a **chord move Am → F** → outro fade.
- **Rendered section-by-section and stitched** with equal-power crossfades —
  sidesteps the flaky automation wiring and gives full per-section control of
  params (filter opening, who's playing, delay feedback).
- Gain-staged by measurement (no clip), club RMS ~0.21.

## If you want to go further

- The honest constraint: an AI can't *hear* — but it can **measure** (per-band
  energy, stereo width, clipping, kick/bash masking) and compose idiomatically.
  The real loop is measure-driven AI production + a human ear for the vibe.
- Highest-leverage code fix: make `<inst>.<voice>.level` an alias for the node
  output gain (or error loudly), so the #1 footgun stops biting.
- `tracks-claude/haze.mjs` is a clean, correct authoring template — copy it for
  new tracks instead of the DK HTML pattern.
