# R2D2: Bass Monosynth Implementation

## Overview

R2D2 is a 2-oscillator bass monosynth that properly integrates with Jambot's modular architecture. It serves as the "golden path" proof that the plugin system works, demonstrating how new instruments can be added to the system.

## Architecture

```
OSC1 (saw/square/tri) ─┐
                       ├──► FILTER (24dB LP) ──► AMP ──► DRIVE ──► OUT
OSC2 (saw/square/tri) ─┘       ↑                  ↑
                               │                  │
                          FILTER ENV          AMP ENV
```

## Files Created

| File | Purpose |
|------|---------|
| `params/r2d2-params.json` | Parameter definitions with units, ranges, defaults |
| `instruments/r2d2-node.js` | InstrumentNode subclass - pattern storage, param access |
| `instruments/r2d2-engine.js` | Web Audio synth engine with `renderPattern()` for offline rendering |
| `tools/r2d2-tools.js` | Tool handlers: `add_r2d2`, `tweak_r2d2` |
| `instruments/bass-node.js` | Stub for BassNode (needed for session.js compatibility) |
| `instruments/lead-node.js` | Stub for LeadNode (needed for session.js compatibility) |

## Files Modified

| File | Changes |
|------|---------|
| `params/converters.js` | Added `R2D2_PARAMS` export, added to `SYNTH_PARAMS` map |
| `tools/index.js` | Added `import('./r2d2-tools.js')` in `initializeTools()` |
| `core/session.js` | Imported R2D2Node, registered with ParamSystem, added backward compat layer |
| `jambot.js` | Session state, tool schemas, render loop integration, reset in create_session |
| `tools/song-tools.js` | Added r2d2 to save_pattern, load_pattern, list_patterns, set_arrangement, show_arrangement |

## Key Integration Points

### 1. Session State (jambot.js:537-562)
```javascript
// R2D2 (bass monosynth)
r2d2Level: 0,            // Node output level in dB
r2d2Pattern: createEmptyR2D2Pattern(),
r2d2Params: { osc1Waveform, osc1Octave, filterCutoff, ... }
```

### 2. Tool Schemas (jambot.js:990-1052)
- `add_r2d2` - 16-step pattern with note, gate, accent, slide
- `tweak_r2d2` - All synth parameters with producer-friendly units

### 3. Render Loop (jambot.js:3055-3104)
- Creates R2D2Engine instance
- Applies params from session
- Calls `renderPattern()` for offline rendering
- Mixes into master via r2d2Gain node

### 4. Buffer Mixing (jambot.js:3687-3701)
- Pre-rendered R2D2 buffers mixed at correct positions
- Supports both single-pattern and arrangement modes

## Parameter Units (Producer-Friendly)

| Parameter | Unit | Range | Default |
|-----------|------|-------|---------|
| level | dB | -60 to +6 | 0 |
| osc1/2Waveform | choice | saw/square/tri | sawtooth |
| osc1/2Octave | semitones | -24 to +24 | 0, -12 |
| osc1/2Detune | 0-100 | -50 to +50 | 0, 7 |
| osc1/2Level | 0-100 | 0 to 100 | 100, 80 |
| filterCutoff | Hz | 20 to 16000 | 800 |
| filterResonance | 0-100 | 0 to 100 | 40 |
| filterEnvAmount | 0-100 | -100 to +100 | 60 |
| filter/amp ADSR | 0-100 | 0 to 100 | varies |
| drive | 0-100 | 0 to 100 | 20 |

## Usage Examples

```javascript
// Add a bass pattern
add_r2d2({
  pattern: [
    { note: 'C2', gate: true, accent: true },
    { note: 'C2', gate: false },
    { note: 'D#2', gate: true, slide: true },
    { note: 'G2', gate: true },
    // ... 16 steps total
  ]
})

// Tweak parameters
tweak_r2d2({
  filterCutoff: 1200,     // Hz - brighter
  filterResonance: 60,    // More resonant
  filterDecay: 25,        // Shorter pluck
  osc2Octave: -12,        // Sub bass
  drive: 40               // More grit
})

// Song mode
save_pattern({ instrument: 'r2d2', name: 'A' })
set_arrangement({
  sections: [
    { bars: 4, drums: 'A', r2d2: 'A' },
    { bars: 8, drums: 'B', r2d2: 'A', lead: 'A' }
  ]
})
```

## Engine Architecture (r2d2-engine.js)

The R2D2Engine class handles offline audio rendering:

1. **Oscillators**: Two oscillators with waveform, octave shift, detune, and level
2. **Filter**: Two cascaded biquad filters (24dB/oct lowpass) with Q control
3. **Filter Envelope**: ADSR modulating cutoff frequency
4. **Amp Envelope**: ADSR controlling amplitude
5. **Drive**: Soft clipping waveshaper with adjustable intensity
6. **Slide**: Portamento between notes when slide flag is set

Key method: `renderPattern({ bars, bpm })` returns a stereo AudioBuffer.

## What's NOT Implemented

- Real-time playback (engine is offline-only, like R1D1)
- Presets system (could be added like R1D1 presets)
- Per-step automation (could be added like R9D9 drum automation)
- LFO modulation (could be added for filter/pitch wobble)

## Testing

To verify the implementation works:
```bash
cd jambot
npm start
# Then: "add a techno bass line with r2d2 and render"
```

## Next Steps for Migration

R2D2 proves the plugin pattern works. To migrate existing instruments:

1. **R9D9 (drums)**: Already has DrumsNode - mostly migrated
2. **R3D3 (bass)**: Create full BassNode (stub exists), move TB303Engine integration
3. **R1D1 (lead)**: Create full LeadNode (stub exists), move SH101Engine integration
4. **R9DS (sampler)**: Already has SamplerNode - mostly migrated

The pattern is:
1. Create `params/<synth>-params.json`
2. Create `instruments/<synth>-node.js` extending InstrumentNode
3. Create `tools/<synth>-tools.js` with add/tweak handlers
4. Register in `tools/index.js`, update enums in `jambot.js`
5. Add to render loop in `jambot.js`
