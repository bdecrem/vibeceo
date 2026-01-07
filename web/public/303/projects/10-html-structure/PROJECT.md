# Project: HTML Structure

## Context
Create the base HTML structure for the TB-303 web interface, following the TR-909 patterns but adapted for the 303's simpler control set.

## Tasks
- [ ] Create `ui/tb303/index.html`
- [ ] Add header with TB-303 title
- [ ] Create controls section:
  - [ ] Waveform toggle (saw/square)
  - [ ] Cutoff knob
  - [ ] Resonance knob
  - [ ] Env Mod knob
  - [ ] Decay knob
  - [ ] Accent knob
- [ ] Create transport section:
  - [ ] BPM input
  - [ ] Play/Stop button
  - [ ] Preset selector
- [ ] Create sequencer grid section:
  - [ ] 16 step columns
  - [ ] Note row
  - [ ] Gate row
  - [ ] Accent row
  - [ ] Slide row
- [ ] Add status display
- [ ] Add keyboard hints
- [ ] Link to app.js and styles.css

## Layout Reference
```html
<main class="panel">
  <div class="header-row">
    <h1>TB-303</h1>
    <div class="engine-controls">...</div>
  </div>

  <section class="controls">
    <!-- Waveform, knobs, transport -->
  </section>

  <section class="sequencer">
    <!-- 16-step grid with note/gate/accent/slide -->
  </section>

  <section class="voice-controls">
    <!-- Additional controls if needed -->
  </section>
</main>
```

## Completion Criteria
- [ ] HTML structure complete
- [ ] All controls have proper IDs
- [ ] Semantic markup
- [ ] Accessible (labels, ARIA)

## Files
- `ui/tb303/index.html`
