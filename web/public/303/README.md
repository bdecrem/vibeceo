# R3-D3

A browser-based bass synthesizer inspired by the classic 303 sound. Pure Web Audio API synthesis.

**[Live Demo](https://kochi.to/303)**

## What is this?

R3-D3 is an acid bass synth that runs entirely in your browser. All synthesis happens in real-time using the Web Audio API, including a custom diode ladder filter emulation.

### Features

- Sawtooth and square waveforms
- Diode ladder filter with resonance and self-oscillation
- Filter envelope with cutoff, resonance, env mod, decay controls
- 16-step sequencer with per-step note, gate, accent, and slide
- Authentic slide/glide behavior
- E1/E2 engine toggle (simple biquad vs diode ladder)
- Preset patterns (Phuture, Squelch, Dark Acid, etc.)
- WAV export
- Keyboard input (A-K plays notes, Shift for accent)
- Mobile-responsive

### The 303 Sound

The magic of the 303 comes from:
- **Accent** - louder notes with extended filter sweep
- **Slide** - portamento glide between notes
- **Filter envelope** - the characteristic "squelch"
- **Resonance** - self-oscillation at high settings

## Usage

Just open `index.html` in a browser. No build step required.

Or use the engine programmatically:

```javascript
import { TB303Engine } from './dist/machines/tb303/engine.js';

const engine = new TB303Engine();

// Set a pattern
engine.setPattern([
  { note: 'C2', gate: true, accent: true, slide: false },
  { note: 'C2', gate: false, accent: false, slide: false },
  { note: 'E2', gate: true, accent: false, slide: true },
  { note: 'G2', gate: true, accent: true, slide: false },
  // ... 16 steps total
]);

// Tweak the filter
engine.setParameter('cutoff', 0.3);
engine.setParameter('resonance', 0.7);
engine.setParameter('envMod', 0.8);

// Play
engine.startSequencer();
```

## File Structure

```
303/
├── dist/                    # Compiled JavaScript modules
│   ├── machines/tb303/      # Engine, sequencer, presets
│   │   └── filter/          # Diode ladder filter
│   └── core/                # Base classes
├── ui/tb303/                # HTML + CSS interface
└── index.html               # Entry point
```

## The Diode Ladder Filter

The E2 engine uses a custom diode ladder filter emulation:
- 3 cascaded biquad filters (18dB/octave slope)
- Feedback path for self-oscillation
- Soft saturation via waveshaper
- Detuned stages for analog character

See `dist/machines/tb303/filter/diode-ladder.js` for the implementation.

## Credits

- Sound design inspired by the Roland TB-303

## License

MIT - Do whatever you want.

---

*Built by [Kochi.to](https://kochi.to). This is a code dump, not a maintained project. Use it, fork it, learn from it.*
