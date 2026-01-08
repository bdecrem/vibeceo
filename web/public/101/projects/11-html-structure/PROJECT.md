# Project: HTML Structure

## Context
Create the main HTML structure for the SH-101 web UI. The design should evoke the original gray SH-101 hardware with its distinctive colored control sections.

## Tasks
- [ ] Create ui/sh101/index.html
- [ ] Add main synth panel layout
- [ ] Add VCO section (saw/pulse sliders, range, mod)
- [ ] Add sub-oscillator section (level, mode switch)
- [ ] Add filter section (cutoff, res, env, kybd)
- [ ] Add envelope section (A/D/S/R sliders)
- [ ] Add LFO section (rate, destinations)
- [ ] Add keyboard (2 octaves)
- [ ] Add arpeggiator controls
- [ ] Add sequencer display/controls
- [ ] Add transport (play/stop/record)
- [ ] Add preset selector dropdown
- [ ] Add E1/E2 engine toggle
- [ ] Add info button (opens modal)

## Layout Reference (Original SH-101)

```
┌─────────────────────────────────────────────────────────────┐
│  VCO      │  VCF       │  VCA      │  ENV      │  LFO      │
│ ┌───┬───┐ │ ┌───┬───┐ │ ┌───┐    │ ┌─┬─┬─┬─┐ │ ┌───┐     │
│ │SAW│PLS│ │ │CUT│RES│ │ │VOL│    │ │A│D│S│R│ │ │RAT│     │
│ └───┴───┘ │ └───┴───┘ │ └───┘    │ └─┴─┴─┴─┘ │ └───┘     │
│  ○ ○ ○ ○  │  ○ ○ ○    │          │           │ ○ ○ ○     │
│  range    │  env kybd  │          │           │ destinations│
├───────────┴───────────┴──────────┴───────────┴───────────┤
│  SEQUENCER / ARPEGGIATOR                                   │
│  [REC] [PLAY] [STOP]   MODE: ○UP ○DN ○UD   HOLD: ○        │
├───────────────────────────────────────────────────────────┤
│  ┌─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┐        │
│  │ │█│ │█│ │ │█│ │█│ │█│ │ │█│ │█│ │ │█│ │█│ │█│ │        │
│  │ │█│ │█│ │ │█│ │█│ │█│ │ │█│ │█│ │ │█│ │█│ │█│ │        │
│  └─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┘        │
│   C D E F G A B C D E F G A B C D E F G A B C D E          │
└───────────────────────────────────────────────────────────┘
```

## Color Scheme (Original SH-101)
- Body: Gray (#d0d0d0)
- Panel text: Black
- Buttons: Red (#c94444) or Blue (#4477aa)
- Knobs: Black with white indicator
- Keys: White naturals, black sharps

## Completion Criteria
- [ ] All control sections present
- [ ] Keyboard renders correctly
- [ ] Layout flows logically
- [ ] Semantic HTML structure
- [ ] Ready for CSS styling

## Files
- `ui/sh101/index.html`
