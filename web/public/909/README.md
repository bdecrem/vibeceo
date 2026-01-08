# R9-D9

A browser-based drum machine inspired by classic 909 sounds. Pure Web Audio API synthesis.

**[Live Demo](https://kochi.to/909)**

## What is this?

R9-D9 is a drum machine that runs entirely in your browser. No samples required (though it can load them). All synthesis happens in real-time using the Web Audio API.

### Features

- 11 synthesized drum voices (kick, snare, clap, hats, toms, cymbals)
- 16-step sequencer with swing and flam
- E1/E2 engine toggle (simple vs circuit-accurate synthesis)
- Pattern save/load to localStorage
- WAV export
- Keyboard shortcuts (1-0 trigger sounds, Space plays/stops)
- Mobile-responsive

### Voices

| Voice | E1 (Simple) | E2 (Authentic) |
|-------|-------------|----------------|
| Kick | Sine + pitch sweep | Triangle through waveshaper, circuit-accurate envelope |
| Snare | Triangle + filtered noise | Dual sine oscillators + bridged-T resonance |
| Clap | Bandpass noise bursts | Four randomized bursts + reverb tail |
| Hats | Highpass noise | Six square oscillators at inharmonic frequencies |
| Toms | Sine + pitch envelope | Three oscillators with analog saturation |

## Usage

Just open `index.html` in a browser. No build step required.

Or use the engine programmatically:

```javascript
import { TR909Engine } from './dist/machines/tr909/engine.js';

const engine = new TR909Engine();
engine.trigger('kick', 1.0);
engine.trigger('snare', 0.8);
```

## File Structure

```
909/
├── dist/           # Compiled JavaScript modules
├── ui/tr909/       # HTML + CSS interface
├── samples/        # Optional real samples (hats, cymbals)
└── index.html      # Entry point (redirects to ui/)
```

## Credits

- WAV encoding based on [audiobuffer-to-wav](https://github.com/Jam3/audiobuffer-to-wav) (MIT)
- Sound design inspired by the Roland TR-909

## License

MIT - Do whatever you want.

---

*Built by [Kochi.to](https://kochi.to). This is a code dump, not a maintained project. Use it, fork it, learn from it.*
