# Jambot v0.1 Release Notes

**Release Date:** January 2025

---

## What is Jambot?

Jambot is an **AI groovebox** — or at least, it's trying to be. It's a CLI tool where you talk to an agent that controls a modular synth rack — drum machines, bass synths, effects, a sequencer, the works. Think hardware groovebox meets Claude Code. (In theory.)

**The philosophy (aka dare to dream):**
- **Real tool, not just a toy.** Yes, you can say "make me a techno beat" and get something. But the *goal* is a production tool that grows with you — tweak parameters, build arrangements, develop your sound. Not just AI slop, but *your* music with AI assistance. We're not there yet. This is v0.1.
- **Agentic loop.** Like Claude Code, Jambot runs an agent loop. You talk, it thinks, it acts (programs patterns, tweaks synths, renders audio), you hear results, you refine. The agent has tools for everything — 65+ of them — and usually figures out what to call. Sometimes it gets confused. It's v0.1.
- **CLI-first (for now).** Terminal UI with real-time feedback. Web UIs exist for hands-on sound design, but the brain lives in your terminal.

This is our first public release. It's rough. Many things are broken. More things are untested. But the core mostly works and it makes real-ish music on good days.

**Projects save to:** `~/Documents/Jambot/projects/`
**Renders save to:** `~/Documents/Jambot/projects/{project}/renders/`

---

## The Loop

```
> make me a techno beat
[agent programs drums]
> add a bass line
[agent adds JB202]
> bounce
[renders WAV to ~/Documents/Jambot/project/renders/]
> analyze that
[agent runs spectral analysis, gives mixing feedback]
> the kick is muddy
[agent tweaks EQ or suggests fixes]
> bounce
```

That's the idea: talk, tweak, bounce, analyze, repeat. Whether it actually works smoothly... it's v0.1.

---

## Highlights

### Modular Architecture (v1) — The Idea, Anyway

The foundation of Jambot is *supposed to be* a **plugin-based instrument system**. Every synth, drum machine, and effect follows the same interface. The agent doesn't need special code for each instrument — it just reads and writes parameters through a unified API.

**Core principles (in theory):**
- One way to read any parameter: `session.get('drums.kick.decay')`
- One way to write any parameter: `session.set('drums.kick.decay', 0.75)`
- Generic tools (`tweak`, `get_param`) work on everything
- New instruments plug in without modifying existing code

This architecture *should* mean we can add new synths, effects, and capabilities without touching the agent loop or tools. Just implement the interface, register the node, and it works. In practice, we've written a lot of bespoke per-instrument code. We'll clean it up. Eventually. It's v0.1.

**Full technical documentation:** [PLATFORM.md](./PLATFORM.md)

---

## Instruments

**Naming convention:**
- **JB** = Jambot originals (JB01, JB202)
- **JP** = Jam-Patch — modular/patchable (JP9000)
- **JT** = Tribute line — classic synth homages (JT10→101, JT30→303, JT90→909)

### JB01 — Drum Machine ✅

8-voice drum machine with pre-rendered, phase-consistent sounds. Every hit sounds identical — no Web Audio timing drift, no random phase issues. (This one actually works pretty well. It's just drums, but still.)

**Voices:** kick, snare, clap, ch (closed hat), oh (open hat), lowtom, hitom, cymbal

**Features:**
- Per-voice level, decay, tune, attack, tone controls
- Step sequencer with velocity
- Variable pattern lengths (16/32/64/etc. steps)
- Preset kits

**Web UI:** [kochi.to/jb01](https://kochi.to/jb01)

### JB202 — Bass Synth ✅

Reference bass monosynth with **custom DSP** written in pure JavaScript. No Web Audio oscillators or filters — everything is hand-coded: PolyBLEP oscillators, cascaded biquad filter, exponential ADSR envelopes, soft-clip drive.

**Why custom DSP?** Cross-platform consistency. JB202 *should* produce **identical output** in the browser and in Node.js offline rendering. Render a pattern in Jambot CLI, play it in the web UI — same waveforms, same timing, same sound. (We've tested this with kicks. Kicks work. Other stuff... probably?)

**Features:**
- 2 oscillators (saw/square/triangle) with detune
- 24dB lowpass filter with resonance
- Filter envelope with adjustable depth
- Amp ADSR envelope
- Soft-clip drive for warmth
- Accent and slide support

**Web UI:** [kochi.to/jb202](https://kochi.to/jb202)

### JP9000 — Modular Synthesizer ✅ (ish)

A true modular synth where you patch modules together via text commands. This is the experimental playground. Emphasis on "experimental."

**Module Types:**
- **Sound Sources:** osc-saw, osc-square, osc-triangle, osc-pulse, string (Karplus-Strong)
- **Filters:** filter-lp24, filter-biquad, moog-ladder
- **Modulation:** env-adsr, lfo, sequencer
- **Utilities:** vca, mixer (4-channel), noise
- **Effects:** drive (soft-clip, tube, hard)

(Some of these work great. Some of them... exist.)

**Presets:**
- `basic` — osc → filter → vca (classic subtractive) — works
- `pluck` — Karplus-Strong string → filter → drive (physical modeling) — works!
- `dualBass` — dual oscillators → mixer → filter → vca → drive — works... we think

**The Pluck Module:** A fun midnight project. Karplus-Strong physical modeling synthesis creates plucked-string-ish sounds. Deterministic seeded PRNG ensures reproducible audio. Parameters: frequency, decay, brightness, pluckPosition. It's neat. Don't expect miracles.

**Example workflow:**
```
add_jp9000({ preset: 'pluck' })
tweak_module({ module: 'string1', param: 'brightness', value: 70 })
add_jp9000_pattern({ pattern: [...] })
render()
```

---

## Effects

### Delay ✅

Flexible delay effect with two modes:
- **Analog:** Warm tape-style delay with saturation and filtering
- **Ping Pong:** Stereo bouncing delay

(Delay is probably the most tested effect. It delays things. As advertised.)

**Features:**
- Time (ms) or tempo sync (8th, dotted 8th, triplet, 16th, quarter)
- Feedback with lowcut/highcut filtering
- Saturation (analog mode)
- Stereo spread (ping pong mode)

**Can be applied to:**
- Individual voices (`jb01.ch`, `jb01.snare`)
- Entire instruments (`jb01`, `jb202`)
- Master bus (`master`)

(Multi-target routing works. Usually.)

**Example:**
```
add_effect({ target: 'jb01.ch', effect: 'delay', mode: 'pingpong', feedback: 50, mix: 30 })
```

### Analyze ✅

Spectral analysis tools for mixing feedback. The agent can analyze your renders and tell you what's wrong (or right).

**Tools:**
- `analyze_render()` — Full analysis: peak/RMS levels, frequency balance, recommendations
- `detect_resonance()` — Find filter squelch peaks (acid detection)
- `detect_mud()` — Find 200-600Hz buildup
- `show_spectrum()` — ASCII 8-band spectrum analyzer
- `get_spectral_peaks()` — Dominant frequencies with note names

**Requires:** sox (`brew install sox`)

**Example:**
```
> bounce
> analyze that — is the bass too loud?
[agent runs analysis, interprets results]
```

(This actually works pretty well. The agent can read spectrograms better than we expected.)

---

## Song Mode ✅ (Basic)

Build arrangements with multiple sections and pattern variations. "Arrangements" might be generous — it's more like "several patterns in a row."

**Features:**
- Save patterns to named slots (A, B, C, etc.)
- Variable pattern lengths per instrument
- Section-based arrangement with bar counts
- Patterns loop to fill their section

(For simple arrangements, this works. For complex stuff... it's v0.1.)

**Example:**
```
# Create patterns
add_jb01({ kick: [0,4,8,12], snare: [4,12] })
save_pattern({ instrument: 'jb01', name: 'A' })

add_jb01({ kick: [0,4,8,12], snare: [4,12], oh: [2,6,10,14] })
save_pattern({ instrument: 'jb01', name: 'B' })

# Build arrangement
set_arrangement({ sections: [
  { bars: 4, jb01: 'A' },
  { bars: 8, jb01: 'B', jb202: 'A' },
  { bars: 4, jb01: 'A' },
]})

# Render full track
render({ filename: 'my-track' })
```

---

## Web UIs ✅ (Mostly)

Every instrument has a browser-based interface for hands-on sound design. Some are more polished than others.

| Instrument | URL | Status |
|------------|-----|--------|
| JB01 Drums | [kochi.to/jb01](https://kochi.to/jb01) | Works |
| JB202 Bass | [kochi.to/jb202](https://kochi.to/jb202) | Works |
| JP9000 Modular | [kochi.to/jp9000](https://kochi.to/jp9000) | Works-ish |
| JT10 Lead | [kochi.to/jt10](https://kochi.to/jt10) | Exists |
| JT30 Acid | [kochi.to/jt30](https://kochi.to/jt30) | Exists |
| JT90 Drums | [kochi.to/jt90](https://kochi.to/jt90) | Exists |

Web UIs share the same DSP code as Jambot CLI — what you hear in the browser *should be* what you get in renders. Sometimes you need to hard-refresh. It's v0.1.

---

## Session Persistence ✅ (Recently Fixed)

Sessions are saved as JSON manifests and persist across Jambot restarts. We just fixed a bug where they didn't actually restore properly, so... fresh feature!

- Patterns for all instruments
- Parameter tweaks
- Effect chains (probably)
- Song arrangements (in theory)
- Project metadata

**Commands:**
- `/new` — Start fresh project
- `/open` — Open existing project
- `/recent` — Resume most recent
- `/projects` — List all saved projects

(If your session doesn't restore correctly, that's a v0.1 moment. Let us know.)

---

## Terminal UI ✅

Terminal interface with:
- Syntax-highlighted output (when Ink cooperates)
- Scrollable message history
- Slash command completion (for the commands we remembered to add)
- Real-time status display
- Keyboard shortcuts

It's a terminal. It works. The bar is low here.

---

## Experimental (Not Battle-Tested)

These features exist but haven't been thoroughly tested. Use at your own risk.

### JT10 — Tribute to the SH-101

Lead/bass monosynth. PolyBLEP oscillators, sub-oscillator, Moog ladder filter, LFO modulation.

**Status:** Implemented, lightly tested.

### JT30 — Tribute to the TB-303

Acid bass synth with saw/square oscillators and Moog ladder filter tuned for 303-style behavior.

**Status:** Implemented, but the resonance still doesn't sound quite right. We've done extensive tuning based on TB-303 research (the real 303 uses a diode ladder that never self-oscillates, ours is a Moog ladder), but it's not there yet. Usable for basic acid sounds, not authentic.

### JT90 — Tribute to the TR-909

11-voice drum machine: kick, snare, clap, rimshot, lowtom, midtom, hitom, ch, oh, crash, ride.

**Status:** Implemented, needs testing.

### Reverb

Dattorro plate reverb with predelay, decay, damping, modulation, and width controls.

**Status:** Implemented, probably works, needs testing.

---

## Probably Broken

These features are in the codebase but likely don't work correctly. They're here for future development.

### Sampler (R9DS)

10-slot sample player with kit loading. The architecture is sound but integration may be incomplete.

### EQ

Channel and master EQ with presets. May not be wired up correctly.

### Sidechain Compression

Ducker effect for bass-ducks-on-kick. Implemented but untested.

### Filter Module

Channel filter effect (lowpass/highpass/bandpass). May not be integrated.

### Automation Lanes

System for parameter automation over time. Architecture exists, probably broken.

### Some JP9000 Modules

The modular system has many modules. Some work great (oscillators, filters, string), others may have issues (LFO routing, complex patches).

---

## Known Issues

1. **JT30 resonance** — Doesn't capture authentic 303 squelch. Needs diode ladder implementation.
2. **Web UI caching** — Sometimes need hard refresh (Cmd+Shift+R) after updates.
3. **Effect chain ordering** — Complex multi-effect routing may have edge cases.
4. **Pattern length edge cases** — Very long patterns (256+ steps) untested.

---

## Getting Started

```bash
# Clone and install
git clone https://github.com/[repo]/vibeceo.git
cd vibeceo/jambot
npm install

# Run Jambot
npm start

# Or with API key as argument
npm start -- --api-key YOUR_KEY
```

**First session (optimistic version):**
```
> make a 128 bpm techno beat with a four on the floor kick and offbeat hats
> add an acid bassline in A minor
> bounce
```

**First session (realistic version):**
```
> make a techno beat
[agent does something]
> the hats are too loud
[agent tweaks]
> can you add bass
[agent tries]
> why is there no sound
[you forgot to bounce]
> bounce
[15 seconds of something that might be music]
```

Lower your expectations. Raise them gradually. It's v0.1.

---

## What's Next (v0.2, Maybe, Hopefully)

- Fix JT30 resonance (diode ladder filter) — we keep saying this
- Test and stabilize experimental features — i.e., actually use them once
- MIDI export — would be nice
- More JP9000 modules — if we get around to it
- Pattern copy/paste — seems basic, doesn't exist yet
- Undo/redo — lol

No promises. It's a side project. We have day jobs.

---

## Reality Check

Let's be honest about where we are.

**The pitch:** "An AI groovebox where you talk to an agent that controls a modular synth rack."

**The reality:** We spent three days tweaking filter coefficients and the 303 still doesn't squelch right.

**What we said:** "65+ tools for everything — the agent figures out what to call."

**What happens:** Half of them are marked "probably broken" in this very document.

**The vision:** "A production tool that grows with you — not just AI slop, but *your* music."

**The execution:** Sampler integration? "May be incomplete." Automation lanes? "Probably broken." Sidechain compression? "Implemented but untested."

**Big dreams:**
- "Modular architecture where any component can be added, removed, or swapped"
- "Services that work on anything — automation doesn't know about drums, it knows about parameters"
- "The agent is just a user — no special code per instrument"

**Tiny steps:**
- Fixed a bug where knobs showed "50" instead of reading from the engine
- Changed a resonance curve from x² to x^0.5
- Added bass loss compensation: `1.0 / (1.0 + resCurved * 0.5)`

**The grand unified theory:** "Cross-platform consistent DSP — what you hear in the browser is what you get in renders."

**The actual achievement:** We got the kick drum to sound the same twice.

**Future plans:** "Diode ladder filter for authentic 303 character."

**Current reality:** We're using a Moog ladder and calling it close enough.

**What the architecture docs say:** "When adding anything new, it plugs into the existing architecture. Never write bespoke code that only works for one thing."

**What we actually did:** Wrote `add_jb01`, `add_jb202`, `add_jt10`, `add_jt30`, `add_jt90`, `add_jp9000`, `add_jp9000_pattern`, `tweak_jt10`, `tweak_jt30`, `tweak_jt90`, `tweak_module`...

**The philosophy:** "CLI-first, like Claude Code. Real work over flashy output."

**The tagline we settled on:** "It makes noise, and sometimes that noise is music."

---

But hey — v0.1 shipped. That's more than most side projects. The noise is happening. It's not great noise, but it's noise.

Onward to v0.2. (Eventually.)

---

## Credits

Built with Claude (Anthropic), Web Audio API, stack overflow, and a lot of late nights tweaking filter coefficients that still don't sound right.

**Architecture:** Modular instrument system (aspirational), unified parameter access (partially), agentic tool loop (this part actually works)
**DSP:** Custom PolyBLEP oscillators, Moog ladder filter (not a 303 diode ladder, sorry), Karplus-Strong synthesis
**UI:** Ink (React for CLI), vanilla JS web UIs

Jambot wants to share DNA with Claude Code — same ideas about making AI tools that are genuinely useful, not just demos. The agentic loop, the CLI-first approach, the focus on real work over flashy output. We're like 20% of the way there. But we shipped v0.1, and that's something.

---

*Jambot v0.1 — "It makes noise, and sometimes that noise is music."*

*Also: lower your expectations.*
