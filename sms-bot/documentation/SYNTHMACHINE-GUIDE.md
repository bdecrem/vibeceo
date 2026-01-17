# SynthMachine Guide

Web Audio synthesizer libraries for creating electronic music programmatically.

## Source Code Locations (READ FIRST)

**All synth source is JavaScript in `web/public/*/dist/`.** Edit these files directly — no build step required.

| Instrument | Source Location |
|------------|-----------------|
| **TR-909** | `web/public/909/dist/*.js` |
| **TB-303** | `web/public/303/dist/*.js` |
| **SH-101** | `web/public/101/dist/*.js` |
| **R9-DS** | `web/public/90s/dist/*.js` |
| **Mixer** | `web/public/mixer/dist/*.js` |

- The `dist/` folders are misleadingly named — they contain **source code**, not compiled output.
- **UI frontends** are static HTML in `web/public/*/ui/` (not React/Next.js).
- `web/app/{909,303,101,90s}/` are just Next.js redirects to the static HTML — no synth logic lives there.
- The original TypeScript for TR-909 is archived in `synthmachine/_archived/` (deprecated, do not use).

---

## Audio Analysis Tool

Analyze rendered WAV files to check levels, frequency balance, and sidechain effectiveness.

**Requires:** `brew install sox` (already installed)

### Basic Usage

```bash
cd synthmachine
npx ts-node tools/analyze-track.ts path/to/track.wav
```

### Options

| Flag | Description |
|------|-------------|
| `--json` | Output only JSON (for programmatic use) |
| `--spectrogram` | Generate a spectrogram PNG |
| `--bpm 128` | Set BPM for sidechain detection (default: 128) |

### What It Reports

```json
{
  "peakLevel": -0.5,        // dB - headroom before clipping
  "rmsLevel": -14.2,        // dB - average loudness
  "dynamicRange": 13.7,     // dB - difference between peak and RMS
  "frequencyBalance": {
    "low": -18.5,           // 20-250 Hz (kick, bass)
    "lowMid": -20.1,        // 250-1000 Hz (bass harmonics, mud zone)
    "highMid": -24.3,       // 1-4 kHz (presence, vocals)
    "high": -32.0           // 4-20 kHz (air, hats, cymbals)
  },
  "sidechain": {
    "detected": true,       // Is sidechain ducking audible?
    "avgDuckingDb": 6.2,    // How much the signal ducks
    "duckingPattern": "quarter-notes",
    "confidence": 0.85
  }
}
```

### Interpreting Results

**Sidechain check:**
- `detected: false` or `avgDuckingDb < 3` → Sidechain too weak, increase ducker amount
- `avgDuckingDb > 10` → Sidechain too aggressive, sounds pumpy
- Sweet spot: 4-8 dB ducking

**Frequency balance for techno:**
- Low should be loudest (kick/bass dominate)
- Low-mid often needs cutting (mud zone)
- High-mid for presence without harshness
- High should be present but not dominant

**Dynamic range:**
- < 6 dB: Over-compressed, lifeless
- 8-14 dB: Good for electronic music
- > 16 dB: Very dynamic, might need limiting for streaming

---

## What's New (January 2026)

**Mixer module added.** You can now combine multiple synths (909 + 303 + 101) with professional effects and render to a single mixed WAV file.

**New capabilities:**
- **Sidechain ducking** — Make the kick cut through the bass
- **4-band EQ** — Clean up mud, add presence (`acidBass`, `crispHats`, `master` presets)
- **Resonant filter** — Lowpass/highpass/bandpass with resonance for sweeps and effects (`dubDelay`, `telephone`, `lofi` presets)
- **Plate reverb** — Dattorro-style algorithm with full parameter control (decay, damping, predelay, modulation, lowcut, highcut, width, mix)
- **Combined render** — `session.render({ bars: 8 })` outputs one mixed WAV

**Quick example:**
```javascript
import { Session } from '/mixer/dist/session.js';
import { TR909Engine } from '/909/dist/machines/tr909/engine.js';
import { TB303Engine } from '/303/dist/machines/tb303/engine.js';

const session = new Session({ bpm: 128 });
session.add('drums', new TR909Engine({ context: session.context }));
session.add('bass', new TB303Engine({ context: session.context }));

// Sidechain the bass to the kick
session.channel('bass').duck({
  trigger: session.channel('drums').getVoiceOutput('kick'),
  amount: 0.6
});

// EQ and reverb
session.channel('bass').eq({ preset: 'acidBass' });
await session.master.reverb({ decay: 2, damping: 0.5, mix: 0.15 });

// Render full mix
const { wav } = await session.render({ bars: 8 });
```

See [Mixer & Effects](#mixer--effects) section below for full documentation.

---

## Available Instruments

| Instrument | Type | Location | Detailed Docs |
|------------|------|----------|---------------|
| **TR-909** | Drum machine (synth) | `/909/` | [TR909-LIBRARY.md](/909/TR909-LIBRARY.md) |
| **R9-DS** | Drum machine (sampler) | `/90s/` | [README.md](/90s/README.md) |
| **TB-303** | Bass synthesizer | `/303/` | [TB303-LIBRARY.md](/303/TB303-LIBRARY.md) |
| **SH-101** | Lead synthesizer | `/101/` | [SH101-LIBRARY.md](/101/SH101-LIBRARY.md) |
| **Mixer** | Session + Effects | `/mixer/` | [README.md](/mixer/README.md) |

## Quick Start

### TR-909 Drum Machine

```javascript
import { TR909Controller } from '/909/dist/api/index.js';

const drums = new TR909Controller();

// Load a preset
drums.setPattern(presetPattern);
drums.setBpm(128);

// Play
drums.play();
drums.stop();

// Render to WAV
const { wav } = await drums.exportCurrentPatternToWav({ bars: 2 });
```

**TR-909 Pattern Structure:**
```javascript
{
  kick: [{ velocity: 1 }, { velocity: 0 }, ...],   // 16 steps
  snare: [{ velocity: 0 }, { velocity: 0 }, ...],
  clap: [...],
  ch: [...],      // closed hihat (NOT hihatClosed)
  oh: [...],      // open hihat (NOT hihatOpen)
  // other voices: rimshot, ltom, mtom, htom, crash, ride
}
```

**TR-909 Voice IDs (use these exact names in patterns):**
| Voice | ID | Notes |
|-------|-----|-------|
| Kick | `kick` | |
| Snare | `snare` | |
| Clap | `clap` | |
| Rimshot | `rimshot` | |
| Low Tom | `ltom` | |
| Mid Tom | `mtom` | |
| High Tom | `htom` | |
| Closed Hat | `ch` | NOT hihatClosed |
| Open Hat | `oh` | NOT hihatOpen |
| Crash | `crash` | |
| Ride | `ride` | |

### R9-DS Sample Drum Machine

A sample-based drum machine with loadable kits. Unlike TR-909 (which synthesizes sounds), R9-DS plays WAV samples.

```javascript
import { R9DSController } from '/90s/dist/api/index.js';

const sampler = new R9DSController();

// Load a kit (808, acoustic, lofi, or custom)
await sampler.loadKit('808');

// Set voice parameters
sampler.setVoiceParameter('s1', 'filter', 0.5);  // darken the kick
sampler.setVoiceParameter('s1', 'tune', -2);     // pitch down 2 semitones

// Load pattern and play
sampler.setPattern(pattern);
sampler.setBpm(120);
sampler.play();

// Render to WAV
const { wav } = await sampler.exportCurrentPatternToWav({ bars: 2 });
```

**R9-DS Pattern Structure:**
```javascript
{
  s1: [{ velocity: 0.8 }, { velocity: 0 }, ...],   // 16 steps (kick)
  s2: [{ velocity: 0 }, { velocity: 1.0 }, ...],   // snare
  s3: [...],  // clap
  // voices: s1-s10 (Kick, Snare, Clap, CH, OH, TL, TM, Crash, Ride, Cowbell)
}
```

**R9-DS Voice IDs:**
| Slot | ID | Default (808 Kit) |
|------|-----|-------------------|
| 1 | `s1` | Kick |
| 2 | `s2` | Snare |
| 3 | `s3` | Clap |
| 4 | `s4` | Closed Hat |
| 5 | `s5` | Open Hat |
| 6 | `s6` | Tom Low |
| 7 | `s7` | Tom Mid |
| 8 | `s8` | Crash |
| 9 | `s9` | Ride |
| 10 | `s10` | Cowbell |

**R9-DS Voice Parameters (per slot):**
| Parameter | Range | Description |
|-----------|-------|-------------|
| `level` | 0-1 | Volume |
| `tune` | -12 to +12 | Pitch (semitones) |
| `attack` | 0-1 | Fade-in time |
| `decay` | 0-1 | Sample length |
| `filter` | 0-1 | Lowpass cutoff |
| `pan` | -1 to +1 | Stereo position |

**Adding Custom Kits:**
See [/90s/README.md](/90s/README.md) for how to create and add custom sample kits.

### TB-303 Bass Synthesizer

```javascript
import { TB303Controller, renderPresetToWav } from '/303/dist/api/index.js';

// Quick render
const { wav } = await renderPresetToWav('acidLine1', { bars: 2 });

// Or use controller
const bass = new TB303Controller();
bass.loadPreset('phuture');
bass.play();
```

**TB-303 Pattern Structure:**
```javascript
[
  { note: 'C2', gate: true, accent: true, slide: false },
  { note: 'C2', gate: false, accent: false, slide: false },
  // ... 16 steps total
]
```

See [TB303-LIBRARY.md](/303/TB303-LIBRARY.md) for full documentation.

---

## Using Both Together (Multi-Track)

To play TR-909 and TB-303 in sync, share the same `AudioContext`:

```javascript
import { TR909Engine } from '/909/dist/machines/tr909/engine.js';
import { TB303Engine } from '/303/dist/machines/tb303/engine.js';

// 1. Create ONE shared AudioContext
const audioContext = new AudioContext();

// 2. Pass to both engines
const drums = new TR909Engine({ context: audioContext });
const bass = new TB303Engine({ context: audioContext });

// 3. Set same BPM
const bpm = 130;
drums.setBpm(bpm);
bass.setBpm(bpm);

// 4. Load patterns
drums.setPattern('main', {
  kick: [{ velocity: 1 }, { velocity: 0 }, { velocity: 0 }, { velocity: 0 },
         { velocity: 1 }, { velocity: 0 }, { velocity: 0 }, { velocity: 0 },
         { velocity: 1 }, { velocity: 0 }, { velocity: 0 }, { velocity: 0 },
         { velocity: 1 }, { velocity: 0 }, { velocity: 0 }, { velocity: 0 }],
  hihatClosed: [{ velocity: 0.7 }, { velocity: 0 }, { velocity: 0.7 }, { velocity: 0 },
                { velocity: 0.7 }, { velocity: 0 }, { velocity: 0.7 }, { velocity: 0 },
                { velocity: 0.7 }, { velocity: 0 }, { velocity: 0.7 }, { velocity: 0 },
                { velocity: 0.7 }, { velocity: 0 }, { velocity: 0.7 }, { velocity: 0 }],
});

bass.setPattern([
  { note: 'C2', gate: true, accent: true, slide: false },
  { note: 'C2', gate: false, accent: false, slide: false },
  { note: 'C2', gate: true, accent: false, slide: false },
  { note: 'E2', gate: true, accent: false, slide: true },
  { note: 'G2', gate: true, accent: true, slide: false },
  { note: 'G2', gate: false, accent: false, slide: false },
  { note: 'A#2', gate: true, accent: false, slide: true },
  { note: 'C3', gate: true, accent: true, slide: false },
  { note: 'C2', gate: true, accent: false, slide: false },
  { note: 'C2', gate: false, accent: false, slide: false },
  { note: 'D#2', gate: true, accent: true, slide: false },
  { note: 'D#2', gate: true, accent: false, slide: true },
  { note: 'G2', gate: true, accent: false, slide: false },
  { note: 'G2', gate: false, accent: false, slide: false },
  { note: 'A#2', gate: true, accent: true, slide: true },
  { note: 'C3', gate: true, accent: false, slide: false },
]);

// 5. Start both together
async function play() {
  await audioContext.resume();
  drums.startSequencer();
  bass.startSequencer();
}

// 6. Stop both
function stop() {
  drums.stopSequencer();
  bass.stopSequencer();
}
```

### Why This Works

- **Shared AudioContext** = same audio clock = perfect sync
- **Web Audio auto-mixes** = both outputs combine automatically
- **No additional setup** = just share the context

---

## Mixer & Effects

For multi-track mixing with sidechain, EQ, reverb, and combined rendering to WAV.

### Quick Start with Session

```javascript
import { Session } from '/mixer/dist/session.js';
import { TR909Engine } from '/909/dist/machines/tr909/engine.js';
import { TB303Engine } from '/303/dist/machines/tb303/engine.js';

// Session manages shared context, BPM, and routing
const session = new Session({ bpm: 128 });

// Add instruments
const drums = new TR909Engine({ context: session.context });
const bass = new TB303Engine({ context: session.context });

session.add('drums', drums);
session.add('bass', bass);

// Sidechain: bass ducks when kick hits
const kickOutput = session.channel('drums').getVoiceOutput('kick');
session.channel('bass').duck({ trigger: kickOutput, amount: 0.6 });

// EQ on bass
session.channel('bass').eq({ preset: 'acidBass' });

// Master reverb (plate algorithm)
await session.master.reverb({ decay: 2, damping: 0.5, lowcut: 100, mix: 0.15 });

// Volume control
session.channel('drums').volume = 0.9;
session.channel('bass').volume = 0.75;

// Play live
await session.play();

// Or render to single WAV with manifest
const { buffer, wav, manifest } = await session.render({
  bars: 8,
  title: 'my-acid-track'
});
// manifest contains full recipe for remixing
```

### Available Effects

| Effect | Description | Parameters |
|--------|-------------|------------|
| **Ducker** | Sidechain gain ducking | `trigger`, `amount`, `release` |
| **EQ** | 4-band parametric | Presets: `acidBass`, `crispHats`, `warmPad`, `master` |
| **Filter** | Resonant filter (LP/HP/BP) | `mode`, `cutoff`, `resonance`. Presets: `dubDelay`, `telephone`, `lofi`, `darkRoom`, `airFilter`, `thinOut` |
| **Reverb** | Dattorro plate algorithm | `decay`, `damping`, `predelay`, `modulation`, `lowcut`, `highcut`, `width`, `mix` |

### Effect Examples

**Sidechain Ducking:**
```javascript
session.channel('bass').duck({
  trigger: session.channel('drums').getVoiceOutput('kick'),
  amount: 0.6,    // Duck 60%
  release: 150,   // 150ms release
});
```

**EQ with Preset:**
```javascript
session.channel('bass').eq({ preset: 'acidBass' });
// Or custom: eq({ highpass: 60, midGain: 3, midFreq: 800 })
```

**Resonant Filter:**
```javascript
// Preset - classic dub lowpass
session.channel('bass').filter({ preset: 'dubDelay' });

// Custom - lowpass sweep
session.channel('drums').filter({
  mode: 'lowpass',     // 'lowpass', 'highpass', or 'bandpass'
  cutoff: 2000,        // Frequency in Hz
  resonance: 40        // 0-100 (maps to Q 0.5-20)
});

// Telephone effect
session.channel('lead').filter({ preset: 'telephone' });
```

**Plate Reverb:**
```javascript
// Basic usage
await session.master.reverb({ mix: 0.15 });

// Full control
await session.master.reverb({
  decay: 2.5,       // Tail length in seconds (0.5-10)
  damping: 0.4,     // High-frequency rolloff (0=bright, 1=dark)
  predelay: 30,     // Gap before reverb in ms (0-100)
  modulation: 0.3,  // Pitch wobble for shimmer (0-1)
  lowcut: 100,      // Remove mud from tail (Hz)
  highcut: 8000,    // Tame harshness (Hz)
  width: 1,         // Stereo spread (0=mono, 1=full)
  mix: 0.2          // Wet/dry balance (0-1)
});
```

### Effect Presets Reference

**EQ Presets:**
| Preset | Description |
|--------|-------------|
| `acidBass` | Cuts <60Hz mud, +3dB at 800Hz bite, -2dB harsh highs |
| `crispHats` | Highpass 200Hz, +2dB presence at 5kHz |
| `warmPad` | Low-end warmth, smooth highs |
| `master` | Gentle 30Hz lowcut, +1dB air at 12kHz |

**Filter Presets:**
| Preset | Mode | Cutoff | Resonance | Use Case |
|--------|------|--------|-----------|----------|
| `dubDelay` | lowpass | 800Hz | 30 | Classic dub lowpass, warm and muffled |
| `telephone` | bandpass | 1500Hz | 50 | Radio/telephone effect |
| `lofi` | lowpass | 3000Hz | 10 | Lo-fi tape warmth |
| `darkRoom` | lowpass | 400Hz | 40 | Dark, muffled, distant |
| `airFilter` | highpass | 500Hz | 20 | Remove low rumble with character |
| `thinOut` | highpass | 1000Hz | 30 | Thin, distant sound |

**Ducker Presets:**
| Preset | Character |
|--------|-----------|
| `tight` | Fast attack/release, transparent |
| `pump` | Slower release, audible pumping |

**Reverb (Dattorro Plate Algorithm):**

| Parameter | Range | Description |
|-----------|-------|-------------|
| `decay` | 0.5-10s | Tail length. Short (1s) for drums, long (4s+) for pads |
| `damping` | 0-1 | High-frequency rolloff. 0=bright/shimmery, 1=dark/warm |
| `predelay` | 0-100ms | Gap before reverb starts. Adds clarity, separates dry from wet |
| `modulation` | 0-1 | Subtle pitch wobble. Adds movement and shimmer |
| `lowcut` | 20-500Hz | Remove low frequencies from tail. Keeps bass tight (use 100+) |
| `highcut` | 2000-20000Hz | Remove high frequencies. Tames harshness |
| `width` | 0-1 | Stereo spread. 0=mono, 1=full stereo |
| `mix` | 0-1 | Wet/dry balance for send output |

**Reverb Presets:**

| Preset | Description |
|--------|-------------|
| `plate` | Classic plate reverb - bright, dense |
| `room` | Small natural space |
| `hall` | Large concert hall |
| `tightDrums` | Short, punchy for drums |
| `lushPads` | Long, shimmery for synths |
| `darkDub` | Filtered, dubby tail |
| `brightPop` | Short, clear for vocals |
| `deepTechno` | Medium decay, filtered |

**Genre-specific settings (manual):**

| Style | Settings |
|-------|----------|
| **Tight drums** | decay=1, damping=0.6, predelay=10, lowcut=200 |
| **Lush pads** | decay=4, damping=0.3, modulation=0.5, width=1 |
| **Dark dub** | decay=3, damping=0.8, predelay=50, highcut=4000 |
| **Bright pop** | decay=1.5, damping=0.2, modulation=0.4 |
| **Deep techno** | decay=2.5, damping=0.5, lowcut=100, highcut=6000 |

---

## DAW Workflow (Creative Agent Reference)

**This is the primary workflow for creative sessions.** Use this to create tracks with per-step automation, effect modulation, and parameter jamming.

### The 5-Step Workflow

1. **Pick instruments** (909, 303, 101, sampler)
2. **Set patterns and sequences**
3. **Add per-note modulations** (jam the knobs)
4. **Apply effects** (EQ, reverb, HPF)
5. **Use EffectSend for step-based effect automation**

### Complete Example: Session 2 Style Track

```javascript
import { Session, EffectSend } from '/mixer/dist/session.js';
import { TR909Engine } from '/909/dist/machines/tr909/engine.js';
import { Effect } from '/mixer/dist/effects/base.js';

// === STEP 1: Create session and instruments ===
const bpm = 128;
const bars = 4;
const totalSteps = bars * 16;

// For offline rendering, create OfflineAudioContext directly
const stepDuration = 60 / bpm / 4;
const totalDuration = totalSteps * stepDuration + 1;
const sampleRate = 44100;
const offlineCtx = new OfflineAudioContext(2, totalDuration * sampleRate, sampleRate);

const drums = new TR909Engine({ context: offlineCtx });
const masterGain = offlineCtx.createGain();
masterGain.gain.value = 0.9;

// === STEP 2: Define patterns ===
const drumPattern = {
  kick: [
    { velocity: 1.0, accent: true }, { velocity: 0 }, { velocity: 0 }, { velocity: 0 },
    { velocity: 1.0 }, { velocity: 0 }, { velocity: 0 }, { velocity: 0 },
    { velocity: 1.0 }, { velocity: 0 }, { velocity: 0 }, { velocity: 0 },
    { velocity: 1.0 }, { velocity: 0 }, { velocity: 0 }, { velocity: 0 }
  ],
  ch: [
    { velocity: 0.8 }, { velocity: 0.7 }, { velocity: 0.7 }, { velocity: 0.7 },
    { velocity: 0.8 }, { velocity: 0.7 }, { velocity: 0.7 }, { velocity: 0.7 },
    { velocity: 0.8 }, { velocity: 0.7 }, { velocity: 0.7 }, { velocity: 0.7 },
    { velocity: 0.8 }, { velocity: 0.7 }, { velocity: 0.7 }, { velocity: 0.7 }
  ]
};

// === STEP 3: Add per-note modulations (jam the knobs) ===
const kick = drums.voices.get('kick');
kick.decay = 0.45;  // Set base decay

const ch = drums.voices.get('ch');
ch.decay = 0.15;  // Short crisp hats

// For dynamic per-note modulation, change parameters before each trigger:
// kick.decay = 0.3 + Math.random() * 0.3;  // Random decay variation
// This creates the "knob jamming" effect

// === STEP 4: Create custom effects ===
// Example: 2-stage HPF for dramatic filtering
class HPFEffect extends Effect {
  constructor(context, frequency = 400) {
    super(context);
    // Two cascaded HPFs for 24dB/octave rolloff
    this._hpf1 = context.createBiquadFilter();
    this._hpf1.type = 'highpass';
    this._hpf1.frequency.value = frequency;
    this._hpf1.Q.value = 0.7;

    this._hpf2 = context.createBiquadFilter();
    this._hpf2.type = 'highpass';
    this._hpf2.frequency.value = frequency;
    this._hpf2.Q.value = 0.7;

    // Wire: input → HPF1 → HPF2 → output
    this._input.connect(this._hpf1);
    this._hpf1.connect(this._hpf2);
    this._hpf2.connect(this._output);
  }
}

// === STEP 5: Use EffectSend for step-based automation ===
const hpfEffect = new HPFEffect(offlineCtx, 400);  // 400Hz cuts sub-bass
const kickHPF = new EffectSend(offlineCtx, {
  effect: hpfEffect,
  defaultWet: 0,      // Start dry
  fadeTime: 0.002     // 2ms crossfade (click-free)
});

// Create automation pattern: bar 1 DRY, bar 2 WET (filtered), bar 3 DRY, bar 4 WET
const hpfPattern = [];
for (let bar = 0; bar < bars; bar++) {
  const isWet = bar % 2 === 1;  // Odd bars = HPF on
  for (let step = 0; step < 16; step++) {
    hpfPattern.push(isWet ? 1 : 0);
  }
}
kickHPF.setAutomationPattern(hpfPattern);

// CRITICAL: Schedule automation BEFORE rendering
kickHPF.scheduleAutomation(bpm, bars, 16, 0);

// === ROUTING ===
// Connect voices without HPF to master
drums.voices.forEach((voice, id) => {
  if (id !== 'kick') voice.connect(masterGain);
});

// Connect kick through HPF effect send
kick.output.connect(kickHPF.input);
kickHPF.output.connect(masterGain);
masterGain.connect(offlineCtx.destination);

// === SCHEDULE HITS ===
for (let i = 0; i < totalSteps; i++) {
  const time = i * stepDuration;
  const stepInBar = i % 16;

  if (drumPattern.kick[stepInBar].velocity > 0) {
    kick.trigger(time, drumPattern.kick[stepInBar].velocity);
  }
  if (drumPattern.ch[stepInBar].velocity > 0) {
    ch.trigger(time, drumPattern.ch[stepInBar].velocity);
  }
}

// === RENDER ===
const buffer = await offlineCtx.startRendering();
// buffer now contains the mixed audio with effect automation
```

### EffectSend Class Reference

**Location:** `/mixer/dist/effect-send.js`

**What it does:** Wraps any Effect with parallel dry/wet routing and step-based automation. Never disconnects nodes—uses gain crossfading for glitch-free transitions.

```javascript
import { EffectSend } from '/mixer/dist/session.js';

// Create
const send = new EffectSend(context, {
  effect: myEffect,    // Any Effect instance
  defaultWet: 0,       // 0 = dry, 1 = wet (default: 0)
  fadeTime: 0.005      // Crossfade time in seconds (default: 5ms)
});

// Set automation pattern (array of wet levels per step)
// 0 = fully dry, 1 = fully wet, 0.5 = 50/50 mix
send.setAutomationPattern([0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1]);

// Schedule automation for offline rendering
// MUST be called BEFORE offlineCtx.startRendering()
send.scheduleAutomation(bpm, bars, stepsPerBar, startTime);

// Clear all automation
send.clearAutomation();

// Access nodes for routing
send.input   // Connect source here
send.output  // Connect to destination
```

**Routing diagram:**
```
Source
   ↓
[EffectSend.input]
   ├── dryGain ────────────────┐
   │                           ↓
   └── Effect → wetGain ───→ output → Destination
```

### Per-Note Parameter Modulation

To "jam the knobs" (change parameters dynamically per note), modify voice parameters before triggering:

```javascript
const kick = drums.voices.get('kick');

for (let i = 0; i < totalSteps; i++) {
  const time = i * stepDuration;
  const stepInBar = i % 16;

  if (drumPattern.kick[stepInBar].velocity > 0) {
    // Modulate decay per note (example: random variation)
    kick.decay = 0.3 + Math.random() * 0.3;

    // Or use a pattern-based modulation
    const decayPattern = [0.5, 0.4, 0.35, 0.3, 0.5, 0.4, 0.35, 0.3,
                          0.5, 0.4, 0.35, 0.3, 0.5, 0.4, 0.35, 0.3];
    kick.decay = decayPattern[stepInBar];

    kick.trigger(time, drumPattern.kick[stepInBar].velocity);
  }
}
```

**Common modulatable parameters:**

| Voice | Parameter | Range | Effect |
|-------|-----------|-------|--------|
| kick | `decay` | 0.1-0.8 | Short punch to deep boom |
| ch | `decay` | 0.05-0.3 | Tight tick to open hat feel |
| snare | `tone` | 0-1 | Bright to dark |
| 303 | `cutoff` | 0-1 | Filter sweep |
| 303 | `resonance` | 0-1 | Acid squelch amount |

### Creating Custom Effects

Extend the `Effect` base class:

```javascript
import { Effect } from '/mixer/dist/effects/base.js';

class MyCustomEffect extends Effect {
  constructor(context, options = {}) {
    super(context);

    // Create your processing nodes
    this._filter = context.createBiquadFilter();
    this._filter.type = 'lowpass';
    this._filter.frequency.value = options.cutoff || 1000;

    // Wire: _input → processing → _output
    this._input.connect(this._filter);
    this._filter.connect(this._output);
  }

  // Optional: expose parameters
  set cutoff(value) {
    this._filter.frequency.value = value;
  }
}
```

### Effect Automation Patterns

**Alternating bars (tension/release):**
```javascript
const pattern = [];
for (let bar = 0; bar < 8; bar++) {
  const isWet = bar % 2 === 1;
  for (let step = 0; step < 16; step++) {
    pattern.push(isWet ? 1 : 0);
  }
}
```

**Build-up (gradual increase):**
```javascript
const pattern = [];
for (let step = 0; step < 64; step++) {
  pattern.push(step / 64);  // 0 → 1 over 4 bars
}
```

**Drop pattern (wet → sudden dry):**
```javascript
const pattern = [
  ...Array(48).fill(1),  // 3 bars wet (filtered)
  ...Array(16).fill(0),  // 1 bar dry (full kick hits)
];
```

**Per-beat automation:**
```javascript
// HPF on beats 2 and 4 only
const pattern = [];
for (let bar = 0; bar < 4; bar++) {
  pattern.push(0, 0, 0, 0);  // Beat 1: dry
  pattern.push(1, 1, 1, 1);  // Beat 2: wet
  pattern.push(0, 0, 0, 0);  // Beat 3: dry
  pattern.push(1, 1, 1, 1);  // Beat 4: wet
}
```

### Critical Implementation Notes

1. **Never disconnect nodes** — Use gain crossfading, not connect/disconnect
2. **Schedule BEFORE startRendering()** — Web Audio automation must be scheduled before offline render begins
3. **Use setValueAtTime() before ramps** — Web Audio requires an explicit start point before any ramp
4. **Short fade times** — 2-5ms prevents clicks without audible latency
5. **Match sample rates** — Use `buffer.sampleRate` for playback context

---

## Remix & Sharing Features

### Track Manifest

When rendering with `Session.render()`, you get a manifest with the full track recipe:

```javascript
const { buffer, wav, manifest } = await session.render({
  bars: 4,
  title: 'acid-techno-jam'
});
```

**Manifest structure:**
```json
{
  "format": "synthmachine-track",
  "version": 1,
  "title": "acid-techno-jam",
  "createdAt": "2026-01-08T12:34:56.789Z",
  "bpm": 128,
  "bars": 4,
  "duration": 7.5,
  "instruments": {
    "drums": {
      "type": "909",
      "volume": 0.8,
      "pattern": { "kick": [...], "snare": [...] },
      "parameters": {}
    },
    "bass": {
      "type": "303",
      "volume": 0.6,
      "pattern": [{ "note": "C2", "accent": true, "slide": false }, ...],
      "parameters": { "cutoff": 0.4, "resonance": 0.7, "waveform": "sawtooth" }
    }
  },
  "effects": {
    "bass": [{ "type": "ducker", "amount": 0.6 }]
  },
  "master": { "volume": 1.0, "effects": [] },
  "files": { "mix": "acid-techno-jam.wav" }
}
```

### Pattern Export/Import (Individual Synths)

Each synth UI can export/import patterns as JSON files:

- **Export Pattern** — Saves current pattern + parameters to `.json`
- **Load Pattern** — Import a previously saved pattern

Pattern formats:
- `synthmachine-909` — TR-909 drum patterns
- `synthmachine-303` — TB-303 bass patterns
- `synthmachine-101` — SH-101 synth patterns

### Remix Links (URL Parameters)

Each synth UI supports URL parameters for direct pattern loading:

```
kochi.to/909/?load=https://example.com/my-drums.json
kochi.to/303/?load=https://example.com/acid-line.json
kochi.to/101/?load=https://example.com/lead-patch.json
```

**Supported URL params:**

| Param | Description | Example |
|-------|-------------|---------|
| `load` | URL to pattern JSON file | `?load=https://kochi.to/patterns/acid.json` |
| `preset` | Built-in preset ID | `?preset=phuture` |

**Example workflow:**
1. Amber creates a track with `session.render()`
2. Save individual instrument patterns as JSON files
3. Tweet: "Check out this acid line! kochi.to/303/?load=..."
4. Users load directly into synth UI and can tweak/remix

---

## Available Presets

### TR-909 Presets

| ID | Name | BPM | Style |
|----|------|-----|-------|
| `techno-basic` | Techno Basic | 128 | Four-on-floor |
| `house-groove` | House Groove | 124 | Classic house |
| `breakbeat` | Breakbeat | 130 | Syncopated |

### TB-303 Presets

| ID | Name | BPM | Style |
|----|------|-----|-------|
| `acidLine1` | Acid Line 1 | 130 | Classic ascending |
| `phuture` | Phuture | 125 | Minimal, hypnotic |
| `squelch` | Squelch | 140 | Fast, aggressive |
| `darkAcid` | Dark Acid | 128 | Minor key, square |
| `rolling` | Rolling | 135 | Hardfloor-style |
| `hypnotic` | Hypnotic | 118 | Slower, spacious |
| `punchy` | Punchy | 145 | Aggressive, fast |

---

## Synth Parameters

### TB-303 Parameters (0-1 range)

| Parameter | Description | Acid Sweet Spot |
|-----------|-------------|-----------------|
| `cutoff` | Filter frequency | 0.2 - 0.4 |
| `resonance` | Filter resonance | 0.5 - 0.8 |
| `envMod` | Envelope to filter | 0.6 - 0.9 |
| `decay` | Envelope decay | 0.3 - 0.5 |
| `accent` | Accent intensity | 0.7 - 0.9 |

```javascript
bass.setParameter('cutoff', 0.3);
bass.setParameter('resonance', 0.75);
bass.setWaveform('sawtooth');  // or 'square'
bass.setEngine('E1');  // 'E1' (simple) or 'E2' (authentic diode ladder)
```

### TR-909 Voice Parameters

Each drum voice has tuning and character parameters accessible via:

```javascript
drums.setVoiceParameter('kick', 'tune', 0.5);
drums.setVoiceParameter('snare', 'tone', 0.6);
```

---

## Live Demos

- **TR-909**: [/909/](/909/) — Synthesized drum machine
- **R9-DS**: [/90s/](/90s/) — Sample-based drum machine (Crimson Edition)
- **TB-303**: [/303/](/303/) — Acid bass synthesizer
- **SH-101**: [/101/](/101/) — Lead synthesizer

---

## File Locations

```
web/public/
├── 909/
│   ├── dist/
│   │   ├── api/index.js          # TR909Controller
│   │   └── machines/tr909/
│   │       ├── engine.js         # TR909Engine
│   │       └── presets.js        # Preset patterns
│   └── ui/tr909/index.html       # Interactive UI
│
├── 90s/
│   ├── dist/
│   │   ├── api/index.js          # R9DSController, renderR9DSPatternToWav
│   │   └── sampler/
│   │       ├── engine.js         # R9DSEngine
│   │       ├── sample-voice.js   # SampleVoice class
│   │       └── kit-loader.js     # Kit loading system
│   ├── kits/
│   │   ├── index.json            # Kit manifest (add new kits here)
│   │   ├── 808/                  # 808 sample kit
│   │   ├── acoustic/             # Acoustic kit
│   │   └── lofi/                 # Lo-Fi kit
│   ├── ui/r9ds/index.html        # Interactive UI (Crimson Edition)
│   └── README.md                 # Full documentation + kit creation guide
│
├── 303/
│   ├── dist/
│   │   ├── api/index.js          # TB303Controller, renderPresetToWav
│   │   └── machines/tb303/
│   │       ├── engine.js         # TB303Engine
│   │       └── presets.js        # Preset patterns
│   ├── ui/tb303/index.html       # Interactive UI
│   └── TB303-LIBRARY.md          # Detailed documentation
│
├── 101/
│   ├── dist/
│   │   ├── api/index.js          # SH101Controller
│   │   └── machines/sh101/
│   │       ├── engine.js         # SH101Engine
│   │       └── presets.js        # Preset sounds
│   ├── ui/sh101/index.html       # Interactive UI
│   └── SH101-LIBRARY.md          # Detailed documentation
│
└── mixer/
    ├── dist/
    │   ├── session.js            # Session class (includes EffectSend export)
    │   ├── effect-send.js        # Step-based effect automation
    │   ├── send-bus.js           # Parallel send bus routing
    │   ├── voice-channel.js      # Per-voice routing and inserts
    │   └── effects/
    │       ├── base.js           # Effect base class
    │       ├── ducker.js         # Sidechain ducking
    │       ├── eq.js             # 4-band EQ
    │       └── reverb.js         # Dattorro plate reverb
    └── README.md                 # Mixer documentation
```
