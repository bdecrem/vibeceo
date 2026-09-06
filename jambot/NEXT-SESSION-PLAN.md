# Next session: fix the audit backlog (written 2026-07-27)

Context: a 187-agent audit ran on 2026-07-27 (full findings + fix sketches in
`code-review-2026-07-27.md` — 166 verified findings). The screech class
(jt30/jb202/jt10/jp9000-lp24), the retired model pin, and the agent-loop
infinite-retry are already FIXED and committed (`1e7a14663`, `7718dddd8`).
Remaining: **11 critical, 79 major, 68 minor**. This file is the work order.

## How to verify any DSP fix (tools live in `audit-tools/`)

- `audit-tools/measure.py '<wav-glob>'` — narrow-peak prominence >2.5kHz, HF>5k
  share, body share, centroid sweep, rms. Screech bar: no line with >25dB
  prominence above 2.5kHz at absolute level > -40dBFS; HF>5k share under ~2%
  for bass instruments.
- `audit-tools/jt30-harness.mjs <tag>` and `audit-tools/fixcheck.mjs` — stress
  renders via headless (run from jambot dir: `node audit-tools/fixcheck.mjs`).
- Always finish with `node tests/run-tests.js` (32 must pass) and a render
  A/B before/after.

## P1 — remaining criticals (11) — ✅ ALL DONE 2026-07-27 evening
(commits eb310a8c2, cluster B, 0b25185c7, cluster D, cluster E — every fix
render-verified; details in each commit message. Next up: P2.)

**Cluster A — the unit-conversion split-brain (5 findings, ONE architectural fix).**
JBSNode and all effect nodes store PRODUCER units; every other instrument node
stores ENGINE units. The generic `tweak`/`tweak_multi`/`get_param` paths
convert producer→engine before `session.set`, so every JB-S slot param and
every effect param written through the generic path is double-converted
(silently wrong audio), and reads are wrong in the other direction.
- `instruments/jbs-node.js:113` + `:128`, `tools/generic-tools.js:118` + `:153` (x2)
- Fix direction: make node storage units uniform (engine units everywhere, like
  the instruments), or teach the param system per-node unit declarations —
  decide ONCE, apply to jbs + all 5 effect nodes, then re-verify every effect
  and sampler tweak end-to-end with renders.

**Cluster B — sampler pitch.**
- `sample-voice.js:66` — toEngine emits cents but SampleVoice clamps as
  semitones: tune is a 3-state switch (-12/0/+12). Fix units, then verify a
  chromatic pitch render.

**Cluster C — effects correctness.**
- `effects/reverb.js:53` — comb feedback hits exactly 1.0 at decay=10: never
  decays, accumulates to clipping. Rescale so decay=10 → feedback ~0.97, and
  re-check the TOOLING-STATUS claim that wet==dry in send tests (sends may not
  be wired at all — see render.js finding below).
- `effects/sidechain.js:38-39` (2 findings) — ducks on EVERY 16th because the
  gate check treats `{velocity,accent}` objects as truthy steps. Read actual
  velocity>0. Verify duck timing against a sparse kick pattern render.

**Cluster D — dead mixer state.**
- `core/render.js:363` — track volume/mute/solo/pan/inserts (RoutingManager)
  are never read during render: the whole mixer tool surface is placebo.
  Either wire RoutingManager into the render mix loop or remove the tools.

**Cluster E — JB01 tom DC.**
- `web/public/jb01/dist/machines/jb01/voices/lowtom.js:86` (hitom likely same)
  — soft-clip curve maps 0 input to -0.00586: constant DC pedestal from
  scheduled toms. Recenter the WaveShaper curve; verify DC via mean-sample
  measurement on a tom pattern.

## P2 — majors (79, see report for all; the ones to do first)
### Status 2026-07-27 late: items 1-4 below DONE (commits e07ee0f77, 120dc8f9f)
- audio regression suite live in tests/ (7th file, screech guard + decay +
  sidechain + units + mixer); tom defaults ascend; JAMBOT-PROMPT.md rewritten;
  JAMBOT_MODEL documented. Bonus fix: build.js never shipped JAMBOT-PROMPT.md
  into dist/ though the bundle reads it at runtime (distributed build crashed).
- Wave 2 (2026-07-27 night, hybrid fable + 6 opus subagents): ~50 more majors
  fixed across 8 commits (9fee54fa0..ea10cbd39): audible glide in all three
  synths, subMode off, alias automation, routing persistence, choice-param NaN,
  truthful tool schemas, jb200 retirement + MIDI export, test suite to ~1590
  assertions, ui /status, snare/cymbal decay, JT90 limiter, delay/reverb/filter
  correctness (true RT60), canonical effect chains, JP9000 robustness (9 fixes).
- REMAINING (~25 majors + 68 minors + doc sync): the big ones left are the
  render-tail truncation at pattern/section end (reverb/delay/voice ring-outs
  hard-cut — needs render.js tail design), session._nodes dual registry,
  sends outside the ParamSystem, sidechain hardcoding instruments,
  song-tools per-instrument copy-paste, jt90-node _swing/_accentLevel dead
  knobs, jbs multi-bar truncation + double output gain. All in the report.

1. **Add the 5 missing regression tests** (report section: tests) — especially
   the per-instrument render-and-analyze smoke test asserting no resonance
   peak >30dB prominence above 2kHz. This is what lets everything else ship
   safely. Wire into `tests/run-tests.js`.
2. `params/jt90-params.json:44/54` — default tom tuning inverted (hi tom lands
   below mid tom; lowtom at 40Hz sub). Make defaults ascend.
3. `JAMBOT-PROMPT.md` — the agent system prompt teaches deprecated tools
   (tweak_jb200, create_send), wrong paths (jb200.bass.*), omits JT10/30/90.
   Rewrite against the actual tool surface (97 tools).
4. Model follow-ups: `JAMBOT_MODEL` documented in CLAUDE.md; consider
   `claude-fable-5` default once cost is acceptable (currently
   `claude-opus-5` default, env override in `jambot.js:424` area).
5. Remaining majors: work the report top-to-bottom — each has file:line +
   fixSketch already written.

## P3 — minors (68) + doc sync

- 17 catalogued doc contradictions (report section "Documentation drift"):
  stale STATUS.md, tool counts (65/91/97), jb200 aliases in PLATFORM.md,
  reverb status contradictions, ui.tsx vs terminal-ui.ts, etc. One
  consolidation pass over the .md set, delete or supersede stale docs.

## Pointers

- Full findings: `code-review-2026-07-27.md` (this dir, 102KB, everything has
  a fixSketch).
- Audit raw data (per-agent transcripts + journal):
  `~/.claude/projects/-Users-bartdecrem-Documents-coding2025-hilma/9a88ecd8-cb32-4f5b-a35e-ecd209a3961e/subagents/workflows/wf_4d2f6347-4a1/journal.jsonl`
- The screech fix pattern (reference for any new filter work):
  `web/public/jt30/dist/machines/jt30/engine.js` ~220-245 +
  `web/public/jb202/dist/dsp/filters/moog-ladder.js` (damping term).
- DK019 (daskollektiv.rip/dk019.html) uses pre-rendered audio — engine fixes
  don't affect it. The tribal tracks' scripts: hilma `scripts/tribal-sketches/`.

## Bugs found building the Techno 128 song sketch (hilma `scripts/jam/songs/techno-128.mjs`, 2026-09-05)

1. **JB202 `oscNOctave` unit split-brain (silent oscillator).** `params/converters.js`
   stores `osc1Octave`/`osc2Octave` as cents (-12 st → -1200) but the JB202
   engine's `transpose(freq, semitones)` reads the stored value as semitones,
   so an oscillator set an octave down runs at ~0 Hz and is silent. Verified
   by render: Bart's melodic 202 (osc1 square 70 + osc2 sine 85 at -12) renders
   -inf with osc1 muted. Fix the unit (same class as the Cluster A finding), but
   note every saved track with a -12 sine osc will gain a 27.5 Hz layer.
2. **Song-mode sidechain reads the LIVE drum pattern, not the section's.**
   `effects/sidechain.js` falls back to `session.jt90Pattern` when the render
   context carries no `triggerSections`; `core/render.js` never builds them for
   arrangement renders. A kick-less section still ducks to whatever is loaded
   live, and loading a kick-less pattern live kills the pump for the whole song.
3. **Section tails are cut 2 s after a section ends** (`renderPattern` renders
   `steps + 2 s`, buffers are summed at section offsets). Long delay/reverb
   tails on an instrument that stops at a boundary are truncated mid-decay.
   Either render each instrument's arrangement as one continuous timeline or
   extend the tail to the longest effect decay.
4. **Per-pattern channel inserts don't round-trip through `save_pattern` when
   effects were added via `add_effect`** (`mixer.effectChains` vs
   `channelInserts`): saved inserts are only rebuilt by `load_pattern`; the
   render always uses the live chains, so a "filter for this section only" is
   impossible from tools.
5. **JT90 open hat is choked by any later closed-hat step** (by design, but the
   agent prompt should say so): offbeat open hats with 16th closed ghosts
   collapse to 117 ms chirps unless the step after each open hat is left empty.
