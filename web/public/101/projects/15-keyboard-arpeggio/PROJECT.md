# Project: Keyboard & Arpeggio

## Context
Implement the on-screen keyboard for playing notes and the arpeggiator interaction. Computer keyboard input for playing notes.

## Tasks
- [ ] Render 2-octave keyboard (C3-C5)
- [ ] Mouse/touch triggers notes
- [ ] Computer keyboard maps to notes (A-K, W-P)
- [ ] Visual feedback on key press
- [ ] Keys feed into arpeggiator when arp enabled
- [ ] Hold mode latches keys
- [ ] Octave up/down buttons
- [ ] Velocity sensitivity (optional)
- [ ] Pitch bend wheel (optional)
- [ ] Mod wheel for LFO amount (optional)

## Keyboard Mapping

**Computer keyboard → notes:**
```
 W E   T Y U   O P
A S D F G H J K L ;
C D E F G A B C D E
3 3 3 3 3 3 3 4 4 4
```

Lower row = natural notes (C, D, E, F, G, A, B, C, D, E)
Upper row = sharps/flats (C#, D#, F#, G#, A#)

**Special keys:**
- Z = octave down
- X = octave up
- Space = toggle play/stop
- Enter = toggle record

## Arpeggiator Integration

When arpeggiator is on:
1. Key press adds note to held notes array
2. Key release removes note (unless hold mode)
3. Arpeggiator cycles through held notes
4. Visual: held notes stay highlighted

When hold mode is on:
1. Key press toggles note in/out of held array
2. Key release does nothing
3. Held notes accumulate
4. Clear all: press hold button again

## Touch Support
- Touch start = note on
- Touch end = note off
- Multi-touch for chords
- Prevent scrolling on keyboard area

## Completion Criteria
- [ ] On-screen keyboard plays notes
- [ ] Computer keyboard works
- [ ] Arpeggiator receives held notes
- [ ] Hold mode works correctly
- [ ] Visual feedback on all interactions

## Files
- `ui/sh101/app.js` (keyboard logic)
