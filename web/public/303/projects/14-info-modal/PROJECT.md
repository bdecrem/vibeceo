# Project: Info Modal

## Context
Add an info button that shows a modal with synthesis information for E1 and E2 engines, following the TR-909 pattern.

## Tasks
- [ ] Add info button to header (next to engine toggle)
- [ ] Create modal HTML structure
- [ ] Style modal (reuse TR-909 modal styles)
- [ ] Add synthesis descriptions:
  - [ ] E1 description
  - [ ] E2 description
- [ ] Implement show/hide logic
- [ ] Close on backdrop click
- [ ] Close on Escape key
- [ ] Close on X button

## Voice Info Content
```javascript
const VOICE_INFO = {
  bass: {
    e1: 'Standard oscillator with biquad lowpass filter. Clean sound, minimal CPU usage. Good for layering.',
    e2: 'Diode ladder filter (~18dB/oct) with resonance self-oscillation. Accent boosts both VCA and filter modulation. Exponential envelope curves. The authentic acid squelch.',
  }
};
```

## Completion Criteria
- [ ] Info button visible and clickable
- [ ] Modal appears with correct content
- [ ] Modal closes properly
- [ ] Styled consistently with TR-909

## Files
- `dist/ui/tb303/app.js`
- `ui/tb303/styles.css`
