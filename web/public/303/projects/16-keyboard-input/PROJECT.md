# Project: Keyboard Input

## Context
Allow users to play the TB-303 voice directly via computer keyboard, and possibly program notes via keyboard.

## Tasks
- [ ] Map keyboard keys to notes:
  - [ ] A-K for white keys (C-B)
  - [ ] W, E, T, Y, U for black keys
- [ ] Trigger voice on keydown
- [ ] Release on keyup (optional, for held notes)
- [ ] Add Space for play/stop
- [ ] Consider arrow keys for step navigation
- [ ] Consider number keys for step selection
- [ ] Show keyboard hints in UI
- [ ] Don't trigger when typing in inputs

## Key Mapping
```
    W   E       T   Y   U
  [C#] [D#]   [F#] [G#] [A#]
 A   S   D   F   G   H   J   K
[C] [D] [E] [F] [G] [A] [B] [C]
```

## Completion Criteria
- [ ] Can play notes via keyboard
- [ ] Space toggles playback
- [ ] No conflicts with text input
- [ ] Keyboard hints displayed

## Files
- `dist/ui/tb303/app.js`
