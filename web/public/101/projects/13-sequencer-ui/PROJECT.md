# Project: Sequencer UI

## Context
Build the sequencer/arpeggiator display and controls. Shows current step, allows pattern editing, and provides transport controls.

## Tasks
- [ ] Create 16-step sequencer grid display
- [ ] Show current step highlight during playback
- [ ] Add note display per step
- [ ] Add gate on/off toggle per step
- [ ] Add accent toggle per step
- [ ] Add slide/tie toggle per step
- [ ] Create arpeggiator mode buttons (up/down/up-down)
- [ ] Add hold/latch toggle
- [ ] Add octave range selector
- [ ] Add record button with indicator
- [ ] Add play/stop buttons
- [ ] Add BPM display and control

## UI Elements

**Step Grid:**
```
 1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16
┌──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┐
│C2│  │E2│  │G2│  │C3│  │C2│  │E2│  │G2│  │C3│  │ Note
├──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┤
│● │○ │● │○ │● │○ │● │○ │● │○ │● │○ │● │○ │● │○ │ Gate
├──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┤
│  │  │A │  │  │  │A │  │  │  │A │  │  │  │A │  │ Accent
├──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┤
│  │  │─ │  │  │  │─ │  │  │  │─ │  │  │  │─ │  │ Slide
└──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┘
        ▲ current step
```

**Transport:**
```
[⏺ REC] [▶ PLAY] [⏹ STOP]  BPM: [120]
```

**Arp Controls:**
```
MODE: [UP] [DOWN] [UP-DN]   HOLD: [○]   OCT: [1] [2] [3]
```

## Interaction
- Click note cell → opens note picker
- Click gate → toggles on/off
- Click accent → toggles accent
- Click slide → toggles slide
- Current step glows during playback
- Arp mode buttons are radio-style (one active)

## Completion Criteria
- [ ] Step grid displays pattern
- [ ] Clicking cells edits values
- [ ] Current step highlights during play
- [ ] Transport controls work
- [ ] Arp mode selection works
- [ ] BPM can be adjusted

## Files
- `ui/sh101/app.js` (sequencer UI logic)
