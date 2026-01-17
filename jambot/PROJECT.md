# Project: Jambot DAW Architecture Refactor

## Goal

Transform Jambot from a monolithic 3800-line file into a clean DAW-like architecture with proper abstractions for instruments, tracks, effects, and mixing — while keeping everything working throughout.

## Current State

**What works:**
- 4 instruments: R9D9 (909), R3D3 (303), R1D1 (101), R9DS (sampler)
- Per-voice parameter control with producer-friendly units
- Effects: reverb sends, channel inserts (EQ/filter), sidechain
- Song mode: patterns (A/B/C), arrangement with sections
- Automation lanes (per-step parameter changes)

**What's problematic:**
- `jambot.js` is 3803 lines, 143KB — one massive file
- 39 tool handlers in a single if/else chain
- Flat session state with instrument prefixes instead of hierarchy
- Render loop has 10+ responsibilities
- No consistent Instrument interface
- Each instrument handled with custom code paths

## Target Architecture

```
jambot/
├── core/
│   ├── session.js          # Session state management
│   ├── mixer.js            # Mixer, tracks, routing
│   ├── render.js           # Render pipeline
│   └── arrangement.js      # Song mode, patterns
├── instruments/
│   ├── instrument.js       # Base interface
│   ├── drums.js            # R9D9 wrapper
│   ├── bass.js             # R3D3 wrapper
│   ├── lead.js             # R1D1 wrapper
│   └── sampler.js          # R9DS wrapper
├── effects/
│   ├── effect.js           # Base interface
│   ├── reverb.js           # Plate reverb
│   ├── eq.js               # Parametric EQ
│   ├── filter.js           # LP/HP/BP filter
│   └── sidechain.js        # Ducker
├── tools/
│   ├── index.js            # Tool registry + dispatcher
│   ├── session-tools.js    # create_session, set_swing, etc.
│   ├── drum-tools.js       # add_drums, tweak_drums, automate_drums
│   ├── bass-tools.js       # add_bass, tweak_bass
│   ├── lead-tools.js       # add_lead, tweak_lead
│   ├── sampler-tools.js    # add_samples, tweak_samples, load_kit
│   ├── mixer-tools.js      # create_send, route_to_send, add_insert
│   ├── song-tools.js       # save_pattern, set_arrangement
│   └── render-tools.js     # render, analyze_render
├── params/                  # (already exists, keep as-is)
├── jambot.js               # Slim orchestrator: imports + agent loop only
├── ui.tsx                  # (already separate, keep as-is)
├── project.js              # (already separate, keep as-is)
└── analyze.js              # (already separate, keep as-is)
```

## Session State Target

```javascript
// FROM (flat with prefixes):
session.drumPattern
session.drumParams
session.drumAutomation
session.bassPattern
session.bassParams
// ... etc

// TO (proper hierarchy):
session = {
  bpm: 128,
  swing: 0,

  instruments: {
    drums: {
      pattern: {},
      params: {},
      automation: {},
      patternLength: 16,
      scale: '16th',
      // ... drum-specific
    },
    bass: {
      pattern: [],
      params: {},
    },
    lead: {
      pattern: [],
      params: {},
      arp: {},
    },
    sampler: {
      kit: null,
      pattern: {},
      params: {},
    },
  },

  mixer: {
    tracks: {
      drums: { inserts: [], sends: {}, volume: 0, mute: false },
      bass: { inserts: [], sends: {}, volume: 0, mute: false },
      // ...
    },
    sends: {
      reverb1: { effect: 'reverb', params: {} },
    },
    master: { inserts: [], volume: 0.8 },
  },

  song: {
    patterns: {
      drums: { A: {...}, B: {...} },
      bass: { A: {...} },
      // ...
    },
    arrangement: [],
  },
};
```

## Phases

### Phase 1: Extract Tool Handlers ✅ COMPLETE
**Risk: Low | Impact: High**

1. ✅ Created `tools/` directory
2. ✅ Created tool registry pattern with dynamic imports (avoids ES module circular deps)
3. ✅ Extracted 40 tools across 8 files:
   - ✅ Session tools (create_session, set_swing)
   - ✅ Drum tools (add_drums, tweak_drums, automate_drums, set_drum_groove, list/load_909_kits)
   - ✅ Bass tools (add_bass, tweak_bass)
   - ✅ Lead tools (add_lead, tweak_lead, list/load_101_presets)
   - ✅ Sampler tools (add_samples, tweak_samples, load_kit, list_kits, create_kit)
   - ✅ Mixer tools (create_send, route_to_send, tweak_reverb, add_channel_insert, etc.)
   - ✅ Song tools (save_pattern, load_pattern, set_arrangement, show_arrangement)
   - ✅ Render tools (render, analyze_render, project management)
4. ⏳ Wire up `jambot.js` to use new registry (old handlers still in place for now)

**Validation:** Tools load and execute correctly via `initializeTools()` + `executeTool()`

### Phase 2: Extract Render Pipeline
**Risk: Medium | Impact: High**

1. Create `core/render.js`
2. Extract `renderSession()` function
3. Break into sub-functions:
   - `buildArrangementPlan(session)`
   - `createAudioContext(duration, sampleRate)`
   - `instantiateInstruments(context, session)`
   - `setupMixer(context, instruments, session.mixer)`
   - `schedulePattern(context, instrument, pattern, startTime)`
   - `encodeWav(audioBuffer)`
4. Keep render logic identical, just reorganized

**Validation:** Render output is bit-identical before/after

### Phase 3: Create Instrument Interface + Generalize Bespoke Code
**Risk: Medium | Impact: High**

**Problem:** We have duplicated "bespoke" code that should be generic:

| Current (Bespoke) | Target (Generic) |
|-------------------|------------------|
| `automate_drums(voice, param, values)` | `automate(instrument, voice, param, values)` |
| `tweak_drums`, `tweak_bass`, `tweak_lead`, `tweak_samples` | `tweak(instrument, voice, params)` |
| Mute logic duplicated in each tweak function | Single mute mechanism via interface |
| Pattern save/load has 4 separate code paths | `instrument.serialize()` / `deserialize()` |
| Channel inserts hardcoded to channel names | Generic track routing |

**Solution:** Common Instrument interface that all synths implement:

1. Create `instruments/instrument.js` base class:
   ```javascript
   class Instrument {
     constructor(context, config) {}

     // Voice management
     getVoices() {}              // ['kick', 'snare'] or ['bass'] or ['s1', 's2']
     getVoice(id) {}             // Get single voice

     // Parameters (enables generic tweak/automate)
     getParameterDescriptors(voice) {}  // { decay: {min, max, unit}, ... }
     setParam(voice, param, value) {}
     getParam(voice, param) {}

     // Pattern (enables generic save/load)
     getPattern() {}
     setPattern(pattern) {}

     // Playback
     trigger(voice, time, velocity) {}

     // Serialization (enables generic pattern storage)
     serialize() {}              // Returns full state for pattern save
     deserialize(data) {}        // Restores from saved pattern
   }
   ```

2. Create wrappers for each instrument that implement interface:
   - `instruments/drums.js` — wraps TR909Engine
   - `instruments/bass.js` — wraps TB303Engine
   - `instruments/lead.js` — wraps SH101Engine
   - `instruments/sampler.js` — wraps sample voices

3. Replace bespoke tools with generic ones:
   ```javascript
   // Before: 4 separate tweak functions
   tweak_drums(input, session) { /* 80 lines */ }
   tweak_bass(input, session) { /* 60 lines */ }
   tweak_lead(input, session) { /* 70 lines */ }
   tweak_samples(input, session) { /* 50 lines */ }

   // After: 1 generic function
   tweak(input, session) {
     const instrument = session.instruments[input.instrument];
     for (const [param, value] of Object.entries(input.params)) {
       instrument.setParam(input.voice, param, value);
     }
   }
   ```

4. Generic automation that works on anything:
   ```javascript
   // Works for drums, bass, lead, sampler, even mixer params
   automate({ instrument: 'bass', voice: 'bass', param: 'cutoff', values: [...] })
   automate({ instrument: 'drums', voice: 'kick', param: 'decay', values: [...] })
   ```

5. Update render loop to use interface instead of ad-hoc code

**Validation:** All instruments behave identically, automation works on any instrument

### Phase 4: Restructure Session State
**Risk: High | Impact: High**

1. Create migration function: `migrateSessionV1toV2(oldSession)`
2. Update all tool handlers to use new paths
3. Update render loop to use new paths
4. Update project save/load to handle both formats
5. Deprecate old format after validation

**Validation:** Can load old projects, create new ones, everything works

### Phase 5: Extract Effects
**Risk: Low | Impact: Low**

1. Create `effects/` directory
2. Extract reverb IR generator to `effects/reverb.js`
3. Extract EQ creation to `effects/eq.js`
4. Extract filter creation to `effects/filter.js`
5. Create common Effect interface

**Validation:** Effects sound identical

## Constraints

- **No regressions**: Every phase must keep Jambot fully functional
- **Incremental**: Each change should be small enough to verify
- **No big-bang rewrites**: Extract, don't rewrite
- **Backward compatible**: Old projects must still load
- **Test as you go**: Manual render tests after each extraction

## Progress Log

### Session 1 (Jan 17, 2026)
- [x] Phase 1: Extract tool handlers — COMPLETE
  - Created tools/ directory with registry pattern
  - Extracted 40 tools into 8 category files (1,668 lines)
  - Fixed ES module circular dependency with dynamic imports
  - All tools tested and working
- [ ] Phase 1.5: Wire jambot.js to use new registry (pending)

---

## Notes

- The synth engines themselves (909, 303, 101) are already well-architected in `web/public/`
- `params/converters.js` is clean, keep as-is
- `ui.tsx` is separate, no changes needed
- Consider adding unit tests as we extract (but not blocking)
