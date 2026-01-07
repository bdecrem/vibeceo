# Project: Bass Voice E2 (Authentic)

## Context
Implement the E2 (authentic) version of the TB-303 bass voice with circuit-accurate behavior including the diode ladder filter, proper envelope curves, and accent modulation.

## Tasks
- [ ] Create `Bass303` class (E2 is the main/default class)
- [ ] Integrate diode ladder filter from Project 04
- [ ] Implement band-limited oscillator (reduce aliasing)
- [ ] Create authentic envelope shape (fast attack, variable decay)
- [ ] Implement accent behavior:
  - [ ] VCA boost (~10dB)
  - [ ] Increased envelope → filter modulation
  - [ ] Slightly shorter decay
- [ ] Add pitch input for sequencer control
- [ ] Implement proper gain staging
- [ ] Match parameter ranges to real 303

## E2 vs E1 Differences
| Aspect | E1 (Simple) | E2 (Authentic) |
|--------|-------------|----------------|
| Filter | Biquad lowpass | Diode ladder |
| Slope | 12dB/oct | ~18dB/oct |
| Resonance | Standard Q | Self-oscillates |
| Envelope | Linear ASR | Exponential curves |
| Accent | Volume only | VCA + VCF mod |

## Completion Criteria
- [ ] Distinctive acid squelch sound
- [ ] Accent dramatically changes character
- [ ] Filter resonates authentically
- [ ] A/B comparison with E1 shows clear difference

## Files
- `dist/machines/tb303/voices/bass.js`

## Notes
This is the main voice - E1 is the simplified fallback. The 303 sound IS the filter, so this project is critical for authenticity.
