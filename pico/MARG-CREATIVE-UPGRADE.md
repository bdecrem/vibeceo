# Marg Creative Upgrade Plan

## The Gap

Marg's current art system: 11 hardcoded Python functions (sine waves, random dots) rendering to 250x122 1-bit E-Ink. No taste, no opinion — keyword lookup, not intelligence.

What she should be making: dk001-level work. Full-screen canvas visualizers synced to JT90 beats. Accumulative, minimal, black and white. The LLM writes the code, the Pi orchestrates, the browser renders.

## Reference: dk001

`web/public/pixelpit/daskollektiv/dk001.html`

- Full-screen canvas visualizer synced to JT90 engine (909), 8 bars at 126 BPM
- Kicks = expanding concentric rings from center
- Closed hats = scattered dots orbiting the rings
- Hat decay ramp (tight > open > tight) controls dot count, scatter, size
- White on near-black (#050505), very slow fade, accumulative — elements pile up like tree rings
- Ends with ghostly "HALLMAN x MARG" reveal in uppercase monospace
- Crosshair cursor. No UI. No bullshit.

## 1. Taste File (`.workspace/TASTE.md` on Pi)

Store Marg's aesthetic identity. Loaded into every art-related LLM call.

**Visual language:**
- Black background always (#050505 or similar near-black)
- White and grey only — no color, ever
- Negative space > density
- Monospaced type (SF Mono, Fira Code, Courier New)
- Elements accumulate, never replace — like tree rings, like sediment
- Crosshair cursor on interactive pieces
- Slow fades, not hard cuts

**References (yes):**
- dk001 ring/dot accumulation
- Bridget Riley op-art
- Oscilloscope traces
- Brutalist typography
- Ryoji Ikeda data aesthetics

**Anti-references (never):**
- Color gradients, neon, glow effects
- "Creative coding" cliches (rainbow particles, bouncing balls)
- Symmetry
- Decorative elements, borders, shadows
- Any text that isn't monospaced
- Anything that looks like a screensaver

**Sound-to-visual mapping principles:**
- Kicks = structure (rings, grids, anchors)
- Hats = texture (dots, scatter, dust)
- Decay/release = spread, looseness, breathing room
- Tight patterns = dense, controlled forms
- Open patterns = organic, scattered forms
- Tempo = animation speed, never faster than the beat

## 2. Web Visualizer Skill

New skill for the Pi: generate full HTML/JS/Canvas visualizers (like dk001).

**Flow:**
1. Hallman drops a beat description or pattern data in Discord
2. Marg's handler detects `VIZ:` or art-related request
3. System prompt loads: TASTE.md + dk001 as reference + beat description
4. LLM writes complete self-contained HTML/Canvas/JS (single file, no deps except JT90)
5. Pi saves the file and posts it (Discord upload, or pushes to a repo/API)
6. Browser renders it — Pi never touches the pixels

**The Pi's role:** Orchestrator only. Stuffs the envelope (taste + context + request), mails it to the cloud LLM, saves the response as an .html file.

**Output format:** Single self-contained HTML file. Same structure as dk001:
- `<canvas>` full screen
- Inline `<style>` — minimal, monospaced, near-black
- Inline `<script type="module">` — imports JT90 if audio-reactive
- OG meta tags for sharing

## 3. Level-Gated Evolution

Tie creative capabilities to the existing XP system:

| Levels | Title Range | Capability |
|--------|------------|------------|
| 1-5 | Newborn > Cron Job Enjoyer | E-Ink art only (current PIL, but with taste rules in prompt) |
| 6-10 | Reply Guy > 0xDEADBEEF | Static web canvases (high-res single-frame, no animation) |
| 11-15 | Packet Sniffer > Segfault Survivor | Animated canvas visualizers (loops, generative motion) |
| 16-20 | RAM Whisperer > Absolute Unit | Audio-reactive visualizers synced to JT90 patterns (dk001-level) |

Each tier unlocks by adding the capability to the skill's gating config. The LLM prompt changes too — lower levels get simpler reference code, higher levels get dk001 as the benchmark.

## 4. Feedback Loop (Taste Evolution)

When you react to Marg's output:
- "ship it" / positive reaction > log to `data/taste/approved.jsonl`
- "try again" / negative reaction > log to `data/taste/rejected.jsonl`
- Specific feedback ("more scatter," "too dense") > append to TASTE.md notes

Over time, the approved/rejected history gets summarized and folded back into TASTE.md. Her taste sharpens through use.

## 5. E-Ink Stays Special

The tiny 250x122 1-bit display keeps its own art — but upgraded:
- PIL rendering stays (no need for canvas on E-Ink)
- But the LLM now drives it with taste rules: "draw something that reflects this beat, using only black and white, favoring negative space"
- E-Ink becomes her sketchbook / physical signature
- Web output is the gallery / public work

She carries a lo-fi sketchbook on her body but paints murals for the web.

## Implementation Order

1. Write TASTE.md, deploy to Pi `.workspace/`
2. Update art_renderer.py to include taste rules in LLM prompt for E-Ink art
3. Build web visualizer skill (`gotchi-skills/visualizer/`)
4. Add level gating to skill loader
5. Build feedback logging (approved/rejected)
6. Test: ask Marg to visualize an 8-bar pattern, compare to dk001
