# Project: Sequencer UI

## Context
Implement the interactive sequencer grid that allows programming notes, gates, accents, and slides for each of the 16 steps.

## Tasks
- [ ] Render 16-step grid dynamically
- [ ] Note input per step:
  - [ ] Click to cycle through notes, OR
  - [ ] Dropdown/picker for note selection
- [ ] Gate toggle per step (on/off)
- [ ] Accent toggle per step (on/off)
- [ ] Slide toggle per step (on/off)
- [ ] Highlight current playing step
- [ ] Update pattern in engine on changes
- [ ] Display note names (C2, D#2, etc.)
- [ ] Visual feedback on interaction

## Interaction Design
```
Step:    1     2     3     4     5     ...
Note:   [C2]  [D2]  [E2]  [F2]  [G2]  ...  ← Click to change
Gate:   [●]   [●]   [○]   [●]   [●]   ...  ← Toggle on/off
Accent: [▲]   [○]   [○]   [▲]   [○]   ...  ← Toggle on/off
Slide:  [/]   [○]   [○]   [○]   [/]   ...  ← Toggle on/off
```

## Note Input Options
1. **Cycle**: Click note to cycle C→C#→D→...→B→C
2. **Picker**: Click opens dropdown with notes
3. **Keyboard**: Focus step, type note (C, D, E...)

Recommend: Start with cycle, add picker later if needed.

## Completion Criteria
- [ ] Can program complete patterns
- [ ] Changes reflect in playback immediately
- [ ] Visual state matches engine state
- [ ] Current step highlighted during playback

## Files
- `dist/ui/tb303/app.js`
