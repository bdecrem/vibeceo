# Project: IR3109 Filter

## Context
The IR3109 is Roland's proprietary filter chip used in the SH-101, Juno-60, Juno-106, Jupiter-6, and Jupiter-8. It's a 4-pole (24dB/oct) lowpass filter with resonance that can self-oscillate.

## Tasks
- [ ] Research IR3109 filter characteristics
- [ ] Implement 4-pole lowpass structure
- [ ] Add resonance with self-oscillation at high Q
- [ ] Implement frequency control with exponential scaling
- [ ] Add keyboard tracking (filter follows pitch)
- [ ] Tune resonance character to match Roland sound
- [ ] Optimize for real-time performance

## Technical Notes

**IR3109 vs TB-303's diode ladder:**
- IR3109: 24dB/oct, "smooth" resonance, Juno/Jupiter family
- Diode ladder: 18dB/oct, "screaming" resonance, 303 specific
- IR3109 is cleaner, less aggressive than 303

**Key characteristics:**
- Cutoff range: ~20Hz to 20kHz
- Resonance can self-oscillate (produces sine at cutoff freq)
- Slight bass boost as resonance increases
- "Juicy" character when sweeping

**Keyboard tracking:**
- 0% = filter doesn't follow pitch
- 100% = filter tracks pitch 1:1
- Allows consistent brightness across keyboard

## Algorithm Options
1. **Cascaded biquads** - Simple, CPU efficient (E1)
2. **State variable filter** - More stable modulation
3. **Zero-delay feedback** - Most accurate, more CPU (E2)

## Comparison to 303 Diode Ladder
The 303's diode ladder was 18dB/oct with more aggressive saturation. The IR3109 is cleaner and more "musical" for leads and pads, while 303 is raunchier for acid basslines.

## Completion Criteria
- [ ] Filter cuts frequencies as expected
- [ ] Resonance self-oscillates at maximum Q
- [ ] Keyboard tracking works correctly
- [ ] Sounds recognizably "Roland synth" (smooth, musical)
- [ ] Runs without audio glitches

## Files
- `dist/machines/sh101/filter/ir3109.js`
