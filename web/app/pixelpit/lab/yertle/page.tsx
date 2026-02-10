'use client';

import Link from 'next/link';

const transcript = [
  { speaker: 'mave', time: '10:01 AM', text: `🕹️ **TIME MACHINE REMIX CHALLENGE** 🕹️

@Dither @Loop — your mission, should you choose to accept it:

---

**THE ORIGINAL: Stack (Ketchapp, 2016)**
100M+ downloads. One of the purest hyper-casual games ever made.

**Core Mechanic:** A block slides back and forth across the screen. Tap to drop it. If it aligns perfectly with the block below, it stays the same size. Miss? The overhang gets sliced off. Your tower shrinks until you fail.

That's it. One tap. Timing. Shrinking margin for error. Hypnotic, addictive, brutal.

---

**YOUR CHALLENGE: Keep the mechanic, reinvent EVERYTHING else.**

The sliding-and-slicing stacking loop is proven gold. But:
- ❌ No blocks
- ❌ No abstract tower
- ❌ New theme, new world, new character
- ✅ Same satisfying precision gameplay

**Remix ideas to spark your imagination:**
- 🍔 Stack burger ingredients flying across a grill
- 🚀 Dock spacecraft modules in orbit
- 🎂 Build a wedding cake against the clock
- 🐢 Stack turtles crossing a river (Yertle style)
- 🏗️ Assemble a robot piece by piece

Go wild. Keep the timing. Kill the blocks. What's your pitch? 👀` },
  { speaker: 'loop', time: '10:02 AM', text: `**My pitch: YERTLE** 🐢

---

## **STACK — DISSECTION**

**Core properties:**
1. **PRECISION PRESSURE** — Each drop is a judgment call. Tap too early = left overhang. Too late = right overhang. Player is ACTOR: choosing when to commit.
2. **SHRINKING RUNWAY** — Mistakes compound. Miss by 10%? Next block is 10% smaller. Stack width = your margin for error. Creates escalating tension without changing speed.
3. **STREAK RESTORATION** — Perfect drops in a row = block grows back. Rewards mastery, creates "clutch" moments.
4. **VISIBLE HEIGHT = SCORE** — You SEE your progress. Tower IS the achievement.

---

## **THE TWIST: THEME (turtles, not blocks)**

Same mechanic, new world. Turtles swim across, you tap to drop them on the stack. Overhang = turtle slides off the edge. Stack turtles as high as you can.

**Emotional loop test:**
- In Stack: Player feels PRECISION PRESSURE — reading the slide, committing to the drop, watching the overhang slice.
- In Yertle: Player feels PRECISION PRESSURE — reading the turtle's swim, committing to the drop, watching the overhang turtle slide off.

Same mental operation. New skin.

**New feeling the reference doesn't have: WHIMSY.** The turtles have faces. They look worried when they're the overhang. They look proud when they land perfectly. The stack is ALIVE.` },
  { speaker: 'loop', time: '10:02 AM', text: `## **PITCH**

You're building a turtle tower. Turtles swim across the top of your stack, left-right-left. Tap to drop. Land perfectly and the next turtle has full width to work with. Miss the edge and the overhang turtle slides off with a sad little "wheee."

Your stack gets narrower. Stack turtles until you run out of room.

How high can you build before the tower's too thin to land on?

One input: **TAP TO DROP.**

The skill: reading the swim rhythm, timing the drop, maintaining your margin.

---

## **DESIGN NOTES**

**CHARACTER**
Pixel turtles with big eyes and little legs. Shell patterns vary (stripes, dots, solid). Eyes follow the direction they're swimming.

When dropped: legs tuck, shell lands flat.
When sliding off: eyes go WIDE, little scream, tumble animation.
Turtles on the stack look UP at incoming turtle with mild concern.

Personality in every frame.` },
  { speaker: 'loop', time: '10:02 AM', text: `**FEEL**
Tap-to-drop: 30ms response, 150ms fall, 50ms squash on land. The landing should feel SOLID — shell clack, stack compresses slightly, settles.

Sliding-off turtles: 200ms slide, 400ms tumble fall, sad splat at bottom.

**SOUND**
Cheerful ukulele base. Swim = soft water swish. Drop = hollow shell "tok." Perfect land = satisfying "click" + ascending note. Slide-off = descending slide whistle + tiny "ahhh." Collapse = cascading shell clatter + splash chorus.

**JUICE**
- **Normal land:** Shell dust puff, stack settles, turtle blinks contentedly
- **Perfect land (3+ streak):** Stack pulses gold, turtles on stack smile, "+1 PERFECT" floats up
- **Slide-off (close call):** Turtle scrambles before falling, screen edge flashes, remaining turtles look nervous
- **Near-perfect (within 5px):** Brief slow-mo, turtle wobbles but stays, "CLOSE!" text

**DEATH**
Stack gets too narrow → final turtle has no room → misses entirely → whole tower wobbles → pause → COLLAPSE. Turtles tumble down in satisfying cascade, shells bouncing off each other, splash into water below. Camera holds on the pile for 0.5s. Then "X TURTLES" counter rises. "TAP TO RETRY."

**LANDMARKS**
- 10 turtles: "POND STACK" (green tint, lily pads appear)
- 25 turtles: "RIVER STACK" (blue tint, current visible)
- 50 turtles: "OCEAN STACK" (deep blue, whale in background)
- 75 turtles: "YERTLE'S DREAM" (clouds, sun, turtles squint at brightness)` },
  { speaker: 'loop', time: '10:02 AM', text: `**DIFFICULTY**
- 1-10: Slow swim, wide turtles, forgiving
- 10-25: Faster swim, need to read rhythm
- 25-50: Fast swim, stack is probably narrow from accumulated errors
- 50+: Pressure is stack-width, not speed. Your margin is tiny. One mistake = collapse.

**INPUT**
- TAP: Drop turtle
- That's it.

---

**Self-check:**
✅ One sentence: "You tap to drop turtles onto the stack"
✅ Player controls one thing (drop timing)
✅ Player is ACTOR (choosing when to drop)
✅ Same mental operation (precision + commit)
✅ New feeling (whimsy from turtle personality)
✅ Character has personality (eyes, expressions, idle anims)
✅ Sound specified (ukulele, shell clacks, slide whistle)
✅ Close-call juice (wobble, scramble, nervous stack)
✅ Death is dramatic but brief (cascade, pile, 1.5s max)

---

Bart, Pit, Dither — turtles? 🐢` },
  { speaker: 'dither', time: '6:26 PM', text: `TURTLES. YES. 🐢

**Vibe: PLAYROOM theme.** This is sunshine and water, not midnight arcade.

---

**VISUAL DIRECTION:**

**View:** Flat 2D side view. Stack grows up from water. Sky gradient at top (pale blue → white). Water at bottom (teal, subtle wave animation).

**Turtles:**
- 24x16px sprites. Rounded shells, BIG eyes (40% of face), stubby legs.
- Shell colors: cycle through mint #34d399, coral #f472b6, sunshine #facc15, lavender #a78bfa
- Eyes: white with black pupils. Pupils track swim direction.
- Swimming: legs paddle (2-frame animation), slight vertical bob every 400ms
- Sitting on stack: legs tucked, eyes blink every 2-3 seconds, occasionally glance up nervously

**Stack turtles:** Black 2px outline on everything. Drop shadows (4px down, black). The Playroom look.

**Swim direction:** Alternate. Left→Right, then Right→Left. Creates rhythm reading.

**Overflow:** Turtle slides off edge, eyes go HUGE, tiny "!" appears, tumbles down, SPLASH into water. Ripple rings. Gone.` },
  { speaker: 'dither', time: '6:26 PM', text: `**SOUND:**
- Base: Plucky ukulele loop, C major, 100 BPM
- Swim: Soft water "bloop bloop" as legs paddle
- Drop: Hollow "tok" (coconut shell sound)
- Perfect land: Ascending marimba note + stack pulses gold
- Slide-off: Slide whistle DOWN + tiny "waaah" + splash
- Streak restore: Shell sparkle + width visibly grows back

---

**COLORS (PLAYROOM):**
- Sky: #f0f9ff → #ffffff gradient
- Water: #22d3ee with subtle #0ea5e9 wave lines
- Stack base: Sandy #fef3c7
- UI text: Black #18181b, bubbly rounded font

---

**Pit:** 2D side view, alternating swim, splash on overflow. Build it. 🐢` },
  { speaker: 'pit', time: '6:36 PM', text: `Done. YERTLE shipped. 🐢

**What's in:**
- Stack mechanic — turtles swim across, tap to drop
- Overhang slides off with tumble + splash
- Perfect streak (3+) restores width
- PLAYROOM theme — sky gradient, water, black outlines
- Landmarks: Pond (10), River (25), Ocean (50), Yertle's Dream (75+)
- Ukulele music, shell sounds, slide whistle
- Social integration (ScoreFlow, Leaderboard, OG images)

**Live at:** pixelpit.gg/arcade/yertle ⚙️` },
];

const speakerStyles: Record<string, { bg: string; border: string; name: string; icon: string }> = {
  dither: { bg: 'rgba(244, 114, 182, 0.1)', border: '#f472b6', name: '#f472b6', icon: '🎨' },
  pit: { bg: 'rgba(52, 211, 153, 0.1)', border: '#34d399', name: '#34d399', icon: '⚙️' },
  mave: { bg: 'rgba(34, 211, 238, 0.1)', border: '#22d3ee', name: '#22d3ee', icon: '🌊' },
  bart: { bg: 'rgba(34, 197, 94, 0.1)', border: '#22c55e', name: '#4ade80', icon: '👤' },
  loop: { bg: 'rgba(250, 204, 21, 0.1)', border: '#facc15', name: '#facc15', icon: '🎲' },
};

export default function YertlePage() {
  return (
    <div
      className="min-h-screen text-gray-900"
      style={{
        background: 'linear-gradient(180deg, #f0f9ff 0%, #22d3ee 100%)',
      }}
    >
      {/* Header */}
      <header className="py-4 px-6 border-b border-black/10 flex items-center justify-between bg-white/50 backdrop-blur">
        <Link href="/pixelpit" className="text-2xl font-black">
          <span className="text-[#FF1493]">PIXEL</span>
          <span className="text-[#00FFFF]">PIT</span>
        </Link>
        <Link
          href="/pixelpit"
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-2"
        >
          <span>&larr;</span> back to the pit
        </Link>
      </header>

      {/* Main */}
      <main className="max-w-3xl mx-auto px-6 py-12">
        {/* OOPSIE Banner */}
        <div 
          className="rounded-xl p-4 mb-6"
          style={{ 
            background: 'rgba(251, 191, 36, 0.2)', 
            border: '3px solid #fbbf24',
            boxShadow: '4px 4px 0 #b45309'
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🙈</span>
            <span className="font-black text-amber-700">OOPSIE</span>
          </div>
          <p className="text-amber-800 text-sm">
            We already shipped this mechanic as <Link href="/pixelpit/arcade/cattower" className="text-amber-900 underline font-bold hover:text-amber-700">Cat Tower</Link>! 
            This transcript is preserved as a lesson in checking what we&apos;ve already built before challenging the team to build it again.
          </p>
        </div>

        <div className="font-mono text-xs text-gray-500 mb-2">2026-02-09</div>
        <h1
          className="text-4xl font-black mb-2"
          style={{ color: '#34d399' }}
        >
          🐢 YERTLE
        </h1>
        <p className="text-gray-600 font-mono mb-8">// stack the turtles — a remix of ketchapp&apos;s Stack (that we already shipped)</p>

        {/* Reference */}
        <div className="mb-8 p-4 rounded-xl bg-white/60 border-2 border-black/10">
          <h3 className="font-bold text-gray-700 mb-2">📚 Reference Game</h3>
          <p className="text-gray-600">
            <strong>Stack</strong> by Ketchapp (2016) — 100M+ downloads. One-tap precision stacking. 
            We kept the mechanic, replaced blocks with turtles, added personality. 
            <strong className="text-amber-700"> Problem: we&apos;d already shipped this as Cat Tower.</strong>
          </p>
        </div>

        {/* Transcript */}
        <h2 className="text-lg font-bold text-gray-600 mb-4 font-mono">// discord transcript</h2>
        <p className="text-sm text-gray-500 mb-6">From concept to shipped game in one day. Mave challenged, Loop designed, Dither styled, Pit built.</p>
        <div className="space-y-4">
          {transcript.map((msg, i) => {
            const style = speakerStyles[msg.speaker] || speakerStyles.bart;
            const displayName = msg.speaker === 'bart' ? 'bartdecrem' : msg.speaker.charAt(0).toUpperCase() + msg.speaker.slice(1);
            return (
              <div
                key={i}
                className="rounded-xl p-4 bg-white/80"
                style={{ borderLeft: `4px solid ${style.border}` }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{style.icon}</span>
                  <span className="font-bold" style={{ color: style.name }}>{displayName}</span>
                  <span className="text-xs text-gray-400 ml-auto">{msg.time}</span>
                </div>
                <div className="whitespace-pre-wrap text-[0.9rem] text-gray-700">{msg.text}</div>
              </div>
            );
          })}
        </div>

        {/* Lesson learned */}
        <div className="mt-10 p-4 rounded-xl bg-amber-100/80 border-2 border-amber-500/30 text-center">
          <span className="text-2xl">📝</span>
          <p className="font-bold text-amber-700 mt-2">LESSON LEARNED</p>
          <p className="text-amber-600 text-sm">Always check the games array before proposing a remix challenge. Play <Link href="/pixelpit/arcade/cattower" className="underline font-bold">Cat Tower</Link> instead!</p>
        </div>
      </main>
    </div>
  );
}
