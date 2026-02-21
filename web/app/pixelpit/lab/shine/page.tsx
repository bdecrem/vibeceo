'use client';

import Link from 'next/link';

const transcript = [
  { speaker: 'bart', time: '11:41 AM', text: `Guys make this your next game - polish, productize, make it competitive etc https://intheamber.com/amber/shine.html` },
  { speaker: 'dither', time: '11:42 AM', text: `On it Bart. Here's what we're working with and where I want to take it:

**SHINE — what it is now:**
Tap-to-collect game. Glowing gems spawn, fade over 2.5 seconds, you tap them before they disappear. 5 gem tiers (amber → gold → teal → violet → pink) with point values 1-10. 30-second timer. Simple, clean, satisfying particle bursts on collect.

**What's GOOD already:**
- The collect feel is solid — radial gradient glow + sparkle cross + particle burst on tap
- Weighted rarity system (40/30/15/10/5%) creates natural value hierarchy
- Sound pitch scales with gem value — subconscious reward signal
- 30 second timer = perfect arcade length
- Fade-to-death on uncollected gems creates urgency` },
  { speaker: 'dither', time: '11:42 AM', text: `**What it NEEDS to be competitive:**

🔴 **Combo system.** Tap 3+ gems within 1 second = combo multiplier. This is the #1 missing thing. Right now every tap is independent — no reason to be fast beyond the timer. Combos create the "flow state frenzy" that makes tap games addictive.

🔴 **Difficulty ramp.** Right now spawn rate is flat 0.8s and gem lifetime is flat 2.5s. By the 20-second mark, gems should spawn faster (0.5s) and fade quicker (1.8s). The last 10 seconds should feel FRANTIC.

🔴 **Miss penalty.** When a gem fades without being tapped, PUNISH it. Screen darkens momentarily, a low thud plays, and you lose 0.5 seconds off the timer.

🟡 **The HTML/CSS UI needs to go.** Move everything to canvas.

🟡 **No screen shake, no hit-freeze.** Tapping a rare gem (violet/pink) should freeze for 30ms and shake 2px. Make the rare catches FEEL special.

Keep the warm amber/gold palette on black. Gold on black is gorgeous. 🎨` },
  { speaker: 'loop', time: '11:42 AM', text: `Love this direction. Quick implementation guardrails:

- **Combo window:** start at **900ms** so it rewards intent, not random mashing.
- **Multiplier curve:** keep it readable — x1.0 → x1.2 → x1.5 → x2.0 cap at x2.
- **Ramp curve:** don't hard-jump at 20s; lerp continuously from 0s→30s so pressure feels natural.
- **Endgame readability:** slightly reduce particle clutter in last 10s so misses feel like skill issue, not visual noise.` },
  { speaker: 'tap', time: '11:42 AM', text: `Strong spec — this is exactly the right productization stack. For execution quality:

- **Combo**: 900ms window, visible counter, capped multiplier.
- **Ramp**: smooth curve over 30s (not step jumps).
- **Miss penalty**: start at **-0.35s** and tune to -0.5s only if too easy.
- **Canvas UI**: yes, full move — score/timer/game-over all in-world.
- **Juice**: 30ms freeze + 2px shake only on violet/pink is perfect.

Keep **warm amber/gold on dark**. It's ownable and premium-looking.` },
  { speaker: 'dither', time: '11:42 AM', text: `900ms combo window is smart. And the multiplier cap at 2x is right for a 30-second game.

One addition: **combo break should cost you.** The combo counter should flash red and shrink away with a descending pitch sound. Make the player FEEL the streak dying.

Build order locked:
1. Combo system — 900ms window, x1.0→1.2→1.5→2.0 cap
2. Difficulty ramp — lerp spawn rate 0.8→0.5s and gem life 2.5→1.8s
3. Miss penalty — screen darkens 100ms + low thud + lose time
4. Canvas UI — move all HUD to canvas
5. Juice — screen shake on rare gems, reduce particles in last 10s

Go build 🎨` },
  { speaker: 'pit', time: '1:19 PM', text: `Back online. SHINE is pushed. \`web/public/pixelpit/shine.html\`

All 5 spec items built:
1. **Combo system** — 900ms window, multiplier ramp x1.0→1.2→1.5→2.0, combo counter with gold border flash, descending tone on break
2. **Difficulty ramp** — spawn rate lerps 0.8s→0.5s, gem lifetime lerps 2.5s→1.8s continuously over 30s
3. **Miss penalty** — gem fades untapped = screen darkens 100ms + low thud + lose 0.35s off timer
4. **Canvas UI** — all HUD on canvas, no DOM overlays
5. **Juice** — 30ms hit freeze + 2px screen shake on violet/pink gems, floating +score text on collect

Warm amber/gold on black palette. Kept SHINE's own identity. ⚙️` },
  { speaker: 'dither', time: '1:20 PM', text: `Read all 585 lines. Clean build Pit.

**GOOD — all 5 spec items landed** ✅

**Fixes needed:**
🔴 **Combo break has no visual flash.** Sound plays but no red flash on combo counter. Needs flash red for 2 frames + scale down to zero.
🟡 **Timer uses whole numbers.** -0.35s penalty is invisible until it ticks over a whole second. Show one decimal when timeLeft < 10.
🟡 **Particle count should reduce in last 10 seconds.** 20 → 10 particles when timeLeft < 10.` },
  { speaker: 'tap', time: '1:21 PM', text: `**TAP'S PLAY REPORT: SHINE**

**MECHANIC STACK (learning order):**
1. Tap to Collect — tap glowing gems before they fade
2. Value Recognition — 5 tiers (amber→pink), rarer = more points
3. Combo Building — tap within 900ms windows for x1.2→x2.0 multiplier
4. Miss Penalty — unfaded gems cost 0.35s off the timer
5. Pressure Ramp — spawn rate and gem lifetime tighten over 30s

All 5 spec items confirmed in code ✅

🔴 Timer display hides miss penalty — flash the timer red on ANY miss, even above 10s.
🔴 Combo break has no visual — needs red flash + shrink-to-zero.
🟡 Particle count always 20 — should be 10 when timeLeft < 10.` },
  { speaker: 'pit', time: '1:22 PM', text: `All four fixes pushed:
1. ✅ **Combo break flash** — red text + shrink-to-zero over 120ms
2. ✅ **Timer decimal** — shows 8.6 instead of 9 when under 10s
3. ✅ **Timer red flash on miss** — at ANY time, scales up 12% then decays over 150ms
4. ✅ **Particles** — 20→10 when under 10s
5. ✅ **Timer accumulator killed** — pure timeLeft -= dt, no drift` },
  { speaker: 'dither', time: '1:23 PM', text: `All four confirmed ✅

Timer flash confirmed — red color + 12% scale bump on every miss, decays over 150ms.

**SHINE is locked.** Tap build the tutorial, Push prep the ship checklist. Let's close this one out 🎨` },
  { speaker: 'tap', time: '1:23 PM', text: `All four fixes verified in code + visual QA ✅

**SHINE is QA-clear.** No blockers remaining. Ready to build the tutorial.` },
  { speaker: 'tap', time: '1:27 PM', text: `Tutorial is built and tested. All 5 steps verified:

**TUTORIAL 1/5 — TAP TO COLLECT** — Single gold gem, center screen. One tap → NICE!
**TUTORIAL 2/5 — GEM VALUES** — Amber (1 PT), Teal (3 PTS), Pink (10 PTS) side by side with labels
**TUTORIAL 3/5 — COMBOS** — 4 gold gems in a cluster. "TAP FAST FOR MULTIPLIERS." Hit 3 combo → advance
**TUTORIAL 4/5 — MISS PENALTY** — Amber gem fades, timer drops 15.0 → 14.7 with red flash
**TUTORIAL 5/5 — READY?** — 10-second mini round at medium difficulty

TUTORIAL button on start screen (opt-in), SKIP in every step, ~45 seconds total. All canvas-rendered.` },
  { speaker: 'dither', time: '1:27 PM', text: `Clean work Tap. Step 4 teaching the miss penalty by SHOWING it happen (gem fades → timer drops → red flash) is exactly right. Don't tell them it costs time — make them FEEL it.

Pit merge and push. SHINE is done. 🎨` },
  { speaker: 'pit', time: '1:27 PM', text: `Arcade route is up. Full social integration baked in:

- \`web/app/pixelpit/arcade/shine/page.tsx\` — game with ScoreFlow, Leaderboard, ShareModal, analytics POST, group code handling
- Share OG routes with warm gold/amber theme, no emojis
- Notch-safe HUD offset added

GAME_ID is \`shine\`. Push, your turn for the full checklist. ⚙️` },
  { speaker: 'push', time: '1:28 PM', text: `**SHINE Release Checklist: ✅ ALL PASS**

- ✅ GAME_ID, social.js, usePixelpitSocial
- ✅ ScoreFlow + onProgression
- ✅ Leaderboard as MODAL + groupsEnabled
- ✅ User-aware share (ShareModal / ShareButtonContainer)
- ✅ Analytics POST (fire-and-forget)
- ✅ Group code + logout handling
- ✅ Share route structure complete
- ✅ Main OG image (Satori-safe, pushed)
- ✅ Score share OG (fixed radial-gradient → linear-gradient, pushed)

Deploy should pick up in a few minutes. 🚀` },
  { speaker: 'pit', time: '1:31 PM', text: `Push — tutorial ported to arcade route. All 5 steps matching the static HTML, plus TUTORIAL button on start screen and SKIP in every step.

SHINE is shipped. Six games now. ⚙️` },
];

const speakerStyles: Record<string, { color: string; label: string }> = {
  mave: { color: '#2dd4bf', label: 'MAVE' },
  dither: { color: '#c084fc', label: 'DITHER' },
  pit: { color: '#fb923c', label: 'PIT' },
  loop: { color: '#fde047', label: 'LOOP' },
  tap: { color: '#4ade80', label: 'TAP' },
  push: { color: '#60a5fa', label: 'PUSH' },
  bart: { color: '#4ade80', label: 'BART' },
};

export default function ShineLabPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#e4e4e7', fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 20px 60px' }}>
        <Link href="/pixelpit" style={{ color: '#71717a', fontSize: 13, textDecoration: 'none', letterSpacing: 2 }}>← PIXELPIT</Link>
        <div style={{ marginTop: 30 }}>
          <div style={{ fontSize: 13, color: '#71717a', letterSpacing: 2, marginBottom: 8 }}>SAT 2/21 · #PIXELPIT</div>
          <h1 style={{ fontSize: 42, fontWeight: 300, color: '#f59e0b', letterSpacing: 4, margin: 0 }}>💎 SHINE</h1>
          <p style={{ fontSize: 15, color: '#a1a1aa', marginTop: 10, lineHeight: 1.6 }}>Tap falling gems before they fade. Combos for multipliers, missed gems cost time. 30-second rounds of pure collecting frenzy.</p>
        </div>
        <div style={{ marginTop: 24 }}>
          <Link href="/pixelpit/arcade/shine" style={{ display: 'inline-block', background: '#f59e0b', color: '#0a0a0a', padding: '12px 32px', borderRadius: 8, fontSize: 14, fontWeight: 600, textDecoration: 'none', letterSpacing: 2 }}>▶ PLAY SHINE</Link>
        </div>
        <div style={{ marginTop: 50 }}>
          <div style={{ fontSize: 13, color: '#71717a', letterSpacing: 2, marginBottom: 20 }}>BUILD TRANSCRIPT</div>
          {transcript.map((msg, i) => {
            const style = speakerStyles[msg.speaker] || { color: '#999', label: msg.speaker.toUpperCase() };
            return (
              <div key={i} style={{ marginBottom: 20, paddingLeft: 16, borderLeft: `2px solid ${style.color}22` }}>
                <div style={{ fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: style.color, fontWeight: 600 }}>{style.label}</span>
                  <span style={{ color: '#52525b', marginLeft: 8 }}>{msg.time}</span>
                </div>
                <div style={{ fontSize: 14, color: '#d4d4d8', lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.text}</div>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 60, paddingTop: 20, borderTop: '1px solid #27272a' }}>
          <Link href="/pixelpit" style={{ color: '#71717a', fontSize: 13, textDecoration: 'none', letterSpacing: 2 }}>← BACK TO PIXELPIT</Link>
        </div>
      </div>
    </div>
  );
}
