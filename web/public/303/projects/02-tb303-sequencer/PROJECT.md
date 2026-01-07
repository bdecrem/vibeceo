# Project: TB-303 Sequencer

## Context
Create a pitched step sequencer with per-step note, accent, and slide controls. Extends the TR-909 StepSequencer concept but adds pitch information.

## Tasks
- [ ] Create `TB303Sequencer` class extending core concepts
- [ ] Add per-step data structure: `{ note, octave, gate, accent, slide }`
- [ ] Implement note triggering with pitch
- [ ] Implement accent flag per step
- [ ] Implement slide flag per step (triggers glide to next note)
- [ ] Add octave transpose per step (-1, 0, +1)
- [ ] Implement pattern storage and loading
- [ ] Test with console logging before voice exists

## Completion Criteria
- [ ] Sequencer runs and fires events with correct timing
- [ ] Per-step accent/slide data accessible
- [ ] Pattern can be saved and loaded

## Technical Notes
TB-303 sequencer quirks:
- Only 16 steps (like TR-909)
- Notes limited to ~1.5 octave range originally
- Slide means "hold gate, glide pitch to next step"
- Accent is binary (on/off) per step

## Files
- `dist/machines/tb303/sequencer.js`
