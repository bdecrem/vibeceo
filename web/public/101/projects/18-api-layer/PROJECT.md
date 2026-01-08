# Project: API Layer

## Context
Create a programmatic API for the creative agent to generate SH-101 tracks. Following the pattern established by TB-303 API.

## Tasks
- [ ] Create dist/api/index.js
- [ ] Implement SH101Controller class
- [ ] Add renderSh101PatternToWav function
- [ ] Add renderPresetToWav function
- [ ] Support all synth parameters
- [ ] Support arpeggiator configuration
- [ ] Support sequence patterns
- [ ] Add engine selection (E1/E2)
- [ ] Export getPresets() helper
- [ ] Document all API methods

## API Design (following 303 pattern)

```javascript
import { SH101Controller, renderPresetToWav } from './dist/api/index.js';

// Option 1: Render a preset to WAV
const { wav } = await renderPresetToWav('classicLead', { bars: 4 });

// Option 2: Controller for real-time or custom patterns
const synth = new SH101Controller({ engine: 'E2' });
synth.loadPreset('fatBass');
synth.setParameter('cutoff', 0.4);
synth.setParameter('resonance', 0.6);
synth.play();

// Option 3: Arpeggiator
synth.setArpMode('up');
synth.setArpHold(true);
synth.addArpNote('C3');
synth.addArpNote('E3');
synth.addArpNote('G3');
synth.play();

// Option 4: Custom sequence
synth.setSequence([
  { note: 'C3', gate: true, accent: true },
  { note: 'C3', gate: false },
  // ...
]);

// Render to WAV
const { wav } = await synth.renderToWav({ bars: 2 });
```

## Controller Methods

```javascript
class SH101Controller {
  // Presets
  loadPreset(presetId)
  static getPresets()

  // Parameters
  setParameter(id, value)
  getParameter(id)
  getParameters()

  // Oscillator
  setVcoSaw(level)
  setVcoPulse(level)
  setPulseWidth(width)
  setSubLevel(level)
  setSubMode(mode)

  // Filter & Envelope
  setCutoff(value)
  setResonance(value)
  setEnvMod(value)
  setAttack(value)
  setDecay(value)
  setSustain(value)
  setRelease(value)

  // LFO
  setLfoRate(rate)
  setLfoToPitch(amount)
  setLfoToFilter(amount)
  setLfoToPW(amount)

  // Arpeggiator
  setArpMode('up' | 'down' | 'updown' | 'off')
  setArpHold(boolean)
  setArpOctaves(1 | 2 | 3)
  addArpNote(note)
  removeArpNote(note)
  clearArpNotes()

  // Sequencer
  setSequence(steps[])
  getSequence()

  // Playback
  play()
  stop()
  isPlaying()
  setBpm(bpm)
  playNote(note, velocity)

  // Rendering
  async renderToBuffer(options)
  async renderToWav(options)

  // Engine
  setEngine('E1' | 'E2')
}
```

## Completion Criteria
- [ ] Controller instantiates without error
- [ ] Presets load correctly
- [ ] All parameters work
- [ ] Arpeggiator produces output
- [ ] renderToWav produces valid audio
- [ ] Matches TB303Controller patterns

## Files
- `dist/api/index.js`
