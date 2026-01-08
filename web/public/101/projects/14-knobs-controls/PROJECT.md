# Project: Knobs & Controls

## Context
Implement interactive rotary knobs and sliders that respond to drag gestures. Follow the pattern established in the 303 implementation.

## Tasks
- [ ] Implement rotary knob component
- [ ] Add vertical drag to adjust value
- [ ] Add visual rotation feedback
- [ ] Implement vertical slider component
- [ ] Add touch support for mobile
- [ ] Add fine-tune mode (shift+drag)
- [ ] Add double-click to reset to default
- [ ] Connect controls to engine parameters
- [ ] Add value tooltips on drag
- [ ] Debounce parameter updates

## Knob Behavior

**Drag interaction:**
- Drag up = increase value
- Drag down = decrease value
- Sensitivity: 200px drag = full range
- Fine mode (shift): 4x slower

**Visual feedback:**
- Knob rotates 270° (from 7 o'clock to 5 o'clock)
- Indicator line shows current position
- Optional: arc indicator behind knob

**Touch support:**
- Touch start = begin drag
- Touch move = adjust value
- Touch end = commit value
- Prevent scroll during knob interaction

## Code Pattern (from 303)

```javascript
function initKnob(element, onChange) {
  let startY, startValue;

  element.addEventListener('pointerdown', (e) => {
    startY = e.clientY;
    startValue = parseFloat(element.dataset.value);
    element.setPointerCapture(e.pointerId);
  });

  element.addEventListener('pointermove', (e) => {
    if (!element.hasPointerCapture(e.pointerId)) return;
    const delta = (startY - e.clientY) / 200;
    const newValue = Math.max(0, Math.min(1, startValue + delta));
    element.dataset.value = newValue;
    updateKnobVisual(element, newValue);
    onChange(newValue);
  });
}
```

## Completion Criteria
- [ ] Knobs respond to vertical drag
- [ ] Visual rotation matches value
- [ ] Touch works on mobile
- [ ] Fine-tune mode works
- [ ] All knobs connected to engine
- [ ] No lag in response

## Files
- `ui/sh101/app.js` (control initialization)
