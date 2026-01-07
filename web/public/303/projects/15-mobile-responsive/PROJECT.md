# Project: Mobile Responsive

## Context
Ensure the TB-303 interface works well on mobile devices, following the responsive patterns established in TR-909.

## Tasks
- [ ] Add viewport meta tag
- [ ] Create mobile breakpoint (@media max-width: 768px)
- [ ] Adjust panel padding for mobile
- [ ] Stack controls vertically if needed
- [ ] Make knobs touch-friendly (larger tap targets)
- [ ] Consider step page toggle (1-8 / 9-16) like TR-909
- [ ] Ensure sequencer grid fits screen
- [ ] Test note input on touch
- [ ] Test knob dragging on touch
- [ ] Hide keyboard hints on mobile

## Mobile Layout Considerations
The TB-303 is simpler than TR-909 (one voice vs 11), so the mobile layout should be easier:
- Controls can stay horizontal or stack
- Sequencer grid needs to fit 16 steps OR paginate
- Note input might need larger tap targets

## Completion Criteria
- [ ] Usable on iPhone
- [ ] No horizontal scroll
- [ ] All controls accessible
- [ ] Touch interactions work smoothly

## Files
- `ui/tb303/styles.css` (media queries)
