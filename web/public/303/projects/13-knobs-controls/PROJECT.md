# Project: Knobs & Controls

## Context
Implement the interactive knob controls for the synth parameters, reusing the TR-909 knob interaction patterns.

## Tasks
- [ ] Port knob drag handling from TR-909 app.js
- [ ] Create knobs for:
  - [ ] Cutoff
  - [ ] Resonance
  - [ ] Env Mod
  - [ ] Decay
  - [ ] Accent
- [ ] Wire knobs to engine parameters
- [ ] Display current values
- [ ] Implement double-click to reset
- [ ] Add waveform toggle (saw/square button)
- [ ] Add tuning control (if needed)
- [ ] Ensure touch support for mobile

## Knob Implementation (from TR-909)
```javascript
// Drag handling
function startKnobDrag(clientY, knobEl, param, valueDisplay) { ... }
function updateKnobFromDrag(clientY) { ... }
function handleKnobEnd() { ... }

// Mouse and touch events
knob.addEventListener('mousedown', ...);
knob.addEventListener('touchstart', ...);
document.addEventListener('mousemove', ...);
document.addEventListener('touchmove', ...);
```

## Completion Criteria
- [ ] All knobs functional
- [ ] Values update engine in real-time
- [ ] Visual rotation matches value
- [ ] Touch works on mobile
- [ ] Double-click resets to default

## Files
- `dist/ui/tb303/app.js`
