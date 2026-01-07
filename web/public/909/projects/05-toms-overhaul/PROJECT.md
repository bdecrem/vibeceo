# Project: Toms E2 (Low, Mid, High)

## Context
Create authentic TR-909 tom synthesis for E2 engine. All three toms share similar architecture but different tunings.

## Tasks
- [ ] Research TR-909 tom circuit (oscillator, pitch envelope, decay)
- [ ] Read current tom.js implementation
- [ ] Implement E2 version based on research
- [ ] Create tom-e1.js with original code
- [ ] Update engine.js to switch all toms with E1/E2
- [ ] Test low, mid, high toms in both engines

## Completion Criteria
- [ ] Build passes
- [ ] E1/E2 toggle switches all three tom voices
- [ ] E2 sounds more authentic

## Notes
File: `web/public/909/dist/machines/tr909/voices/tom.js`
Reference: ds909, network-909.de
Low tom: ~100Hz, Mid tom: ~150Hz, High tom: ~200Hz (approx)
