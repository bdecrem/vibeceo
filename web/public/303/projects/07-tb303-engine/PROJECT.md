# Project: TB303Engine

## Context
Create the main engine class that orchestrates the voice, sequencer, and provides the public API. Extends the shared SynthEngine base class.

## Tasks
- [ ] Create `TB303Engine` class extending SynthEngine
- [ ] Initialize Bass303 voice (E2 by default)
- [ ] Initialize TB303Sequencer
- [ ] Connect sequencer events to voice triggering
- [ ] Implement pattern management (setPattern, getPattern)
- [ ] Add BPM control
- [ ] Add play/stop controls
- [ ] Implement voice parameter passthrough
- [ ] Add getVoiceParameterDescriptors()
- [ ] Set up step change callback for UI

## API Surface
```javascript
class TB303Engine extends SynthEngine {
  // Playback
  startSequencer(): void
  stopSequencer(): void
  isPlaying(): boolean
  setBpm(bpm: number): void

  // Pattern
  setPattern(pattern: TB303Pattern): void
  getPattern(): TB303Pattern

  // Voice parameters
  setWaveform(type: 'saw' | 'square'): void
  setCutoff(value: number): void
  setResonance(value: number): void
  setEnvMod(value: number): void
  setDecay(value: number): void
  setAccent(value: number): void

  // Engine switching
  setEngine(version: 'E1' | 'E2'): void
  getEngine(): string

  // Callbacks
  onStepChange?: (step: number) => void
}
```

## Completion Criteria
- [ ] Engine initializes without errors
- [ ] Sequencer plays patterns through voice
- [ ] All parameters accessible via API
- [ ] Step callback fires for UI sync

## Files
- `dist/machines/tb303/engine.js`
