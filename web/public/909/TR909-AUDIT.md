# TR-909 Comprehensive Audit: B+ → A+

Based on research from:
- [Roland's official specs](https://support.roland.com/hc/en-us/articles/201921899-TR-909-Technical-Specifications)
- [Sound On Sound's technical review](https://www.soundonsound.com/reviews/roland-tr909)
- [Gearspace synthesis discussions](https://gearspace.com/board/electronic-music-instruments-and-electronic-music-production/1099922-synthesizing-tr-909-kick-drum.html)
- [TR-909 circuit schematics](http://www.analog-synth.de/synths/tr909/tr909.htm)
- [Snare synthesis deep dive](https://www.soundonsound.com/techniques/practical-snare-drum-synthesis)

---

## SYNTHESIS ISSUES (Library)

| Sound | Issue | Original Spec | Current Implementation |
|-------|-------|---------------|------------------------|
| **Kick** | Wrong waveform | Sawtooth → waveshaped to sine | Pure sine oscillator |
| **Kick** | Narrow tune range | "Fairly wide" (~octave+) | ±50 cents only |
| **Kick** | Attack transient | Short impulse/pulse + LP filtered noise | Bandpass filtered noise burst |
| **Kick** | Pitch envelope | ~165Hz (E3) down to subsonic | 160Hz → 30Hz (close but not tuned to E3) |
| **Snare** | Wrong oscillator count | TWO sine oscillators (shell modes 0,1) | One triangle oscillator |
| **Snare** | Frequency behavior | Static dual frequencies for shell modes | Ramps 180Hz → 330Hz (incorrect) |
| **Snare** | Missing TUNE control | Has Tune knob on original | Not implemented |
| **Snare** | Snappy behavior | Affects noise balance AND attack speed | Only affects balance |
| **Clap** | Noise isolation | Shares noise source with snare (phasing effect) | Separate noise buffer |
| **Clap** | Extra parameter | Level only on original | Has "Spread" (non-authentic) |
| **Rimshot** | Extra parameter | Level only on original | Has Tune (non-authentic) |
| **Hi-Hat** | Missing TUNE | Tune control for playback rate | Not implemented |
| **Hi-Hat** | Synth fallback | 6-bit samples at 18kHz | Crude HP noise + sine (poor quality) |
| **Cymbals** | Missing TUNE | Tune control for playback rate | Not implemented |
| **Cymbals** | Synth fallback | 6-bit samples at 18kHz | Simple additive sines (poor quality) |
| **Toms** | Frequencies unverified | Need schematic reference | 110/164/220 Hz (need verification) |

---

## SEQUENCER ISSUES (Library)

| Feature | Original Spec | Current Implementation |
|---------|---------------|------------------------|
| **Pattern length** | 1-16 steps (variable per pattern) | Fixed 16 steps only |
| **Scale modes** | 16th notes, 8th triplets, 16th triplets, 32nd notes | 16th notes only |
| **Pattern memory** | 96 patterns (48 × 2 banks) | Unlimited via localStorage |
| **Banks** | Bank I and Bank II | Not implemented |
| **Pattern chaining** | Chain up to 96 patterns, 896 measures | Not implemented |
| **Tempo range** | 37-290 BPM | 40-220 BPM in UI |
| **Total Accent** | Global accent level affects all accented steps | Not implemented |
| **Tap recording** | Step mode AND Tap mode | Step mode only |
| **Sync** | MIDI clock, DIN sync, tape sync | None (setTimeout only) |

---

## WEB INTERFACE ISSUES

| Component | Issue |
|-----------|-------|
| **BPM input** | Range 40-220 instead of 37-290 |
| **Snare panel** | Missing TUNE knob |
| **Hi-Hat panels** | Missing TUNE knobs for CH/OH |
| **Cymbal panels** | Missing TUNE knobs for CC/RC |
| **Rimshot panel** | Has TUNE knob (shouldn't have) |
| **Clap panel** | Has SPREAD knob (non-authentic, but useful) |
| **Scale selector** | Missing entirely |
| **Pattern length** | Missing (can't set 1-16 steps) |
| **Total Accent** | Missing global accent control |
| **Banks** | No Bank I/II selector |
| **Song mode** | No pattern chaining UI |

---

## TO-DO LIST

### Priority 1: Sound Accuracy (Critical for "A+")

#### Kick Drum Overhaul
- [ ] Change from pure sine to sawtooth → waveshaper circuit
- [ ] Tune default frequency to E3 (~165Hz)
- [ ] Replace noise-burst attack with impulse/pulse generator
- [ ] Expand tune range to at least ±1 octave (1200 cents)

#### Snare Drum Overhaul
- [ ] Implement TWO sine oscillators for dual shell modes
- [ ] Add TUNE parameter (affects both oscillator frequencies)
- [ ] Make Snappy also control attack envelope decay rate
- [ ] Use static frequencies (not ramping pitch envelope)

#### Shared Noise Source
- [ ] Create single LFSR noise generator shared between snare and clap
- [ ] This produces authentic phasing when both play together

#### Hi-Hat & Cymbals
- [ ] Add TUNE parameter (sample playback rate)
- [ ] Improve synthesized fallback or remove entirely (samples are better)

#### Parameter Authenticity
- [ ] Remove TUNE from Rimshot
- [ ] Keep Clap SPREAD (useful extension) but mark as "extended"

---

### Priority 2: Sequencer Features

#### Pattern Length
- [ ] Add `setPatternLength(1-16)` method
- [ ] Update sequencer to respect per-pattern length
- [ ] Add UI control for pattern length

#### Scale Modes
- [ ] Implement 32nd note mode (32 steps per bar)
- [ ] Implement 8th note triplet mode (12 steps per bar)
- [ ] Implement 16th note triplet mode (24 steps per bar)
- [ ] Add scale selector dropdown to UI

#### Total Accent
- [ ] Add global accent level parameter (0-100%)
- [ ] Apply multiplier to all accented steps
- [ ] Add knob/slider to UI

#### Tempo Range
- [ ] Change BPM input min to 37, max to 290

---

### Priority 3: Extended Features (Nice to Have)

#### Pattern Banks
- [ ] Implement Bank I / Bank II structure
- [ ] Add bank selector UI

#### Song Mode
- [ ] Implement pattern chaining (queue of pattern IDs)
- [ ] Add "Song" tab with pattern arrangement UI

#### Tap Recording
- [ ] Add tap-to-record mode
- [ ] Quantize tapped hits to nearest step

#### Sync Options
- [ ] Implement MIDI clock sync (Web MIDI API)
- [ ] Add external sync UI toggle

---

## Current Strengths

- Real 909 samples from Rob Roy Recordings (1995) - authentic source
- Hi-hat choke (closed cuts open) - correctly implemented
- Swing/shuffle - working
- Flam - working
- Sample/synth toggle for cymbals - nice feature
- Good presets (techno, house, breakbeat, etc.)
- Mobile-responsive UI
- Keyboard shortcuts
- Local pattern save/load

---

## File Locations

**Library (compiled JS):**
- `web/public/909/dist/machines/tr909/voices/kick.js`
- `web/public/909/dist/machines/tr909/voices/snare.js`
- `web/public/909/dist/machines/tr909/voices/clap.js`
- `web/public/909/dist/machines/tr909/voices/tom.js`
- `web/public/909/dist/machines/tr909/voices/rimshot.js`
- `web/public/909/dist/machines/tr909/voices/hihat.js`
- `web/public/909/dist/machines/tr909/voices/cymbal.js`
- `web/public/909/dist/core/sequencer.js`
- `web/public/909/dist/machines/tr909/engine.js`

**Web Interface:**
- `web/public/909/ui/tr909/index.html`
- `web/public/909/ui/tr909/styles.css`
- `web/public/909/dist/ui/tr909/app.js`

**Source TypeScript:** Location TBD (not found in synthmachine/src/)
