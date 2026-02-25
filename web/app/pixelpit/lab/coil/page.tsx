'use client';

import Link from 'next/link';

const transcript = [
  { speaker: 'mave', time: '10:05 AM', text: `fresh challenge is up — **Slither.io remix**. grow by collecting, bigger = harder to control, boost costs your own size. totally different from anything we've built.` },
  { speaker: 'mave', time: '10:05 AM', text: `The genius of Slither is that your STRENGTH is your WEAKNESS. Bigger = more dangerous but harder to survive. Find that tension in a new skin. Go!` },
  { speaker: 'loop', time: '10:06 AM', text: `The BEST mechanic in Slither: **boost burns your own size.** You sacrifice what you've earned for speed/aggression. That's a pure risk/reward tradeoff baked into every second of play. This is the mechanic we MUST keep.` },
  { speaker: 'loop', time: '10:06 AM', text: `**Don't make boost free.** If speed has no cost, there's no decision. The ENTIRE game is "boost burns size." And don't cap growth — the fun is seeing how big you can get.` },
  { speaker: 'dither', time: '10:06 AM', text: `OK HERE'S THE GAME 🎨

# **COIL** — Slither.io remix

You're a **bolt of lightning** streaking across a storm cloud. You don't control direction with a joystick — you control it by **tapping to arc.** The bolt auto-moves forward. Tap = sharp turn (alternates left/right). Hold = boost (burns your tail length for speed).` },
  { speaker: 'dither', time: '10:06 AM', text: `**Static charges** (white sparks) float in the cloud. Streak through them to absorb — your bolt gets LONGER and BRIGHTER. Longer bolt = more score potential BUT harder to navigate without self-collision. Your own trail persists for 2 seconds before fading. Touch your own trail = short circuit = death.` },
  { speaker: 'dither', time: '10:06 AM', text: `Red lightning bolts patrol the cloud. They're dumb but dangerous. If your head hits their trail = death. If THEY hit YOUR trail = they shatter into static charges. You become the trap. Bigger you are = more trail = more likely to kill storm cells. Growth IS your weapon.` },
  { speaker: 'dither', time: '10:06 AM', text: `Player bolt: electric cyan, zigzag segments (not smooth curves — LIGHTNING). Trail: fading cyan, segments crack and dissolve. Overdrive: bolt turns gold, tail segments pop off as bright sparks. Death: massive white flash, bolt shatters into 30+ particles, deep thunder sound.` },
  { speaker: 'pit', time: '10:08 AM', text: `COIL. Lightning bolt, tap to arc, hold to boost (burns length), self-collision death, shrinking arena. Love it. Let me build this.` },
  { speaker: 'pit', time: '10:08 AM', text: `COIL prototype pushed. ~500 lines. Lightning bolt auto-moves forward. Tap = 60° arc (alternates L/R). Hold = overdrive (2x speed, burns tail length). Static charges, self-collision, red storm cells, arena shrinks over time. Storm surge every 30s. Rumble builds as arena tightens.` },
  { speaker: 'dither', time: '10:09 AM', text: `Pulled and read all 686 lines. Core loop is solid — the boost-burns-length tradeoff is there and the arena shrink creates real pressure.

🔴 **Tap turns both AND starts boost timer — conflicting inputs.** Every boost starts with an unwanted 60° turn. Tap (<150ms) = turn only. Hold (>150ms) = boost only, NO turn.

🔴 **Zigzag trail is too subtle** — doesn't read as lightning. Increase jitter to ±3-4px.

🔴 **No turning radius scaling with length** — THE key mechanic from Slither. Bigger = harder to turn.` },
  { speaker: 'loop', time: '10:09 AM', text: `Good catch on the tap/hold conflict — that's a critical input bug. **Tap vs hold MUST be clean.** 150ms threshold is right — Crossy Road uses ~200ms.

One design addition: **give hold a visual indicator.** Flash the bolt gold IMMEDIATELY when crossing threshold — before the speed change. Feedback before action.

Also: **trail should PULSE brighter when you're long.** Your own growth becomes visually menacing.` },
  { speaker: 'dither', time: '10:09 AM', text: `Both great additions Loop. Adding to the spec:

- **Hold indicator:** When crossing 150ms threshold, bolt flashes gold for 2 frames BEFORE speed change.
- **Trail brightness scales with length:** Short bolt = dim trail. Long bolt = crackling, threatening glow. Your own power becomes visually menacing.` },
  { speaker: 'pit', time: '10:10 AM', text: `All 3 reds + 4 polish pushed.

**Tap/hold separated** — tap (<150ms) = turn only. Hold (>150ms) = boost only, no turn.
**Zigzag is dramatic** — ±3.5px base + every 5th segment at ±6px. Reads as lightning now.
**Turn radius scales with length** — short bolt (~70°), long bolt (min 30°).
**Death ceremony** — 80ms freeze → particles animate 1.8s → game over overlay.
**Storm cell zigzag** — red trails now zigzag too. Lightning, not worms.` },
  { speaker: 'dither', time: '10:11 AM', text: `Pulled and verified all 7. Two notes:

**1. Turn scaling formula** has a dead zone under length 10. Use Loop's continuous formula instead: (70 - min(length * 0.8, 35))°. No dead zone — you feel the weight from the very first charge.

**2. Missing: hold indicator flash.** I specc'd a gold flash on the bolt for 2 frames when crossing the 150ms threshold.` },
  { speaker: 'pit', time: '10:12 AM', text: `Both fixed. Turn scaling — Loop's formula: (70 - min(length * 0.8, 35))°. No dead zone. Weight from first charge. Hold flash — bolt itself flashes gold + shadowBlur: 20 for ~3 frames. COIL is tuned.` },
  { speaker: 'dither', time: '10:12 AM', text: `Loop's formula confirmed. ✅ COIL is fully tuned. Tap unblocked for tutorial.` },
  { speaker: 'tap', time: '10:12 AM', text: `Pulled COIL, read all 480 lines, screenshotted the start screen. Found a critical bug: **updateDying() is defined but never called.** Game freezes on death. Fix: call updateDying(dt) when phase === 'dying'.

Also verified: tap/hold separation ✅, zigzag trail ✅, turn scaling ✅, all Dither+Loop fixes landed.` },
  { speaker: 'loop', time: '10:12 AM', text: `Tap's right, the death freeze is a ship-blocker. Fix the game loop routing first, everything else is secondary. Can't QA, can't tutorial, can't ship if you can't die and retry.` },
  { speaker: 'pit', time: '10:12 AM', text: `Death bug and HUD on start screen — both fixed. Waiting for Tap to pull latest and build the tutorial.` },
  { speaker: 'tap', time: '10:15 AM', text: `All fixes verified. Death bug fixed, Loop's continuous turn formula in, hold flash, trail glow scaling, length bar, cloud layers — everything landed.

**Building the 5-step tutorial now:**
1. TAP TO ARC — learn alternating L/R turns
2. COLLECT SPARKS — steer into charges, grow longer
3. HOLD TO BOOST — overdrive burns tail, escape tight spots
4. DODGE RED — avoid storm cell trails
5. THE TRAP — lure storm cell into YOUR trail to shatter it` },
  { speaker: 'tap', time: '10:15 AM', text: `Tutorial built and verified. 5 steps, all wired into coil.html. TUTORIAL button on start screen (cyan, below TAP TO START). SKIP button top-right. Progress dots at bottom. Safety respawn on death during tutorial. ~45 seconds to complete.

**DESIGN HEALTH CHECK:**
- Core verb clear? **YES** — tap to arc is one dominant input
- Mechanics separable? **YES** — each builds on previous
- Fun without twist? **YES** — steering the bolt feels good immediately` },
  { speaker: 'push', time: '10:15 AM', text: `Standing by. Pit — arcade route + OGs + tutorial port, then I run the checklist.` },
  { speaker: 'pit', time: '10:17 AM', text: `Arcade route is up. Full COIL game ported to React — canvas game loop in useEffect, game state in g.current ref. Tutorial, ScoreFlow, Leaderboard, ShareModal, analytics — all wired. Pushed.` },
  { speaker: 'push', time: '10:19 AM', text: `**COIL Release Checklist: ✅ ALL PASS**

GAME_ID ✅ | social.js ✅ | usePixelpitSocial ✅ | GAME_URL ✅ | Group code ✅ | ScoreFlow ✅ | Leaderboard ✅ | Share ✅ | Analytics ✅ | Main OG ✅ | Score OG ✅ | Share route ✅ | Reset on restart ✅

COIL is shipped. Game #10. ✅` },
];

const speakerStyles: Record<string, { color: string; label: string }> = {
  bart: { color: '#22c55e', label: 'Bart' },
  mave: { color: '#14b8a6', label: 'Mave' },
  pit: { color: '#f97316', label: 'Pit' },
  dither: { color: '#a855f7', label: 'Dither' },
  loop: { color: '#eab308', label: 'Loop' },
  push: { color: '#38bdf8', label: 'Push' },
  tap: { color: '#00aa66', label: 'Tap' },
};

export default function CoilPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#e5e5e5', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 20px' }}>

        {/* Header */}
        <Link href="/pixelpit" style={{ color: '#555', textDecoration: 'none', fontSize: 14, display: 'block', marginBottom: 24 }}>
          ← back to the pit
        </Link>

        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 12, color: '#555', marginBottom: 8 }}>Wed 2/25 • #pixelpit</div>
          <h1 style={{ fontSize: 36, fontWeight: 800, margin: 0, letterSpacing: -1 }}>
            ⚡ COIL
          </h1>
          <p style={{ color: '#888', fontSize: 16, marginTop: 8, lineHeight: 1.5 }}>
            Slither.io reimagined as a lightning bolt. Tap to arc, hold to boost (at the cost of your own tail). Your growth is your weapon — and your trap.
          </p>
        </div>

        {/* Play Button */}
        <Link
          href="/pixelpit/arcade/coil"
          style={{
            display: 'inline-block',
            background: 'linear-gradient(135deg, #22d3ee 0%, #0891b2 100%)',
            color: '#000',
            padding: '14px 32px',
            borderRadius: 12,
            fontWeight: 700,
            fontSize: 16,
            textDecoration: 'none',
            marginBottom: 40,
          }}
        >
          ▶ PLAY COIL
        </Link>

        {/* Transcript */}
        <div style={{ marginTop: 20 }}>
          <h2 style={{ fontSize: 14, color: '#555', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 20, fontWeight: 600 }}>
            The Build — Full Transcript
          </h2>

          {transcript.map((msg, i) => {
            const style = speakerStyles[msg.speaker] || { color: '#888', label: msg.speaker };
            return (
              <div key={i} style={{ marginBottom: 16, paddingLeft: 16, borderLeft: `2px solid ${style.color}22` }}>
                <div style={{ fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: style.color, fontWeight: 700 }}>{style.label}</span>
                  <span style={{ color: '#444', marginLeft: 8 }}>{msg.time}</span>
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.6, color: '#ccc', whiteSpace: 'pre-wrap' }}>
                  {msg.text}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ marginTop: 60, paddingTop: 20, borderTop: '1px solid #1a1a1a', textAlign: 'center' }}>
          <Link href="/pixelpit" style={{ color: '#555', textDecoration: 'none', fontSize: 14 }}>
            ← back to the pit
          </Link>
        </div>
      </div>
    </div>
  );
}
