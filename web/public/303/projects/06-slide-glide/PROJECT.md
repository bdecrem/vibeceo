# Project: Slide/Glide Implementation

## Context
Slide (portamento/glide) is a signature TB-303 feature. When slide is enabled for a step, the pitch glides smoothly to the next note while the gate stays open.

## Tasks
- [ ] Add slide handling to TB303Sequencer
- [ ] Implement glide in Bass303 voice
- [ ] Use exponential pitch curve (not linear)
- [ ] Set glide time (~60ms, fixed like original)
- [ ] Keep gate open during slide
- [ ] Handle slide into rest (stop on rest)
- [ ] Handle slide at pattern end (wrap or stop)
- [ ] Test with various note intervals

## Technical Notes
TB-303 slide behavior:
- Glide time is fixed (not adjustable on original)
- Pitch slides exponentially for natural sound
- Gate remains open = no re-trigger of envelope
- Filter continues from current state
- Creates the classic "wah" effect when combined with accent

## Implementation Approach
```javascript
// In sequencer, when slide is active:
if (currentStep.slide && nextStep.gate) {
  // Don't retrigger envelope
  // Start pitch glide to next note
  voice.glideTo(nextNote, glideTime);
} else {
  // Normal trigger
  voice.trigger(note, velocity);
}
```

## Completion Criteria
- [ ] Slide creates smooth pitch transition
- [ ] Gate stays open during slide
- [ ] Envelope doesn't retrigger on slide
- [ ] Multiple consecutive slides work
- [ ] Sounds like authentic 303 slide

## Files
- `dist/machines/tb303/sequencer.js` (slide logic)
- `dist/machines/tb303/voices/bass.js` (glideTo method)
