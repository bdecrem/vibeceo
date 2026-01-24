# Jambot Status

Last updated: 2025-01-23

See **PLATFORM.md** for architecture documentation.

---

## What Works

| Component | Status | Notes |
|-----------|--------|-------|
| **JB01** | ✅ | Drum machine, 8 voices, registered in ParamSystem |
| **JB200** | ✅ | Bass monosynth (2 osc, filter, drive), registered |
| **Sampler** | ✅ | 10-slot sample player, registered |
| **R9D9 (TR909)** | ✅ | 11-voice drum machine, registered |
| **R3D3 (TB303)** | ✅ | Acid bass, registered |
| **R1D1 (SH101)** | ✅ | Lead synth, registered |
| **ParamSystem** | ✅ | Unified `session.get()`/`session.set()` |
| **Clock** | ✅ | Single source of truth for timing |
| **Generic render** | ✅ | One loop over instruments, each calls `renderPattern()` |
| **Delay effect** | ✅ | Analog + ping-pong modes, tempo sync |
| **Reverb effect** | ✅ | Plate reverb with full controls |
| **Per-voice effects** | ✅ | Effects on `jb01.ch`, `jb01.kick`, etc. |
| **Instrument effects** | ✅ | Effects on whole instrument |
| **Master effects** | ✅ | Effects on final mix |
| **EQ/Filter inserts** | ✅ | Channel inserts with presets |
| **Sidechain ducking** | ✅ | Bass ducks on kick, etc. |
| **Song mode** | ✅ | Patterns A/B/C, arrangements |

## Architecture

**Canonical instruments:** `jb01`, `jb200`, `sampler`, `r9d9`, `r3d3`, `r1d1`

**Aliases:** `drums`→jb01, `bass`→jb200, `lead`→jb200, `synth`→jb200

**Patterns:** Stored by canonical ID only (no separate drums/bass/lead pattern slots)

**Rendering:** Generic loop in `render.js` calls each instrument's `renderPattern()`, applies effect chains (voice→instrument→master), and mixes buffers

**Effects flow:**
```
voice → [voice effects] → mix → [instrument effects] → [master effects] → output
```

## Recent Changes (Jan 2025)

- **Delay effect** — Analog (mono+saturation) and ping-pong (stereo bounce) modes
- **Flexible effect routing** — Effects can target instruments, individual voices, or master
- **Code cleanup** — Removed deprecated tool files, extracted tool definitions to separate file
- **Generic render loop** — Refactored from instrument-specific code to generic loop

## File Structure (Key Files)

```
jambot/
├── jambot.js                    # Agent loop (~540 lines)
├── tools/
│   ├── tool-definitions.js      # 65 tool schemas (~980 lines)
│   └── index.js                 # Tool registry + handlers
├── core/
│   ├── session.js               # Session manager, instruments, aliases
│   ├── render.js                # Generic render loop, effect processing
│   └── params.js                # ParamSystem
└── effects/
    ├── delay-node.js            # Delay effect
    └── reverb-node.js           # Reverb effect
```

## Known Issues

- None currently blocking

## What's Coming

| Feature | Priority | Notes |
|---------|----------|-------|
| **Tape loop effect** | Next | Analog memory machine |
| **More synth engines** | Low | Additional synth types |



====
 Assessment: Is Jambot a Good Foundation for "Claude Code for Grooves"?        
                                                                                
  Short answer: Yes. The architecture is sound and the core agentic pattern is  
  solid. Here's my assessment:                                                  
                                                                                
  ---                                                                           
  What's Working Well                                                           
                                                                                
  1. The Parameter System is Excellent                                          
  The unified tweak({ path: 'jb01.kick.decay', value: 75 }) pattern is the right
   abstraction. One way to read, one way to write, works for everything. This is
   exactly what an agent needs — it doesn't have to know synth internals, just  
  addresses.                                                                    
                                                                                
  2. The Agent Loop is Clean                                                    
  User input → System prompt + session context → Claude → Tool dispatch → Loop  
  until done                                                                    
  This is the standard agentic pattern (same as Claude Code). Session context   
  gets rebuilt each iteration, tool results feed back in, Claude reasons about  
  what to do next. Callbacks provide full transparency.                         
                                                                                
  3. Generic Rendering is the Right Design                                      
  The render loop doesn't know about specific instruments — it just calls       
  node.renderPattern() on each registered instrument. Adding a new synth doesn't
   require touching the renderer. This is the "pluggable" part working          
  correctly.                                                                    
                                                                                
  4. Tool Organization is Practical                                             
  65 tools organized by domain (session, mixing, song-mode, per-instrument).    
  Flat structure, easy to find things. JSON schemas ensure type safety at the   
  API boundary.                                                                 
                                                                                
  5. Song Mode is Well-Designed                                                 
  Variable-length patterns (16-step drums looping over 4-bar bass), named slots 
  (A, B, C), arrangement system with sections — this models how producers       
  actually work.                                                                
                                                                                
  ---                                                                           
  Areas That Need Attention (But Don't Block v0.1)                              
                                                                                
  1. Session State is Fragmented                                                
  Pattern data lives in three places: session.jb01Pattern,                      
  session.patterns.jb01['A'], and session._nodes.jb01._pattern. Not a blocker,  
  but creates confusion about source of truth.                                  
                                                                                
  2. Effects System is Incomplete                                               
  Delay and reverb work. EQ/filter/sidechain are partially done. No compression,
   saturation, or other common effects. The architecture supports them, they    
  just need implementation.                                                     
                                                                                
  3. No Formal Interface Contract                                               
  Instruments are duck-typed rather than implementing a formal interface. Works 
  fine now, but could lead to subtle bugs as more instruments are added.        
                                                                                
  4. Redundant Tool Files                                                       
  routing-tools.js overlaps with mixer-tools.js, preset-tools.js could fold into
   instrument tools. Minor cleanup.                                             
                                                                                
  ---                                                                           
  The Key Question: Does It Behave Like a Smart Agent?                          
                                                                                
  Yes. The system has the three essential components:                           
  Component: Tools                                                              
  Status: ✅ Solid                                                              
  Notes: 65 well-defined tools with JSON schemas, clear handlers                
  ────────────────────────────────────────                                      
  Component: Loop                                                               
  Status: ✅ Clean                                                              
  Notes: Standard agentic pattern, context rebuilt each iteration               
  ────────────────────────────────────────                                      
  Component: State                                                              
  Status: ✅ Works                                                              
  Notes: Session captures everything, persists to disk, serializable            
  The agent can:                                                                
  - Create a session at 128 BPM                                                 
  - Add drum patterns with add_jb01                                             
  - Tweak parameters with tweak                                                 
  - Save patterns A/B/C                                                         
  - Set an arrangement                                                          
  - Render to WAV                                                               
  - Add reverb, delay, EQ                                                       
                                                                                
  All through natural language → tool dispatch → result feedback.               
                                                                                
  ---                                                                           
  v0.1 Verdict                                                                  
                                                                                
  This is a good v0.1 foundation. The architecture mirrors Claude Code's        
  pattern:                                                                      
  - User describes intent                                                       
  - Agent selects tools                                                         
  - Tools modify state                                                          
  - Agent observes results                                                      
  - Loop continues until task complete                                          
                                                                                
  The parameter system is the star — it's what makes the agent generic rather   
  than requiring per-synth knowledge. The rendering loop is properly decoupled. 
  The tool organization is practical.                                           
                                                                                
  What would make v0.2 better:                                                  
  1. Unify session state model (one source of truth for patterns)               
  2. Complete effects system (compression, saturation, more filters)            
  3. Formalize instrument interface (TypeScript or runtime validation)          
  4. Add real-time preview (currently render-only)                              
                                                                                
  But for a v0.1 "Claude Code for grooves" — you're in good shape.          