# Jambot Comprehensive Code Review

**Date:** 2026-01-18
**Agent:** Claude Opus 4.5
**Codebase Size:** 6,445+ LoC across core files

---

## Executive Summary

Jambot is a modular music production AI system with **4256 lines in jambot.js** plus extensive supporting infrastructure. The architecture has both **strengths** (clear separation of concerns, producer-friendly units, good plugin model) and **significant pain points** (dual session systems, incomplete node implementations, large monolithic render function).

---

## 1. Architecture Overview

### System Design

Jambot implements a **plugin-based synth/effect system** where:
- **Instruments** (R9D9, R3D3, R1D1, R9DS, R2D2) expose parameters via standard interface
- **Tools** dispatch through a central registry and execute against session state
- **Rendering** converts session state to audio via Web Audio API
- **Library system** injects genre/artist knowledge into AI prompts

### Main Entry Points

| File | Purpose | Lines |
|------|---------|-------|
| `jambot.js` | Core agent loop, session, rendering | 4256 |
| `tools/index.js` | Tool registry & dispatcher | 98 |
| `tools/*.js` | Per-domain tool handlers | 2189 |
| `core/session.js` | Dual session interface | 382 |
| `core/params.js` | Parameter registry and automation | 150+ |
| `core/node.js` | Base Node classes | 358 |

### Data Flow

```
Agent Input
    ↓
runAgentLoop() [jambot.js]
    ↓
Tool Selection (Anthropic API)
    ↓
executeTool() [tools/index.js]
    ↓
Handler [tools/*-tools.js]
    ↓
Session State Mutation
    ↓
renderSession() [jambot.js]
    ↓
Engine Initialization
    ↓
WAV Encoding → File Output
```

---

## 2. Session Management: Dual Systems (CRITICAL ISSUE)

### The Problem

Jambot has **two distinct session systems** that don't fully integrate:

#### System 1: Direct Properties (jambot.js, legacy)
```javascript
session = {
  drumPattern: {...},
  drumParams: {...},
  bassPattern: [...],
  bassParams: {...},
  // ... direct objects for each instrument
}
```

**Usage**: 74+ direct references in jambot.js

#### System 2: ParamSystem + Nodes (core/session.js, new)
```javascript
session = {
  params: ParamSystem,
  _nodes: {
    drums: DrumsNode,
    bass: BassNode,  // stub
    lead: LeadNode,  // stub
    sampler: SamplerNode,
    r2d2: R2D2Node,
  }
}

// Unified access:
session.get('drums.kick.decay')
session.set('drums.kick.decay', 50)
```

### Why This Is a Problem

1. **Duplication**: Same state tracked in two ways
2. **Incomplete Migration**: Tools write to legacy, render reads from legacy
3. **Inconsistent Tool Implementation**: No centralized path-based access
4. **Backward Compat Overhead**: 74+ lines of getter/setter proxies per instrument

### Node Implementation Status

| Node | Status | Notes |
|------|--------|-------|
| DrumsNode | ✅ 80% | Registers params, but render ignores it |
| BassNode | ❌ Stub | No param registration |
| LeadNode | ❌ Stub | No param registration |
| SamplerNode | ✅ 70% | Registers params |
| R2D2Node | ✅ 70% | Registers params |

---

## 3. Instrument System

### Five Synths: Implementation Quality

| Synth | Source | Node Quality | Param Conversion | Render Support |
|-------|--------|--------------|-----------------|----------------|
| R9D9 (drums) | web/909 | ✅ Complete | ✅ Full | ✅ Full |
| R3D3 (bass) | web/303 | ❌ Stub | ⚠️ Partial | ⚠️ Basic |
| R1D1 (lead) | web/101 | ❌ Stub | ⚠️ Partial | ✅ Full |
| R9DS (sampler) | Local | ✅ Good | ✅ Full | ✅ Full |
| R2D2 (monosynth) | Local | ✅ Good | ✅ Full | ✅ Full |

### R9D9 (TR-909 Drum Machine) - BEST IMPLEMENTED
- Full parameter registration
- 11 voices × ~6 params each
- Per-voice engine selection
- Automation support

### R3D3 (TB-303 Acid Bass) - NEEDS WORK
- BassNode is a 20-line stub
- All logic in jambot.js
- Render code doesn't convert producer units

### R1D1 (SH-101 Lead) - PARTIAL
- LeadNode is a stub
- Complex arrangement rendering works
- Missing preset loading integration

### R9DS (Sampler) - GOOD
- Full kit loading system
- Per-slot parameters
- User kit support

### R2D2 (Bass Monosynth) - GOOD
- Entire synth implemented locally
- Clean DRY code
- Full arrangement support

---

## 4. Tool System

### Architecture

- `registerTool(name, handler)` - Single tool registration
- `registerTools(tools)` - Batch register
- `executeTool(name, input, session, context)` - Dispatcher

### Tool Inventory (2189 lines across 13 files)

| Category | Tools | Status |
|----------|-------|--------|
| Session | create_session, list_projects, etc. | ✅ |
| Drums (R9D9) | add_drums, tweak_drums, etc. | ✅ |
| Bass (R3D3) | add_bass, tweak_bass | ⚠️ |
| Lead (R1D1) | add_lead, tweak_lead, etc. | ⚠️ |
| Sampler (R9DS) | add_samples, tweak_samples, etc. | ✅ |
| R2D2 | add_r2d2, tweak_r2d2 | ✅ |
| Mixer | create_send, route_to_send, etc. | ⚠️ |
| Song | save_pattern, set_arrangement, etc. | ✅ |
| Render | render, analyze_render | ✅ |

### Issues

- **Bass/Lead**: Don't use param converters
- **Mixer**: Complex send/insert logic duplicated, no validation
- **Inconsistent Access**: Tools write to `session.drumParams[voice]` instead of unified path

---

## 5. Render Pipeline

### Architecture

**Single function**: `renderSession()` (1500+ lines in jambot.js)

### Code Quality Issues

#### DUPLICATION: R1D1 and R2D2 Arrangement Handling
Lines 3025-3120 have nearly identical code:
```javascript
// R1D1
const leadSections = [];
for (const section of arrangementPlan) {
  // ... collect sections ...
}

// R2D2 - IDENTICAL PATTERN
const r2d2Sections = [];
for (const section of arrangementPlan) {
  // ... same code ...
}
```

**Solution**: Extract to `renderInstrumentSections()` helper

#### MISSING: Bass (R3D3) Render
- Engine created but pattern never rendered
- No gatetime handling

#### PERFORMANCE: Step Index Recalculation
```javascript
for (let i = 0; i < totalSamples; i++) {
  const stepIndex = Math.floor((i / sampleRate) * (bpm / 60) * 4) % 16;
  // Called for every sample!
}
```

Should pre-compute step boundaries.

---

## 6. Parameter System

### Design: Producer-Friendly Units

| Unit | Range | Example |
|------|-------|---------|
| dB | -60 to +6 | Volume, level |
| 0-100 | 0-100 | Decay, resonance |
| semitones | ±12/±24 | Pitch, tuning |
| Hz | Log scale | Filter frequency |
| pan | -100 to +100 | Stereo position |
| choice | Discrete | Waveform type |

### Conversion System (params/converters.js)

**Quality**: Excellent. Well-documented, handles all unit types.

### Issues

- Not all code uses converters consistently
- Bass/Lead store engine values directly
- Inconsistent validation

---

## 7. Code Quality Issues

### A. DUPLICATION

1. **Drum Voice Lists** - Defined in 3 places
2. **Empty Pattern Helpers** - Identical functions for bass/lead/r2d2
3. **Arrangement Section Rendering** - R1D1 and R2D2 identical
4. **Parameter Proxy Pattern** - Same proxy logic repeated 4 times

### B. INCONSISTENCIES

1. **Parameter Access Patterns**
   - drums: `session.drumParams[voice].level`
   - bass: `session.bassParams.cutoff`
   - Should be: `session.set('drums.kick.level', value)`

2. **Unit Handling**
   - Drums: Convert at tool time
   - Bass: Store engine units directly
   - Should be: Consistent policy everywhere

### C. INCOMPLETE FEATURES

1. Bass (R3D3) render
2. Lead (R1D1) preset loading
3. Mixer effects in render (sidechain, inserts)
4. Automation for non-drum instruments

### D. MISSING ERROR HANDLING

- No arrangement validation
- No parameter bounds checking at tool level
- No engine initialization error handling
- No kit loading fallback

---

## 8. What Works Well

| Area | Assessment |
|------|------------|
| Tool Registry | Excellent - simple, extensible |
| Parameter Converters | Excellent - clean abstraction |
| DrumsNode | Good - can serve as template |
| Song Mode Patterns | Good - clean separation |
| Sampler Kit System | Good - bundled + user kits |
| Producer Library | Good - genre knowledge injection |

---

## 9. Recommendations

### SHORT-TERM (Next Sprint)

1. **Consolidate Parameter Access**
   - Create unified `session.get/set('path')` interface
   - Update tools to use it

2. **Complete Bass Node**
   - Copy DrumsNode pattern
   - Register all parameters

3. **Complete Lead Node**
   - Same as Bass

4. **Fix Render Duplication**
   - Extract `renderInstrumentSections()` helper
   - Extract empty pattern creator

### MEDIUM-TERM (Q1 2026)

1. **Separate Render Module**
   - Move out of jambot.js
   - Create `RenderSession` class
   - Pre-compute step boundaries

2. **Complete Automation System**
   - Apply to all synths, not just drums
   - Add smoothing/interpolation

3. **Implement Missing Render Features**
   - Sidechain ducking
   - Channel inserts
   - Proper reverb convolution

### LONG-TERM

1. Remove dual session system entirely
2. Consider TypeScript for core modules
3. Real-time audio support

---

## 10. Files to Refactor (Priority Order)

1. **jambot.js** (4256 lines)
   - Extract `renderSession()` to `render.js`
   - Extract library/genre to `library.js`
   - Extract API key management to `config.js`

2. **core/session.js** (382 lines)
   - Remove backward compat proxies after migration

3. **instruments/bass-node.js** (20 lines)
   - Full implementation needed

4. **instruments/lead-node.js** (20 lines)
   - Full implementation needed

5. **tools/mixer-tools.js** (272 lines)
   - Add validation, extract patterns

---

## 11. Metrics Summary

| Metric | Value | Assessment |
|--------|-------|-----------|
| Total LoC | 6,445+ | Large, complex domain |
| Main file | 4,256 | Too monolithic |
| Duplication | ~200 LoC | Moderate |
| Test coverage | 0% | No tests |
| Modularity | 6/10 | Dual session hurts |
| Maintainability | 6/10 | Large functions |
| Extensibility | 8/10 | Tool registry excellent |

---

## Conclusion

Jambot has **excellent architecture for extensibility** (tool registry, parameter converters, node system) but is **hampered by incomplete implementation** (dual session systems, stub nodes, incomplete render).

The **core issue** is a migration in progress: both legacy (direct properties) and new (ParamSystem + Nodes) systems exist but aren't integrated. Tools write to one, render reads from the same legacy system.

**Path forward**: Complete the ParamSystem migration, unify tools to use `session.set/get()`, finish node implementations, split the render function, and add proper error handling.
