# Jambot & the Music — hub (updated 2026-07-28)

The single place to pick this effort back up. Covers: what was done, what we
learned, what's next — for both the platform (jambot) and the music made
with it.

## The work so far

**The audit (2026-07-27).** 187-agent review of every instrument, effect,
core service, tool schema, and doc — each finding adversarially verified.
166 confirmed findings. Full detail with per-finding fix sketches:
[`code-review-2026-07-27.md`](code-review-2026-07-27.md).

**Fixes landed** (~60 findings, commits `7718dddd8..88fb15f67`):
- Filter screech class killed across jt30/jb202/jt10/jp9000 (exponential
  octave env mapping + ladder damping; squelch preserved, measured)
- Real slides/glide in all three synths; real velocity-gated sidechain;
  reverb with true RT60; honest delay feedback; filter makeup gain
- Unit split-brain resolved (producer-unit nodes declared; conversion once);
  sampler tune chromatic; tool schemas tell the truth
- Mixer wired into render (volume/mute/solo/pan); routing state persists
- JT90 patterns wrap at pattern length (multi-bar drum patterns work now)
- Retired-model pin replaced (`JAMBOT_MODEL` env || `claude-opus-5`);
  agent-loop infinite-retry fixed; dist build ships its system prompt
- Agent system prompt rewritten against the real tool surface
  ([`JAMBOT-PROMPT.md`](JAMBOT-PROMPT.md))
- Test suite: 32 → ~1,600 assertions incl. render-and-measure screech
  guards ([`tests/test-audio-regression.js`](tests/test-audio-regression.js))

**The music.** Four sketches in one subgenre (Mills-school tribal techno),
in hilma `scripts/tribal-sketches/` (each script re-renders with one node
command; README there has the genre invariants):
- Round 2: congregation (138, bell anthem) / red clay (134, clave ritual) /
  interceptor (145, siren siege) — corpus-study workflow, judged + verified
- Round 3: **procession** (131, G minor) — Afro-acid antiphony built on the
  repaired synths: tom question, one-bar switch with a real 48→98 Hz
  portamento, 303 answer; sidechained sub; per-voice rim room
- Published: DK019 (daskollektiv.rip/dk019.html) — 14-min continuous mix of
  round 2 with a three-movement audio-reactive visualizer, iOS-safe (no
  WebAudio; baked analysis; audioSession playback fix), varispeed+brake
  transition. Local player: bart-imac.tunn3l.sh (server on port 3000).

## Things we learned (the expensive lessons)

1. **"Build passes" proves nothing** — the screech shipped for months with
   green tests. Render audio and MEASURE it (audit-tools/measure.py:
   no >25dB-prominent line above 2.5kHz at >-40dBFS; HF>5k <2% for bass).
2. **Arrangement mode drops ALL params** — saved patterns render engine
   defaults + automation lanes only. Reliable path today: single-pattern
   mode with full-length node-level patterns (`session._nodes.X.setPattern`,
   N*16-step arrays) — every tweak applies, tails flow across scenes.
   See hilma `scripts/tribal-sketches/procession.mjs` header for the recipe.
3. **Node-level pattern velocity is 0-1**, not 0-127 (0-127 renders a wall).
4. **tweak_jt90 tune is semitones; tweak_jt30 level is dB** — the schemas
   now say so, but old scripts assumed cents / 0-100.
5. **jb202 held/slid notes die after ~a bar** — retrigger drones per bar
   (slide=false on bar starts); a slide flag never re-opens a released gate.
6. **Genre research pays** — the corpus invariants (one hook, mixer-mute
   choreography, subtraction, straight grid) and the "switch" concept came
   from real sources and made the tracks better than parameter-tweaking
   ever did. Music knowledge base: `library.json` (canonical, both repos).
7. **Mixed-model delegation works** — judgment-heavy DSP/core stays with
   the strongest model; well-specified findings fan out to opus agents with
   disjoint file ownership; verify + commit per bundle.

## Still to do

**Platform** (all catalogued with fix sketches in the report; work order in
[`NEXT-SESSION-PLAN.md`](NEXT-SESSION-PLAN.md)):
- Fix arrangement mode properly (params in save_pattern snapshots) — the
  biggest workflow unlock; then retire the single-pattern workaround
- Render-tail truncation at pattern/section end (ring-outs hard-cut)
- session._nodes dual registry; sends outside the ParamSystem; sidechain
  hardcodes instruments; song-tools copy-paste; jt90 dead knobs
- ~25 remaining majors + 68 minors + the 17-doc contradiction sync pass
- EQ effect: untested recently — verify before relying on it

**Music:**
- DK020 candidate: procession (or a 4-track round-3 mix)
- First real tracks using JBS (chromatic sample tunes now work) and JP9000
- A mastering/glue pass story (master bus is still bare summing + soft clip)
- Grow `library.json` with what the tribal series taught us

## Quick links
- Audit report: [`code-review-2026-07-27.md`](code-review-2026-07-27.md)
- Work order: [`NEXT-SESSION-PLAN.md`](NEXT-SESSION-PLAN.md)
- Verification harness: [`audit-tools/`](audit-tools/)
- Sketch scripts + genre invariants: hilma `scripts/tribal-sketches/`
- Live: https://daskollektiv.rip/dk019.html · https://bart-imac.tunn3l.sh
- Usage meter (Max-plan budget): hilma `scripts/usage-meter.py`
