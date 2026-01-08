# Project: Info Modal

## Context
Provide a modal with information about the SH-101 implementation, E1/E2 engine differences, keyboard shortcuts, and usage tips.

## Tasks
- [ ] Create modal HTML structure
- [ ] Style modal to match synth aesthetic
- [ ] Add SH-101 history/overview section
- [ ] Document E1 vs E2 engine differences
- [ ] List all keyboard shortcuts
- [ ] Add arpeggiator usage tips
- [ ] Add sequencer usage tips
- [ ] Add preset descriptions
- [ ] Add close button (X)
- [ ] Close on backdrop click
- [ ] Close on Escape key

## Modal Content Outline

```markdown
# Roland SH-101

The SH-101 is a monophonic synthesizer released by Roland in 1982.
Famous for its portability, built-in sequencer/arpeggiator, and
distinctive sound used in countless electronic music tracks.

## Engine Modes

**E1 (Simple)**
- Uses Web Audio's built-in filters
- Clean, digital sound
- Lower CPU usage
- Good for: Quick playback, mobile devices

**E2 (Authentic)**
- Emulates IR3109 filter chip
- Warmer, more analog-like sound
- Higher CPU usage
- Good for: Final renders, detailed sound design

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| A-L | Play notes (C3-E4) |
| W,E,T,Y,U,O,P | Play sharps |
| Z | Octave down |
| X | Octave up |
| Space | Play/Stop |
| Enter | Toggle record |

## Arpeggiator Tips

- Hold multiple keys for chords
- Use HOLD mode to accumulate notes
- Try different octave ranges
- UP-DOWN mode avoids repeating top/bottom notes

## Credits

Built with Web Audio API. Part of the Kochi.to synth collection.
```

## Completion Criteria
- [ ] Modal opens on info button click
- [ ] All sections present and readable
- [ ] Closes correctly (X, backdrop, Escape)
- [ ] Styled consistently with synth UI

## Files
- `ui/sh101/index.html` (modal structure)
- `ui/sh101/styles.css` (modal styles)
- `ui/sh101/app.js` (modal logic)
