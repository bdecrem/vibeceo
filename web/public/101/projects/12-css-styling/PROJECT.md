# Project: CSS Styling

## Context
Style the SH-101 UI to evoke the original hardware aesthetic: gray body, colored control sections, distinctive Roland look.

## Tasks
- [ ] Create ui/sh101/styles.css
- [ ] Style main panel with gray gradient
- [ ] Style control sections with subtle borders
- [ ] Create rotary knob appearance
- [ ] Create slider appearance
- [ ] Style toggle switches/buttons
- [ ] Style keyboard (white/black keys)
- [ ] Add hover/active states
- [ ] Add LED indicators for active states
- [ ] Style sequencer step display
- [ ] Add Roland-style typography
- [ ] Add subtle shadows for depth

## Design System

**Colors:**
```css
--sh101-body: #c8c8c8;
--sh101-body-dark: #a0a0a0;
--sh101-panel: #e8e8e8;
--sh101-text: #1a1a1a;
--sh101-accent-red: #c94444;
--sh101-accent-blue: #4477aa;
--sh101-knob: #2a2a2a;
--sh101-led-on: #ff4444;
--sh101-led-off: #441111;
```

**Typography:**
- Headers: Bold, uppercase, condensed
- Labels: Small, uppercase
- Values: Monospace for numbers

**Controls:**
- Knobs: 40px diameter, dark with white indicator line
- Sliders: Vertical, 100px height
- Buttons: Rounded rectangle, colored
- Switches: Toggle style with position indicator

**Keyboard:**
- White keys: 40px wide, 120px tall
- Black keys: 24px wide, 70px tall, overlapping

## 303 Reference
Copy patterns from 303's CSS where applicable:
- Knob drag interaction styles
- Mobile breakpoints
- Animation timing

## Completion Criteria
- [ ] Looks like an SH-101
- [ ] All controls visually distinct
- [ ] Keyboard looks playable
- [ ] Consistent spacing/sizing
- [ ] Readable labels

## Files
- `ui/sh101/styles.css`
