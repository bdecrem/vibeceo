'use client';

import Link from 'next/link';

const transcript = [
  { speaker: 'bart', time: '1:56 PM', text: `@Dither pitch a fun new game idea that's in the infinite runner genre - pitch it in max 6 lines` },
  { speaker: 'dither', time: '1:57 PM', text: `**MELT** 🧊

You're an ice cube sliding down a hot volcano. You're MELTING.

- **Swipe** to dodge lava rocks
- **Collect ice cubes** to grow back
- **Bigger = more points** but harder to dodge
- **Too small = you evaporate = game over**

The tension: stay big for score, or shrink to survive?` },
  { speaker: 'bart', time: '1:57 PM', text: `@Pit ? thoughts?` },
  { speaker: 'pit', time: '1:57 PM', text: `Love it. Clear tradeoff, one input, visual feedback is instant. Size = hitbox = difficulty scaling built in.

Easy to build: auto-scroll down, swipe left/right lanes, shrink over time, ice pickups grow you. Particle steam when you melt. Can ship today. 🧊` },
  { speaker: 'dither', time: '5:50 PM', text: `LET'S GO 🧊🔥

**MELT — Visual Spec**

**Theme: INDIE BITE** — Hot, dangerous, neon lava glow

**The Character:** A chunky ice cube. Starts big (48px), shrinks over time. Cute worried face that gets MORE worried as you shrink. Steam particles constantly rising off it.

**The World:** Volcanic slope. Auto-scrolling downward. Dark rock (#1c1917) with glowing lava veins (#ef4444, #f97316).

**Palette:**
| Element | Color |
| ----------- | --------------------------------- |
| Ice cube | Cyan #22d3ee with white highlight |
| Lava rocks | Orange #f97316, red glow |
| Ice pickups | Bright cyan #67e8f9, sparkle |
| Background | Dark stone #1c1917 |
| Lava veins | Red #ef4444, pulsing |` },
  { speaker: 'dither', time: '5:50 PM', text: `**Mechanics:**

• **3 lanes** — swipe left/right to switch
• **Shrink** — lose 1px every 0.5s (constant melt)
• **Lava rocks** — hit = instant shrink by 8px + screen shake
• **Ice pickups** — collect = grow 12px
• **Death** — shrink below 8px = evaporate = game over

**Juice:**

• Steam particles rising constantly (more when small)
• Size = score multiplier (bigger = 2x points)
• Collect ice = satisfying "crystallize" sound + brief glow
• Hit lava = sizzle sound + flash red

Pit — three lanes, auto-scroll, shrink mechanic. Ship it! 🧊` },
  { speaker: 'pit', time: '5:51 PM', text: `On it. Building MELT prototype.` },
  { speaker: 'pit', time: '5:51 PM', text: `**MELT prototype shipped.** 🧊🌋

**Test at:** \`pixelpit.gg/pixelpit/arcade/melt\` (~2 min deploy)
**Local:** \`localhost:3000/pixelpit/arcade/melt\`

**Mechanic:**
- Ice cube auto-slides down volcano
- Melts over time (shrinks)
- Collect ice = grow back
- Rocks = push + small shrink
- Lava = big melt + steam

**Controls:** Drag left/right to steer

Dither — needs your vibe check on visuals. 💧` },
  { speaker: 'push', time: '5:51 PM', text: `New MELT build. Running checklist when gameplay is confirmed. 🚀` },
  { speaker: 'push', time: '5:51 PM', text: `Heads up @Pit — this rebuild stripped social integration.

Share routes exist (from Feb 5) but \`page.tsx\` is missing \`ScoreFlow\`/\`usePixelpitSocial\`. Will need to re-add when gameplay is locked. 🧊` },
  { speaker: 'bart', time: '5:52 PM', text: `@Loop build a tutorial mode for MELT introducing the user to the gameplay one step at a time OR tell pit and at dither what is not working in the game.` },
  { speaker: 'pit', time: '5:53 PM', text: `**MELT updated to Dither spec.** 🧊🌋

**Changes:**
- **3 lanes** — swipe left/right to switch
- **Worried face** — gets MORE worried as you shrink
- **Steam particles** — constantly rising, more when small
- **INDIE BITE colors** — cyan ice, red lava glow
- **Lava hit** — -8px + sizzle + screen shake + red flash
- **Ice pickup** — +12px + crystallize + sparkle burst
- **Size multiplier** — bigger = higher score` },
  { speaker: 'loop', time: '5:53 PM', text: `Let me assess MELT's learnability first.

**MELT mechanics:**

1. Drag to steer (intuitive)
2. You're shrinking constantly (needs visual feedback)
3. Ice pickups make you bigger (needs to be obvious)
4. Obstacles shrink you faster (needs to hurt visually)
5. Too small = death (needs warning)

**The risk:** Player doesn't understand they're melting, or doesn't connect ice pickups to growth.

**RECOMMENDATION: "Game IS the tutorial" approach**

Same philosophy as POUR. No separate tutorial mode. Make the first 10 seconds brain-dead obvious.` },
  { speaker: 'loop', time: '5:53 PM', text: `**FIRST 10 SECONDS OF MELT:**

**Seconds 0-3:**
• NO obstacles
• Ice cube starts at max size
• Text pulses: "YOU'RE MELTING!" as cube visibly shrinks
• Steam particles increase as cube gets smaller

**Seconds 3-6:**
• First ice pickup appears DIRECTLY in cube's path (no steering needed)
• When collected: cube grows visibly, "ICE!" text pops, satisfying sound
• Player connects: ice = good = growth

**Seconds 6-10:**
• First lava rock appears (easy to dodge)
• If hit: big shrink + "OUCH!" + screen shake
• Player connects: rocks = bad = shrink faster

**After 10 seconds:** Normal gameplay, difficulty ramps` },
  { speaker: 'pit', time: '5:55 PM', text: `**MELT updated with tutorial-by-design.** 🧊

**First 10 seconds teach the game:**
- **0-3s:** Empty, "YOU'RE MELTING!" popup
- **3-6s:** First ice in center lane (auto-collect, teaches ice=good)
- **6-10s:** First rock in side lane (easy dodge, teaches rock=bad)
- **After 10s:** Normal gameplay

**Visual feedback added:**
- ✓ Popup text: "YOU'RE MELTING!", "ICE!", "OUCH!"
- ✓ Red pulse/vignette when near death
- ✓ Score multiplier visible when big (e.g. "1.8x")
- ✓ Size bar turns red when low

No separate tutorial mode. Game teaches itself. 💧` },
  { speaker: 'loop', time: '5:55 PM', text: `Good. Now we wait for Bart's playtest. If the first 10 seconds don't click, we adjust the timing — but the approach is right. 🧊` },
  { speaker: 'bart', time: '6:00 PM', text: `GOOD JOB GUYS, this game mechanic works!! @Loop @Pit @Dither (don't do anything yet, thinking about next steps)` },
  { speaker: 'pit', time: '6:00 PM', text: `🧊 Standing by.` },
  { speaker: 'loop', time: '6:00 PM', text: `🧊 ✓` },
  { speaker: 'dither', time: '6:00 PM', text: `🧊🔥 LET'S GO! Waiting on you, Bart.` },
  { speaker: 'bart', time: '8:36 PM', text: `@Loop explain the difficulty ramp to me: I THINK there is an ABRUPT (not good) leap in difficulty after just a few seconds of gameplay, but then it just stays the same for at least 3000 units - i got bored so stopped playing. @Pit` },
  { speaker: 'loop', time: '8:36 PM', text: `**FIX: Gradual continuous ramp, not discrete phases**

Instead of sudden phase jumps, use **smooth interpolation**:

SCROLL_SPEED = 1.0 + (distance / 5000) * 1.0 // caps at 2.0x
ROCK_DENSITY = base + (distance / 3000) * 2 // gradual increase
ICE_FREQUENCY = high - (distance / 4000) // gradual decrease
MELT_RATE = 1.0 + (distance / 8000) * 0.5 // slow increase

**What this means:**
- At distance 0: Easy, like now
- At distance 1000: Slightly harder
- At distance 3000: Noticeably harder
- At distance 5000+: Intense

**No abrupt jumps.** Difficulty rises continuously. Player doesn't feel a "wall" — they feel the heat turning up gradually.` },
  { speaker: 'pit', time: '8:37 PM', text: `**Continuous ramp shipped.** No more phase jumps. All parameters scale smoothly with **distance**:

| Dist | Speed | Melt | Spacing | Rocks | Ice |
| ----- | ----- | ----- | ------- | ----- | --- |
| 0 | 1.0x | 1.0x | 200 | 40% | 40% |
| 2500 | 1.5x | 1.15x | 150 | 65% | 25% |
| 5000+ | 2.0x | 1.5x | 100 | 90% | 15% |

Heat turns up gradually — no walls. 🧊` },
  { speaker: 'bart', time: '8:42 PM', text: `it's RIDICULOUSLY BAD!!! within 20 seconds of gameplay there are now MANY CASES where there are literally lava blocks across the path, making it impossible not to fail. and there are even cases where lava is on top of ice - stupid. BAD JOB @Loop @Pit` },
  { speaker: 'loop', time: '8:42 PM', text: `You're right. That's broken. Two bugs:

**Bug 1: Impossible paths**
Rocks spanning the entire width = no way through = unfair death.

**Bug 2: Ice spawning on lava**
That's spawn collision — should never happen.

---

## **IMMEDIATE FIXES:**

**Fix 1: Path guarantee**
Every row of obstacles MUST have a gap of at least 30% screen width. Never spawn rocks that block 100% of the path.

MAX_ROCK_COVERAGE = 0.7 (70% of width max)
MIN_GAP_WIDTH = 30% of screen width

**Fix 2: Spawn exclusion**
Ice pickup positions must be checked against rock positions. If a rock is there, don't spawn ice there.

IF ice_spawn_position overlaps rock → find new position` },
  { speaker: 'pit', time: '8:43 PM', text: `**Fixed.** Commit \`a37071b4\`

**Bugs fixed:**
- ✓ Max 2 rocks per row — always 1 clear lane
- ✓ Ice offset from rocks — no overlap

**Difficulty halved:**
- Speed ramps over 10000 dist (was 5000)
- Rock chance maxes at 70% (was 90%)
- Ice stays generous much longer
- Pairs max 40% (was 60%)

Sorry for the broken build. Should be playable now. ⚙️` },
];

const speakerStyles: Record<string, { bg: string; border: string; name: string }> = {
  bart: { bg: 'bg-green-900/30', border: 'border-green-500/50', name: 'Bart' },
  dither: { bg: 'bg-purple-900/30', border: 'border-purple-500/50', name: 'Dither' },
  pit: { bg: 'bg-orange-900/30', border: 'border-orange-500/50', name: 'Pit' },
  loop: { bg: 'bg-yellow-900/30', border: 'border-yellow-500/50', name: 'Loop' },
  push: { bg: 'bg-blue-900/30', border: 'border-blue-500/50', name: 'Push' },
  mave: { bg: 'bg-teal-900/30', border: 'border-teal-500/50', name: 'Mave' },
};

export default function MeltPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-950 via-red-950/20 to-stone-950 text-white">
      {/* Header */}
      <div className="max-w-2xl mx-auto px-4 pt-8 pb-4">
        <Link href="/pixelpit" className="text-stone-400 hover:text-white text-sm mb-4 inline-block">
          ← Back to PixelPit
        </Link>
        
        <div className="text-stone-400 text-sm mb-2">Feb 12-13, 2026</div>
        <h1 className="text-3xl font-bold mb-2">🧊 MELT</h1>
        <p className="text-stone-400 text-lg mb-6">Ice cube survival on a volcano. Shrink to survive, grow for points.</p>
        
        {/* Play Button */}
        <Link
          href="/pixelpit/arcade/melt"
          className="inline-flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold px-6 py-3 rounded-lg transition-colors mb-8"
        >
          🎮 Play MELT
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
            <li>• <strong>Concept:</strong> Dither pitched an ice cube infinite runner with a size/score tradeoff</li>
            <li>• <strong>Core tension:</strong> Stay big for points vs shrink to dodge obstacles</li>
            <li>• <strong>Tutorial approach:</strong> "Game IS the tutorial" — first 10 seconds teach mechanics</li>
            <li>• <strong>Key fix:</strong> Continuous difficulty ramp instead of phase jumps</li>
            <li>• <strong>Shipped with:</strong> 3 lanes, worried face, steam particles, size multiplier</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
