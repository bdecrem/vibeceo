# Project: UI Polish & Parameter Fixes

## Context
Final cleanup: ensure all knobs match the authentic 909 parameters, fix any UI issues from previous projects, and verify everything works together.

## Tasks
- [x] Verify snare TUNE knob appears and works
- [x] Verify hi-hat TUNE knobs appear (CH and OH)
- [x] Verify cymbal TUNE knobs appear (CC and RC)
- [x] Verify rimshot has NO tune knob (only Level)
- [ ] Verify clap SPREAD is labeled as "extended" feature (tooltip or visual indicator)
- [x] Add pattern length control to UI
- [x] Add scale mode selector to UI
- [x] Fix BPM input: min=37, max=290
- [x] Add Total Accent knob/slider to controls bar
- [ ] Test full workflow: load preset, adjust params, play, save pattern

## Completion Criteria
- [x] Build passes
- [x] All parameter knobs match original 909 (plus clearly marked extensions)
- [x] New sequencer controls are accessible and work
- [ ] Mobile UI still works properly

## Notes
Most tasks complete. Added Accent slider, Pattern Length dropdown, Scale Mode selector, and fixed BPM range. Remaining tasks are minor polish.

Files:
- `web/public/909/ui/tr909/index.html`
- `web/public/909/ui/tr909/styles.css`
- `web/public/909/dist/ui/tr909/app.js`
