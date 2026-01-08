# Project: ADSR Envelope

## Context
Unlike the TB-303's simple decay-only envelope, the SH-101 has a full ADSR (Attack, Decay, Sustain, Release) envelope generator. This allows much more expressive sounds.

## Tasks
- [ ] Implement ADSR envelope generator class
- [ ] Add attack stage with exponential curve
- [ ] Add decay stage with exponential curve
- [ ] Add sustain level (0-1)
- [ ] Add release stage with exponential curve
- [ ] Support gate on/off triggering
- [ ] Add legato mode (no retrigger on overlapping notes)
- [ ] Test with various ADSR settings

## Technical Notes

**ADSR stages:**
```
     /\
    /  \____
   /        \
  /          \
 A   D   S   R
```

**Attack:** Time from 0 to peak (typically exponential curve)
**Decay:** Time from peak to sustain level
**Sustain:** Level held while gate is on (0-1)
**Release:** Time from sustain to 0 after gate off

**Typical SH-101 ranges:**
- Attack: 1ms - 3s
- Decay: 1ms - 3s
- Sustain: 0% - 100%
- Release: 1ms - 3s

**Curve shapes:**
- Analog synths use RC-style exponential curves
- Not linear! Adds warmth and musicality

## Implementation
```javascript
class ADSREnvelope {
  trigger(time) { /* start attack */ }
  release(time) { /* start release from current level */ }
  getValueAtTime(time) { /* return envelope value */ }
}
```

## Completion Criteria
- [ ] Attack/decay/release have correct exponential curves
- [ ] Sustain holds at correct level
- [ ] Gate on/off works correctly
- [ ] Legato mode prevents retrigger
- [ ] Values can modulate filter and VCA

## Files
- `dist/machines/sh101/envelope.js`
