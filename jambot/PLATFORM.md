# Jambot Platform

A modular music production system. This document serves two audiences:
1. **Code agents** building and maintaining the platform
2. **Jambot** (the AI agent) making music

---

# Part 1: For Code Agents

## Philosophy

Jambot is a modular synth platform where **instruments are plugins**. The system doesn't care what synth you plug in - it just needs to follow the interface.

**Core principles:**
- One way to read any parameter: `session.get('drums.kick.decay')`
- One way to write any parameter: `session.set('drums.kick.decay', 0.75)`
- Generic tools work on everything
- New synths plug in without special code

## Current Instruments

We have **6 canonical instruments**:

| Instrument | File | Description |
|------------|------|-------------|
| `jb01` | `instruments/jb01-node.js` | Drum machine (8 voices) |
| `jb200` | `instruments/jb200-node.js` | Bass monosynth (2 osc, filter, drive) |
| `sampler` | `instruments/sampler-node.js` | Sample playback (10 slots) |
| `r9d9` | `instruments/tr909-node.js` | TR-909 drum machine (11 voices) |
| `r3d3` | `instruments/tb303-node.js` | TB-303 acid bass |
| `r1d1` | `instruments/sh101-node.js` | SH-101 lead synth |

| Alias | Points To | Use Case |
|-------|-----------|----------|
| `drums` | jb01 | Default drum machine |
| `bass` | jb200 | Bass sounds |
| `lead` | jb200 | Lead sounds |
| `synth` | jb200 | Generic synth |

**Why aliases?** Users say "drums" and "bass" - they don't care about internal names. The alias system lets us swap implementations later (e.g., `drums` could point to a different drum machine) without changing tools or documentation.

## File Structure

```
jambot/
├── core/
│   ├── session.js      # Creates instruments, registers aliases
│   ├── params.js       # ParamSystem - unified parameter access
│   ├── node.js         # Base classes (Node, InstrumentNode, EffectNode)
│   ├── clock.js        # Master timing (BPM, swing)
│   ├── render.js       # Renders session to audio
│   ├── library.js      # Save/load projects
│   └── wav.js          # WAV file encoding
├── instruments/
│   ├── jb01-node.js      # JB01 drum machine
│   ├── jb200-node.js     # JB200 bass monosynth
│   ├── sampler-node.js   # Sampler (10 slots)
│   ├── tr909-node.js     # TR-909 drum machine (R9D9)
│   ├── tb303-node.js     # TB-303 acid bass (R3D3)
│   └── sh101-node.js     # SH-101 lead synth (R1D1)
├── params/
│   ├── jb01-params.json   # Drum param definitions
│   ├── jb200-params.json  # Synth param definitions
│   └── converters.js      # Producer units <-> engine units
├── tools/
│   ├── index.js           # Tool registry
│   ├── generic-tools.js   # tweak, get_param, list_params (PRIMARY)
│   ├── drum-tools.js      # add_drums, tweak_drums (deprecated)
│   ├── bass-tools.js      # add_bass, tweak_bass (deprecated)
│   ├── lead-tools.js      # add_lead, tweak_lead (deprecated)
│   ├── jb01-tools.js      # JB01-specific (kits, presets)
│   ├── jb200-tools.js     # JB200-specific (kits, sequences)
│   ├── song-tools.js      # Patterns, arrangement
│   ├── session-tools.js   # render, show, create_session
│   ├── routing-tools.js   # Mixer, sends, inserts
│   └── preset-tools.js    # Preset loading
├── presets/
│   ├── jb01/kits/         # Drum sound presets
│   ├── jb200/kits/        # Synth sound presets
│   └── jb200/sequences/   # Pattern presets
├── effects/
│   ├── reverb.js          # Plate reverb IR generator
│   ├── reverb-node.js     # Reverb effect (registers in ParamSystem)
│   ├── eq-node.js         # EQ effect
│   └── filter-node.js     # Filter effect
├── jambot.js              # Main entry point
└── ui.tsx                 # Terminal UI
```

## Key Systems

### ParamSystem (`core/params.js`)

Central registry for all parameters. Every instrument registers its params here.

```javascript
// Register a node
params.register('jb01', jb01Node);
params.register('drums', jb01Node);  // Alias to same node

// Access parameters
params.get('drums.kick.decay');      // Returns engine value (0-1)
params.set('drums.kick.decay', 0.75);
params.describe('drums');            // Returns param descriptors
```

### Unit Conversion (`params/converters.js`)

Producers think in dB, Hz, 0-100. Engines want 0-1. The converter system bridges this.

| Producer Unit | Engine Unit | Example |
|---------------|-------------|---------|
| dB (-60 to +6) | 0-1 linear | level: -6dB → 0.25 |
| 0-100 | 0-1 | decay: 75 → 0.75 |
| Hz (log scale) | 0-1 | cutoff: 2000Hz → ~0.65 |
| semitones | cents | tune: +3 → 300 |
| pan (-100 to +100) | -1 to +1 | pan: -50 → -0.5 |

```javascript
import { toEngine, fromEngine, getParamDef } from './params/converters.js';

const def = getParamDef('jb01', 'kick', 'level');
const engineValue = toEngine(-6, def);  // 0.25
const producerValue = fromEngine(0.25, def);  // -6
```

### Instruments (`instruments/*.js`)

Instruments extend `InstrumentNode` from `core/node.js`. Each instrument:
- Registers parameters from JSON definitions
- Stores patterns (variable length, 16 steps = 1 bar)
- Provides `getParam()`/`setParam()` for ParamSystem
- Provides `renderPattern()` for audio output
- Handles serialization

```javascript
// instruments/jb01-node.js
class JB01Node extends InstrumentNode {
  constructor() {
    super('jb01');
    this._voices = ['kick', 'snare', 'clap', 'ch', 'oh', 'perc', 'tom', 'cymbal'];
    this._registerParams();  // From jb01-params.json
  }

  getParam(path) { return this._params[path]; }
  setParam(path, value) { this._params[path] = value; return true; }
  getPattern() { return this._pattern; }
  setPattern(p) { this._pattern = p; }
  getPatternLength() { return this._pattern.kick?.length || 16; }
  getPatternBars() { return this.getPatternLength() / 16; }

  // Core render method - each instrument handles its own rendering
  async renderPattern(options) {
    const { bars, stepDuration, sampleRate, pattern, params } = options;
    // Creates engine, applies params, renders audio buffer
    return buffer;
  }
}
```

Instruments register directly in session — no intermediate wrappers:

```javascript
// core/session.js
const jb01 = new JB01Node();
params.register('jb01', jb01);
params.register('drums', jb01);  // Alias
```

### Variable Pattern Lengths

Each instrument can have its own pattern length (in steps, where 16 steps = 1 bar). This enables:
- 16-step drum loops with 64-step bass lines
- Per-instrument song mode (A/B sections for bass while drums loop)
- Any combination of loop lengths

```javascript
// Set pattern lengths via the bars parameter
add_jb01({ kick: [0,4,8,12], bars: 1 })     // 16 steps (1 bar)
add_jb200({ pattern: [...], bars: 4 })       // 64 steps (4 bars)

// Patterns loop to fill the render duration
// 16-step drums loop 4x over a 4-bar render
```

**How it works:**
1. Pattern length is stored with the instrument (via `bars` param in tools)
2. `renderPattern()` handles looping the pattern to fill the requested duration
3. `render.js` calls each instrument's `renderPattern()` and mixes the results

**Key methods on each instrument node:**
- `getPatternLength()` — Returns steps (e.g., 16, 32, 64)
- `getPatternBars()` — Returns bars (e.g., 1, 2, 4)
- `resizePattern(steps)` — Resize while preserving existing steps

### Clock (`core/clock.js`)

Single source of truth for timing. Synths never store BPM.

```javascript
const clock = new Clock({ bpm: 128 });
clock.stepDuration;    // Seconds per 16th note
clock.barDuration;     // Seconds per bar
clock.samplesPerStep;  // For sample-accurate timing
```

## Adding a New Instrument

1. **Create param definitions** in `params/{synth}-params.json`
2. **Add to converters** in `params/converters.js`
3. **Create node** in `instruments/{synth}-node.js` extending `InstrumentNode`
4. **Register in session** in `core/session.js`
5. **Create tools** in `tools/{synth}-tools.js`
6. **Add to render loop** in `core/render.js`

The generic tools (`tweak`, `get_param`) will automatically work once the node is registered.

## Sends & Effects

**No formal Mixer component.** Sends and effects register directly in ParamSystem when created.

### How it works

```javascript
// When create_send() runs:
create_send({ name: 'delay', effect: 'delay', time: 'triplet' })
  → session.mixer.sends.delay = { effect: 'delay', params: {...} }
  → params.register('sends.delay', delayEffect)  // Registers in ParamSystem

// Now tweak() works:
tweak({ path: 'sends.delay.mix', value: 30 })
tweak({ path: 'sends.delay.feedback', value: 65 })
```

### Signal flow

```
voice → [voice level] → [channel inserts] → instrument output
                                                    ↓
                                              [send buses]
                                                    ↓
                                             [master inserts]
                                                    ↓
                                                 output
```

### Routing

```javascript
// Route closed hats to delay
route_to_send({ source: 'drums.ch', send: 'delay', amount: 0.6 })

// Chain effects: delay → reverb
route_to_send({ source: 'sends.delay', send: 'reverb', amount: 0.4 })
```

### Volumes

Instrument levels are plain session properties (in dB):
- `session.jb01Level`
- `session.jb200Level`
- `session.samplerLevel`

These could also register in ParamSystem as `levels.*` for `tweak()` access.

---

# Part 2: For Jambot (Making Music)

## What You Have

Three instruments ready to play:

### drums (JB01)
8 voices: `kick`, `snare`, `clap`, `ch` (closed hat), `oh` (open hat), `perc`, `tom`, `cymbal`

```
add_drums({ kick: [0,4,8,12], snare: [4,12], ch: [0,2,4,6,8,10,12,14] })
add_drums({ kick: [0,4,8,12], snare: [4,12], bars: 2 })   // 32-step pattern
```

### bass / lead / synth (JB200)
Polysynth with 2 oscillators, filter, envelopes. Same engine for bass and lead sounds.

```
add_bass({ pattern: [
  { note: 'C2', gate: true, accent: true },
  { note: 'C2', gate: false },
  { note: 'E2', gate: true, slide: true },
  ...
]})

add_bass({ pattern: [...], bars: 4 })    // 64-step pattern (4 bars)
add_lead({ pattern: [...] })
```

### sampler
10-slot sample player with kits.

```
add_samples({ s1: [{step: 0, vel: 1}], s3: [{step: 4, vel: 0.8}] })
```

## Primary Tools

### tweak (MOST IMPORTANT)

Set any parameter with automatic unit conversion:

```
tweak({ path: 'drums.kick.decay', value: 75 })      // 0-100 scale
tweak({ path: 'drums.kick.level', value: -6 })      // dB
tweak({ path: 'bass.cutoff', value: 2000 })         // Hz
tweak({ path: 'bass.resonance', value: 80 })        // 0-100
tweak({ path: 'lead.attack', value: 30 })           // 0-100
tweak({ path: 'sampler.s1.tune', value: +5 })       // semitones
```

### get_param

Read any parameter (returns producer-friendly value):

```
get_param({ path: 'drums.kick.decay' })  // "drums.kick.decay = 75"
```

### list_params

See what parameters are available:

```
list_params({ node: 'drums' })
list_params({ node: 'bass' })
```

## Parameter Reference

### drums (per voice)

| Param | Unit | Range | Description |
|-------|------|-------|-------------|
| level | dB | -60 to +6 | Volume |
| decay | 0-100 | 0-100 | Envelope length |
| tune | semitones | -12 to +12 | Pitch |
| attack | 0-100 | 0-100 | Click/transient |

Path format: `drums.{voice}.{param}` (e.g., `drums.kick.decay`, `drums.snare.level`)

### bass / lead (JB200)

| Param | Unit | Range | Description |
|-------|------|-------|-------------|
| level | dB | -60 to +6 | Volume |
| filterCutoff | Hz | 20-20000 | Filter frequency |
| filterResonance | 0-100 | 0-100 | Filter resonance |
| filterEnvMod | 0-100 | 0-100 | Envelope to filter |
| osc1Waveform | choice | saw/square/triangle | Oscillator 1 |
| osc2Waveform | choice | saw/square/triangle | Oscillator 2 |
| osc2Detune | cents | -100 to +100 | Detune amount |
| attack | 0-100 | 0-100 | Amp attack |
| decay | 0-100 | 0-100 | Amp decay |
| sustain | 0-100 | 0-100 | Amp sustain |
| release | 0-100 | 0-100 | Amp release |
| drive | 0-100 | 0-100 | Saturation |

Path format: `bass.{param}` or `lead.{param}` (e.g., `bass.filterCutoff`, `lead.attack`)

### sampler (per slot)

| Param | Unit | Range | Description |
|-------|------|-------|-------------|
| level | dB | -60 to +6 | Volume |
| tune | semitones | -24 to +24 | Pitch |
| attack | 0-100 | 0-100 | Fade in |
| decay | 0-100 | 0-100 | Fade out |
| filter | Hz | 200-20000 | Lowpass cutoff |
| pan | -100 to +100 | L to R | Stereo position |

Path format: `sampler.{slot}.{param}` (e.g., `sampler.s1.level`, `sampler.s3.tune`)

## Song Mode

### Variable Loop Lengths

Each instrument can have a different pattern length. A 16-step drum pattern loops while a 64-step bass line plays through:

```
add_jb01({ kick: [0,4,8,12], bars: 1 })                    // 16 steps (loops 4x)
add_jb200({ pattern: [...64 steps...], bars: 4 })          // 64 steps (plays once)
render({ bars: 4 })                                         // Both fit in 4 bars
```

### Save patterns for reuse

```
save_pattern({ instrument: 'drums', name: 'A' })
save_pattern({ instrument: 'drums', name: 'B' })
save_pattern({ instrument: 'jb200', name: 'A' })           // 4-bar bass pattern
```

### Build arrangement

```
set_arrangement({ sections: [
  { bars: 4, drums: 'A', jb200: 'A' },
  { bars: 8, drums: 'B', jb200: 'A', lead: 'A' },          // jb200's 4-bar pattern loops 2x
  { bars: 4, drums: 'A' },
  { bars: 8, drums: 'B', jb200: 'A', lead: 'A' },
]})
```

### Render

```
render({ filename: 'my-track' })
```

## Quick Recipes

### Punchy techno kick
```
tweak({ path: 'drums.kick.decay', value: 40 })
tweak({ path: 'drums.kick.attack', value: 80 })
tweak({ path: 'drums.kick.level', value: 0 })
```

### Acid bass
```
tweak({ path: 'bass.filterCutoff', value: 600 })
tweak({ path: 'bass.filterResonance', value: 70 })
tweak({ path: 'bass.filterEnvMod', value: 80 })
tweak({ path: 'bass.decay', value: 30 })
```

### Crisp hats
```
tweak({ path: 'drums.ch.decay', value: 20 })
tweak({ path: 'drums.ch.level', value: -6 })
tweak({ path: 'drums.oh.decay', value: 60 })
```

### Mute an instrument
```
tweak({ path: 'drums.kick.level', value: -60 })  // -60dB = silent
```

## Available Instruments

All 6 instruments are registered and ready:
- `jb01` / `drums` — JB01 drum machine (8 voices)
- `jb200` / `bass` / `lead` — JB200 bass monosynth
- `sampler` — Sample player (10 slots)
- `r9d9` — TR-909 drum machine (11 voices)
- `r3d3` — TB-303 acid bass
- `r1d1` — SH-101 lead synth

## What's Coming

- **Effects system** — Sends, inserts, delay pedal (mixer config exists, processing code coming)
