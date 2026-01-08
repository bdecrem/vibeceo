# TB-303 Bass Synthesizer Library

A Web Audio implementation of the Roland TB-303 bass synthesizer with 16-step sequencer, accent, slide, and filter envelope modulation.

## Quick Start

```javascript
import { TB303Engine } from './dist/machines/tb303/engine.js';
import { getPreset } from './dist/machines/tb303/presets.js';

// Create engine
const engine = new TB303Engine();

// Load a preset
const preset = getPreset('acidLine1');
engine.setPattern(preset.pattern);
engine.setBpm(preset.bpm);
engine.setWaveform(preset.waveform);
Object.entries(preset.parameters).forEach(([id, value]) => {
  engine.setParameter(id, value);
});

// Play
engine.startSequencer();

// Stop
engine.stopSequencer();
```

## Pattern Structure

A pattern is an array of 16 step objects:

```javascript
{
  note: 'C2',      // Note name (C2-C4 range typical)
  gate: true,      // Whether this step plays (true) or is silent (false)
  accent: false,   // Accented notes are louder with more filter sweep
  slide: false     // Glide smoothly to the next note's pitch
}
```

### Note Format
Notes use standard notation: `C2`, `D#2`, `F3`, `A#3`, etc.
- Typical bass range: C2 to C4
- Available notes: C, C#, D, D#, E, F, F#, G, G#, A, A#, B

### Step Properties

| Property | Type | Description |
|----------|------|-------------|
| `note` | string | Note name (e.g., 'C2', 'G#3') |
| `gate` | boolean | If `true`, note plays. If `false`, step is silent |
| `accent` | boolean | Accented notes are louder with extended filter sweep |
| `slide` | boolean | Portamento glide to the NEXT step's pitch |

### Example Pattern

```javascript
const myPattern = [
  { note: 'C2', gate: true, accent: true, slide: false },   // Step 1: Accented C2
  { note: 'C2', gate: false, accent: false, slide: false }, // Step 2: Rest
  { note: 'C2', gate: true, accent: false, slide: false },  // Step 3: Normal C2
  { note: 'E2', gate: true, accent: false, slide: true },   // Step 4: E2 sliding to...
  { note: 'G2', gate: true, accent: true, slide: false },   // Step 5: G2 (arrived via slide)
  // ... steps 6-16
];
```

## Synth Parameters

All parameters are normalized 0-1:

| Parameter | Description | Sweet Spot |
|-----------|-------------|------------|
| `cutoff` | Filter cutoff frequency | 0.2-0.5 for classic acid |
| `resonance` | Filter resonance/Q | 0.5-0.8 for squelch |
| `envMod` | Filter envelope amount | 0.6-0.9 for sweep |
| `decay` | Envelope decay time | 0.3-0.5 typical |
| `accent` | Accent intensity | 0.7-0.9 |

```javascript
engine.setParameter('cutoff', 0.35);
engine.setParameter('resonance', 0.75);
engine.setParameter('envMod', 0.7);
engine.setParameter('decay', 0.4);
engine.setParameter('accent', 0.85);
```

## Waveforms

Two classic 303 waveforms:

```javascript
engine.setWaveform('sawtooth');  // Buzzy, harmonically rich (most common)
engine.setWaveform('square');    // Hollow, darker tone
```

## Engine Versions

Two synthesis engines available:

| Engine | Description |
|--------|-------------|
| `E1` | Simple biquad filter. Clean, CPU-efficient |
| `E2` | Diode ladder filter emulation. Authentic acid squelch |

```javascript
engine.setEngine('E1');  // Simple
engine.setEngine('E2');  // Authentic (default)
```

## Available Presets

| ID | Name | BPM | Character |
|----|------|-----|-----------|
| `acidLine1` | Acid Line 1 | 130 | Classic ascending acid |
| `phuture` | Phuture | 125 | Minimal, hypnotic |
| `squelch` | Squelch | 140 | Fast, aggressive |
| `darkAcid` | Dark Acid | 128 | Minor key, square wave |
| `rolling` | Rolling | 135 | Hardfloor-style |
| `hypnotic` | Hypnotic | 118 | Slower, spacious |
| `punchy` | Punchy | 145 | Aggressive, fast |
| `empty` | Empty | 130 | Blank pattern |

```javascript
import { getPreset, getPresetNames } from './dist/machines/tb303/presets.js';

// List all presets
const presets = getPresetNames();
// Returns: [{ id: 'acidLine1', name: 'Acid Line 1' }, ...]

// Load specific preset
const preset = getPreset('phuture');
```

## Rendering to WAV

Export patterns as audio files:

```javascript
// Render 2 bars at current settings
const audioBuffer = await engine.renderPattern({ bars: 2 });

// Convert to WAV blob
const wavBlob = engine.audioBufferToBlob(audioBuffer);

// Create download URL
const url = URL.createObjectURL(wavBlob);
```

## Full API Reference

### TB303Engine

```javascript
// Constructor
const engine = new TB303Engine({ engine: 'E2' });

// Transport
engine.startSequencer()      // Start playback
engine.stopSequencer()       // Stop playback
engine.isPlaying()           // Returns boolean

// Tempo
engine.setBpm(130)           // Set BPM (30-300)
engine.getBpm()              // Get current BPM

// Pattern
engine.setPattern(pattern)   // Set full 16-step pattern
engine.getPattern()          // Get current pattern
engine.setStep(index, data)  // Modify single step (0-15)
engine.getStep(index)        // Get single step data

// Synthesis
engine.setParameter(id, value)  // Set synth parameter (0-1)
engine.getParameter(id)         // Get parameter value
engine.setWaveform('sawtooth')  // Set waveform
engine.getWaveform()            // Get current waveform
engine.setEngine('E2')          // Set engine version
engine.getEngine()              // Get engine version

// Preview
engine.playNote('C2', accent)   // Play single note (for keyboard)

// Render
engine.renderPattern({ bars: 1, bpm: 130 })  // Render to AudioBuffer
engine.audioBufferToBlob(buffer)             // Convert to WAV blob

// Callbacks
engine.onStepChange = (step) => {}  // Called on each step (for UI)
engine.onNote = (step, data) => {}  // Called when note triggers
```

## Creating Acid Patterns

### Tips for Classic Acid Sound

1. **Use rests** - Don't trigger every step. `gate: false` creates rhythmic interest
2. **Accent sparingly** - 3-5 accents per pattern, often on downbeats
3. **Slide between notes** - Creates the characteristic "wah" sound
4. **Low cutoff + high envMod** - Classic squelchy filter sweep
5. **Repetition with variation** - Root note on beats 1 & 9, variations elsewhere

### Pattern Building Blocks

**Driving bass:**
```javascript
{ note: 'C2', gate: true, accent: true, slide: false }  // Strong downbeat
{ note: 'C2', gate: true, accent: false, slide: false } // Repeated root
```

**Melodic movement:**
```javascript
{ note: 'E2', gate: true, accent: false, slide: true }  // Slide up
{ note: 'G2', gate: true, accent: true, slide: false }  // Land with accent
```

**Rhythmic gap:**
```javascript
{ note: 'C2', gate: false, accent: false, slide: false } // Rest
```

**Octave jump:**
```javascript
{ note: 'C2', gate: true, accent: true, slide: false }
{ note: 'C3', gate: true, accent: false, slide: true }   // Jump + slide back
{ note: 'G2', gate: true, accent: false, slide: false }
```

## File Structure

```
303/
├── dist/
│   ├── core/
│   │   ├── engine.js      # Base SynthEngine class
│   │   ├── voice.js       # Base Voice class
│   │   └── output.js      # WAV rendering
│   └── machines/tb303/
│       ├── engine.js      # TB303Engine (main entry point)
│       ├── sequencer.js   # 16-step sequencer
│       ├── presets.js     # Preset patterns
│       ├── filter/
│       │   └── diode-ladder.js  # E2 filter emulation
│       └── voices/
│           ├── bass.js    # E2 voice (diode ladder)
│           └── bass-e1.js # E1 voice (simple biquad)
└── ui/tb303/
    ├── index.html         # Interactive UI
    ├── styles.css
    └── app.js
```

## Live Demo

Interactive UI available at: `/303/`
