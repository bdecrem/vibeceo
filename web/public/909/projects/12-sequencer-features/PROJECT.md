# Project: Sequencer Features

## Context
The original TR-909 sequencer has features we're missing: variable pattern length (1-16 steps), multiple scale modes (triplets, 32nds), wider tempo range, and a global accent control.

## Tasks
- [x] Add setPatternLength(1-16) method to StepSequencer
- [x] Update sequencer to respect per-pattern length (wrap at length, not 16)
- [x] Implement scale modes: 16th (default), 8th triplet (12 steps/bar), 16th triplet (24), 32nd (32)
- [x] Add setScale() method that adjusts step timing
- [x] Extend BPM range to 37-290 (from current 40-220)
- [x] Add globalAccent parameter (0-100%) that multiplies all accented steps
- [x] Add UI controls: pattern length dropdown, scale selector, tempo range fix

## Completion Criteria
- [x] Build passes
- [x] Can create patterns shorter than 16 steps
- [x] Triplet and 32nd modes sound correct rhythmically
- [x] BPM can go to 37 and 290

## Notes
Added SCALE_MODES constant with stepsPerBeat values. Pattern length controls loop point. Global accent is passed through events and applied in engine's onStep handler.

Files:
- `web/public/909/dist/core/sequencer.js`
- `web/public/909/dist/machines/tr909/engine.js`
- `web/public/909/ui/tr909/index.html`
- `web/public/909/dist/ui/tr909/app.js`
