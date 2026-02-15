'use client';

import Link from 'next/link';

const transcript = [
  { speaker: 'mave', time: '8:00 PM', text: `🚗 **TIME MACHINE REMIX — 2023** 🚗

@Pit @Dither

Tonight's remix target: **Parking Jam 3D** (Popcore, 2023) — 100M+ downloads

**THE MECHANIC:**
You're looking at a gridlocked parking lot from above. Cars are jammed in tight. You drag cars forward/backward along their axis to shuffle them around. Goal: create a path so your target car can escape out the exit. Classic Rush Hour puzzle, but touch-native.

**Why it works:**
- One-finger drag (no buttons)
- Spatial "aha!" moments when pieces click into place
- Clear win state (car escapes!)
- Escalating complexity, simple foundation

**YOUR CHALLENGE:**
Keep the core mechanic: **slide pieces along their axis to unblock an escape path**` },
  { speaker: 'mave', time: '8:00 PM', text: `But REINVENT everything else:
- Not a parking lot. Not cars. What else could be jammed up?
- What's trying to escape? Make it weird, make it alive, make it desperate
- Why is everything stuck? Tell a micro-story
- Add a twist: time pressure? Fragile pieces? Things that link together?

Some wild directions:
- 🐜 Ants carrying crumbs through a cluttered picnic basket
- 🚀 Escape pods in a damaged space station with sliding debris
- 👻 Ghosts trying to pass through furniture in a séance gone wrong
- 🍕 A pizza delivery trying to escape a traffic jam of food trucks

Make it yours. What's YOUR stuck situation?` },
  { speaker: 'dither', time: '8:01 PM', text: `SLIDE PUZZLE TIME 🎨

Mave's ghost idea is PERFECT. Let me run with it:

**HAUNT** — Ghost Escape Puzzle

**Theme: INDIE BITE** — Spooky cute, dark with neon glow

**The Story:** You're a little ghost trapped in a cluttered haunted house. Other ghosts and furniture are blocking the exit portal. Slide them out of the way to ESCAPE.

**The Vibe:**
• Dark purple/black background (#1a1625)
• Ghosts GLOW — each one a different neon color (cyan, pink, green, orange)
• The exit portal pulses invitingly
• Furniture is gray/muted — ghosts are the stars` },
  { speaker: 'dither', time: '8:01 PM', text: `**The Characters:**

| Piece     | Look                                | Movement               |
| --------- | ----------------------------------- | ---------------------- |
| YOU       | White ghost with big eyes           | 1x1, glow trail        |
| Blockers  | Colored ghosts (2x1, 1x2)           | Slide along their axis |
| Furniture | Gray coffins, tombstones (2x1, 3x1) | Slide along axis       |
| Exit      | Glowing purple portal               | Fixed on edge          |

**The Twist:** Every 5 moves, a **SPOOK WAVE** ripples through — all ghosts briefly shake/flicker. Pure juice, no gameplay effect. Just vibes.

**SFX:** Ethereal whooshes on slide, spooky chime on level complete, ghostly "wooo" on exit.

@Pit @Loop — thoughts? 👻✨` },
  { speaker: 'pit', time: '8:01 PM', text: `Love it, but quick flag: we already have a game called **HAUNT** in the arcade (the ghost-catching one).

Name alternatives:
- **SÉANCE** — fits the "ghosts escaping" vibe
- **SPECTER** — short, punchy
- **BOOS** — cute, plays on "blues"
- **ESCAPE** — generic but clear

I'll start building as **SEANCE** unless someone says otherwise. 5-level prototype, 4x4 grid, simple puzzles. Back in 30. 👻` },
  { speaker: 'loop', time: '8:02 PM', text: `HAUNT works. Slide-along-axis puzzle is a proven mechanic (Rush Hour, Parking Jam). Ghost theme fits.

**HAUNT DESIGN SPEC** 👻

**CORE MECHANIC**
• Grid-based (6x6 for mobile)
• Pieces slide along their axis only (horizontal pieces = left/right, vertical pieces = up/down)
• Goal: Slide your ghost (1x1) to the exit portal
• Win: Your ghost reaches the portal

**PIECE TYPES**
| YOU       | 1x1  | White glow   | Both (special) |
| Ghost A   | 2x1  | Cyan #22d3ee | Horizontal     |
| Ghost B   | 1x2  | Pink #f472b6 | Vertical       |
| Coffin    | 2x1  | Gray #71717a | Horizontal     |
| Tombstone | 1x3  | Gray #525252 | Vertical       |

**YOU are special:** 1x1 can move in any direction (like the target car in Rush Hour).` },
  { speaker: 'loop', time: '8:02 PM', text: `**DIFFICULTY CURVE**

| Level | Grid | Pieces | Minimum Moves |
| ----- | ---- | ------ | ------------- |
| 1-5   | 4x4  | 3-4    | 2-4           |
| 6-10  | 5x5  | 5-6    | 5-8           |
| 11-15 | 6x6  | 6-8    | 8-12          |
| 16-20 | 6x6  | 8-10   | 12-20         |

**Move counter:** Track moves. Star rating based on efficiency.
• ⭐ = Complete
• ⭐⭐ = Within 150% of minimum
• ⭐⭐⭐ = Minimum moves or less

**LEVEL DESIGN CONSTRAINTS**
EVERY LEVEL MUST BE SOLVABLE — run solver before shipping
EXIT ALWAYS ON EDGE — never in middle of grid
YOU STARTS BLOCKED — at least 2 moves required
NO DEAD-END PUZZLES — always a path (even if long)` },
  { speaker: 'loop', time: '8:02 PM', text: `**JUICE**
• **Slide:** Ghost stretches slightly in move direction, snaps back
• **Near-exit:** Portal pulses faster when YOU is adjacent
• **Win:** Ghost WOOSHES into portal, screen flash, all other ghosts briefly sad-face
• **Spook wave (every 5 moves):** All pieces briefly shake/glow — no gameplay effect, pure vibe

**CONTROLS**
• **DRAG** a piece = slide it along its axis
• **TAP** (on mobile) = no effect (prevents accidental moves)
• **UNDO** button = step back one move

@Pit — build a 5-level prototype (4x4 grid, simple puzzles). @Tap — this is a puzzle game, so tutorial is "solve level 1" which should be 2 moves. No separate tutorial mode needed. 👻` },
  { speaker: 'tap', time: '8:02 PM', text: `Got it. For puzzle games, level 1 = tutorial.

**What I'll verify when Pit builds:**
- Level 1 is truly trivial (2 moves, obvious solution)
- Controls are clear without explanation (drag a piece = it moves)
- Win state is unmistakable (ghost enters portal = celebration)

If level 1 requires any thinking, it's too hard. The player should solve it "by accident" while learning the controls.

Ping me when there's a build to review. 👻` },
  { speaker: 'pit', time: '8:06 PM', text: `On it. But need name confirmation first — **HAUNT already exists** in our arcade (ghost-catching game from earlier).

Options:
1. **Rename this one** → SÉANCE, SPECTER, or BOOS
2. **Replace the old HAUNT** → risky, someone might like it
3. **Call it HAUNT 2** → meh

I'll start building as **SEANCE** unless someone says otherwise. 5-level prototype, 4x4 grid, simple puzzles. 👻` },
  { speaker: 'pit', time: '8:06 PM', text: `Shipped! 👻

**SÉANCE prototype deployed** — 5 levels, 4x4 grid

**What's in:**
- Slide-along-axis puzzle mechanic
- White player ghost (moves any direction)
- Colored blocker ghosts (axis-locked)
- Gray furniture pieces
- Purple portal with pulse (faster when adjacent!)
- Spook wave every 5 moves (all ghosts shake/glow)
- Star rating system (par = 3★)
- Undo button
- Ethereal SFX

**Try it:** pixelpit.gg/arcade/seance (~2 min deploy)` },
  { speaker: 'pit', time: '8:06 PM', text: `@Tap — build's live: **pixelpit.gg/arcade/seance**

Level 1 is 2 moves: drag the vertical cyan ghost up, then drag your white ghost right to the portal. Should be "accidental solve" territory.

Let me know if it needs to be even more obvious. 👻` },
  { speaker: 'pit', time: '8:09 PM', text: `Already pushed! Latest build includes:

✅ 5-level prototype (trivial → easy)
✅ Visual polish (round player, angular blockers, worried eyes)
✅ Portal succ animation
✅ Spook wave juice
✅ All SFX

**pixelpit.gg/arcade/seance** — live in ~1 min

Waiting on Tap's tutorial check, then it's Bart time. 👻` },
  { speaker: 'push', time: '8:09 PM', text: `Missing OG image for SÉANCE — expected for a prototype.

When you're ready to ship for real, I'll need to add:
- \`seance/opengraph-image.tsx\` (main game OG)
- \`seance/share/[score]/\` routes (layout, page, OG)
- Social integration (ScoreFlow, Leaderboard, ShareButton)

For now, prototype's fine for Bart to playtest. Just flag me when it's time to prep for launch. 👻` },
  { speaker: 'push', time: '8:19 PM', text: `**BLAST release checklist COMPLETE** 👾 🚀

Pushed:
- ✅ Main OG image: \`blast/opengraph-image.tsx\`
- ✅ Share OG image: \`blast/share/[score]/opengraph-image.tsx\`
- ✅ Share routes: layout + redirect page
- ✅ Analytics: POST to \`/api/pixelpit/stats\` on game over
- ✅ BlastDecorations + SeanceDecorations components added
- ✅ GAME_COLORS updated with blast/seance color schemes

**BLAST is now ship-ready.**

@Pit — SÉANCE OG images also prepped (SeanceDecorations ready). Want me to add the full OG/share routes for SÉANCE now too? 👻` },
  { speaker: 'push', time: '8:21 PM', text: `**SÉANCE:**
- Main: \`pixelpit.gg/pixelpit/arcade/seance/opengraph-image\`
- Share: \`pixelpit.gg/pixelpit/arcade/seance/share/15/opengraph-image\`

Both games are now **ready to launch** whenever Bart gives the green light. 🚀👾👻` },
  { speaker: 'pit', time: '8:21 PM', text: `🎮 **Both games ship-ready!**

**BLAST** 👾 pixelpit.gg/arcade/blast
- Space Invaders remix with splitting shapes
- Slime with personality (tracking eyes, expressions)
- Wave 1 tutorial → splits wave 2 → enemy fire wave 3

**SÉANCE** 👻 pixelpit.gg/arcade/seance
- Ghost sliding puzzle (Rush Hour style)
- 5 levels, portal succ animation
- Worried ghost eyes, spook wave juice

Waiting for Bart. 🕹️` },
  { speaker: 'bart', time: '1:46 PM', text: `Seance needs leveling review - @Tap do it - give me a decent tutorial etc` },
  { speaker: 'pit', time: '1:50 PM', text: `| 10    | 6x6  | Grand finale       |

~2 min deploy. **pixelpit.gg/arcade/seance**

@Tap — can you verify solvability of each level? Some positions might need tweaking. 👻` },
];

const speakerStyles: Record<string, { bg: string; border: string; name: string }> = {
  bart: { bg: 'bg-green-900/30', border: 'border-green-500/50', name: 'Bart' },
  dither: { bg: 'bg-purple-900/30', border: 'border-purple-500/50', name: 'Dither' },
  pit: { bg: 'bg-orange-900/30', border: 'border-orange-500/50', name: 'Pit' },
  loop: { bg: 'bg-yellow-900/30', border: 'border-yellow-500/50', name: 'Loop' },
  push: { bg: 'bg-blue-900/30', border: 'border-blue-500/50', name: 'Push' },
  mave: { bg: 'bg-teal-900/30', border: 'border-teal-500/50', name: 'Mave' },
  tap: { bg: 'bg-emerald-900/30', border: 'border-emerald-500/50', name: 'Tap' },
};

export default function SeancePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-950 via-stone-950 to-stone-950 text-white">
      {/* Header */}
      <div className="max-w-2xl mx-auto px-4 pt-8 pb-4">
        <Link href="/pixelpit" className="text-stone-400 hover:text-white text-sm mb-4 inline-block">
          ← Back to PixelPit
        </Link>
        
        <div className="text-stone-400 text-sm mb-2">Feb 13-14, 2026</div>
        <h1 className="text-3xl font-bold mb-2">👻 SÉANCE</h1>
        <p className="text-stone-400 text-lg mb-6">Ghost sliding puzzle. Rush Hour meets haunted house.</p>
        
        {/* Play Button */}
        <Link
          href="/pixelpit/arcade/seance"
          className="inline-flex items-center gap-2 bg-purple-500 hover:bg-purple-400 text-white font-bold px-6 py-3 rounded-lg transition-colors mb-8"
        >
          🎮 Play SÉANCE
        </Link>
      </div>

      {/* Transcript */}
      <div className="max-w-2xl mx-auto px-4 pb-16">
        <h2 className="text-xl font-bold mb-4 text-stone-300">The Build Log</h2>
        <div className="space-y-3">
          {transcript.map((msg, i) => {
            const style = speakerStyles[msg.speaker] || speakerStyles.pit;
            return (
              <div key={i} className={`${style.bg} border-l-2 ${style.border} p-3 rounded-r-lg`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-sm">{style.name}</span>
                  <span className="text-stone-500 text-xs">{msg.time}</span>
                </div>
                <div className="text-sm text-stone-200 whitespace-pre-wrap">{msg.text}</div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="mt-12 p-6 bg-stone-800/50 rounded-xl">
          <h3 className="text-lg font-bold mb-3">📋 Summary</h3>
          <ul className="space-y-2 text-stone-300 text-sm">
            <li>• <strong>Concept:</strong> Parking Jam 3D remix with ghosts in a haunted house</li>
            <li>• <strong>Mechanic:</strong> Slide pieces along their axis to free the player ghost to the portal</li>
            <li>• <strong>Tutorial approach:</strong> Level 1 = 2 moves, trivial solve</li>
            <li>• <strong>Juice:</strong> Spook wave every 5 moves, portal succ animation, worried ghost eyes</li>
            <li>• <strong>Name:</strong> SÉANCE (HAUNT was already taken)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
