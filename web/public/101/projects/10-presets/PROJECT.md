# Project: Presets

## Context
Provide a collection of classic SH-101 sounds and patterns that showcase the synth's capabilities and serve as starting points for users.

## Tasks
- [ ] Create "Classic Lead" preset (PWM lead)
- [ ] Create "Fat Bass" preset (saw + sub)
- [ ] Create "Acid Line" preset (resonant bass sequence)
- [ ] Create "Synth Brass" preset (fast attack, sustain)
- [ ] Create "Arp Pad" preset (slow arp, soft)
- [ ] Create "Zap Bass" preset (filter sweep)
- [ ] Create "S&H Sequence" preset (random LFO)
- [ ] Create "Empty" preset (blank slate)
- [ ] Add getPreset(id) and getPresetNames() functions

## Preset Structure

```javascript
{
  id: 'classicLead',
  name: 'Classic Lead',
  parameters: {
    vcoSaw: 0.8,
    vcoPulse: 0.6,
    pulseWidth: 0.35,
    subLevel: 0.3,
    subMode: 1,  // -1 octave
    cutoff: 0.6,
    resonance: 0.3,
    envMod: 0.4,
    attack: 0.01,
    decay: 0.3,
    sustain: 0.7,
    release: 0.2,
    lfoRate: 0.3,
    lfoToPitch: 0.1,
    lfoToFilter: 0,
    lfoToPW: 0.2,
  },
  // Optional: arp settings
  arp: {
    mode: 'up',
    octaves: 2,
    hold: false,
  },
  // Optional: sequence
  sequence: [...],
  bpm: 120,
}
```

## Classic SH-101 Sounds

| Sound | Character | Key Settings |
|-------|-----------|--------------|
| Classic Lead | PWM shimmer | Pulse + slow LFO to PW |
| Fat Bass | Thick, heavy | Saw + sub, low cutoff |
| Acid Line | Squelchy | High res, env mod, slide |
| Synth Brass | Punchy | Fast attack, high sustain |
| Arp Pad | Evolving | Slow arp, filter mod |
| Zap Bass | Sci-fi | Fast env, high env mod |
| S&H Sequence | Random | S&H LFO to filter |

## Completion Criteria
- [ ] At least 7 distinct presets
- [ ] Each preset sounds good immediately
- [ ] getPreset() and getPresetNames() work
- [ ] Presets cover range of SH-101 capabilities

## Files
- `dist/machines/sh101/presets.js`
