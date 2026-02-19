'use client';

import Link from 'next/link';

const transcript = [
  { speaker: 'mave', time: '11:00 AM', text: `Remix challenge time! 🎮 The original: **Alto's Odyssey** (2018) — one-tap snowboarding with buttery physics. Core mechanic: **tap-to-backflip while descending slopes.** Challenge: keep the backflip-while-falling mechanic but reinvent everything else.` },
  { speaker: 'dither', time: '11:01 AM', text: `**SIFT** — mercury dropping through rotating layers.

Not snow. Not slopes. Not backflips. Instead: a mercury ball falling through horizontal layers with gaps. Player drags to ROTATE each layer, aligning the gap so mercury drops through.

**Visual direction:** Indie Bite dark (#0a0a0a). Mercury ball is liquid silver (#e8e8f0) with a highlight dot. Layers are cyan (#22d3ee) horizontal bars with slime green (#a3e635) gap glow. Fuchsia (#d946ef) for magnetic layers. Pure black (#111111) for death layers.

**The feel:** Each gap-pass should feel like threading a needle. The mercury should look HEAVY but mercury-smooth. Not bouncy — liquid. When it hits a surface, it squashes then reforms.` },
  { speaker: 'dither', time: '11:01 AM', text: `**Mechanics:**
- DRAG to rotate the nearest layer below mercury
- Layers wrap around (gap can scroll off one edge and appear on the other)
- Combo system: chain 3+ gap passes without landing = multipliers (3+=2x, 5+=3x, 8+=5x)
- Magnetic layers (fuchsia): pull mercury sideways while nearby — must pre-compensate
- Black layers: NO GAP. Instant death if mercury hits one. Rotate it out of the way.
- Gravity increases with depth — natural difficulty ramp

**Sound:** Descending ping on each pass (800Hz - depth*12). Shatter = noise burst + sub thud. Low drone that deepens as you go.` },
  { speaker: 'loop', time: '11:02 AM', text: `7 Keys analysis:

**Core verb:** Rotate (drag to turn layers) — good, single-verb design
**Pacing:** Gravity ramp + combo timer creates natural escalation without artificial timers
**Risk vs reward:** Landing resets combo, passing through keeps it. Clean tension.
**Danger zones:** Drag sensitivity needs to be tuned carefully for mobile — too sensitive = frustrating, too sluggish = death. Gap glow needs to be readable at speed.
**Readability:** Active layer needs clear visual indicator so player knows WHICH layer they're rotating` },
  { speaker: 'pit', time: '11:03 AM', text: `SIFT prototype pushed. \`web/public/pixelpit/sift.html\`

What's in:
✅ Layer rotation via drag (wrapping gaps)
✅ Mercury ball with squash/reform physics
✅ Combo system with multipliers
✅ Magnetic layers (fuchsia) with sideways pull
✅ Black layers (no gap, instant death)
✅ Gravity scales with depth
✅ Descending ping pitch (800 - depth * 12)
✅ Shatter effect (12 beads + noise burst + sub thud)
✅ Camera follow with lerp
✅ Drone that deepens with progress` },
  { speaker: 'dither', time: '11:05 AM', text: `First review — 3 red flags:

🔴 **Drag sensitivity** — \`/ W\` is way too sluggish on mobile. Change to \`/ (W * 0.3)\`. 1/3 screen width = full rotation.
🔴 **Gap glow** — 0.15 alpha is invisible at speed. Bump to 0.25 + add shadowBlur: 6.
🔴 **Active layer indicator** — player can't tell which layer they're rotating. Brighten the active layer's bars + add pulsing gap glow with sin(gameTime * 6).

Fix these before we move on.` },
  { speaker: 'pit', time: '11:08 AM', text: `SIFT fixes pushed:

✅ **drag sensitivity 3x** — 1/3 screen width = full rotation now
✅ **gap glow** bumped to 0.25 alpha + shadowBlur 6
✅ **active layer** — bars brighten, gap pulses with sin(gameTime * 6)

All 3 reds addressed.` },
  { speaker: 'dither', time: '11:10 AM', text: `All three reds confirmed fixed:
- ✅ Drag: W * 0.3 — 3x more responsive
- ✅ Gap glow: shadowBlur = 6
- ✅ Active layer pulse: sin(gameTime * 6)

**SIFT is clean.** No open flags. Ready for Tap playtest and Push ship checklist.` },
  { speaker: 'tap', time: '11:12 AM', text: `🎓 **TAP'S PLAY REPORT: SIFT**

**MECHANIC STACK (in learning order):**
1. ROTATE — drag to rotate the nearest layer, aligning the gap
2. FALL — mercury drops with gravity, pass through gaps to score
3. COMBO — chain 3+ drops without landing for multipliers
4. MAGNETS — fuchsia layers pull mercury sideways
5. BLACK LAYERS — no gap, instant death

**DESIGN HEALTH CHECK:**
- Core verb clear? YES
- Mechanics separable? YES — can teach rotate, then combo, then magnets
- Fun without twist? YES — watching mercury drop through gaps you aligned is satisfying

🟡 Bounce 0.3 → 0.4 + micro screen shake on surface landings. Minor but makes every hit feel physical.` },
  { speaker: 'pit', time: '11:14 AM', text: `Done. Bounce 0.4 + screen shake on surface hit. Pushed.` },
  { speaker: 'tap', time: '11:16 AM', text: `SIFT tutorial is done. 3 steps, ~25 seconds:

| Step | Instruction | Setup |
|------|------------|-------|
| ROTATE | "DRAG TO ALIGN THE GAP" | 3 layers with offset gaps. Pass 2 to advance. |
| COMBO | "CHAIN DROPS FOR BONUS" | 4 nearly-aligned layers. Hit 3x combo to pass. |
| MAGNETS | "MAGNETIC LAYERS PULL YOU" | Normal + magnetic + normal. Must compensate. |

Included all of Dither's fixes: drag sensitivity, gap glow, active layer pulse, bounce 0.4 + screen shake. TUTORIAL button on start screen, SKIP button during.` },
  { speaker: 'push', time: '11:18 AM', text: `SIFT Release Checklist — FINAL:

✅ GAME_ID: 'sift'
✅ social.js loading via Script
✅ usePixelpitSocial hook
✅ ScoreFlow with onProgression
✅ Leaderboard as MODAL with groupsEnabled
✅ User-aware share: ShareModal for logged-in, ShareButtonContainer for anonymous
✅ OG image renders (mercury + layer lines)
✅ Score share route (share/[score]/)
✅ Analytics POST on game over

SIFT is shippable. 🚀` },
  { speaker: 'dither', time: '11:19 AM', text: `**SIFT IS SHIPPED.** 🎨🚀

Great build. Clean concept — one mechanic (rotate) with layers of complexity added through magnets and black layers. The mercury feel is right. The combo system gives it replay value. Tutorial teaches without handholding.

From pitch to live in one session. Let's keep going.` },
];

const speakerStyles: Record<string, { color: string; label: string }> = {
  mave: { color: '#2dd4bf', label: 'MAVE' },
  dither: { color: '#c084fc', label: 'DITHER' },
  pit: { color: '#fb923c', label: 'PIT' },
  loop: { color: '#fde047', label: 'LOOP' },
  tap: { color: '#67e8f9', label: 'TAP' },
  push: { color: '#60a5fa', label: 'PUSH' },
  bart: { color: '#4ade80', label: 'BART' },
};

export default function SiftLabPage() {
  return (
    <div style={{
      minHeight: '100vh', background: '#0a0a0a', color: '#e4e4e7',
      fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
    }}>
      {/* Header */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 20px 60px' }}>
        <Link href="/pixelpit" style={{ color: '#71717a', fontSize: 13, textDecoration: 'none', letterSpacing: 2 }}>
          ← PIXELPIT
        </Link>

        <div style={{ marginTop: 30 }}>
          <div style={{ fontSize: 13, color: '#71717a', letterSpacing: 2, marginBottom: 8 }}>
            WED 2/19 · #PIXELPIT
          </div>
          <h1 style={{ fontSize: 42, fontWeight: 300, color: '#a3e635', letterSpacing: 4, margin: 0 }}>
            🧪 SIFT
          </h1>
          <p style={{ fontSize: 15, color: '#a1a1aa', marginTop: 10, lineHeight: 1.6 }}>
            Mercury through layers. Drag to rotate, align the gaps, chain combos. Don&apos;t hit black.
          </p>
        </div>

        {/* Play Button */}
        <div style={{ marginTop: 24 }}>
          <Link
            href="/pixelpit/arcade/sift"
            style={{
              display: 'inline-block', background: '#a3e635', color: '#0a0a0a',
              padding: '12px 32px', borderRadius: 8, fontSize: 14, fontWeight: 600,
              textDecoration: 'none', letterSpacing: 2,
            }}
          >
            ▶ PLAY SIFT
          </Link>
        </div>

        {/* Transcript */}
        <div style={{ marginTop: 50 }}>
          <div style={{ fontSize: 13, color: '#71717a', letterSpacing: 2, marginBottom: 20 }}>
            BUILD TRANSCRIPT
          </div>
          {transcript.map((msg, i) => {
            const style = speakerStyles[msg.speaker] || { color: '#999', label: msg.speaker.toUpperCase() };
            return (
              <div key={i} style={{ marginBottom: 20, paddingLeft: 16, borderLeft: `2px solid ${style.color}22` }}>
                <div style={{ fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: style.color, fontWeight: 600 }}>{style.label}</span>
                  <span style={{ color: '#52525b', marginLeft: 8 }}>{msg.time}</span>
                </div>
                <div style={{
                  fontSize: 14, color: '#d4d4d8', lineHeight: 1.7,
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                }}>
                  {msg.text}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ marginTop: 60, paddingTop: 20, borderTop: '1px solid #27272a' }}>
          <Link href="/pixelpit" style={{ color: '#71717a', fontSize: 13, textDecoration: 'none', letterSpacing: 2 }}>
            ← BACK TO PIXELPIT
          </Link>
        </div>
      </div>
    </div>
  );
}
