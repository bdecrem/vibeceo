# Project: UI Polish & Parameter Fixes

## Context
Final cleanup: ensure all knobs match the authentic 909 parameters, fix any UI issues from previous projects, and verify everything works together.

## Tasks
- [ ] Verify snare TUNE knob appears and works
- [ ] Verify hi-hat TUNE knobs appear (CH and OH)
- [ ] Verify cymbal TUNE knobs appear (CC and RC)
- [ ] Verify rimshot has NO tune knob (only Level)
- [ ] Verify clap SPREAD is labeled as "extended" feature (tooltip or visual indicator)
- [ ] Add pattern length control to UI
- [ ] Add scale mode selector to UI
- [ ] Fix BPM input: min=37, max=290
- [ ] Add Total Accent knob/slider to controls bar
- [ ] Test full workflow: load preset, adjust params, play, save pattern

## Completion Criteria
- [ ] Build passes
- [ ] All parameter knobs match original 909 (plus clearly marked extensions)
- [ ] New sequencer controls are accessible and work
- [ ] Mobile UI still works properly

## Notes
This is the final polish pass. All previous projects should be complete first.
Files:
- `web/public/909/ui/tr909/index.html`
- `web/public/909/ui/tr909/styles.css`
- `web/public/909/dist/ui/tr909/app.js`
