# Project: Presets

## Context
Create a library of classic acid patterns that demonstrate the TB-303's capabilities and provide starting points for users.

## Tasks
- [ ] Define pattern data structure
- [ ] Create "Acid Line 1" - Classic rising pattern
- [ ] Create "Acid Line 2" - Descending with slides
- [ ] Create "Minimal" - Simple repeated note with accents
- [ ] Create "Squelch" - High resonance showcase
- [ ] Create "Bassline" - Musical phrase
- [ ] Create "Random" - Experimental pattern
- [ ] Add preset loading to engine
- [ ] Add preset selector to UI (later)

## Pattern Structure
```javascript
const preset = {
  id: 'acid-classic',
  name: 'Acid Classic',
  bpm: 130,
  pattern: {
    steps: [
      { note: 'C2', gate: true, accent: true, slide: false },
      { note: 'C2', gate: true, accent: false, slide: true },
      { note: 'D#2', gate: true, accent: false, slide: false },
      // ... 16 steps
    ]
  },
  params: {
    waveform: 'saw',
    cutoff: 0.3,
    resonance: 0.7,
    envMod: 0.6,
    decay: 0.4,
    accent: 0.8
  }
};
```

## Completion Criteria
- [ ] At least 5 presets created
- [ ] Presets load correctly
- [ ] Each preset sounds good
- [ ] Presets demonstrate different 303 techniques

## Files
- `dist/machines/tb303/presets.js`
