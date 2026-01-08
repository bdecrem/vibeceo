# Project: Documentation

## Context
Update SYNTHMACHINE-GUIDE.md with Mixer section. Also create a README.md in the mixer folder for quick reference.

## Tasks
- [ ] Create `mixer/README.md` — Quick reference for the module
- [ ] Update `sms-bot/documentation/SYNTHMACHINE-GUIDE.md`:
  - [ ] Add Mixer section after Available Instruments
  - [ ] Add Effects reference
  - [ ] Add "Multi-Track with Effects" example
  - [ ] Update File Locations section
- [ ] Test that documentation matches actual API

## mixer/README.md Outline
```markdown
# Mixer

Session + Effects for multi-track mixing.

## Quick Start
[10-line example]

## Effects
- Ducker (sidechain)
- EQ (4-band)
- Reverb (convolution)

## API Reference
[Session, Channel, Effect methods]
```

## SYNTHMACHINE-GUIDE.md Additions

### New Section: Mixer & Effects
```markdown
## Mixer & Effects

For combining instruments with effects and rendering to a single WAV.

### Quick Start
[Session example]

### Available Effects
| Effect | Description | Presets |
|--------|-------------|---------|
| Ducker | Sidechain gain ducking | tight, pump |
| EQ | 4-band parametric | acidBass, crispHats, warmPad, master |
| Reverb | Convolution | plate, room |

### Effect Parameters
[Tables for each effect]

### Rendering
[How render() works, options]
```

### Updated File Locations
Add mixer to the tree diagram.

## Completion Criteria
- [ ] mixer/README.md exists and is accurate
- [ ] SYNTHMACHINE-GUIDE.md has Mixer section
- [ ] All examples in docs actually work
- [ ] Effect presets documented with descriptions
