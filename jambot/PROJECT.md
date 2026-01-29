# Project: Jambot Architecture Refactor

## The Vision

Transform Jambot into a **modular platform** where:
- Any component (instrument, effect, track) can be added/removed/swapped
- Everything connects via standard interfaces
- The agent can **read and write ANY parameter** uniformly
- Services (automation, analysis) work on anything, not just specific instruments

This is not about reorganizing files. It's about building a **unified parameter system** as the foundation.

## Core Architecture

### 1. Unified Parameter System (The Foundation)

Every parameter in the system is addressable via a path:
```javascript
session.get('drums.kick.decay')           // Read drum kick decay
session.set('bass.cutoff', 0.7)           // Write bass filter cutoff
session.get('mixer.sends.reverb1.decay')  // Read reverb decay
session.set('mixer.master.volume', 0.8)   // Write master volume

// Automation works on ANY path:
session.automate('drums.kick.decay', [0.5, 0.7, 0.3, ...])
session.automate('bass.cutoff', [0.2, 0.8, 0.5, ...])
session.automate('mixer.sends.reverb1.decay', [1.5, 2.0, ...])
```

**Implementation:**
```javascript
// core/params.js
class ParamSystem {
  constructor() {
    this.nodes = new Map();  // 'drums' -> DrumsNode, 'bass' -> BassNode
    this.automation = new Map();
  }

  register(id, node) { this.nodes.set(id, node); }

  get(path) {
    const [nodeId, ...rest] = path.split('.');
    return this.nodes.get(nodeId)?.getParam(rest.join('.'));
  }

  set(path, value) {
    const [nodeId, ...rest] = path.split('.');
    this.nodes.get(nodeId)?.setParam(rest.join('.'), value);
  }

  describe(nodeId) {
    return this.nodes.get(nodeId)?.getParameterDescriptors();
  }

  automate(path, values) { this.automation.set(path, values); }
  getAutomation(path) { return this.automation.get(path); }
}
```

### 2. Node Interface (For Everything)

Both instruments AND effects implement the same base interface:

```javascript
// core/node.js
class Node {
  constructor(id, config) { this.id = id; this.params = {}; }
  getParam(path) {}
  setParam(path, value) {}
  getParameterDescriptors() {}  // { 'kick.decay': {min, max, unit}, ... }
  serialize() {}
  deserialize(data) {}
}

class InstrumentNode extends Node {
  getVoices() {}
  trigger(voice, time, velocity) {}
  getPattern() {}
  setPattern(pattern) {}
}

class EffectNode extends Node {
  process(inputBuffer, outputBuffer) {}
}
```

### 3. Dynamic Routing

Tracks and sends created at runtime:
```javascript
session = {
  params: ParamSystem,
  tracks: {
    'drums': { nodeId: 'drums', inserts: [], sends: {} },
    'bass': { nodeId: 'bass', inserts: [], sends: {} },
  },
  sends: {
    'reverb1': { nodeId: 'reverb', params: {} },
  },
  master: { inserts: [], volume: 0.8 }
};
```

### 4. Generic Tools

One tool for each action type:
```javascript
// BEFORE: 4 bespoke tweak functions
tweak_drums(), tweak_bass(), tweak_lead(), tweak_samples()

// AFTER: 1 generic tweak
tweak({ path: 'drums.kick.decay', value: 0.7 })
tweak({ path: 'bass.cutoff', value: 0.5 })
tweak({ path: 'mixer.sends.reverb1.decay', value: 2.0 })

// BEFORE: Drum-only automation
automate_drums(voice, param, values)

// AFTER: Automate anything
automate({ path: 'drums.kick.decay', values: [...] })
automate({ path: 'bass.cutoff', values: [...] })
automate({ path: 'mixer.master.volume', values: [...] })
```

---

## Implementation Phases

### Phase 1: Tool Extraction ✅ COMPLETE
- Created `tools/` directory with registry pattern
- Extracted 40 tools into 8 category files
- Dynamic imports avoid circular deps
- `initializeTools()` + `executeTool()` working

### Phase 2: Create ParamSystem Core
**Files:** `core/params.js`

1. Create ParamSystem class with get/set/describe/automate
2. Create Node base interface
3. Unit tests for path resolution

**Validation:** Can register mock nodes and read/write via paths

### Phase 3: Wrap Instruments as Nodes
**Files:** `instruments/drums-node.js`, `bass-node.js`, `lead-node.js`, `sampler-node.js`

1. DrumsNode wrapping TR909Engine
   - getParam/setParam for all voices
   - Maps producer units to engine units
   - getParameterDescriptors() for agent introspection
2. BassNode wrapping TB303Engine
3. LeadNode wrapping SH101Engine
4. SamplerNode wrapping sample voices

**Key:** Nodes handle unit conversion internally. External callers use producer-friendly units.

**Validation:** `session.params.get('drums.kick.decay')` works

### Phase 4: Integrate ParamSystem into Session
**Files:** `core/session.js`, update `tools/*.js`

1. Session creates ParamSystem, registers instrument nodes
2. Add `session.get(path)`, `session.set(path, value)`
3. Update create_session to initialize param system
4. Migrate tools to use param system

**Validation:** Existing tools work through new param system

### Phase 5: Wrap Effects as Nodes
**Files:** `effects/reverb-node.js`, `eq-node.js`, `filter-node.js`, `sidechain-node.js`

1. ReverbNode with decay, mix, etc.
2. EQNode with frequency, gain, Q
3. FilterNode with cutoff, resonance, type
4. Register effects in param system

**Validation:** `session.params.get('mixer.sends.reverb1.decay')` works

### Phase 6: Unify Automation
**Files:** `core/automation.js`, `tools/automation-tools.js`

1. Move automation storage to ParamSystem
2. Single `automate` tool for any path
3. Update render to apply automation from ParamSystem
4. Deprecate drum-specific automation

**Validation:** Can automate any param (instrument, effect, mixer)

### Phase 7: Generic Tools
**Files:** `tools/generic-tools.js`

1. `tweak({ path, value })` — replaces 4 bespoke tweaks
2. `get_param({ path })` — agent reads any param
3. `list_params({ node })` — agent discovers available params
4. Keep bespoke tools as aliases

**Validation:** Agent can read/write any parameter uniformly

### Phase 8: Dynamic Routing
**Files:** `core/routing.js`, `tools/routing-tools.js`

1. Dynamic track list (add/remove)
2. Dynamic send list (add/remove)
3. Tools: `add_track`, `remove_track`, `add_send`, `remove_send`
4. Render builds graph from dynamic config

**Validation:** Can add tracks/sends at runtime

---

## Success Criteria

After this refactor:

1. **Agent can read any parameter:** `get_param({ path: 'drums.kick.decay' })` returns value
2. **Agent can write any parameter:** `tweak({ path: 'bass.cutoff', value: 0.7 })` works
3. **Automation on anything:** Not just drums — bass, lead, effects, mixer
4. **New instruments plug in:** Add node, register, tools work automatically
5. **New effects plug in:** Add node, register, route audio through it
6. **No bespoke code per component:** One tweak, one automate, one get_param

---

## Progress Log

### Session 1 (Jan 17, 2026)
- [x] Phase 1: Tool extraction complete (40 tools, 8 files)
- [x] Phase 2: ParamSystem core (core/params.js, core/node.js)
- [x] Phase 3: Wrap instruments as Nodes (4 nodes: drums, bass, lead, sampler)
- [x] Phase 4: Integrate ParamSystem into Session (session.get/set, backward compat)
- [x] Phase 5: Wrap effects as Nodes (4 nodes: reverb, eq, filter, sidechain)
- [x] Phase 6: Unify automation (automate any path, generateAutomation patterns)
- [x] Phase 7: Generic tools (tweak, get_param, list_params, tweak_multi, get_state)
- [x] Phase 8: Dynamic routing (RoutingManager, add/remove tracks/sends)

**ALL PHASES COMPLETE**

### Files Created

```
jambot/
├── core/
│   ├── index.js          # Core module exports
│   ├── params.js         # ParamSystem - unified parameter access
│   ├── node.js           # Node, InstrumentNode, EffectNode, MixerNode
│   ├── session.js        # createSession with ParamSystem integration
│   ├── automation.js     # Unified automation utilities
│   └── routing.js        # RoutingManager for dynamic tracks/sends
├── instruments/
│   ├── index.js          # Instrument exports
│   ├── drums-node.js     # DrumsNode wrapping TR909
│   ├── bass-node.js      # BassNode wrapping TB303
│   ├── lead-node.js      # LeadNode wrapping SH101
│   └── sampler-node.js   # SamplerNode wrapping sampler
├── effects/
│   ├── index.js          # Effect exports
│   ├── reverb-node.js    # ReverbNode
│   ├── eq-node.js        # EQNode with presets
│   ├── filter-node.js    # FilterNode with presets
│   └── sidechain-node.js # SidechainNode (ducker)
└── tools/
    ├── automation-tools.js  # automate, clear_automation, show_automation
    ├── generic-tools.js     # get_param, tweak, tweak_multi, list_params, get_state
    └── routing-tools.js     # add_track, remove_track, add_send, remove_send, route, etc.
```
