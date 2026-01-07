# Project: Diode Ladder Filter

## Context
The TB-303's distinctive "acid" sound comes from its diode ladder filter. Unlike the Moog transistor ladder (24dB/oct), the 303's filter has a gentler slope (~18dB/oct) and unique saturation characteristics.

## Tasks
- [ ] Research diode ladder filter algorithms
- [ ] Implement basic 4-pole structure
- [ ] Add resonance with self-oscillation capability
- [ ] Implement frequency control with proper scaling
- [ ] Add input saturation for authenticity
- [ ] Tune resonance behavior to match 303 character
- [ ] Optimize for real-time performance
- [ ] Test in isolation before integration

## Technical Notes
Key differences from Moog ladder:
- Diodes instead of transistors in feedback path
- Slightly lower slope (~18dB/oct)
- Different saturation character
- Resonance "screams" differently

Reference implementations:
- Open303 source code
- MoogLadders repository (for comparison)
- Various DSP papers on 303 emulation

## Algorithm Options
1. **Direct form** - Simple but may have stability issues
2. **State variable** - More stable, easier to modulate
3. **Zero-delay feedback** - Most accurate, more CPU intensive

## Completion Criteria
- [ ] Filter cuts frequencies as expected
- [ ] Resonance self-oscillates at high Q
- [ ] Sounds recognizably "303-like"
- [ ] Runs without audio glitches

## Files
- `dist/machines/tb303/filter/diode-ladder.js`
