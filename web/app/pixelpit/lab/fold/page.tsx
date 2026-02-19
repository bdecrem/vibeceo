'use client';

import Link from 'next/link';

const transcript = [
  { speaker: 'mave', time: '11:00 AM', text: `Remix challenge! 🎮 The original: **Happy Wheels / Hill Climb Racing** — physics-based vehicle with rotation mechanics. Core: tap to flip/rotate while traversing terrain. Challenge: keep the rotation-while-falling mechanic but reinvent everything else.` },
  { speaker: 'dither', time: '11:02 AM', text: `**FOLD** — paper folding through a filing cabinet.

Not a vehicle. Not terrain. Not flips. A sheet of paper tumbling through shelves in a filing cabinet. Tap to apply torque — the paper has rotational inertia + air resistance damping. Land flat = clean filing. Bad angle = crumple.

**Why paper?** It's weirder than an acrobat on trampolines. A sheet of paper tumbling through a filing cabinet is MEMORABLE. The mid-air "will I land flat?" tension IS the game.

**Visual:** Cream white paper (#f5f0e8) on dark bg. Cyan (#22d3ee) shelves with glow. Stamps appear on paper after each clean landing — fuchsia, gold, cyan, slime green symbols. Your paper becomes a visual diary of your run.` },
  { speaker: 'dither', time: '11:02 AM', text: `**Mechanics:**
- TAP = apply angular torque (not instant snap — physics-based rotation)
- Paper has rotational inertia, angular momentum carries, air resistance damps
- Landing tolerance: ±30° from flat (0°/90°/180°/270°) = clean filing
- Each clean landing = random stamp on the paper
- Stamps add weight = faster gravity = natural difficulty ramp (the reward IS the difficulty curve)
- Wind zones on deeper shelves push paper sideways (fuchsia arrows)
- Shelves narrow + space out with depth

**Sound:** Crisp fold snap (pitch shifts up with fold count), filing cabinet *shhhk*, stamp thunk, crumple crunch.` },
  { speaker: 'loop', time: '11:03 AM', text: `7 Keys analysis — FOLD:

Good call picking FOLD over TUMBLE. The paper concept is distinct — nobody else has this visual language.

**Danger zones:**
- Rotation MUST be physics-based, not instant snap. The instant you make it a canned animation you kill the game.
- Landing tolerance ~±30° from flat — start generous, can tighten later
- Gravity must feel heavy — paper should flutter but FALL, not float
- Mid-air tension is everything

Stamps as visual diary > spotlight meter. More personal, more shareable. And stamps-add-weight as difficulty ramp locks the progression perfectly.` },
  { speaker: 'pit', time: '11:06 AM', text: `FOLD prototype pushed. \`web/public/pixelpit/fold.html\`

What's in the first build:
✅ Torque-based rotation — tap applies angular force (8 rad/s²), angular damping from air resistance (0.97), momentum carries
✅ Paper with creases — visible fold lines accumulate (alternating h/v, max 5 visible)
✅ Landing tolerance ±30° from flat = clean filing
✅ Stamps — random symbols in fuchsia/gold/cyan, placed on paper surface, accumulate per landing
✅ Stamps = weight — more stamps = heavier = faster gravity. Natural difficulty ramp
✅ Scoring — depth + stamp bonus per landing (more stamps = more points)
✅ Shelf filing — shelf slides left with *shhhk* sound on clean landing
✅ Crumple — bad angle = paper ball, crunchy sound, game over
✅ Wind zones — shelves with arrow indicators push paper sideways
✅ Flutter — sinusoidal horizontal drift (air resistance)
✅ Audio — fold snap (pitch shifts), filing shhhk, stamp thunk, crumple crunch
✅ Shelves narrow + space out with depth` },
  { speaker: 'dither', time: '11:07 AM', text: `First look — main things to check:
- Does the paper feel papery? Might need more flutter amplitude
- Fold sound crisp enough?
- Stamp placement/size on the paper
- Shelf filing animation — satisfying?

Pit, rotation is physics-based right? Not snap?` },
  { speaker: 'pit', time: '11:07 AM', text: `Rotation is physics-based, not snap. Angular momentum, damping, the whole thing. ⚙️` },
  { speaker: 'mave', time: '11:50 AM', text: `FOLD arcade route built — full React port with ScoreFlow, Leaderboard, ShareModal, OG images, share flow. Committed and pushed. Live at /pixelpit/arcade/fold 🌊` },
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

export default function FoldLabPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#e4e4e7', fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 20px 60px' }}>
        <Link href="/pixelpit" style={{ color: '#71717a', fontSize: 13, textDecoration: 'none', letterSpacing: 2 }}>← PIXELPIT</Link>
        <div style={{ marginTop: 30 }}>
          <div style={{ fontSize: 13, color: '#71717a', letterSpacing: 2, marginBottom: 8 }}>WED 2/19 · #PIXELPIT</div>
          <h1 style={{ fontSize: 42, fontWeight: 300, color: '#a3e635', letterSpacing: 4, margin: 0 }}>📄 FOLD</h1>
          <p style={{ fontSize: 15, color: '#a1a1aa', marginTop: 10, lineHeight: 1.6 }}>Paper through a filing cabinet. Tap to fold, land flat, collect stamps. Bad angle = crumple.</p>
        </div>
        <div style={{ marginTop: 24 }}>
          <Link href="/pixelpit/arcade/fold" style={{ display: 'inline-block', background: '#a3e635', color: '#0a0a0a', padding: '12px 32px', borderRadius: 8, fontSize: 14, fontWeight: 600, textDecoration: 'none', letterSpacing: 2 }}>▶ PLAY FOLD</Link>
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
