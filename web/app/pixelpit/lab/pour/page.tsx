'use client';

import Link from 'next/link';

const transcript = [
  { speaker: 'mave', time: '3:55 PM', text: `🎰 **TIME MACHINE REMIX** 🎰

<@Pit> <@Dither>

Tonight's roll: **Sand Balls** (2019) — the "dig paths for falling objects" mechanic. Over 100M downloads.

**THE ORIGINAL:**
- Balls pile up at the top
- Swipe to dig through sand/obstacles
- Guide balls to the truck at the bottom
- Satisfying physics + tactile carving

**YOUR CHALLENGE:**
Keep that dig-and-drop satisfaction. REINVENT everything else:
- 🚫 Not sand, not balls, not a truck
- 🌍 New world, new falling objects, new goal
- ✨ What makes the payoff satisfying?

Pitch me something weird. 🌊` },
  { speaker: 'pit', time: '3:56 PM', text: `Yeah, saw it. Sand Balls remix — dig paths for falling objects.

Quick take: full physics sim with piling/rolling is heavy. Simpler version: **one object falls at a time**, swipe to carve the path, it slides down. More puzzle, less chaos, still satisfying.

Waiting on Dither for the theme — what are we digging through, what's falling? 🎨` },
  { speaker: 'dither', time: '3:56 PM', text: `YES! Sand Balls is perfect for a remix. That dig-and-drop satisfaction is *chef's kiss*. 🎨

---

## **POUR** — Cloud Digging Game

**Theme: PLAYROOM** — Soft, cozy, garden vibes

**The World:** You're digging through FLUFFY CLOUDS. Soft whites and grays, cotton-candy texture. Swipe to carve paths through the sky.

**The Characters:** RAINDROPS. They form at the top, wobble, then fall through your carved paths. Cute little blue tear-shapes with tiny faces.

**The Goal:** A FLOWER POT at the bottom. Fill it with raindrops. When it's full — **FLOWERS BLOOM**. 🌸

That's the payoff. Not a truck driving away. LIFE GROWING.

**The Twist:** Different clouds have different densities:
- White clouds = easy dig
- Gray clouds = slower dig
- Dark storm clouds = can't dig (obstacles)

**Juice:** Raindrops go "plink plink" when they land. Flowers grow in real-time. Screen gets more colorful as you succeed.

Pit — thoughts? 💧🌸` },
  { speaker: 'pit', time: '3:56 PM', text: `Love it. Buildable and beautiful.

**Tech approach:**
- Cloud = grid of cells (pixel art style)
- Swipe = erase cells in brush radius
- White/gray/dark = 1 hit / 2 hits / indestructible
- Raindrops fall with gravity, slide along remaining cloud edges
- Flower pot = catch zone, fill meter, bloom animation

One raindrop at a time or multiple? Single is cleaner for v1, can add "rain shower" chaos mode later.

Ready to build when Loop signs off on the spec. 💧🌸` },
  { speaker: 'loop', time: '3:57 PM', text: `POUR is solid. Clouds → raindrops → flowers is thematically coherent and the payoff (life growing) is more satisfying than "truck leaves."

**POUR SPEC** 💧

**CORE LOOP**
1. Raindrops form at top of screen
2. Player swipes to carve paths through clouds
3. Raindrops fall through carved paths
4. Collect in flower pot → flowers bloom

**CLOUD PHYSICS**
\`\`\`
CLOUD_GRID = 8px cells
BRUSH_RADIUS = 24px (3 cells)
WHITE_CLOUD = 1 swipe to clear
GRAY_CLOUD = 2 swipes to clear
DARK_CLOUD = indestructible (obstacle)
\`\`\`

**The feel:** Raindrops should feel HEAVY but SLOW. They slide and settle, not ping-pong. You have time to carve ahead of them.` },
  { speaker: 'loop', time: '3:57 PM', text: `**LEVEL STRUCTURE**
| Level | Cloud Layout             | Drops Needed |
| ----- | ------------------------ | ------------ |
| 1-5   | All white, simple        | 3-5          |
| 6-10  | White + gray             | 5-8          |
| 11-15 | White + gray + obstacles | 8-10         |
| 16-20 | Complex mazes            | 10-15        |

**20 levels total.** Each level = fixed layout, fixed number of drops to collect.

**RISKS**
1. **Carving feels slow** — Brush needs to be big enough
2. **Raindrops get stuck** — If drop hasn't moved in 2 seconds, give it a gentle nudge
3. **Levels too puzzle-y** — Don't hide the solution. Player should see the path

Pit — build World 1 (levels 1-5, all white clouds). 💧🌸` },
  { speaker: 'pit', time: '3:59 PM', text: `On it. Building POUR World 1 (levels 1-5, all white clouds).

**Implementation plan:**
- Grid: 8px cells, canvas-based
- Carve: touch/mouse drag, 24px brush, instant cell removal + poof particles
- Drop: one at a time, gravity 0.3, slide along surfaces
- Pot: wide catch zone, fill meter, bloom animation on complete
- 5 levels, 3-5 drops each, simple paths

Shipping to \`/arcade/pour/\`. Will ping when playable. 💧🌸` },
  { speaker: 'pit', time: '3:59 PM', text: `**POUR World 1 shipped.** 💧🌸

5 levels, all white clouds. Swipe to carve, raindrops fall through, flowers bloom when pot fills.

**Test at:** \`pixelpit.gg/pixelpit/arcade/pour\` (~2 min deploy)

Loop, Dither — check the feel:
- Is the brush big enough?
- Do raindrops get stuck?
- Is the carve satisfying?

Push — ready for social integration when gameplay is confirmed. ⚙️` },
  { speaker: 'loop', time: '3:59 PM', text: `Shipped fast. Key test: Does carving feel like finger-painting or like fighting the UI? The brush needs to leave a trail of destruction that feels effortless.

Waiting for Bart's playtest feedback. 💧` },
  { speaker: 'dither', time: '3:59 PM', text: `Cloud carving game is LIVE! 💧🌸

Can't wait to see those flowers bloom. The poof particles on carve better be FLUFFY — clouds should feel like cotton candy disappearing.

If raindrops feel too fast, slow that gravity down. The satisfaction is watching them *roll* down your carved paths, not zip through.` },
  { speaker: 'bart', time: '4:10 PM', text: `Perfect let me play` },
  { speaker: 'bart', time: '4:13 PM', text: `Hey i understand the game! It's a where's my water knockoff … but uhm, I worked on that game.` },
  { speaker: 'bart', time: '4:16 PM', text: `1- make it carve much more narrow tunnels- half as wide
2- I think you have a construct of rocks/obstacles- do not let me carve through those` },
  { speaker: 'pit', time: '4:16 PM', text: `On it.

1. **Narrower brush:** 24px → 12px (half width)
2. **Gray = indestructible:** Can't carve through obstacles at all` },
  { speaker: 'pit', time: '4:16 PM', text: `Done.

- **Brush halved:** 24px → 12px (narrow tunnels)
- **Gray = indestructible:** Obstacles can't be carved through at all

Pushed. ~2 min. 💧` },
  { speaker: 'bart', time: '4:19 PM', text: `Remove the "swipe to dig" instruction- not needed` },
  { speaker: 'pit', time: '4:19 PM', text: `Gone. No hints — game teaches itself. 💧` },
  { speaker: 'bart', time: '4:21 PM', text: `Now add a try again button for when the user is stuck- you lose one of your hearts tho` },
  { speaker: 'pit', time: '4:22 PM', text: `Done. **SKIP (-1❤️)** button bottom-right. Costs one heart, respawns the drop. 💧` },
  { speaker: 'bart', time: '6:59 PM', text: `Hey did you ship this? Is it any good??` },
  { speaker: 'pit', time: '6:59 PM', text: `Shipped. Live at \`pixelpit.gg/pixelpit/arcade/pour\`

5 levels, narrow tunnels, gray obstacles, skip button. Waiting on Dither's vibe check. 💧` },
  { speaker: 'dither', time: '6:59 PM', text: `It's live! And honestly? This one WORKS. 🌸

**Why POUR is good:**

1. **Bart understood it instantly** — after CHROMA's five failed tutorials, that's a WIN
2. **The payoff is satisfying** — flowers blooming > truck driving away
3. **Narrow tunnels = precision** — makes carving feel skillful, not sloppy
4. **No tutorial needed** — Level 1 teaches itself (thin strip, straight path)

**What I'd juice up if we polish:**
- Cloud poof particles when you carve (fluffy cotton candy burst)
- Raindrop wobble animation (they should feel *wet*)
- Flower bloom should be BIG — that's the dopamine moment
- Soft piano "plink" on each drop landing, builds to a chord on level complete

But the core is solid. It's learnable, it's satisfying, it's got a clear goal. Ship it. 💧🌸` },
];

const speakerStyles: Record<string, { bg: string; text: string; name: string }> = {
  mave: { bg: '#0ea5e9', text: '#ffffff', name: 'Mave' },
  dither: { bg: '#a855f7', text: '#ffffff', name: 'Dither' },
  pit: { bg: '#f97316', text: '#ffffff', name: 'Pit' },
  loop: { bg: '#facc15', text: '#18181b', name: 'Loop' },
  push: { bg: '#3b82f6', text: '#ffffff', name: 'Push' },
  bart: { bg: '#22c55e', text: '#ffffff', name: 'Bart' },
};

export default function PourLabPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(to bottom, #0f172a, #1e293b)',
      color: '#f8fafc',
      fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace",
    }}>
      {/* Header */}
      <div style={{
        padding: '40px 20px 20px',
        textAlign: 'center',
        borderBottom: '1px solid #334155',
      }}>
        <Link href="/pixelpit" style={{ 
          color: '#94a3b8', 
          textDecoration: 'none',
          fontSize: 12,
          letterSpacing: 2,
        }}>
          ← PIXELPIT
        </Link>
        <div style={{ marginTop: 20 }}>
          <span style={{ fontSize: 11, color: '#64748b', letterSpacing: 2 }}>
            WED 2/12
          </span>
        </div>
        <h1 style={{
          fontSize: 'clamp(32px, 8vw, 48px)',
          margin: '8px 0',
          letterSpacing: 4,
        }}>
          💧 POUR
        </h1>
        <p style={{
          color: '#94a3b8',
          fontSize: 14,
          maxWidth: 400,
          margin: '0 auto',
          lineHeight: 1.6,
        }}>
          Sand Balls remix — dig through clouds, guide raindrops to flower pots
        </p>
        <Link 
          href="/pixelpit/arcade/pour"
          style={{
            display: 'inline-block',
            marginTop: 20,
            padding: '12px 32px',
            background: '#22d3ee',
            color: '#0f172a',
            textDecoration: 'none',
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 14,
            letterSpacing: 2,
          }}
        >
          ▶ PLAY POUR
        </Link>
      </div>

      {/* Transcript */}
      <div style={{
        maxWidth: 700,
        margin: '0 auto',
        padding: '30px 20px 60px',
      }}>
        <h2 style={{
          fontSize: 14,
          color: '#64748b',
          letterSpacing: 3,
          marginBottom: 24,
          textAlign: 'center',
        }}>
          THE BUILD TRANSCRIPT
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {transcript.map((msg, i) => {
            const style = speakerStyles[msg.speaker] || speakerStyles.mave;
            return (
              <div key={i} style={{
                background: '#1e293b',
                borderRadius: 12,
                padding: 16,
                borderLeft: `4px solid ${style.bg}`,
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 8,
                }}>
                  <span style={{
                    background: style.bg,
                    color: style.text,
                    padding: '2px 8px',
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 700,
                  }}>
                    {style.name}
                  </span>
                  <span style={{ color: '#64748b', fontSize: 11 }}>
                    {msg.time}
                  </span>
                </div>
                <div style={{
                  color: '#e2e8f0',
                  fontSize: 13,
                  lineHeight: 1.7,
                  whiteSpace: 'pre-wrap',
                }}>
                  {msg.text}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        textAlign: 'center',
        padding: '40px 20px',
        borderTop: '1px solid #334155',
      }}>
        <Link 
          href="/pixelpit/arcade/pour"
          style={{
            display: 'inline-block',
            padding: '14px 40px',
            background: '#22d3ee',
            color: '#0f172a',
            textDecoration: 'none',
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 14,
            letterSpacing: 2,
          }}
        >
          ▶ PLAY POUR
        </Link>
        <div style={{ marginTop: 20 }}>
          <Link href="/pixelpit" style={{ 
            color: '#64748b', 
            textDecoration: 'none',
            fontSize: 12,
            letterSpacing: 2,
          }}>
            ← BACK TO PIXELPIT
          </Link>
        </div>
      </div>
    </div>
  );
}
