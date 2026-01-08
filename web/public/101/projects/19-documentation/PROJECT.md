# Project: Documentation

## Context
Create comprehensive documentation for the SH-101 library, similar to TB303-LIBRARY.md. This enables other developers and the creative agent to use the synth effectively.

## Tasks
- [ ] Create SH101-LIBRARY.md
- [ ] Document Quick Start (copy-paste examples)
- [ ] Document all API methods
- [ ] Document pattern structure
- [ ] Document synth parameters with ranges
- [ ] Document preset list with descriptions
- [ ] Document arpeggiator modes
- [ ] Document engine differences (E1 vs E2)
- [ ] Add sound design tips
- [ ] Add file structure reference
- [ ] Include example code snippets

## Documentation Outline

```markdown
# SH-101 Synthesizer Library

## Quick Start (API)
[Copy-paste examples for common use cases]

## Controller Class
[Full method reference]

## Pattern Structure
[Step format for sequencer]

## Synth Parameters
| Parameter | Range | Description |
[Full parameter table]

## Arpeggiator
[Modes, hold, octave range]

## Presets
| ID | Name | Character |
[All presets]

## Engine Modes
[E1 vs E2 comparison]

## Sound Design Tips
[How to create classic sounds]

## File Structure
[Directory layout]
```

## Key Differences from 303 Docs

The SH-101 doc needs to cover:
- Full ADSR (not just decay)
- Sub-oscillator modes
- Arpeggiator (not just sequencer)
- LFO modulation destinations
- PWM (pulse width modulation)

## Example Code for Docs

```javascript
// Classic PWM Lead
const synth = new SH101Controller();
synth.setVcoPulse(1.0);
synth.setPulseWidth(0.3);
synth.setLfoRate(0.2);
synth.setLfoToPW(0.4);  // PWM effect
synth.setCutoff(0.6);
synth.setResonance(0.3);
synth.playNote('C4');

// Fat Bass with Sub
synth.setVcoSaw(0.8);
synth.setSubLevel(0.7);
synth.setSubMode(1);  // -1 octave
synth.setCutoff(0.25);
synth.setEnvMod(0.5);
```

## Completion Criteria
- [ ] All API methods documented
- [ ] Examples are copy-paste ready
- [ ] Parameter ranges are accurate
- [ ] File passes markdown lint
- [ ] Matches TB303-LIBRARY.md quality

## Files
- `SH101-LIBRARY.md`
