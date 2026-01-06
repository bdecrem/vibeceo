# Project: Kick Drum Overhaul

## Context
The current kick uses a pure sine oscillator, but the real TR-909 uses a sawtooth waveshaped into a sine. The tune range is too narrow and the attack transient uses the wrong technique.

## Tasks
- [x] Replace pure sine with sawtooth → waveshaper circuit (or close approximation)
- [x] Tune default frequency to E3 (~165Hz) instead of 160Hz
- [x] Replace bandpass noise attack with impulse/pulse generator + LP filtered noise
- [x] Expand tune range from ±50 cents to ±1200 cents (full octave)
- [ ] Test: Compare sound to 909 samples, verify punch and character

## Completion Criteria
- [x] Build passes (`cd web && npm run build`)
- [ ] Kick sounds punchier with better attack transient
- [ ] Tune knob has wide usable range

## Notes
Reference: http://www.analog-synth.de/synths/tr909/tr909.htm for circuit details.
File: `web/public/909/dist/machines/tr909/voices/kick.js`
