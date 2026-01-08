# R1-D1

A browser-based monophonic synthesizer inspired by classic 101 sounds. Pure Web Audio API synthesis.

**[Live Demo](https://kochi.to/101)**

## What is this?

R1-D1 is a mono synth that runs entirely in your browser. VCO with saw/pulse, sub-oscillator, resonant filter, full ADSR, LFO, arpeggiator, and 16-step sequencer. All synthesis happens in real-time using the Web Audio API.

### Features

- VCO with sawtooth and pulse (PWM)
- Sub-oscillator (-1 oct, -2 oct, pulse modes)
- IR3109-style resonant lowpass filter
- Full ADSR envelope
- LFO with triangle, square, and sample-and-hold
- LFO routing to pitch, filter, and pulse width
- 16-step sequencer with accent and slide
- Arpeggiator (up, down, up-down modes)
- E1/E2 engine toggle (simple vs authentic)
- Preset sounds (Classic Lead, Fat Bass, Acid Line, etc.)
- Keyboard input (A-K plays notes)
- Mobile-responsive

### Sound Architecture

```
VCO (Saw/Pulse) ──┬──> VCF (IR3109) ──> VCA ──> Output
                  │         ↑            ↑
Sub Oscillator ───┘    Env Mod      ADSR Envelope
                           ↑
                    LFO (Tri/Sq/S&H)
                     ↓    ↓    ↓
                  Pitch  VCF   PW
```

## Usage

Just open `index.html` in a browser. No build step required.

Or use the engine programmatically:

```javascript
import { SH101Engine } from './dist/machines/sh101/engine.js';

const synth = new SH101Engine();

// Set parameters
synth.setParameter('cutoff', 0.3);
synth.setParameter('resonance', 0.7);
synth.setParameter('vcoSaw', 1.0);

// Play a note
synth.playNote('C3', 1.0);

// Or use the sequencer
synth.setPattern([
  { note: 'C3', gate: true, accent: true, slide: false },
  { note: 'C3', gate: false, accent: false, slide: false },
  // ... 16 steps
]);
synth.startSequencer();
```

## File Structure

```
101/
├── dist/
│   ├── api/index.js              # SH101Controller
│   └── machines/sh101/
│       ├── engine.js             # Main engine
│       ├── oscillator.js         # VCO
│       ├── sub-oscillator.js     # Sub osc
│       ├── filter/ir3109.js      # Filter emulation
│       ├── envelope.js           # ADSR
│       ├── lfo.js                # LFO
│       └── presets.js            # Preset sounds
├── ui/sh101/                     # HTML + CSS interface
└── index.html                    # Entry point
```

## Credits

- Sound design inspired by the Roland SH-101

## License

MIT - Do whatever you want.

---

*Built by [Kochi.to](https://kochi.to). This is a code dump, not a maintained project. Use it, fork it, learn from it.*
