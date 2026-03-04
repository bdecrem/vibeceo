# Jambot - Claude Code Instructions

## THE SYSTEM (Read This First)

**Jambot is a modular music production platform where any component can be added, removed, or swapped, and everything connects the same way.**

- **Instruments** are plugins. Add a new synth → it exposes voices and parameters through the standard interface. The system doesn't care if it's a 909, FM synth, or something that doesn't exist yet.

- **Effects** are plugins. Add a new effect → it exposes parameters the same way. Delay, EQ, filter — all plug in identically.

- **Tracks and routing** are dynamic. Create a track, route a voice to a bus, add a send — operations on a graph, not hardcoded paths.

- **Services** work on anything. Automation doesn't know about "drums" — it knows about parameters. Analysis doesn't know about "kick" — it knows about audio signals. Generic capabilities that work across the whole system.

- **The agent** is just a user. It sees the current configuration, reads and writes parameters, renders audio. No special code per instrument — same interface for everything.

**The Core Requirement:** The agent must be able to **read and write ANY parameter** in the system. Everything is addressable (jb01.kick.decay, jb202.filterCutoff, fx.master.delay1.feedback, master.volume). One way to read, one way to write. If a value exists, the agent can see it.

**When adding anything new:** It plugs into the existing architecture. New synth? Same interface. New effect? Same interface. New service? Works on everything. Never write bespoke code that only works for one thing.

---

## Quick Reference

```bash
npm start          # Run jambot
npm run build      # Build for release (only when cutting a release)
node jambot/tests/run-tests.js   # Run architecture tests
```

### Mandatory: Run Tests After Changes

**After making ANY code changes to `jambot/` files, ALWAYS run the architecture tests before committing:**

```bash
node jambot/tests/run-tests.js
```

If any test fails, fix the issue before committing. Do not skip or ignore failures.

## Headless API (For Other Agents)

`headless.js` exposes Jambot's full tool layer without the Claude agent loop or TUI. Use this when driving Jambot programmatically from another agent or script.

```javascript
import { createHeadless } from './headless.js';

const jb = await createHeadless({ bpm: 128 });

// All 91 tools available — same interface as the agent, producer-friendly units
await jb.tool('add_jb01', { kick: [0, 4, 8, 12], snare: [4, 12] });
await jb.tool('tweak', { path: 'jb01.kick.decay', value: 75 });       // 0-100
await jb.tool('tweak', { path: 'jb01.kick.level', value: -3 });       // dB
await jb.tool('automate', { path: 'jb01.ch.decay', values: [80,70,60,50,40,30,20,10,80,70,60,50,40,30,20,10] });
await jb.tool('save_pattern', { instrument: 'jb01', name: 'A' });
await jb.tool('set_arrangement', { sections: [{ bars: 4, jb01: 'A' }] });
await jb.render('my-track', 4);

// Session persists between calls — tweak and re-render without rebuilding
// save()/load() for serialization across sessions
const state = jb.save();
jb.load(state);
```

**Key points:**
- Pattern format uses step arrays (`[0, 4, 8, 12]`) — the tool layer converts
- All values in producer units (dB, 0-100, Hz, semitones) — automatic conversion
- Song mode (save_pattern, set_arrangement) works through `tool()` calls
- `await jb.listTools()` to see all available tools

## Architecture

Core files:
- `jambot.js` — Agent loop, tools, WAV encoder, synth integration
- `headless.js` — Headless API for programmatic access (no agent loop)
- `ui.tsx` — Ink-based terminal UI
- `project.js` — Project persistence
- `midi.js` — MIDI file generation for exports

### Naming Conventions

**JB202 vs JB200**: The bass synth was renamed from JB200 to JB202. Code uses the canonical name `JB202` but legacy aliases exist for backwards compatibility:
- Function names: `generateJB202Midi` (canonical), `generateJB200Midi` (legacy alias)
- Session state: `jb202Pattern`, `jb202Params` (canonical), `jb200Pattern` (legacy alias in some places)
- Always use JB202 in new code. Legacy aliases exist only to prevent breaking old saved projects.

## Instruments

### Active Instruments

| Instrument | ID | Description |
|------------|-----|-------------|
| **JB01** | `jb01` | Drum machine (8 voices: kick, snare, clap, ch, oh, lowtom, hitom, cymbal) |
| **JB202** | `jb202` | Modular bass synth with custom DSP (cross-platform consistent) |
| **JP9000** | `jp9000` | True modular synth with patchable modules (oscillators, filters, Karplus-Strong strings) |
| **JB-S** | `jbs` | 10-slot sample player with kits |
| **JT10** | `jt10` | Lead/bass synth (101-style) with PolyBLEP oscillators, sub-osc, Moog ladder filter, LFO |
| **JT30** | `jt30` | Acid bass synth (303-style) with saw/square oscillators, Moog ladder filter, classic acid sound |
| **JT90** | `jt90` | Drum machine (909-style) with 11 voices: kick, snare, clap, rimshot, lowtom, midtom, hitom, ch, oh, crash, ride |

**Agent guidance for user intent:**
- User says "drum" / "drums" / "beat" → suggest **JB01** or **JT90**
- User says "bass" / "bassline" / "synth" → suggest **JB202** or **JT30**
- User says "lead" / "melody" → suggest **JT10**
- User says "acid" / "303" → suggest **JT30**
- User says "909" → suggest **JT90**
- User says "modular" / "patch" / "modules" / "string" / "pluck" → suggest **JP9000**
- User says "sample" / "samples" / "kit" → suggest **JB-S**

### JB202 - Modular Bass Synth (Custom DSP)

JB202 is a bass monosynth with **custom DSP components** written in pure JavaScript:
- **PolyBLEP oscillators**: Band-limited waveforms (alias-free)
- **24dB cascaded biquad filter**: Smooth lowpass with resonance
- **Exponential ADSR envelopes**: Natural decay curves
- **Soft-clip drive**: Warm saturation

**Key feature**: Produces **identical output** in Web Audio (browser) and offline rendering (Node.js/Jambot). Same waveforms, same filter response, same timing.

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

### JT10 - Lead/Bass Synth (101-style)

JT10 is a monophonic lead/bass synth inspired by the SH-101:
- **PolyBLEP saw and pulse oscillators**: Band-limited waveforms
- **Sub-oscillator**: Square wave, 1-2 octaves down
- **Moog ladder filter**: 4-pole lowpass with resonance
- **LFO modulation**: Pitch, filter, or pulse width destinations
- **ADSR envelopes**: Filter and amplitude

**Key feature**: Versatile for both bass and lead lines. Pulse width modulation available.

**Web UI**: `kochi.to/jt10`

**Example workflow:**
```
add_jt10({ pattern: [
  { note: 'C3', gate: true, accent: false, slide: false },
  { note: 'C3', gate: false, accent: false, slide: false },
  { note: 'G3', gate: true, accent: true, slide: false },
  ...
]})
tweak_jt10({ filterCutoff: 2000, filterResonance: 40 })
render()
```

### JT30 - Acid Bass (303-style)

JT30 is the classic acid bass synth:
- **Saw and square oscillators**: The iconic 303 waveforms
- **Moog ladder filter**: 4-pole lowpass with accent-modulated resonance
- **ADSR envelope**: With accent control for harder attacks
- **Drive**: Soft-clip saturation for grit

**Key feature**: Classic acid sound with accents and slides for squelchy basslines.

**Web UI**: `kochi.to/jt30`

**Example workflow:**
```
add_jt30({ pattern: [
  { note: 'C2', gate: true, accent: true, slide: false },
  { note: 'C2', gate: true, accent: false, slide: true },
  { note: 'G2', gate: true, accent: false, slide: false },
  ...
]})
tweak_jt30({ filterCutoff: 800, filterResonance: 70, filterEnvAmount: 80 })
render()
```

### JT90 - Drum Machine (909-style)

JT90 is a **hybrid** drum machine with 11 voices:
- **Synthesized** (pure JS DSP): kick, snare, clap, rimshot, lowtom, midtom, hitom
- **Sample-based** (WAV playback): ch, oh, crash, ride

Sample WAVs live in `web/public/jt90/samples/` (ch.wav, oh.wav, crash.wav, ride.wav).

**Web UI**: `kochi.to/jt90`

#### JT90 Web Audio: MUST Pre-Render (CRITICAL)

**NEVER use real-time `scriptProcessor` / `onaudioprocess` with JT90.** The sample voices (ch, oh, crash, ride) do per-sample interpolation + envelope + filtering — too CPU-heavy for the audio thread. It will glitch, stutter, or drop frames.

**Always pre-render offline, then play back the buffer:**

```javascript
// CORRECT — pre-render, then play
const engine = new JT90Engine({ bpm: 126 });
await engine.loadSamples('/jt90/samples');
engine._ensureVoices();
engine.setPattern(pattern);

// Render offline (no AudioContext needed for this step)
const buffer = await engine.renderPattern({
  bars: 4,
  bpm: 126,
  automation: { 'ch.decay': [0.8, 0.1, 0.7, 0.2, ...] },
});

// Play the baked buffer
const ctx = new AudioContext();
const audioBuffer = ctx.createBuffer(1, buffer.length, buffer.sampleRate);
audioBuffer.getChannelData(0).set(buffer.getChannelData(0));
const source = ctx.createBufferSource();
source.buffer = audioBuffer;
source.connect(ctx.destination);
source.start();

// Drive visuals with setInterval, NOT audio callbacks
const stepMs = (60 / 126 / 4) * 1000;
setInterval(() => { /* update visuals from arrangement data */ }, stepMs);
```

```javascript
// WRONG — will glitch on mobile, stutter on desktop
const scriptNode = ctx.createScriptProcessor(1024, 0, 2);
scriptNode.onaudioprocess = (e) => {
  // DON'T DO THIS with JT90 — sample voices are too expensive
  for (const v of VOICE_IDS) {
    if (voice.isActive()) sample += voice.processSample();
  }
};
```

**JB01 is different** — it's pure synthesis, so real-time `trigger()` scheduling works fine (see `hallman/index.html`). JT90's sample voices are what make real-time processing too expensive.

**Reference implementations:**
- `web/public/pixelpit/daskollektiv/dk001.html` — JT90 pre-rendered, 8 bars
- `web/public/hallman/sick.html` — JT90 pre-rendered, multi-section arrangement
- `web/public/jt90/tribal.html` — JT90 pre-rendered, simple version

**Node.js (headless):** `jt90-node.js` already pre-renders via `renderPattern()`. Remember to call `loadSamplesFromDisk(engine)` before rendering — without it, sample voices are silent stubs.

**Example workflow:**
```
add_jt90({ kick: [0, 8], snare: [4, 12], ch: [0, 2, 4, 6, 8, 10, 12, 14] })
tweak_jt90({ voice: 'kick', decay: 60, attack: 30 })
tweak_jt90({ voice: 'snare', snappy: 70 })
render()
```

## Synth Sources

Engines imported from `web/public/`:
- JB01: `../web/public/jb01/dist/machines/jb01/engine.js`
- JB202: `../web/public/jb202/dist/machines/jb202/engine.js` (custom DSP)
- JP9000: `../web/public/jp9000/dist/rack.js` + modules (reuses JB202 DSP)
- JT10: `../web/public/jt10/dist/machines/jt10/engine.js`
- JT30: `../web/public/jt30/dist/machines/jt30/engine.js`
- JT90: `../web/public/jt90/dist/machines/jt90/engine.js`

JB-S (Sampler) uses local files:
- `kit-loader.js` — Loads kits from filesystem
- `sample-voice.js` — Sample playback engine
- `samples/` — Bundled sample kits

**Do NOT duplicate synth code** - always import from web/public/ (except JB-S which is local).

### Cross-Origin Usage (External Domains Loading Jambot Engines)

When a web page on another domain (e.g., `daskollektiv.rip` on Vercel) imports Jambot engines from `kochi.to`, CORS headers are required. Without them, the browser blocks the ES module imports.

**How it works now:**

`web/middleware.ts` checks if the request path starts with a synth engine prefix (`/jt90/`, `/jb01/`, `/jb202/`) and sets `Access-Control-Allow-Origin` to the requesting origin if it's in the allowlist.

**When building a page on an external domain that uses Jambot engines:**

1. **Use absolute URLs** for all engine imports:
   ```javascript
   // CORRECT — works from any domain
   import { JT90Engine } from 'https://kochi.to/jt90/dist/machines/jt90/engine.js';

   // WRONG — resolves to the hosting domain, not kochi.to
   import { JT90Engine } from '/jt90/dist/machines/jt90/engine.js';
   ```

2. **Add the external domain to the CORS allowlist** in `web/middleware.ts`:
   ```typescript
   const allowed = origin === 'https://yourdomain.com' || origin === 'https://www.yourdomain.com'
   ```
   Always include both bare domain and `www.` — CORS requires an exact origin match.

3. **Cover all engine path prefixes the page needs.** Engines have internal cross-imports:
   - JT90 voices import shared DSP from `/jb202/dist/dsp/` — so `/jb202/*` needs CORS too
   - JT90 loads samples via fetch from `/jt90/samples/` — same CORS rule covers it
   - JB01 is self-contained (no cross-engine imports)
   - JP9000, JT10, JT30 also import from `/jb202/dist/dsp/`

   **Currently covered prefixes:** `/jt90/*`, `/jb01/*`, `/jb202/*`

   **If you add a page using JT10, JT30, or JP9000** from an external domain, add their prefixes to the middleware CORS block too (e.g., `/jt10/*`, `/jt30/*`, `/jp9000/*`).

4. **`next.config.js` also has CORS headers** as a belt-and-suspenders backup, but the middleware runs first and returns early, so it's the middleware that matters.

### Shared DSP Library

**Location:** `web/public/jb202/dist/dsp/`

This folder contains the canonical shared DSP primitives for all instruments. Despite living under `jb202/`, it's the platform-wide DSP library.

| Category | Modules |
|----------|---------|
| **Oscillators** | `SawtoothOscillator`, `SquareOscillator`, `TriangleOscillator`, `SineOscillator`, `PulseOscillator` (PolyBLEP) |
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
    │  (JB01)  │        │  (JB202) │        │  (JB-S)  │
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

**Base class:** `SynthEngine` (`web/public/{synth}/dist/core/engine.js`)

**Internal audio graph:** `voices → compressor → analyser → masterGain → context.destination`

**Key properties and methods:**

| Property/Method | Description |
|-----------------|-------------|
| `engine.context` | The AudioContext |
| `engine.masterGain` | GainNode — the engine's final output node |
| `engine.compressor` | DynamicsCompressor before masterGain |
| `engine.analyser` | AnalyserNode between compressor and masterGain |
| `engine.connectOutput(node)` | Redirects masterGain to a custom destination (disconnects from context.destination) |
| `engine.trigger(voiceId, velocity, time)` | Trigger a voice |
| `engine.setVoiceParameter(voiceId, paramId, value)` | Set a voice parameter |
| `engine.registerVoice(id, voice)` | Register a voice (connects it to internal compressor) |

**IMPORTANT: There is NO `engine.output` property.** Use `engine.connectOutput(node)` to reroute, or `engine.masterGain` to tap the output for parallel connections (e.g. reverb sends).

```javascript
// Rerouting engine output to a custom compressor + reverb send:
const compressor = actx.createDynamicsCompressor();
compressor.connect(actx.destination);

const engine = new JB01Engine({ context: actx });
engine.connectOutput(compressor);        // Redirects masterGain → compressor
engine.masterGain.connect(reverbNode);   // Parallel send to reverb
```

**Subclassing:**

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
| **JB202** | Modular bass synth | Custom DSP, cross-platform consistent, PolyBLEP oscillators |
| **JB-S** | Sample player | 10 slots, kit-based loading |

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
  jb202-params.json  # JB202 modular bass synth
  converters.js      # toEngine(), fromEngine(), etc.
```

### Per-Instrument Parameters

**JB01 (drum machine):**
- `level` (dB): -60 to +6
- `tune` (semitones): -12 to +12
- `decay` (0-100): 0=tight/punchy, 100=boomy
- `attack` (0-100): 0=soft, 100=clicky (kick only)
- `tone` (0-100): brightness

**JB202 (modular bass synth with custom DSP):**
- `level` (0-100): output level
- `filterCutoff` (Hz): 20-16000
- `filterResonance` (0-100): 0=clean, 100=resonant
- `drive` (0-100): soft-clip saturation
- `osc1Waveform`, `osc2Waveform`: sawtooth/square/triangle/sine
- All ADSR envelopes (0-100): filterAttack/Decay/Sustain/Release, ampAttack/Decay/Sustain/Release

**JB-S (Sampler):**
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
const tweaks = { level: -6, decay: 80, filterCutoff: 2000 };

// Convert to engine units
const engineTweaks = convertTweaks('jb202', 'bass', tweaks);
// → { level: 0.25, decay: 0.8, filterCutoff: 0.65 }
```

## JB-S Sample Kits

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

### JB202 Library Presets (Kits)

The JB202 has built-in kits shared between the web UI and Jambot:

| Kit | Description |
|-----|-------------|
| **Pulse** | Balanced and responsive (default) |
| **Ember** | Warm and saturated |
| **Glass** | Bright and crystalline |
| **Shadow** | Deep and resonant |
| **Wire** | Sharp and aggressive |
| **Test** | Pure saw for testing |

Load with: `load_jb202_kit({ kit: 'ember' })` or `load_jb202_kit({ kit: 'wire' })`

### JB202 Library Sequences

The JB202 has built-in sequences shared between the web UI and Jambot:

| Sequence | Description |
|----------|-------------|
| **Steady** | Simple pulse |
| **Bounce** | Upbeat rhythm |
| **Glide** | Smooth slides |
| **Stab** | Punchy staccato |
| **Climb** | Ascending run |
| **Test** | Single note for testing |

Load with: `load_jb202_sequence({ sequence: 'glide' })` or `load_jb202_sequence({ sequence: 'stab' })`

### Architecture

```
web/public/{synth}/dist/
  presets.json           # Library kits (shared with web UI, engine units)
  sequences.json         # Library sequences (shared with web UI)

presets/
  loader.js              # Generic loader (reusable for all synths)
  jb202/
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
  "description": "Classic JB202 bass sound",
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
| `list_jb202_kits` | Show available JB202 sound presets |
| `load_jb202_kit` | Load a sound preset by ID |
| `list_jb202_sequences` | Show available JB202 pattern presets |
| `load_jb202_sequence` | Load a pattern preset by ID |

### Adding New Presets

1. Create JSON file in `presets/{synth}/kits/` or `presets/{synth}/sequences/`
2. Use producer-friendly values (Hz, dB, etc.)
3. Tools automatically pick up new files

### Extending to Other Synths

The `presets/loader.js` module is generic. To add presets for another synth:
1. Create `presets/{synth}/kits/` and `presets/{synth}/sequences/` directories
2. Add `list_{synth}_kits`, `load_{synth}_kit`, etc. tools following JB202 pattern
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
tweak({ path: 'jbs.s1.pan', value: -50 })             → Sets pan to L50
tweak({ path: 'jbs.s1.level', value: 0 })            → Sets JB-S slot 1 to unity
```

**Path format:** `{instrument}.{voice}.{param}` or `{instrument}.{param}` for single-voice synths

| Instrument | Path Format | Example |
|------------|-------------|---------|
| jb01 | `jb01.{voice}.{param}` | `jb01.kick.decay`, `jb01.snare.level` |
| jb202 | `jb202.{param}` | `jb202.filterCutoff`, `jb202.drive` |
| jbs | `jbs.{slot}.{param}` | `jbs.s1.level`, `jbs.s3.tune` |

**Muting voices:**
- Use `tweak({ path: 'jb01.kick.level', value: -60 })` to mute (minimum dB = silent)
- Or omit the instrument from the section's pattern assignment in song mode

### Per-Instrument Tools

**Pattern programming tools:**

| Tool | Instrument | Description |
|------|------------|-------------|
| `add_jb01` | JB01 | Drum machine (8 voices: kick, snare, clap, ch, oh, lowtom, hitom, cymbal). Use `bars` param for multi-bar patterns. |
| `add_jb202` | JB202 | Modular bass synth pattern with note, gate, accent, slide. Use `bars` param for multi-bar patterns. Cross-platform consistent output. |
| `add_jp9000` | JP9000 | Initialize modular synth with optional preset (basic, pluck, dualBass). |
| `add_jp9000_pattern` | JP9000 | Set melodic pattern (triggers modules set via set_trigger_modules). |
| `add_jt10` | JT10 | Lead synth pattern (16 steps: note, gate, accent, slide). 101-style monosynth. |
| `add_jt30` | JT30 | Acid bass pattern (16 steps: note, gate, accent, slide). 303-style acid bass. |
| `add_jt90` | JT90 | Drum machine (11 voices: kick, snare, clap, rimshot, lowtom, midtom, hitom, ch, oh, crash, ride). 909-style. |

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

**JT synth tools:**

| Tool | Instrument | Description |
|------|------------|-------------|
| `tweak_jt10` | JT10 | Adjust lead synth params: level, waveform, filterCutoff, filterResonance, filterEnvAmount, lfoRate, lfoAmount, ADSR, etc. |
| `tweak_jt30` | JT30 | Adjust acid bass params: level, waveform, filterCutoff, filterResonance, filterEnvAmount, filterDecay, accentLevel, drive |
| `tweak_jt90` | JT90 | Adjust drum voice params: voice (required), level, tune, decay, attack (kick only), tone, snappy (snare only) |

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
| `show_scope` | Generate oscilloscope PNG — time-domain waveform trace |

**Effect chain tools (flexible routing):**

| Tool | Description |
|------|-------------|
| `add_effect` | Add effect to target (instrument/master) with optional position (`after: 'delay'`) |
| `remove_effect` | Remove effect from target |
| `show_effects` | Display all effect chains |
| `tweak_effect` | Modify params on existing effect |

**Send/return routing tools (shared buses):**

**Agent guidance:** Prefer `add_send` + `route` for reverb and delay. Sends share one effect across multiple instruments and mix cleanly. Use `add_effect` inserts only when you need a unique effect on a single voice (e.g., filter on just the hats).

| Tool | Description |
|------|-------------|
| `add_send` | Create a send bus with effect (reverb, delay, eq, filter) |
| `remove_send` | Remove a send bus and all routes to it |
| `list_sends` | List all send buses |
| `route` | Route a track to a send at a level (0-1) |
| `unroute` | Remove a route from track to send |
| `show_routing` | Show full routing config (tracks, sends, routes) |

**Track management tools:**

| Tool | Description |
|------|-------------|
| `add_track` | Add a track (auto-created for instruments) |
| `remove_track` | Remove a track |
| `list_tracks` | List all tracks |
| `set_track_volume` | Set track volume in dB |
| `mute_track` | Mute/unmute a track |
| `solo_track` | Solo a track (mutes others) |

### Send/Return Routing (Shared Effect Buses)

Send/return is the standard DAW workflow for sharing effects across multiple instruments. Instead of adding reverb to each instrument individually, create one shared reverb bus and route instruments to it at different levels.

**Example: Shared reverb bus**
```
add_send({ id: 'verb', effect: 'reverb', decay: 3, size: 60 })
route({ track: 'jb01', send: 'verb', level: 0.3 })     # Drums get 30% reverb
route({ track: 'jb202', send: 'verb', level: 0.2 })     # Bass gets 20% reverb
route({ track: 'jt10', send: 'verb', level: 0.5 })      # Lead gets 50% reverb
```

**Example: Shared delay bus**
```
add_send({ id: 'dly', effect: 'delay', mode: 'pingpong', time: 375, feedback: 50 })
route({ track: 'jb01', send: 'dly', level: 0.15 })
route({ track: 'jt30', send: 'dly', level: 0.25 })
```

**How it works:**
1. Send buses are 100% wet — the route level controls how much dry signal goes to the bus
2. Tracks are auto-initialized from active instruments when routing is first used
3. The processed wet signal is mixed back into the master output
4. Use `show_routing` to see the full signal flow

## Mixer (DAW-like Routing)

Jambot includes a virtual mixer for professional mixing:

### Channel EQ
```
add_channel_insert(channel: 'jb202', effect: 'eq', preset: 'acidBass')
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
add_channel_insert(channel: 'jb202', effect: 'filter', preset: 'dubDelay')
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
add_sidechain(target: 'jb202', trigger: 'kick', amount: 0.5)
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
show_scope()               // Oscilloscope PNG — time-domain waveform
```

**Resonance detection** identifies acid squelch — prominent filter resonance peaks above the average spectrum. Returns peak frequencies with their musical note names and prominence in dB.

**Mud detection** analyzes narrow bands in the 200-600Hz range to find frequency buildup that makes mixes sound muddy. Returns which frequencies need cutting.

**Spectral flux** measures how much the spectrum changes over time. High flux = active filter sweeps, low flux = static sound.

### Node Output Levels (Mixer)

Each instrument has a node-level output gain for balancing the mix:

```
tweak({ path: 'jb01.level', value: -3 })     // JB01 down 3dB
tweak({ path: 'jb202.level', value: -6 })    // JB202 down 6dB
tweak({ path: 'jbs.level', value: 0 })       // JB-S at unity
```

Use `show_mixer` to see current output levels:
```
OUTPUT LEVELS:
  jb01: 0dB  jb202: -3dB  jbs: +2dB
```

Note: For multi-voice instruments (jb01, jbs), this is separate from per-voice levels (`jb01.kick.level`, `jbs.s1.level`). For single-voice instruments (jb202), this IS the voice level.

### Signal Flow
```
voice → [voice level] → [channel EQ/Filter] → [ducker] → node level → [effect chain] → master → [master chain] → output
```

## Effect Chains (Flexible Routing)

Add effects to any instrument, voice, or master in any order. Effect chains provide delay, EQ, filter, reverb, and sidechain.

### Targets
- **Instrument**: `jb01`, `jb202`, `jbs` — affects entire instrument
- **Voice**: `jb01.ch`, `jb01.kick`, `jb01.snare` — affects single voice (JB01 supported)
- **Master**: `master` — affects final mix

### Adding Effects
```
add_effect({ target: 'jb01.ch', effect: 'delay', mode: 'pingpong', feedback: 50, mix: 30 })
add_effect({ target: 'jb202', effect: 'delay', mode: 'analog', time: 500 })
add_effect({ target: 'jb202', effect: 'reverb', decay: 2, mix: 30, size: 50 })
add_effect({ target: 'jb202', effect: 'eq', highpass: 30, lowGain: 2, midFreq: 800, midGain: 3 })
add_effect({ target: 'master', effect: 'eq', preset: 'master' })
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

### Reverb Parameters

| Param | Range | Default | Description |
|-------|-------|---------|-------------|
| decay | 0.1-10s | 2.0 | Reverb tail length |
| damping | 0-100 | 50 | High-frequency rolloff (0=bright, 100=dark) |
| predelay | 0-100ms | 10 | Gap before reverb onset |
| mix | 0-100 | 30 | Wet/dry balance |
| width | 0-100 | 100 | Stereo spread |
| lowcut | 20-500Hz | 80 | Remove mud from wet signal |
| highcut | 1000-20000Hz | 10000 | Tame harshness |
| size | 0-100 | 50 | Room size |

**Reverb presets** (use params directly): plate, room, hall, chamber, cathedral, ambient

### Tweaking Effects
```
tweak_effect({ target: 'jb01', effect: 'delay', feedback: 70, time: 250 })
tweak_effect({ target: 'jb202', effect: 'reverb', decay: 4, damping: 70 })
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
# jb01.ch: delay(pingpong) [feedback=50, mix=30]
# jb202: delay(analog) [time=500]
```

### Use Cases

**Dub-style hi-hats**: Add delay to JUST the closed hats
```
add_effect({ target: 'jb01.ch', effect: 'delay', mode: 'analog', time: 375, feedback: 60, mix: 25 })
```

**Acid bass with ping-pong**: Bouncing echoes on the synth
```
add_effect({ target: 'jb202', effect: 'delay', mode: 'pingpong', time: 250, feedback: 40, mix: 20 })
```

**Hall reverb on snare**: Big snare with long tail
```
add_effect({ target: 'jb01.snare', effect: 'reverb', decay: 3, mix: 35, size: 70, damping: 50 })
```

**Ambient pad reverb**: Long wash on master
```
add_effect({ target: 'master', effect: 'reverb', decay: 8, mix: 45, size: 80, damping: 65, predelay: 40 })
```

## Automation (Per-Step Knob Mashing)

Automation sets per-step values for any parameter — 16 values that cycle with each bar. Like turning a knob differently on every step. Works on any instrument that supports it (JB01, JB202, JT30, JT90, JP9000).

### Tools

| Tool | Description |
|------|-------------|
| `automate` | Set per-step automation values for a parameter |
| `clear_automation` | Clear automation for a parameter, instrument, or all |
| `show_automation` | Show all active automation lanes |

### Path Format

Same as `tweak` paths but with the instrument prefix: `{instrument}.{voice}.{param}`

```
automate({ path: 'jb01.ch.decay', ... })     # JB01 closed hat decay
automate({ path: 'jt90.kick.decay', ... })    # JT90 kick decay
automate({ path: 'jb202.filterCutoff', ... }) # JB202 filter cutoff
```

### Two Ways to Set Values

**1. Direct values** — provide an array of 16 producer-unit values (nulls keep the static value):
```
automate({ path: 'jb01.ch.decay', values: [80, 70, 60, 50, 40, 30, 20, 10, 80, 70, 60, 50, 40, 30, 20, 10] })
```

**2. Generated patterns** — use `pattern`, `min`, `max`, and optional `steps`:
```
automate({ path: 'jt90.kick.decay', pattern: 'ramp', min: 10, max: 80 })
automate({ path: 'jb01.ch.decay', pattern: 'random', min: 15, max: 90 })
automate({ path: 'jb202.filterCutoff', pattern: 'sine', min: 400, max: 4000 })
```

**Available patterns:** `ramp` (saw up), `triangle`, `random`, `sine`, `square`

### Examples

**Jam the decay on JT90 closed hats** (random per-step):
```
automate({ path: 'jt90.ch.decay', pattern: 'random', min: 10, max: 80 })
```

**Sweep the JB202 filter** (smooth sine wave):
```
automate({ path: 'jb202.filterCutoff', pattern: 'sine', min: 200, max: 6000 })
```

**Dynamic JB01 kick attack** (ramp up over 16 steps):
```
automate({ path: 'jb01.kick.attack', pattern: 'ramp', min: 10, max: 90 })
```

**Clear automation**:
```
clear_automation({ path: 'jb01.ch.decay' })   # Clear one parameter
clear_automation({ path: 'jt90' })             # Clear all JT90 automation
clear_automation({})                            # Clear everything
```

**Show active automation**:
```
show_automation({})
# AUTOMATION:
#   jb01.ch.decay: ████████████████ (16/16 steps)
#   jt90.kick.attack: ██·██·██·██·██·██· (8/16 steps)
```

### Song Mode Integration

Automation is saved/loaded with patterns. Each pattern slot captures the automation state:
```
save_pattern({ instrument: 'jt90', name: 'A' })    # Saves pattern + params + automation
load_pattern({ instrument: 'jt90', name: 'A' })    # Restores everything
```

Arrangement mode uses each section's saved automation.

### Supported Instruments

| Instrument | Automation Paths | Example |
|------------|-----------------|---------|
| **JB01** | `jb01.{voice}.{param}` | `jb01.kick.decay`, `jb01.ch.level` |
| **JB202** | `jb202.{param}` | `jb202.filterCutoff`, `jb202.drive` |
| **JT30** | `jt30.{param}` | `jt30.cutoff`, `jt30.resonance` |
| **JT90** | `jt90.{voice}.{param}` | `jt90.kick.decay`, `jt90.snare.tone` |
| **JP9000** | `jp9000.{module}.{param}` | `jp9000.filter1.cutoff`, `jp9000.string1.decay` |

Values are in **producer units** (0-100, Hz, dB) — same units as `tweak`. The system converts to engine units at render time.

## Session State

```javascript
session = {
  bpm, swing, bars,
  // JB01 (drum machine)
  jb01Pattern: { kick: [...], snare: [...], ch: [...], oh: [...], ... },
  jb01Params: { kick: { decay, tune, level, ... }, snare: {...}, ... },
  // JB202 (modular bass synth)
  jb202Pattern: [{ note, gate, accent, slide }, ...],
  jb202Params: { osc1Waveform, filterCutoff, filterResonance, drive, level, ... },
  // JB-S (Sampler)
  jbsKit: { id, name, slots: [{ id, name, short, buffer }] },
  jbsPattern: { s1: [{step, vel}, ...], s2: [...], ... },
  jbsParams: { s1: { level, tune, attack, decay, filter, pan }, ... },
  // Mixer
  mixer: {
    effectChains: { 'jb01.ch': [{ id: 'delay1', type: 'delay', params: { mode: 'pingpong', mix: 0.3 } }] },
    channelInserts: { 'jb202': [{ type: 'ducker', params: { trigger: 'kick', amount: 0.5 } }] },
    masterInserts: [{ type: 'eq', preset: 'master' }],
    masterVolume: 0.8,
  },
  // Song Mode - patterns stored by instrument ID
  patterns: {
    jb01: { 'A': {...}, 'B': {...} },
    jb202: { 'A': {...}, 'B': {...} },
    jbs: { 'A': {...} },
  },
  currentPattern: { jb01: 'A', jb202: 'A', jbs: 'A' },
  arrangement: [
    { bars: 4, patterns: { jb01: 'A', jb202: 'A' } },
    { bars: 8, patterns: { jb01: 'B', jb202: 'A' } },
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
add_jb202({ pattern: [
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
add_jb202({ pattern: [...64 steps...], bars: 4 })
save_pattern({ instrument: 'jb202', name: 'A' })

// 3. Arrange using canonical instrument IDs
set_arrangement({
  sections: [
    { bars: 4, jb01: 'A', jb202: 'A' },   // Intro: drums loop 4x, bass plays once
    { bars: 8, jb01: 'B', jb202: 'A' },   // Main: drums loop 8x, bass loops 2x
    { bars: 4, jb01: 'A' },               // Breakdown (no bass)
    { bars: 8, jb01: 'B', jb202: 'A' },   // Main
  ]
})

// 4. Render full 24-bar song
render({ filename: 'full-track' })
```

### Pattern Contents

Each saved pattern captures the full state for that instrument:

- **jb01**: pattern, params
- **jb202**: pattern, params
- **jbs**: pattern, params

## Music Knowledge System

`library.json` (v2) contains unified music knowledge — 45 genres and 1 artist profile. When users mention a genre or artist, `core/library.js` auto-injects relevant production knowledge into the agent's context.

**How it works:**
1. `detectLibraryKeys(text)` scans user input for genre/artist keywords
2. `buildLibraryContext(keys)` formats the data for the system prompt
3. Agent receives: BPM range, keys, swing, drum/bass settings, production philosophy

**Structure:** `{ _meta, genres: { key: {...} }, artists: { key: {...} } }`

**Three genre tiers:**

| Tier | Count | What's included |
|------|-------|-----------------|
| **core** | 17 | Machine-readable drum/bass params, concise descriptions |
| **deep** | 16 | Core + modulation, mixing, reasoning, sources |
| **profile** | 12 | Prose-derived from research (no drum/bass params yet) |

**Core genres:** Classic House, Chicago House, Deep House, Tech House, Detroit Techno, Berlin Techno, Industrial Techno, Minimal, Acid House, Acid Techno, Electro, Breakbeat, Trance, Drum & Bass, Jungle, Ambient, IDM

**Deep genres:** Doomcore, Gabber, UK Funky, Footwork, Gqom, Kuduro, Afro House, Dub Techno, Microhouse, Psytrance, Reggaeton, UK Garage, Vaporwave, Witch House, Darksynth, Drill

**Profile genres:** Breakcore, Complextro, Drift Phonk, Future Garage, Gym Phonk, Jersey Club, Neurofunk, Pluggnb, Rawstyle, Sigilkore, Stutterhouse, Wave

**Artists:** Jeff Mills, Hannes Bieger

**Aliases:** "house" → classic_house, "techno" → berlin_techno, "acid" → acid_house, "phonk" → drift_phonk, "gabber" → gabber, etc.

**To add a genre:** Add entry to `library.json` under `genres` with tier, name, bpm, keys, description, production, and references. For core/deep tiers include drums and bass params. Then add aliases to `LIBRARY_ALIASES` in `core/library.js`.

**Source material:** `musical-knowledge/` contains the raw research files (genres.json, genres-deep.json, genres/*.md) that were merged into library.json.

### Hannes Bieger-Inspired Test Pack (for tool validation)

When validating new synths/modules with analysis tools, use these repeatable checks:

1. **Kick Tune Sweep**
   - Render same pattern at kick tune `-12, -6, 0, +6, +12`
   - Verify `get_spectral_peaks` tracks expected fundamental/harmonic shifts

2. **Kick Decay Sweep**
   - Render same pattern with decay `10` vs `90`
   - Verify `analyze_render` shows expected RMS/DR changes (long decay = higher RMS, lower DR)

3. **Mono Low-End Validation**
   - For tracks with bass modules/EQ available: keep low end mono below ~100Hz
   - Verify mud/resonance changes with `detect_mud`/`detect_resonance`

4. **Filtered-Kick Arrangement Tension**
   - Test bridges with high-passed kick rather than full mute
   - Verify movement and contrast with `measure_spectral_flux` and `show_spectrum`

5. **Reference Workflow**
   - Compare against reference tracks at matched loudness after major arrangement milestones
   - Cross-check lows on headphones for translation

Use this pack to catch analyzer regressions and to produce more mix-translation-ready defaults.

## Slash Commands

| Command | Description |
|---------|-------------|
| `/new` | New project |
| `/open` | Open project |
| `/recent` | Resume most recent project |
| `/projects` | List all projects (with timestamps) |
| `/mix` | Show mix overview |
| `/jb01` | JB01 drum machine guide (kochi.to/jb01) |
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

**Tool health tracking**: Keep current tool validation status in `TOOLING-STATUS.md` (in this `jambot/` folder). Update it whenever testing changes confidence in a tool area.

**Cutting a release**: See RELEASE-ENGINEERING.md.

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
