# Project: Sequencer Features

## Context
The original TR-909 sequencer has features we're missing: variable pattern length (1-16 steps), multiple scale modes (triplets, 32nds), wider tempo range, and a global accent control.

## Tasks
- [ ] Add setPatternLength(1-16) method to StepSequencer
- [ ] Update sequencer to respect per-pattern length (wrap at length, not 16)
- [ ] Implement scale modes: 16th (default), 8th triplet (12 steps/bar), 16th triplet (24), 32nd (32)
- [ ] Add setScale() method that adjusts step timing
- [ ] Extend BPM range to 37-290 (from current 40-220)
- [ ] Add globalAccent parameter (0-100%) that multiplies all accented steps
- [ ] Add UI controls: pattern length dropdown, scale selector, tempo range fix

## Completion Criteria
- [ ] Build passes
- [ ] Can create patterns shorter than 16 steps
- [ ] Triplet and 32nd modes sound correct rhythmically
- [ ] BPM can go to 37 and 290

## Notes
Scale modes change the musical feel dramatically - triplets give swing, 32nds allow hi-hat rolls.
Files:
- `web/public/909/dist/core/sequencer.js`
- `web/public/909/dist/machines/tr909/engine.js`
- `web/public/909/ui/tr909/index.html`
- `web/public/909/dist/ui/tr909/app.js`
