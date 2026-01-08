# Project: VCO Oscillator

## Context
The SH-101's heart is the CEM3340 VCO chip (same as Prophet-5, Oberheim OB-X). It produces sawtooth and pulse waveforms simultaneously, with pulse width modulation.

## Tasks
- [ ] Research CEM3340 waveform characteristics
- [ ] Implement sawtooth oscillator with band-limited aliasing reduction
- [ ] Implement pulse oscillator with variable width
- [ ] Add PWM input for pulse width modulation
- [ ] Implement octave range switch (16', 8', 4', 2')
- [ ] Add pitch modulation input for LFO/envelope
- [ ] Test oscillator tuning accuracy across range

## Technical Notes

**CEM3340 characteristics:**
- Sawtooth: Linear ramp, hard reset (slight click = character)
- Pulse: Variable width 5%-95%, symmetric at 50% = square
- PWM range: Typically modulated ±40% from center

**Waveform mixing:**
- Saw and pulse can be mixed independently
- Slider controls: 0% = off, 100% = full

**Octave ranges:**
- 16' = bass (C1 = 32.7Hz)
- 8' = normal (C3 = 130.8Hz)
- 4' = high (C5 = 523Hz)
- 2' = very high (C7 = 2093Hz)

## Algorithm Options
1. **Native Web Audio oscillators** - Simple but limited PWM
2. **PeriodicWave** - Custom waveforms, smooth PWM
3. **AudioWorklet** - Full control, most authentic

## Completion Criteria
- [ ] Sawtooth sounds correct across range
- [ ] Pulse width modulation works smoothly
- [ ] Octave switch transposes correctly
- [ ] No audible aliasing at high frequencies

## Files
- `dist/machines/sh101/voices/oscillator.js`
