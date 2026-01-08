# Project: SH101Engine

## Context
The main engine class that combines VCO, sub-oscillator, filter, envelopes, and VCA into a playable synthesizer. Extends the base SynthEngine class.

## Tasks
- [ ] Create SH101Engine extending SynthEngine
- [ ] Wire VCO → mixer → filter → VCA → output
- [ ] Connect sub-oscillator to mixer
- [ ] Connect ADSR to VCA gain
- [ ] Connect filter envelope to filter cutoff
- [ ] Connect LFO to modulation targets
- [ ] Implement playNote(note, velocity, time)
- [ ] Implement noteOff(time)
- [ ] Add parameter setters for all controls
- [ ] Implement getParameters() for state export

## Technical Notes

**Signal flow:**
```
VCO (saw + pulse) ─┬─→ Mixer ─→ IR3109 Filter ─→ VCA ─→ Output
Sub-oscillator ────┘              ↑               ↑
                            Env + LFO       ADSR Envelope
```

**Parameters to expose:**
- `vcoSaw` - Sawtooth level (0-1)
- `vcoPulse` - Pulse level (0-1)
- `pulseWidth` - Pulse width (0.05-0.95)
- `subLevel` - Sub-oscillator level (0-1)
- `subMode` - Sub mode (0=off, 1=-1oct, 2=-2oct, 3=25%pulse)
- `cutoff` - Filter cutoff (0-1, log scaled)
- `resonance` - Filter resonance (0-1)
- `envMod` - Filter envelope amount (-1 to 1)
- `attack` - Envelope attack (0-1, log scaled to time)
- `decay` - Envelope decay (0-1)
- `sustain` - Envelope sustain level (0-1)
- `release` - Envelope release (0-1)
- `lfoRate` - LFO speed (0-1)
- `lfoToPitch` - LFO to pitch amount (0-1)
- `lfoToFilter` - LFO to filter amount (0-1)
- `lfoToPW` - LFO to pulse width amount (0-1)

## Completion Criteria
- [ ] Engine initializes without errors
- [ ] playNote triggers sound correctly
- [ ] noteOff triggers release
- [ ] All parameters affect sound as expected
- [ ] getParameters() returns current state

## Files
- `dist/machines/sh101/engine.js`
