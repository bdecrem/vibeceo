# Project: Mobile Responsive

## Context
Ensure the SH-101 UI works well on mobile devices, particularly iPhone. The interface should be usable without horizontal scrolling.

## Tasks
- [ ] Add viewport meta tag
- [ ] Create mobile breakpoint (max-width: 768px)
- [ ] Stack control sections vertically on mobile
- [ ] Resize knobs for touch (48px minimum)
- [ ] Simplify keyboard to 1 octave on small screens
- [ ] Make sequencer grid scrollable horizontally
- [ ] Ensure touch targets are 44px minimum
- [ ] Test on iPhone Safari
- [ ] Prevent zoom on double-tap
- [ ] Prevent pull-to-refresh during interaction

## Mobile Layout

**Desktop (>768px):**
```
┌─────────────────────────────────────────────┐
│  VCO  │  VCF  │  VCA  │  ENV  │  LFO       │
├─────────────────────────────────────────────┤
│          SEQUENCER / ARPEGGIATOR            │
├─────────────────────────────────────────────┤
│              KEYBOARD                        │
└─────────────────────────────────────────────┘
```

**Mobile (<768px):**
```
┌────────────────┐
│  VCO + SUB     │
├────────────────┤
│  VCF + ENV     │
├────────────────┤
│  LFO + ARP     │
├────────────────┤
│  SEQUENCER     │  (horizontal scroll)
├────────────────┤
│  KEYBOARD      │  (1 octave)
└────────────────┘
```

## Touch Optimizations

```css
/* Prevent zoom on input focus */
input, select, button {
  font-size: 16px;
}

/* Larger touch targets */
.knob {
  min-width: 48px;
  min-height: 48px;
}

/* Prevent pull-to-refresh */
html {
  overscroll-behavior: none;
}
```

## Testing Checklist
- [ ] iPhone SE (smallest common screen)
- [ ] iPhone 14 (standard)
- [ ] iPhone 14 Pro Max (large)
- [ ] iPad (tablet)
- [ ] Landscape orientation

## Completion Criteria
- [ ] No horizontal scroll on mobile
- [ ] All controls usable with fingers
- [ ] Keyboard playable on touchscreen
- [ ] Sequencer scrolls smoothly
- [ ] No accidental zoom/refresh

## Files
- `ui/sh101/styles.css` (media queries)
