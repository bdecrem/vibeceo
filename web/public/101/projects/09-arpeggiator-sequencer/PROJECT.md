# Project: Arpeggiator & Sequencer

## Context
The SH-101 is famous for its built-in sequencer and arpeggiator. The arpeggiator plays held notes in patterns (up, down, up-down). The sequencer stores and plays back 100 steps.

## Tasks
- [ ] Implement arpeggiator with up mode
- [ ] Add down mode
- [ ] Add up-down mode
- [ ] Add hold/latch feature
- [ ] Implement 16-step sequencer (simplified from 100)
- [ ] Add sequence recording mode
- [ ] Add sequence playback with tempo sync
- [ ] Add gate length control
- [ ] Support both arp and seq modes

## Technical Notes

**Arpeggiator modes:**
- **Up:** Plays notes from lowest to highest, repeats
- **Down:** Plays notes from highest to lowest, repeats
- **Up-Down:** Plays up then down, repeats (no double at ends)

**Hold/Latch:**
- When enabled, arp continues after keys released
- New keys add to held notes
- Press same key to remove from held notes

**Sequencer (simplified):**
- Original SH-101: 100 steps with transposition
- Our implementation: 16 steps (like 303)
- Each step: note, gate on/off, accent, slide
- Transposition via keyboard

**Timing:**
- Clock from BPM setting
- Gate length: 25%, 50%, 75%, tie
- Swing option for groove

## Implementation
```javascript
class Arpeggiator {
  addNote(note) {}
  removeNote(note) {}
  setMode('up' | 'down' | 'updown') {}
  setHold(boolean) {}
  tick() { return currentNote; }
}

class Sequencer {
  setPattern(steps[]) {}
  setGateLength(percent) {}
  tick() { return currentStep; }
}
```

## Completion Criteria
- [ ] Arpeggiator plays up/down/up-down correctly
- [ ] Hold mode latches notes
- [ ] Sequencer plays 16-step pattern
- [ ] Sequence recording works
- [ ] Both sync to BPM

## Files
- `dist/machines/sh101/arpeggiator.js`
- `dist/machines/sh101/sequencer.js`
