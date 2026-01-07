# Project: Bass Voice E1 (Simple)

## Context
Implement the E1 (simple) version of the TB-303 bass voice using standard Web Audio nodes. This provides a clean, predictable baseline before adding the authentic complexity.

## Tasks
- [ ] Create `Bass303E1` class extending Voice
- [ ] Implement oscillator with saw/square waveform switch
- [ ] Implement tuning control (pitch offset in cents)
- [ ] Add biquad lowpass filter for cutoff
- [ ] Add filter resonance (Q) control
- [ ] Implement basic envelope (attack/decay/release)
- [ ] Add envelope → filter modulation
- [ ] Implement basic accent (volume boost)
- [ ] Add level control
- [ ] Define parameterDescriptors for UI

## Parameters
| Parameter | Range | Default | Description |
|-----------|-------|---------|-------------|
| waveform | saw/square | saw | Oscillator waveform |
| tuning | -1200 to +1200 cents | 0 | Pitch offset |
| cutoff | 0-1 | 0.5 | Filter cutoff (mapped to frequency) |
| resonance | 0-1 | 0.5 | Filter Q |
| envMod | 0-1 | 0.5 | Envelope → filter depth |
| decay | 0-1 | 0.5 | Envelope decay time |
| accent | 0-1 | 0.8 | Accent intensity |
| level | 0-1 | 1 | Output level |

## Completion Criteria
- [ ] Voice triggers and produces sound
- [ ] All parameters affect sound correctly
- [ ] Saw and square waveforms work
- [ ] Can be triggered by sequencer

## Files
- `dist/machines/tb303/voices/bass-e1.js`
