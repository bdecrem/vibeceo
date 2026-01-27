# Jambot - Claude Code Instructions

## THE SYSTEM (Read This First)

**Jambot is a modular music production platform where any component can be added, removed, or swapped, and everything connects the same way.**

- **Instruments** are plugins. Add a new synth → it exposes voices and parameters through the standard interface. The system doesn't care if it's a 909, FM synth, or something that doesn't exist yet.

- **Effects** are plugins. Add a new effect → it exposes parameters the same way. Reverb, delay, granular — all plug in identically.

- **Tracks and routing** are dynamic. Create a track, route a voice to a bus, add a send — operations on a graph, not hardcoded paths.

- **Services** work on anything. Automation doesn't know about "drums" — it knows about parameters. Analysis doesn't know about "kick" — it knows about audio signals. Generic capabilities that work across the whole system.

- **The agent** is just a user. It sees the current configuration, reads and writes parameters, renders audio. No special code per instrument — same interface for everything.

**The Core Requirement:** The agent must be able to **read and write ANY parameter** in the system. Everything is addressable (jb01.kick.decay, jb200.filterCutoff, mixer.reverb.decay, master.volume). One way to read, one way to write. If a value exists, the agent can see it.

**When adding anything new:** It plugs into the existing architecture. New synth? Same interface. New effect? Same interface. New service? Works on everything. Never write bespoke code that only works for one thing.

---

## Quick Reference

```bash
npm start          # Run jambot
npm run build      # Build for release (only when cutting a release)
```

## Architecture

Core files:
- `jambot.js` — Agent loop, tools, WAV encoder, synth integration
- `ui.tsx` — Ink-based terminal UI
- `project.js` — Project persistence

## Instruments

### Active Instruments

| Instrument | ID | Description |
|------------|-----|-------------|
| **JB01** | `jb01` | Drum machine (8 voices: kick, snare, clap, ch, oh, lowtom, hitom, cymbal) |
| **JB200** | `jb200` | Bass monosynth (2-osc, filter, drive) |
| **JB202** | `jb202` | Modular bass synth with custom DSP (cross-platform consistent) |
| **JP9000** | `jp9000` | True modular synth with patchable modules (oscillators, filters, Karplus-Strong strings) |
| **Sampler** | `sampler` | 10-slot sample player with kits |

### Dormant Instruments (files exist, not yet integrated)

| Synth | Engine | Status |
|-------|--------|--------|
| **R9D9** | TR-909 | Dormant — files in `instruments/tr909-node.js` |
| **R3D3** | TB-303 | Dormant — files in `instruments/tb303-node.js` |
| **R1D1** | SH-101 | Dormant — files in `instruments/sh101-node.js` |

**Agent guidance for user intent:**
- User says "drum" / "drums" / "beat" → suggest **JB01**
- User says "bass" / "bassline" → suggest **JB200** or **JB202**
- User says "jb202" / "modular bass" / "custom dsp" → suggest **JB202**
- User says "modular" / "patch" / "modules" / "string" / "pluck" → suggest **JP9000**
- User says "sample" / "samples" / "kit" → suggest **Sampler**

### JB202 - Modular Bass Synth (Custom DSP)

JB202 is a bass monosynth with **custom DSP components** written in pure JavaScript:
- **PolyBLEP oscillators**: Band-limited waveforms (alias-free)
- **24dB cascaded biquad filter**: Smooth lowpass with resonance
- **Exponential ADSR envelopes**: Natural decay curves
- **Soft-clip drive**: Warm saturation

**Key feature**: Produces **identical output** in Web Audio (browser) and offline rendering (Node.js/Jambot). Same waveforms, same filter response, same timing.

**API**: Identical to JB200 - same parameter names, same pattern format. Drop-in replacement for cross-platform consistency testing.

**Web UI**: `kochi.to/jb202`

### JP9000 - True Modular Synthesizer

JP9000 is a fully patchable modular synthesizer where you connect modules together:

**Module Types:**
- **Sound Sources**: `osc-saw`, `osc-square`, `osc-triangle`, `string` (Karplus-Strong physical modeling)
- **Filters**: `filter-lp24` (24dB lowpass), `filter-biquad`
- **Modulation**: `env-adsr` (ADSR envelope), `sequencer`
- **Utilities**: `vca`, `mixer` (4-channel)
- **Effects**: `drive` (saturation)

**Key feature**: The `string` module uses Karplus-Strong physical modeling for realistic plucked strings, bells, and mallet sounds. Deterministic seeded PRNG ensures reproducible audio.

**API**: Module-based patching with `add_module`, `connect_modules`, `tweak_module`.

**Presets**: `basic` (osc→filter→vca WITH envelope), `pluck` (string→filter→drive, NO envelope), `dualBass` (dual osc bass WITH envelope)

**Example workflow:**
```
add_jp9000({ preset: 'pluck' })          # Load string preset
tweak_module({ module: 'string1', param: 'brightness', value: 70 })
add_jp9000_pattern({ pattern: [...] })   # Set melodic pattern
render()
```

**Adding filter envelope to pluck preset** (pluck has NO envelope by default):
```
add_module({ type: 'env-adsr', id: 'env1' })              # Add envelope
connect_modules({ from: 'env1.cv', to: 'filter1.cutoffCV' })  # Connect to filter
tweak_module({ module: 'filter1', param: 'envAmount', value: 50 })  # Scale modulation
tweak_module({ module: 'env1', param: 'attack', value: 0 })
tweak_module({ module: 'env1', param: 'decay', value: 30 })
tweak_module({ module: 'env1', param: 'sustain', value: 20 })
tweak_module({ module: 'env1', param: 'release', value: 10 })
```
Note: Envelopes auto-trigger when pattern notes play.

## Synth Sources

Engines imported from `web/public/`:
- R9D9: `../web/public/909/dist/machines/tr909/engine-v3.js`
- R3D3: `../web/public/303/dist/machines/tb303/engine.js`
- R1D1: `../web/public/101/dist/machines/sh101/engine.js`
- JB200: `../web/public/jb200/dist/machines/jb200/engine.js`
- JB202: `../web/public/jb202/dist/machines/jb202/engine.js` (custom DSP)
- JB01: `../web/public/jb01/dist/machines/jb01/engine.js`
- JP9000: `../web/public/jp9000/dist/rack.js` + modules (reuses JB202 DSP)

R9DS uses local files:
- `kit-loader.js` — Loads kits from filesystem
- `sample-voice.js` — Sample playback engine
- `samples/` — Bundled sample kits

**Do NOT duplicate synth code** - always import from web/public/ (except R9DS which is local).

### Shared DSP Library

**Location:** `web/public/jb202/dist/dsp/`

This folder contains the canonical shared DSP primitives for all instruments. Despite living under `jb202/`, it's the platform-wide DSP library.

| Category | Modules |
|----------|---------|
| **Oscillators** | `SawtoothOscillator`, `SquareOscillator`, `TriangleOscillator`, `PulseOscillator` (PolyBLEP) |
| **Filters** | `Lowpass24Filter`, `BiquadFilter`, `MoogLadderFilter` |
| **Envelopes** | `ADSREnvelope` |
| **Effects** | `Drive` (soft-clip saturation) |
| **Modulators** | `LFO` (triangle, square, sine, S&H, ramp) |
| **Generators** | `Noise` (seeded PRNG white noise) |
| **Utils** | `clamp`, `fastTanh`, `noteToMidi`, `midiToFreq` |

**Usage:**
```javascript
import { SawtoothOscillator } from '../../../jb202/dist/dsp/oscillators/index.js';
import { MoogLadderFilter } from '../../../jb202/dist/dsp/filters/index.js';
import { LFO } from '../../../jb202/dist/dsp/modulators/index.js';
import { Noise } from '../../../jb202/dist/dsp/generators/index.js';
```

**Rule:** When building new instruments, import from this library rather than duplicating DSP code. JP9000, JT10, JT30, and JT90 all follow this pattern.

## Synth Development Guide

This section covers creating new synth libraries and web clients for the Jambot synth machine system.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         JAMBOT AGENT                            │
│  (reads/writes parameters, triggers, renders)                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        MASTER CLOCK                             │
│  Single source of truth for all timing (BPM, swing, step)       │
│  jambot/core/clock.js                                           │
└─────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
    ┌──────────┐        ┌──────────┐        ┌──────────┐
    │  ENGINE  │        │  ENGINE  │        │  ENGINE  │
    │  (JB01)  │        │  (JB200) │        │ (Sampler)│
    └──────────┘        └──────────┘        └──────────┘
          │                   │                   │
    ┌─────┴─────┐            │             ┌─────┴─────┐
    ▼     ▼     ▼            ▼             ▼     ▼     ▼
  Voice Voice Voice       Voice         Slot  Slot  Slot
  kick  snare ch          bass          s1    s2    s3
```

### Master Clock (`jambot/core/clock.js`)

The clock is the **single source of truth** for all timing. Synths never store BPM - they query the clock.

```javascript
import { Clock } from './core/clock.js';

const clock = new Clock({ bpm: 128 });

// Producer interface
clock.bpm = 140;          // Change tempo
clock.swing = 0.3;        // Add groove

// Internal timing (what engines use)
clock.stepDuration;       // Seconds per 16th note
clock.barDuration;        // Seconds per bar
clock.samplesPerStep;     // Sample-accurate timing
clock.getStepTime(4, true); // Time with swing applied
```

### Engine

An Engine manages voices and provides the instrument's interface.

```javascript
// web/public/{synth}/dist/machines/{synth}/engine.js
import { SynthEngine } from '../../core/engine.js';

export class MyEngine extends SynthEngine {
  constructor(options = {}) {
    super(options);
    this.setupVoices();
  }

  setupVoices() {
    this.registerVoice('kick', new KickVoice('kick', this.context));
    this.registerVoice('snare', new SnareVoice('snare', this.context));
  }
}
```

### Voice

A Voice produces sound. This is where synthesis happens.

```javascript
// web/public/{synth}/dist/machines/{synth}/voices/kick.js
import { Voice } from '../../../core/voice.js';

export class KickVoice extends Voice {
  constructor(id, context) {
    super(id, context);
    this.decay = 0.5;
    this._renderSound();  // Pre-render on construction
  }

  trigger(time, velocity) {
    const source = this.context.createBufferSource();
    source.buffer = this.buffer;
    source.connect(this.output);
    source.start(time, 0);
  }
}
```

### Critical Rules for Voice Implementation

**Rule 1: Pre-Render Percussive Sounds**

NEVER use real-time oscillators for drums/percussion. Web Audio's oscillator phase is non-deterministic - each trigger starts at an arbitrary phase, causing audible variation between hits.

```javascript
// BAD - Each kick sounds different!
trigger(time, velocity) {
  const osc = this.context.createOscillator();
  osc.start(time);  // Random phase each time
}

// GOOD - Every kick is identical
constructor(id, context) {
  this._renderCompleteSound();  // Pre-render once
}

trigger(time, velocity) {
  const source = this.context.createBufferSource();
  source.buffer = this.preRenderedBuffer;
  source.start(time, 0);  // Always starts at sample 0
}
```

**Rule 2: No Randomness in Audio Code**

NEVER use `Math.random()` in voice trigger paths. Use a deterministic PRNG with fixed seed:

```javascript
// GOOD - Same noise every trigger
constructor(id, context) {
  let seed = 12345;
  for (let i = 0; i < 128; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    this.noiseData[i] = (seed / 0x7fffffff) * 2 - 1;
  }
}
```

**Rule 3: Bake Everything Into the Buffer**

For percussive sounds, pre-render the COMPLETE sound including oscillator body, pitch envelope, amplitude envelope, saturation, and click transients.

**Rule 4: Re-render When Parameters Change**

When synthesis parameters change (attack, decay, sweep), re-render the buffer.

**Rule 5: Tune via Playback Rate**

Pitch/tune changes don't require re-rendering:

```javascript
trigger(time, velocity) {
  const source = this.context.createBufferSource();
  source.buffer = this.buffer;
  source.playbackRate.value = Math.pow(2, this.tune / 12);
  source.start(time, 0);
}
```

### Web Audio Gotchas

1. **AudioContext Autoplay Policy**: Browsers require user interaction before audio plays. Add click listener to resume context.

2. **First-Trigger Warmup**: Web Audio has initialization overhead on first scheduled events. Add warmup triggers in tests.

3. **Sample-Aligned Timing**: Snap to sample boundaries for precise timing:
   ```javascript
   const alignedTime = Math.round(time * sampleRate) / sampleRate;
   ```

4. **BiquadFilter State**: Create new filter instances per trigger, don't reuse.

### File Structure for New Synths

```
web/public/{synth}/
  dist/
    core/                    # Shared (copy from existing synth)
    machines/{synth}/
      engine.js              # Your SynthEngine subclass
      voices/
        kick.js, snare.js    # Individual voice files
  ui/{synth}/
    index.html, styles.css, app.js

jambot/
  params/{synth}-params.json   # Parameter definitions
  instruments/{synth}-node.js  # Jambot integration
  tools/{synth}-tools.js       # Agent tools
  presets/{synth}/kits/, sequences/
```

### Web Client Pattern

```javascript
import { MyEngine } from '../../dist/machines/mysynth/engine.js';

let engine = null;

async function init() {
  engine = new MyEngine({ bpm: 120 });

  // Resume on user interaction
  document.addEventListener('click', async () => {
    if (engine.context.state === 'suspended') {
      await engine.context.resume();
    }
  }, { once: true });

  // Critical: Sync UI defaults to engine on init
  syncParamsToEngine();
}
```

### Testing with Playwright

Always test synth consistency with Playwright (`web/test-*.mjs`). Verify that multiple triggers produce identical output.

### Reference Implementations

| Instrument | Type | Key Patterns |
|------------|------|--------------|
| **JB01** | Drum machine | Pre-rendered kicks, 8 voices, hi-hat choke |
| **JB200** | Bass monosynth | Real-time oscillators OK (not percussive) |
| **JB202** | Modular bass synth | Custom DSP, cross-platform consistent, PolyBLEP oscillators |
| **Sampler** | Sample player | 10 slots, kit-based loading |

### Checklist for New Synths

- [ ] Engine extends SynthEngine
- [ ] Voices extend Voice
- [ ] Percussive voices pre-render complete sound
- [ ] No Math.random() in trigger paths
- [ ] Parameters defined in `params/{synth}-params.json`
- [ ] Converter added to `params/converters.js`
- [ ] Web client syncs params on init
- [ ] AudioContext resume on user interaction
- [ ] Playwright test for consistency

## Parameter Units (Producer-Friendly)

Synth parameters use producer-friendly units instead of raw 0-1 engine values. The system converts automatically.

### The 5 Unit Types

| Unit | Range | Examples |
|------|-------|----------|
| **dB** | -60 to +6 | Level, volume (0 = unity gain) |
| **0-100** | 0 to 100 | Decay, attack, resonance, envMod (like hardware knobs) |
| **semitones** | ±12 or ±24 | Tune, pitch (+12 = 1 octave up) |
| **Hz** | varies | Filter cutoff, hi-hat tone (log scale) |
| **pan** | -100 to +100 | Stereo position (L=-100, C=0, R=+100) |

Plus `choice` for discrete options (waveform: "sawtooth"/"square").

### File Structure

```
params/
  jb01-params.json   # JB01 drum machine
  jb200-params.json  # JB200 bass monosynth
  converters.js      # toEngine(), fromEngine(), etc.
```

### Per-Instrument Parameters

**JB01 (drum machine):**
- `level` (dB): -60 to +6
- `tune` (semitones): -12 to +12
- `decay` (0-100): 0=tight/punchy, 100=boomy
- `attack` (0-100): 0=soft, 100=clicky (kick only)
- `tone` (0-100): brightness

**JB200 (bass monosynth):**
- `level` (dB): -60 to +6
- `filterCutoff` (Hz): 20-16000
- `filterResonance` (0-100): 0=clean, 100=screaming
- `drive` (0-100): saturation/grit
- `osc1Waveform`, `osc2Waveform`: sawtooth/square/triangle

**JB202 (modular bass synth with custom DSP):**
- `level` (0-100): output level
- `filterCutoff` (Hz): 20-16000
- `filterResonance` (0-100): 0=clean, 100=resonant
- `drive` (0-100): soft-clip saturation
- `osc1Waveform`, `osc2Waveform`: sawtooth/square/triangle
- All ADSR envelopes (0-100): filterAttack/Decay/Sustain/Release, ampAttack/Decay/Sustain/Release
- Same parameter names as JB200 for compatibility

**Sampler:**
- `level` (dB): -60 to +6
- `tune` (semitones): -24 to +24
- `attack`, `decay` (0-100)
- `filter` (Hz): 200-20000 lowpass
- `pan` (-100 to +100)

### How It Works

1. Agent passes producer values (e.g., `level: -3` dB)
2. `converters.js` converts to engine units (0-1)
3. Synth engine receives normalized values

```javascript
import { convertTweaks } from './params/converters.js';

// Producer-friendly input
const tweaks = { level: -6, decay: 80, cutoff: 2000 };

// Convert to engine units
const engineTweaks = convertTweaks('r3d3', 'bass', tweaks);
// → { level: 0.25, decay: 0.8, cutoff: 0.65 }
```

## R9DS Sample Kits

Kit locations (checked in order, user can override bundled):
1. **Bundled**: `./samples/` (ships with app)
2. **User**: `~/Documents/Jambot/kits/` (user adds their own)

Kit structure:
```
my-kit/
  kit.json          # { name, slots: [{id, name, short}] }
  samples/
    s1.wav ... s10.wav
```

Bundled kits: 808, amber

## Preset System (Kits & Sequences)

Unified preset system for loading sounds (kits) and patterns (sequences) separately.

### JB200 Library Presets (Kits)

The JB200 has built-in kits shared between the web UI and Jambot:

| Kit | Description |
|-----|-------------|
| **Pulse** | Balanced and responsive (default) |
| **Ember** | Warm and saturated |
| **Glass** | Bright and crystalline |
| **Shadow** | Deep and resonant |
| **Wire** | Sharp and aggressive |
| **Test** | Pure saw for testing |

Load with: `load_jb200_kit({ kit: 'ember' })` or `load_jb200_kit({ kit: 'wire' })`

### JB200 Library Sequences

The JB200 has built-in sequences shared between the web UI and Jambot:

| Sequence | Description |
|----------|-------------|
| **Steady** | Simple pulse |
| **Bounce** | Upbeat rhythm |
| **Glide** | Smooth slides |
| **Stab** | Punchy staccato |
| **Climb** | Ascending run |
| **Test** | Single note for testing |

Load with: `load_jb200_sequence({ sequence: 'glide' })` or `load_jb200_sequence({ sequence: 'stab' })`

### Architecture

```
web/public/{synth}/dist/
  presets.json           # Library kits (shared with web UI, engine units)
  sequences.json         # Library sequences (shared with web UI)

presets/
  loader.js              # Generic loader (reusable for all synths)
  jb200/
    kits/
      *.json             # Additional/legacy kits (producer units)
    sequences/
      *.json             # Additional/legacy sequences
```

User presets location: `~/Documents/Jambot/presets/{synth}/kits/` and `.../sequences/`

### Kit Format (Producer-Friendly Values)

```json
{
  "name": "Default",
  "description": "Classic JB200 bass sound",
  "params": {
    "osc1Waveform": "sawtooth",
    "osc1Octave": 0,
    "filterCutoff": 800,
    "filterResonance": 40,
    "level": 0
  }
}
```

Values in user/bundled kits are in producer units (Hz, dB, 0-100). The loader converts to engine units (0-1) automatically. Library presets are already in engine units.

### Sequence Format

```json
{
  "name": "Default",
  "description": "Acid-style bass line",
  "pattern": [
    { "note": "C2", "gate": true, "accent": true, "slide": false },
    { "note": "C2", "gate": false, "accent": false, "slide": false },
    ...
  ]
}
```

### Tools

| Tool | Description |
|------|-------------|
| `list_jb200_kits` | Show available JB200 sound presets |
| `load_jb200_kit` | Load a sound preset by ID |
| `list_jb200_sequences` | Show available JB200 pattern presets |
| `load_jb200_sequence` | Load a pattern preset by ID |

### Adding New Presets

1. Create JSON file in `presets/{synth}/kits/` or `presets/{synth}/sequences/`
2. Use producer-friendly values (Hz, dB, etc.)
3. Tools automatically pick up new files

### Extending to Other Synths

The `presets/loader.js` module is generic. To add presets for another synth:
1. Create `presets/{synth}/kits/` and `presets/{synth}/sequences/` directories
2. Add `list_{synth}_kits`, `load_{synth}_kit`, etc. tools following JB200 pattern
3. Ensure `params/{synth}-params.json` exists for unit conversion

## Tools Available to Agent

### Generic Parameter Tools (PRIMARY)

**These are the PRIMARY tools for reading and writing parameters.** Use these for all parameter tweaks. The per-instrument `tweak_*` tools are deprecated.

| Tool | Description |
|------|-------------|
| `tweak` | **PRIMARY** - Set any parameter with automatic unit conversion |
| `tweak_multi` | Set multiple params at once |
| `get_param` | Get any parameter (returns producer-friendly units) |
| `get_state` | Get all params for an instrument/voice |
| `list_params` | List available params for an instrument |

**`tweak` examples (with automatic unit conversion):**
```
tweak({ path: 'jb01.kick.decay', value: 75 })        → Sets decay to 75%
tweak({ path: 'jb01.kick.level', value: -6 })        → Sets level to -6dB
tweak({ path: 'jb200.filterCutoff', value: 2000 })   → Sets filter to 2000Hz
tweak({ path: 'jb200.filterResonance', value: 80 })  → Sets resonance to 80%
tweak({ path: 'sampler.s1.pan', value: -50 })        → Sets pan to L50
tweak({ path: 'sampler.s1.level', value: 0 })        → Sets sampler slot 1 to unity
```

**Path format:** `{instrument}.{voice}.{param}` or `{instrument}.{param}` for single-voice synths

| Instrument | Path Format | Example |
|------------|-------------|---------|
| jb01 | `jb01.{voice}.{param}` | `jb01.kick.decay`, `jb01.snare.level` |
| jb200 | `jb200.{param}` | `jb200.filterCutoff`, `jb200.drive` |
| sampler | `sampler.{slot}.{param}` | `sampler.s1.level`, `sampler.s3.tune` |

**Muting voices:**
- Use `tweak({ path: 'jb01.kick.level', value: -60 })` to mute (minimum dB = silent)
- Or omit the instrument from the section's pattern assignment in song mode

### Per-Instrument Tools

**Pattern programming tools:**

| Tool | Instrument | Description |
|------|------------|-------------|
| `add_jb01` | JB01 | Drum machine (8 voices: kick, snare, clap, ch, oh, lowtom, hitom, cymbal). Use `bars` param for multi-bar patterns. |
| `add_jb200` | JB200 | Bass monosynth pattern with note, gate, accent, slide. Use `bars` param for multi-bar patterns. |
| `add_jb202` | JB202 | Modular bass synth pattern (same format as JB200). Cross-platform consistent output. |
| `add_jp9000` | JP9000 | Initialize modular synth with optional preset (basic, pluck, dualBass). |
| `add_jp9000_pattern` | JP9000 | Set melodic pattern (triggers modules set via set_trigger_modules). |

**JP9000 modular tools:**

| Tool | Description |
|------|-------------|
| `add_module` | Add module to rack (osc-saw, filter-lp24, string, env-adsr, etc.) |
| `remove_module` | Remove module from rack |
| `connect_modules` | Patch two module ports (e.g., 'osc1.audio' → 'filter1.audio') |
| `disconnect_modules` | Unpatch two module ports |
| `set_jp9000_output` | Set which module is the final output |
| `tweak_module` | Adjust module parameter (cutoff, decay, brightness, etc.) |
| `pluck_string` | Pluck a string module at a specific note |
| `set_trigger_modules` | Set which modules the pattern sequencer triggers |
| `show_jp9000` | Show current rack: modules, connections, params |
| `list_module_types` | List available module types with descriptions |

**Session tools:**

| Tool | Description |
|------|-------------|
| `create_session` | Set BPM (60-200), reset all patterns |
| `show` | Show current state of any instrument |
| `render` | Render session to WAV file |
| `list_projects` | List all saved projects |
| `open_project` | Open a project by name/folder |
| `rename_project` | Rename current project |

**Preset tools:**

| Tool | Instrument | Description |
|------|------------|-------------|
| `list_jb01_kits` | JB01 | Show available drum kits |
| `load_jb01_kit` | JB01 | Load a drum kit by ID |
| `list_jb200_kits` | JB200 | Show available sound presets |
| `load_jb200_kit` | JB200 | Load a sound preset by ID |
| `list_jb200_sequences` | JB200 | Show available pattern presets |
| `load_jb200_sequence` | JB200 | Load a pattern preset by ID |
| `list_jb202_kits` | JB202 | Show available JB202 sound presets |
| `load_jb202_kit` | JB202 | Load a JB202 sound preset by ID |
| `list_jb202_sequences` | JB202 | Show available JB202 pattern presets |
| `load_jb202_sequence` | JB202 | Load a JB202 pattern preset by ID |

**Song mode tools:**

| Tool | Description |
|------|-------------|
| `set_swing` | Groove amount 0-100% |
| `render` | Mix all synths to WAV file (uses arrangement if set) |
| `save_pattern` | Save current pattern for an instrument to a named slot (A, B, C...) |
| `load_pattern` | Load a saved pattern into current working pattern |
| `copy_pattern` | Copy a pattern to a new name (for variations) |
| `list_patterns` | List all saved patterns per instrument |
| `set_arrangement` | Set song arrangement: sections with bar counts and pattern assignments |
| `clear_arrangement` | Clear arrangement, return to single-pattern mode |
| `show_arrangement` | Display current patterns and arrangement |

**Mixer tools:**

| Tool | Description |
|------|-------------|
| `create_send` | Create send bus with plate reverb (full param control) |
| `tweak_reverb` | Adjust reverb parameters on existing send |
| `route_to_send` | Route a voice to a send bus |
| `add_channel_insert` | Add EQ/filter/ducker to channel OR individual drum voice |
| `remove_channel_insert` | Remove EQ/filter/ducker from channel or drum voice |
| `add_sidechain` | Sidechain ducking (bass ducks on kick) |
| `add_master_insert` | Add effect to master bus |
| `show_mixer` | Display current mixer config |

**Analysis tools:**

| Tool | Description |
|------|-------------|
| `analyze_render` | Analyze WAV: levels, frequency balance, recommendations |
| `detect_resonance` | Detect filter resonance peaks (squelch detection) |
| `detect_mud` | Detect frequency buildup in 200-600Hz mud zone |
| `measure_spectral_flux` | Measure spectrum changes over time (filter movement) |
| `get_spectral_peaks` | Find dominant frequencies with note names |
| `show_spectrum` | ASCII spectrum analyzer visualization (8-band EQ style) |
| `detect_waveform` | Identify waveform type (saw, square, triangle, sine) |
| `verify_waveform` | Verify expected waveform type matches actual |
| `generate_spectrogram` | Generate spectrogram image from WAV |

**Effect chain tools (flexible routing):**

| Tool | Description |
|------|-------------|
| `add_effect` | Add effect to target (instrument/master) with optional position (`after: 'delay'`) |
| `remove_effect` | Remove effect from target |
| `show_effects` | Display all effect chains |
| `tweak_effect` | Modify params on existing effect |

## Mixer (DAW-like Routing)

Jambot includes a virtual mixer for professional mixing:

### Send Buses (Reverb)
```
create_send(name: 'reverb', effect: 'reverb', decay: 2, damping: 0.5)
route_to_send(voice: 'ch', send: 'reverb', level: 0.4)
route_to_send(voice: 'clap', send: 'reverb', level: 0.3)
tweak_reverb(send: 'reverb', decay: 3, highcut: 6000)
```

Reverb parameters (Dattorro plate algorithm):
- `decay` (0.5-10s) - Tail length
- `damping` (0-1) - High-frequency rolloff (0=bright, 1=dark)
- `predelay` (0-100ms) - Gap before reverb
- `modulation` (0-1) - Pitch wobble for shimmer
- `lowcut` (20-500Hz) - Remove mud
- `highcut` (2000-20000Hz) - Tame harshness
- `width` (0-1) - Stereo spread
- `mix` (0-1) - Wet/dry balance

### Channel EQ
```
add_channel_insert(channel: 'jb200', effect: 'eq', preset: 'acidBass')
add_channel_insert(channel: 'jb01', effect: 'eq', preset: 'punchyKick')
```

EQ presets: `acidBass`, `crispHats`, `warmPad`, `punchyKick`, `cleanSnare`

EQ parameters (can override preset):
- `highpass` (Hz) - Cut frequencies below this
- `lowGain` (dB) - Low shelf boost/cut
- `midGain` (dB) - Mid peak boost/cut
- `midFreq` (Hz) - Mid peak frequency
- `highGain` (dB) - High shelf boost/cut

### Channel Filter
```
add_channel_insert(channel: 'jb200', effect: 'filter', preset: 'dubDelay')
add_channel_insert(channel: 'jb01', effect: 'filter', params: { mode: 'lowpass', cutoff: 2000, resonance: 40 })
```

Filter presets: `dubDelay` (LP 800Hz), `telephone` (BP 1500Hz), `lofi` (LP 3000Hz), `darkRoom` (LP 400Hz), `airFilter` (HP 500Hz), `thinOut` (HP 1000Hz)

Filter parameters:
- `mode` - lowpass, highpass, or bandpass
- `cutoff` (Hz) - Filter frequency
- `resonance` (0-100) - Filter Q/resonance (0=gentle, 100=screaming)

Use filter for: dub effects, lo-fi warmth, breakdown sweeps, telephone/radio sounds, dramatic frequency cuts.

### Per-Section Channel Inserts (Song Mode)

Channel inserts (filter, EQ) are saved with patterns. Supports individual JB01 voices (kick, snare, ch, oh, etc.).

```
# Apply highpass to ONLY THE KICK in part C
load_pattern(jb01, C)
add_channel_insert(channel: 'kick', effect: 'filter', params: {mode: 'highpass', cutoff: 500})
save_pattern(jb01, C)

# Apply filter to ALL JB01 voices in part C
load_pattern(jb01, C)
add_channel_insert(channel: 'jb01', effect: 'filter', params: {mode: 'lowpass', cutoff: 2000})
save_pattern(jb01, C)

# Change filter settings on C
load_pattern(jb01, C)
add_channel_insert(channel: 'kick', effect: 'filter', params: {mode: 'highpass', cutoff: 800})  # Replaces existing
save_pattern(jb01, C)

# Remove filter from kick in A and D
load_pattern(jb01, A)
remove_channel_insert(channel: 'kick', effect: 'filter')
save_pattern(jb01, A)

load_pattern(jb01, D)
remove_channel_insert(channel: 'kick', effect: 'filter')
save_pattern(jb01, D)
```

Parts without filters in their saved state play without the filter. Always: **load → modify → save** for EACH part.

### Sidechain Ducking
```
add_sidechain(target: 'jb200', trigger: 'kick', amount: 0.5)
```

### Master EQ
```
add_master_insert(effect: 'eq', preset: 'master')
```

### Analysis

Jambot includes spectral analysis tools for mixing feedback. Requires sox: `brew install sox`

```
analyze_render()           // Levels, frequency balance, recommendations
detect_resonance()         // Find filter squelch peaks
detect_mud()               // Find 200-600Hz buildup
show_spectrum()            // ASCII 8-band spectrum analyzer
get_spectral_peaks()       // Dominant frequencies with note names
measure_spectral_flux()    // Filter movement detection
detect_waveform()          // Identify saw/square/triangle/sine
```

**Resonance detection** identifies acid squelch — prominent filter resonance peaks above the average spectrum. Returns peak frequencies with their musical note names and prominence in dB.

**Mud detection** analyzes narrow bands in the 200-600Hz range to find frequency buildup that makes mixes sound muddy. Returns which frequencies need cutting.

**Spectral flux** measures how much the spectrum changes over time. High flux = active filter sweeps, low flux = static sound.

### Node Output Levels (Mixer)

Each instrument has a node-level output gain for balancing the mix:

```
tweak({ path: 'jb01.level', value: -3 })     // JB01 down 3dB
tweak({ path: 'jb200.level', value: -6 })    // JB200 down 6dB
tweak({ path: 'sampler.level', value: 0 })   // Sampler at unity
```

Use `show_mixer` to see current output levels:
```
OUTPUT LEVELS:
  jb01: 0dB  jb200: -3dB  sampler: +2dB
```

Note: For multi-voice instruments (jb01, sampler), this is separate from per-voice levels (`jb01.kick.level`, `sampler.s1.level`). For single-voice instruments (jb200), this IS the voice level.

### Signal Flow
```
voice → [voice level] → [channel EQ/Filter] → [ducker] → node level → [effect chain] → [send] → master → [master chain] → output
                                                                                          ↓
                                                                                    send bus (reverb) → master
```

## Effect Chains (Flexible Routing)

Add effects to any instrument, voice, or master in any order. Effect chains provide delay, reverb, and more.

### Targets
- **Instrument**: `jb01`, `jb200`, `sampler` — affects entire instrument
- **Voice**: `jb01.ch`, `jb01.kick`, `jb01.snare` — affects single voice (JB01 supported)
- **Master**: `master` — affects final mix

### Adding Effects
```
add_effect({ target: 'jb01.ch', effect: 'delay', mode: 'pingpong', feedback: 50, mix: 30 })
add_effect({ target: 'jb01.ch', effect: 'reverb', after: 'delay', decay: 2, mix: 20 })
add_effect({ target: 'jb200', effect: 'delay', mode: 'analog', time: 500 })
add_effect({ target: 'master', effect: 'reverb', decay: 1.5, mix: 15 })
```

### Delay Parameters

| Param | Range | Default | Description |
|-------|-------|---------|-------------|
| mode | analog/pingpong | analog | Delay type |
| time | 1-2000ms | 375 | Delay time |
| sync | off/8th/dotted8th/triplet8th/16th/quarter | off | Tempo sync |
| feedback | 0-100 | 50 | Feedback amount |
| mix | 0-100 | 30 | Wet/dry balance |
| lowcut | 20-500Hz | 80 | Remove mud from feedback |
| highcut | 1000-20000Hz | 8000 | Tame harshness |
| saturation | 0-100 | 20 | Analog warmth (analog mode) |
| spread | 0-100 | 100 | Stereo width (pingpong mode) |

### Tweaking Effects
```
tweak_effect({ target: 'jb01', effect: 'delay', feedback: 70, time: 250 })
```

### Removing Effects
```
remove_effect({ target: 'jb01', effect: 'delay' })     # Remove specific effect
remove_effect({ target: 'jb01', effect: 'all' })       # Remove all effects
```

### Showing Effect Chains
```
show_effects()
# Output:
# jb01: delay(pingpong) [feedback=50, mix=30] → reverb [decay=2, mix=20]
# master: reverb [decay=1.5, mix=15]
```

### Use Cases

**Dub-style hi-hats**: Add delay to JUST the closed hats
```
add_effect({ target: 'jb01.ch', effect: 'delay', mode: 'analog', time: 375, feedback: 60, mix: 25 })
```

**Reverb on snare only**: Space on snare, dry kick
```
add_effect({ target: 'jb01.snare', effect: 'reverb', decay: 1.5, mix: 30 })
```

**Acid bass with ping-pong**: Bouncing echoes on the synth
```
add_effect({ target: 'jb200', effect: 'delay', mode: 'pingpong', time: 250, feedback: 40, mix: 20 })
```

**Master reverb for glue**: Subtle reverb on everything
```
add_effect({ target: 'master', effect: 'reverb', decay: 1.2, mix: 10 })
```

**Chained effects on hats**: Delay into reverb for spacious sound
```
add_effect({ target: 'jb01.ch', effect: 'delay', mode: 'pingpong', feedback: 45 })
add_effect({ target: 'jb01.ch', effect: 'reverb', after: 'delay', decay: 2.5, mix: 30 })
```

## Session State

```javascript
session = {
  bpm, swing, bars,
  // JB01 (drum machine)
  jb01Pattern: { kick: [...], snare: [...], ch: [...], oh: [...], ... },
  jb01Params: { kick: { decay, tune, level, ... }, snare: {...}, ... },
  // JB200 (bass monosynth)
  jb200Pattern: [{ note, gate, accent, slide }, ...],
  jb200Params: { osc1Waveform, filterCutoff, filterResonance, drive, level, ... },
  // Sampler
  samplerKit: { id, name, slots: [{ id, name, short, buffer }] },
  samplerPattern: { s1: [{step, vel}, ...], s2: [...], ... },
  samplerParams: { s1: { level, tune, attack, decay, filter, pan }, ... },
  // Mixer
  mixer: {
    sends: { 'reverb': { effect: 'reverb', params: { mix: 0.3 } } },
    voiceRouting: { 'ch': { sends: { 'reverb': 0.4 } } },
    channelInserts: { 'jb200': [{ type: 'ducker', params: { trigger: 'kick', amount: 0.5 } }] },
    masterInserts: [{ type: 'eq', preset: 'master' }],
    masterVolume: 0.8,
  },
  // Song Mode - patterns stored by instrument ID
  patterns: {
    jb01: { 'A': {...}, 'B': {...} },
    jb200: { 'A': {...}, 'B': {...} },
    sampler: { 'A': {...} },
  },
  currentPattern: { jb01: 'A', jb200: 'A', sampler: 'A' },
  arrangement: [
    { bars: 4, patterns: { jb01: 'A', jb200: 'A' } },
    { bars: 8, patterns: { jb01: 'B', jb200: 'A' } },
  ],
}
```

## Song Mode

Song mode enables multi-section arrangements with reusable patterns of any length.

### Variable Pattern Lengths

Each instrument can have its own pattern length:
- **16 steps = 1 bar** (default)
- **32 steps = 2 bars**
- **64 steps = 4 bars**
- **256 steps = 16 bars**
- etc.

Short patterns loop to fill their section. Long patterns play through once (or loop if shorter than the section).

**Example:** 1-bar drum loop + 4-bar bass progression
```javascript
// Drums: 16 steps (1 bar) - loops 4x over 4 bars
add_jb01({ kick: [0,4,8,12], ch: [0,2,4,6,8,10,12,14] })

// Bass: 64 steps (4 bars) - plays once over 4 bars
add_jb200({ pattern: [
  // Bar 1: C
  { note: 'C2', gate: true }, ...rest,
  // Bar 2: E
  { note: 'E2', gate: true }, ...rest,
  // Bar 3: G
  { note: 'G2', gate: true }, ...rest,
  // Bar 4: A
  { note: 'A2', gate: true }, ...rest,
], bars: 4 })

render({ bars: 4 })  // Drums loop 4x, bass plays once
```

### Workflow

1. **Create patterns**: Program instruments with desired length (use `bars` param for multi-bar patterns)
2. **Save patterns**: `save_pattern(instrument: 'jb01', name: 'A')` — saves current state to named slot
3. **Create variations**: Load pattern, modify, save as new name (B, C, etc.)
4. **Set arrangement**: Define sections with bar counts and pattern assignments
5. **Render**: Outputs full song with patterns looping within each section

### How Patterns Loop

Patterns loop to fill their section. A 16-step (1-bar) drum pattern playing over 8 bars loops 8 times. A 64-step (4-bar) bass pattern playing over 8 bars loops twice.

### Example

```javascript
// 1. Create drum patterns (16 steps = 1 bar, loops to fill sections)
add_jb01({ kick: [0,4,8,12], ch: [0,2,4,6,8,10,12,14] })
save_pattern({ instrument: 'jb01', name: 'A' })

add_jb01({ kick: [0,4,8,12], snare: [4,12], oh: [2,6,10,14] })
save_pattern({ instrument: 'jb01', name: 'B' })

// 2. Create bass pattern (64 steps = 4 bars, different notes each bar)
add_jb200({ pattern: [...64 steps...], bars: 4 })
save_pattern({ instrument: 'jb200', name: 'A' })

// 3. Arrange using canonical instrument IDs
set_arrangement({
  sections: [
    { bars: 4, jb01: 'A', jb200: 'A' },   // Intro: drums loop 4x, bass plays once
    { bars: 8, jb01: 'B', jb200: 'A' },   // Main: drums loop 8x, bass loops 2x
    { bars: 4, jb01: 'A' },               // Breakdown (no bass)
    { bars: 8, jb01: 'B', jb200: 'A' },   // Main
  ]
})

// 4. Render full 24-bar song
render({ filename: 'full-track' })
```

### Pattern Contents

Each saved pattern captures the full state for that instrument:

- **jb01**: pattern, params
- **jb200**: pattern, params
- **sampler**: pattern, params

## Genre Knowledge System

`genres.json` contains deep production knowledge for 17 genres. When users mention a genre, the system auto-injects relevant knowledge into the agent's context.

**How it works:**
1. `detectGenres(text)` scans user input for genre keywords
2. `buildGenreContext(keys)` formats the genre data for the system prompt
3. Agent receives: BPM range, keys, swing, drum/bass settings, production philosophy

**Supported genres:**
- Classic House, Chicago House, Deep House, Tech House
- Detroit Techno, Berlin Techno, Industrial Techno, Minimal
- Acid House, Acid Techno
- Electro, Breakbeat, Trance
- Drum & Bass, Jungle
- Ambient, IDM

**Aliases:** "house" → classic_house, "techno" → berlin_techno, "acid" → acid_house, etc.

**To add a genre:** Add entry to `genres.json` with name, bpm, keys, description, production, drums, bass, swing, references. Then add aliases to `GENRE_ALIASES` in `jambot.js`.

## Slash Commands

| Command | Description |
|---------|-------------|
| `/new` | New project |
| `/open` | Open project |
| `/recent` | Resume most recent project |
| `/projects` | List all projects (with timestamps) |
| `/mix` | Show mix overview |
| `/jb01` | JB01 drum machine guide (kochi.to/jb01) |
| `/jb200` | JB200 bass synth guide (kochi.to/jb200) |
| `/jb202` | JB202 modular bass synth guide (kochi.to/jb202) |
| `/delay` | Delay effect guide |
| `/status` | Show current session |
| `/clear` | Reset session |
| `/changelog` | Version history |
| `/help` | Show available commands |
| `/exit` | Quit Jambot |

## Splash Screen

Must fit 80x24 terminal. Currently 21 lines + prompt.

## Workflow

**Daily development**: Edit `jambot.js` / `ui.tsx`, commit/push. No builds needed.

**Cutting a release**: See README.md.

## Code Review

After major work, run the code review subagent:

```
/review-jambot                    # Review uncommitted changes
/review-jambot HEAD~3..HEAD       # Review last 3 commits
/review-jambot main..feature      # Review a branch
/review-jambot effects/           # Review specific directory
```

The reviewer checks:
- **Architecture compliance** — Node interface, ParamSystem, engine sourcing
- **Audio consistency** — Pre-render percussion, deterministic audio, no Math.random()
- **Code quality** — File sizes (<400 lines), tool organization, no duplication
- **Puzzle piece reuse** — Clock, session, routing, presets

Then updates `jambot/CLAUDE.md` and `PLATFORM-OVERVIEW.md` with new capabilities.

Source: `sms-bot/documentation/subagents/review-jambot.md`
