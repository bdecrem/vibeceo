# Project: Snare Drum Overhaul

## Context
The real TR-909 snare uses TWO sine oscillators for dual shell modes (0,1), not one triangle. It also has a TUNE control and the Snappy parameter should affect attack envelope speed, not just noise balance.

## Tasks
- [ ] Replace single triangle oscillator with TWO sine oscillators for shell modes
- [ ] Set frequencies to static values (not ramping) based on original circuit
- [ ] Add TUNE parameter that affects both oscillator frequencies proportionally
- [ ] Make Snappy control both noise balance AND attack envelope decay rate
- [ ] Update parameterDescriptors to include tune
- [ ] Test: Verify snare has more body and realistic shell resonance

## Completion Criteria
- [ ] Build passes
- [ ] Snare sounds fuller with proper dual-oscillator character
- [ ] TUNE knob appears in UI and works

## Notes
Reference: https://www.soundonsound.com/techniques/practical-snare-drum-synthesis
File: `web/public/909/dist/machines/tr909/voices/snare.js`
