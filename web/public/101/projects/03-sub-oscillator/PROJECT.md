# Project: Sub-Oscillator

## Context
The SH-101's sub-oscillator uses a CD4013 dual flip-flop to generate three waveforms at lower octaves. This adds bass weight and complexity to the sound.

## Tasks
- [ ] Research CD4013 flip-flop behavior
- [ ] Implement -1 octave square wave
- [ ] Implement -2 octave square wave
- [ ] Implement -2 octave 25% pulse wave
- [ ] Add sub-oscillator level control
- [ ] Sync sub to main VCO (critical for tracking)
- [ ] Test all three modes across pitch range

## Technical Notes

**CD4013 implementation (from Electric Druid):**
```
Main VCO sawtooth → flip-flop 1 → -1 octave square
                  → flip-flop 2 → -2 octave square
Diode-OR of both outputs → 25% pulse at -2 octave
```

**Why 25% pulse sounds like -1 octave:**
- 25% pulse has strongest 2nd harmonic
- Creates illusion of -1 octave even though fundamental is -2

**Sync behavior:**
- Sub must reset when main VCO resets
- Otherwise sub drifts out of phase = muddy sound

## Implementation Options
1. **Web Audio oscillators + octave detune** - Simple, less authentic
2. **OscillatorNode with frequency division** - More accurate
3. **ScriptProcessor/AudioWorklet flip-flop sim** - Most authentic

## Completion Criteria
- [ ] All three sub modes selectable
- [ ] Sub tracks main oscillator pitch perfectly
- [ ] Level control works (0 = off, 1 = equal to main)
- [ ] No phase drift over time

## Files
- `dist/machines/sh101/voices/sub-oscillator.js`
