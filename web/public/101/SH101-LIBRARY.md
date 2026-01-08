# SH-101 Synthesizer Library

A Web Audio implementation of the Roland SH-101 monophonic synthesizer with VCO, sub-oscillator, IR3109 filter, full ADSR envelope, LFO, arpeggiator, and 16-step sequencer.

## Quick Start (API)

```javascript
import { SH101Controller, renderPresetToWav } from './dist/api/index.js';

// Option 1: Render a preset to WAV (simplest)
const { wav } = await renderPresetToWav('classicLead', { bars: 2 });
// wav is an ArrayBuffer ready to save or play

// Option 2: Use controller for real-time playback
const synth = new SH101Controller();
synth.loadPreset('fatBass');
synth.play();
// ... later
synth.stop();

// Option 3: Custom pattern with arpeggiator
synth.setArpMode('up');
synth.setArpHold(true);
synth.addArpNote('C3');
synth.addArpNote('E3');
synth.addArpNote('G3');
synth.play();
```

## Low-Level Engine Access

```javascript
import { SH101Engine } from './dist/machines/sh101/engine.js';
import { getPreset } from './dist/machines/sh101/presets.js';

// Create engine
const engine = new SH101Engine({ engine: 'E2' }); // E1 or E2

// Load a preset
const preset = getPreset('acidLine');
Object.entries(preset.parameters).forEach(([id, value]) => {
  engine.setParameter(id, value);
});
engine.setPattern(preset.pattern);
engine.setBpm(preset.bpm);

// Play
engine.startSequencer();

// Stop
engine.stopSequencer();
```

## Pattern Structure

A pattern is an array of 16 step objects:

```javascript
{
  note: 'C3',      // Note name (C1-C6 range)
  gate: true,      // Whether this step plays (true) or is silent (false)
  accent: false,   // Accented notes are louder with more filter sweep
  slide: false     // Glide smoothly to the next note's pitch
}
```

### Note Format
Notes use standard notation: `C3`, `D#4`, `F#2`, `A#3`, etc.
- Typical synth range: C2 to C5
- Available notes: C, C#, D, D#, E, F, F#, G, G#, A, A#, B

### Example Pattern

```javascript
const myPattern = [
  { note: 'C3', gate: true, accent: true, slide: false },   // Step 1
  { note: 'C3', gate: false, accent: false, slide: false }, // Step 2: Rest
  { note: 'E3', gate: true, accent: false, slide: true },   // Step 3: Slide to...
  { note: 'G3', gate: true, accent: true, slide: false },   // Step 4
  // ... steps 5-16
];
```

## Synth Parameters

All parameters are normalized 0-1 unless noted:

### VCO (Oscillator)

| Parameter | Description | Sweet Spot |
|-----------|-------------|------------|
| `vcoSaw` | Sawtooth level | 0.5-1.0 for leads |
| `vcoPulse` | Pulse level | 0.5-1.0 for PWM sounds |
| `pulseWidth` | Pulse width (0.05-0.95) | 0.3-0.5 for classic |

### Sub-Oscillator

| Parameter | Description | Values |
|-----------|-------------|--------|
| `subLevel` | Sub-oscillator level | 0-1 |
| `subMode` | Sub mode | 0=off, 1=-1oct, 2=-2oct, 3=25%pulse |

### Filter (VCF)

| Parameter | Description | Sweet Spot |
|-----------|-------------|------------|
| `cutoff` | Filter cutoff frequency | 0.2-0.6 typical |
| `resonance` | Filter resonance/Q | 0.3-0.7 for character |
| `envMod` | Filter envelope amount | 0.4-0.8 for sweep |

### Envelope (ADSR)

| Parameter | Description | Sweet Spot |
|-----------|-------------|------------|
| `attack` | Attack time | 0.01-0.1 for synth |
| `decay` | Decay time | 0.2-0.5 typical |
| `sustain` | Sustain level | 0.5-0.8 for leads |
| `release` | Release time | 0.2-0.5 typical |

### LFO

| Parameter | Description | Range |
|-----------|-------------|-------|
| `lfoRate` | LFO speed | 0-1 (0.1-30Hz) |
| `lfoWaveform` | LFO wave | 'triangle', 'square', 'sh' |
| `lfoToPitch` | Vibrato amount | 0-1 (0-2 semitones) |
| `lfoToFilter` | Filter mod amount | 0-1 (0-2 octaves) |
| `lfoToPW` | PWM amount | 0-1 (0-40%) |

### Master

| Parameter | Description |
|-----------|-------------|
| `volume` | Master volume (0-1) |

## Engine Versions

Two synthesis engines available:

| Engine | Description |
|--------|-------------|
| `E1` | Simple biquad filter. Clean, CPU-efficient. Good for mobile. |
| `E2` | IR3109 filter emulation. Warm, analog-style. Higher CPU. |

```javascript
synth.setEngine('E1');  // Simple
synth.setEngine('E2');  // Authentic
```

## Available Presets

| ID | Name | BPM | Character |
|----|------|-----|-----------|
| `classicLead` | Classic Lead | 120 | PWM shimmer, vibrato |
| `fatBass` | Fat Bass | 110 | Thick with sub |
| `acidLine` | Acid Line | 130 | Resonant squelch |
| `synthBrass` | Synth Brass | 115 | Punchy stab |
| `arpPad` | Arp Pad | 90 | Soft arpeggiated |
| `zapBass` | Zap Bass | 128 | Sci-fi filter zap |
| `shSequence` | S&H Sequence | 125 | Random filter mod |
| `empty` | Empty | 120 | Blank starting point |

```javascript
import { getPreset, getPresetNames } from './dist/machines/sh101/presets.js';

// List all presets
const presets = getPresetNames();
// Returns: [{ id: 'classicLead', name: 'Classic Lead', description: '...' }, ...]

// Load specific preset
const preset = getPreset('fatBass');
```

## Arpeggiator

```javascript
// Set arp mode
synth.setArpMode('up');     // Ascending
synth.setArpMode('down');   // Descending
synth.setArpMode('updown'); // Up then down
synth.setArpMode('off');    // Disable arp

// Hold mode (notes stay even after release)
synth.setArpHold(true);

// Octave range
synth.setArpOctaves(2);  // 1-3 octaves

// Add notes to arp
synth.addArpNote('C3');
synth.addArpNote('E3');
synth.addArpNote('G3');

// Start arp playback
synth.play();

// Clear held notes
synth.clearArpNotes();
```

## Rendering to WAV

```javascript
// Render current pattern to WAV
const { buffer, wav } = await synth.renderToWav({ bars: 4 });

// buffer = AudioBuffer
// wav = ArrayBuffer (WAV file data)

// Create download
const blob = new Blob([wav], { type: 'audio/wav' });
const url = URL.createObjectURL(blob);
```

## Full API Reference

### SH101Controller

```javascript
// Constructor
const synth = new SH101Controller({ engine: 'E1' });

// Presets
synth.loadPreset(presetId)      // Load a preset
SH101Controller.getPresets()     // List all presets (static)

// Parameters
synth.setParameter(id, value)   // Set any parameter (0-1)
synth.getParameter(id)          // Get parameter value
synth.getParameters()           // Get all parameters

// Oscillator shortcuts
synth.setVcoSaw(level)
synth.setVcoPulse(level)
synth.setPulseWidth(width)
synth.setSubLevel(level)
synth.setSubMode(mode)          // 0-3

// Filter shortcuts
synth.setCutoff(value)
synth.setResonance(value)
synth.setEnvMod(value)

// Envelope shortcuts
synth.setAttack(value)
synth.setDecay(value)
synth.setSustain(value)
synth.setRelease(value)

// LFO shortcuts
synth.setLfoRate(rate)
synth.setLfoWaveform(type)      // 'triangle', 'square', 'sh'
synth.setLfoToPitch(amount)
synth.setLfoToFilter(amount)
synth.setLfoToPW(amount)

// Pattern
synth.setPattern(pattern)       // Set full 16-step pattern
synth.getPattern()              // Get current pattern
synth.setStep(index, data)      // Modify single step (0-15)
synth.getStep(index)            // Get single step data

// Arpeggiator
synth.setArpMode(mode)          // 'off', 'up', 'down', 'updown'
synth.setArpHold(boolean)
synth.setArpOctaves(1-3)
synth.addArpNote(note)
synth.removeArpNote(note)
synth.clearArpNotes()

// Transport
synth.setBpm(bpm)               // Set tempo (30-300)
synth.getBpm()                  // Get tempo
synth.play()                    // Start sequencer
synth.stop()                    // Stop sequencer
synth.isPlaying()               // Check if playing

// Single notes
synth.playNote(note, velocity)  // Play a note
synth.noteOff()                 // Release note

// Engine
synth.setEngine('E1' | 'E2')    // Switch engine
synth.getEngine()               // Get current engine

// Rendering
synth.renderToBuffer(options)   // Render to AudioBuffer
synth.renderToWav(options)      // Render to WAV ArrayBuffer
```

## Sound Design Tips

### Classic PWM Lead
```javascript
synth.setVcoPulse(1.0);
synth.setPulseWidth(0.35);
synth.setLfoRate(0.2);
synth.setLfoToPW(0.3);  // PWM effect
synth.setCutoff(0.6);
synth.setResonance(0.25);
```

### Fat Bass with Sub
```javascript
synth.setVcoSaw(0.7);
synth.setSubLevel(0.6);
synth.setSubMode(1);  // -1 octave
synth.setCutoff(0.25);
synth.setEnvMod(0.5);
```

### Acid Line
```javascript
synth.setVcoSaw(1.0);
synth.setCutoff(0.2);
synth.setResonance(0.75);
synth.setEnvMod(0.8);
synth.setDecay(0.15);
synth.setSustain(0.1);
```

### Arp Pad
```javascript
synth.setVcoSaw(0.5);
synth.setVcoPulse(0.5);
synth.setSubLevel(0.3);
synth.setSubMode(2);  // -2 octaves
synth.setAttack(0.1);
synth.setRelease(0.5);
synth.setLfoToFilter(0.2);
synth.setArpMode('updown');
synth.setArpOctaves(2);
```

## File Structure

```
101/
├── dist/
│   ├── api/
│   │   └── index.js           # SH101Controller, renderToWav (USE THIS)
│   ├── core/
│   │   ├── engine.js          # Base SynthEngine class
│   │   ├── voice.js           # Base Voice class
│   │   └── output.js          # WAV rendering
│   └── machines/sh101/
│       ├── engine.js          # SH101Engine (low-level)
│       ├── oscillator.js      # VCO implementation
│       ├── sub-oscillator.js  # Sub-oscillator
│       ├── envelope.js        # ADSR envelope
│       ├── lfo.js             # LFO
│       ├── vca.js             # VCA
│       ├── sequencer.js       # Sequencer + Arpeggiator
│       ├── presets.js         # Preset sounds
│       ├── filter/
│       │   └── ir3109.js      # IR3109 filter emulation
│       └── voices/
│           ├── synth-e1.js    # E1 simple voice
│           └── synth-e2.js    # E2 authentic voice
└── ui/sh101/
    ├── index.html             # Interactive UI
    ├── styles.css
    └── app.js
```

## Live Demo

Interactive UI available at: `/101/`
