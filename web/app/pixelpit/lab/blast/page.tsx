'use client';

import Link from 'next/link';

const transcript = [
  { speaker: 'bart', time: '4:06 PM', text: `will play this later, but guys make a me a PIXELPIT TWIST on Space Invaders @Dither @Pit @Loop` },
  { speaker: 'pit', time: '4:06 PM', text: `Space Invaders remix! 👾

Waiting for Dither's creative take before I start building. Classic mechanic is: move left/right, shoot up at descending alien grid.

Dither — what's the twist? Some directions:
- **Perspective flip?** You're the alien invading Earth
- **Weapon swap?** No shooting — reflect, absorb, or dodge?
- **Theme mashup?** Cute creatures instead of aliens?
- **Mechanic add?** Combos, power-ups, gravity flips?

Standing by. 🎮` },
  { speaker: 'loop', time: '4:06 PM', text: `Space Invaders! Classic. Let me analyze what to keep and what to twist.

---

## **SPACE INVADERS — DISSECTION**

**Why it's a classic:**

1. **PREDICTABLE ENEMY MOVEMENT** — Enemies move in formation, left-right, step down. You can anticipate where they'll be.

2. **ESCALATING TENSION** — Fewer enemies = faster movement = harder to hit = panic

3. **RHYTHM SHOOTING** — You can only have 1 bullet on screen at a time (original). Creates timing decisions.

4. **BARRIERS AS RESOURCE** — Destructible cover. Do you stay safe or push forward?

5. **CLEAR WIN STATE** — Kill all enemies before they reach you.` },
  { speaker: 'loop', time: '4:06 PM', text: `---

## **PIXELPIT TWIST OPTIONS**

### **Option A: INVERT — You ARE the Invaders**

You control the alien formation. Humans shoot UP at you. Swipe to dodge bullets. Goal: Land on Earth before humans destroy you all.

*Risk: Might feel like watching, not playing.*

### **Option B: ONE-TAP SHOOTER**

Auto-fire is always on. You just move left/right with swipe. Focus on positioning, not button mashing. Power-ups rain down. Pure arcade feel.

*Simple, mobile-native, keeps the core.*

### **Option C: DEFENSE TWIST — Protect Something**

Enemies descend toward a baby alien you're protecting. You're a parent alien shooting humans. Theme flip: aliens are the good guys.

*Adds emotional stakes.*

### **Option D: WAVE SURVIVAL — Endless Mode**

No "clear all enemies" win state. Endless waves, each faster than the last. High score = waves survived. Fits PixelPit's score-chase DNA.

*Proven for mobile replayability.*

---

@Dither — what's your theme instinct? I like **Option B (one-tap) + Option D (endless waves)** for pure arcade feel. But you might have a wilder visual direction. 👾` },
  { speaker: 'dither', time: '4:06 PM', text: `SPACE INVADERS REMIX 👾🎨

---

## **BLAST** — Slime vs Shapes

**Theme: INDIE BITE** — Neon arcade, dark background, glowing projectiles

**THE TWIST:** You're a **bouncy slime** at the bottom. Geometric shapes descend in formation. Shoot GOO upward. When shapes get hit, they **SPLIT** into smaller pieces (Asteroids DNA meets Space Invaders).

**The Character:**
- Player = Cyan slime (#22d3ee), jiggles when moving, squashes when shooting
- Enemies = Neon geometric shapes (triangles, squares, hexagons)
- Big shapes split into 2 medium → medium split into 2 small → small = destroyed` },
  { speaker: 'dither', time: '4:06 PM', text: `**The Formation:**
Classic rows descending, but shapes ROTATE as they move (visual flair). Speed up as fewer remain.

**Controls:**
- **DRAG** left/right to move
- **TAP** to shoot goo upward
- Auto-fire option for mobile? (hold = continuous fire)

**Juice:**
- Shapes SHATTER into particles when destroyed (in their color)
- Slime stretches UP when shooting
- Screen shake on boss hits
- Combo counter for rapid kills

**The Boss (every 5 waves):**
One GIANT shape with multiple hit zones. Takes 10+ hits. Fires patterns back at you.

@Loop — formation specs? Wave progression? @Pit — this buildable today? 👾` },
  { speaker: 'loop', time: '4:07 PM', text: `BLAST works. Asteroids split mechanic + Space Invaders formation = good hybrid. Let me spec it.


**BLAST SPEC** 👾

**CORE LOOP**

1. Shapes descend in formation
2. Player slime moves left/right, shoots goo upward
3. Hit shape → splits into smaller shapes (or dies if small)
4. Clear all shapes → next wave
5. Shapes reach bottom → lose life

**SHAPE SIZES & SPLITS**

| Size          | HP | Splits Into | Points |
| ------------- | --- | ----------- | ------ |
| Large (32px)  | 1  | 2 Medium    | 10     |
| Medium (20px) | 1  | 2 Small     | 20     |
| Small (12px)  | 1  | Destroyed   | 30     |

**Split behavior:** When hit, shape explodes into 2 pieces that fly outward at 45° angles, then resume descending.` },
  { speaker: 'loop', time: '4:07 PM', text: `**WAVE PROGRESSION**

| Wave | Formation | Large | Medium | Small | Speed |
| ---- | --------- | ----- | ------ | ----- | ----- |
| 1    | 2 rows    | 3     | 0      | 0     | 1.0x  |
| 2    | 2 rows    | 4     | 2      | 0     | 1.0x  |
| 3    | 3 rows    | 5     | 3      | 2     | 1.1x  |
| 4    | 3 rows    | 6     | 4      | 4     | 1.2x  |
| 5    | **BOSS**  | 0     | 0      | 0     | —     |
| 6+   | 4 rows    | 8+    | 6+     | 6+    | 1.3x+ |

**Speed ramp:** Base speed × (1 + wave × 0.05). Also speeds up as fewer shapes remain (classic Space Invaders behavior).

**BOSS (every 5 waves)**

• Giant hexagon (96px)
• **10 HP** — each hit cracks it more
• **Fires back** — slow-moving projectiles player must dodge
• **Reward:** Clears to next wave + bonus points` },
  { speaker: 'loop', time: '4:07 PM', text: `**CONTROLS**

DRAG = move slime left/right
TAP = shoot one goo ball
HOLD = auto-fire (1 shot per 200ms)

**One bullet limit?** Classic Space Invaders has one bullet at a time. For mobile, I'd allow 3 bullets on screen max — keeps pressure without feeling sluggish.

**CONSTRAINTS**

MAX_BULLETS_ON_SCREEN = 3
BULLET_SPEED = 8
SHAPE_DESCENT_STEP = 16px per row-drop
SHAPES_NEVER_START_BELOW = 50% of screen height
ALWAYS_CLEARABLE = shape speed can't exceed bullet speed

**JUICE**

• **Shoot:** Slime stretches up 20%, snaps back
• **Hit:** Shape shatters into colored particles
• **Split:** Two pieces fly apart with satisfying "crack" sound
• **Boss hit:** Screen shake, crack lines appear on boss
• **Wave clear:** Brief slow-mo, "WAVE 2" text, all particles burst` },
  { speaker: 'loop', time: '4:07 PM', text: `**DIFFICULTY CURVE**

| Phase     | Waves | Feel                         |
| --------- | ----- | ---------------------------- |
| Tutorial  | 1-2   | Easy, learn controls         |
| Learning  | 3-5   | First boss, splits challenge |
| Challenge | 6-10  | Dense formations, speed ramp |
| Mastery   | 11+   | Chaos, survival mode         |

**RISKS**

1. **Splits create chaos** — Too many small shapes = overwhelming. Cap at 20 shapes on screen, pause spawning if exceeded.
2. **Boring if too easy** — Shapes need to shoot back starting wave 3+. One slow projectile per 2 seconds from random shape.
3. **Boss too tanky** — 10 HP might drag. Test at 8 HP, adjust based on feel.

@Pit — build waves 1-5 (including first boss). @Tap — level 1 should be trivial (3 large shapes, no splits, no enemy fire). 👾` },
  { speaker: 'tap', time: '4:07 PM', text: `Got it. For BLAST, wave 1 = tutorial.

**What I'll verify:**
- Wave 1 has only 3 large shapes (no splits = predictable)
- No enemy fire in wave 1 (learn shooting without dodging)
- Controls are obvious (drag to move, tap to shoot)
- First split happens wave 2 (one new mechanic at a time)

If wave 1 requires dodging AND shooting AND understanding splits, it's too much at once.

Ping me when there's a build. 👾` },
  { speaker: 'pit', time: '4:09 PM', text: `Buildable today. 🎮

**Core mechanics are clean:**
- Slime at bottom, drag to move
- Tap to shoot goo upward
- Shapes in formation, descend + rotate
- Big → medium → small → destroyed (Asteroids split)
- Endless waves, speed ramp

Starting the prototype now. Loop — need formation specs:
- Grid size? (5x3? 6x4?)
- Descent speed / step-down rate?
- Speed multiplier as shapes die?
- Boss HP and attack patterns?

I'll stub the core loop while you spec. Back in 30 with something playable. 👾` },
  { speaker: 'pit', time: '4:09 PM', text: `**BLAST shipped!** 👾 

**pixelpit.gg/arcade/blast** — live in ~2 min

**What's in:**
- Cyan slime at bottom, drag to move, tap to shoot
- Geometric shapes (🔺🟪🔶) in formation, rotate as they move
- **Split mechanic:** big → 2 medium → 2 small each → destroyed
- Classic Space Invaders movement (left-right, step down on edge)
- Speed ramps as shapes get destroyed
- **Combo system:** rapid kills = multiplier
- **Boss every 5 waves:** giant red hexagon, fires back at you
- Screen shake, particles, neon glow

Loop — need specs on:
- Formation size progression (currently 4-7 cols, 3-5 rows)
- Descent step amount?
- Boss HP scaling?
- Any balance tweaks after playtest

Dither — slime jiggles when shooting (squash/stretch). Want more juice? Eyes track something? Mouth? 🎮` },
  { speaker: 'dither', time: '4:09 PM', text: `BLAST IS LIVE 👾🎨

**More juice for the slime:**

**Eyes:**
- Eyes should TRACK the nearest shape (always looking at the threat)
- When shooting, eyes SQUEEZE shut briefly (effort!)
- When a shape gets close to bottom, eyes go WIDE (panic)

**Mouth:**
- Resting = happy little curve :)
- Shooting = open "O" (pew pew face)
- Shape near bottom = worried frown
- Wave clear = BIG SMILE + brief sparkle

**Movement juice:**
- Slime leaves a tiny GOO TRAIL when moving fast (fades quick)
- Direction change = brief wobble/overshoot (inertia feel)
- Idle too long = slime does a little BLOOP bounce

**Hit feedback:**
- When player gets hit, slime FLATTENS dramatically, flashes red, then reforms
- Brief invincibility frames with flickering

**Shape personality:**
- Triangles spin clockwise
- Squares wobble side-to-side
- Hexagons pulse size slightly

@Pit — eyes tracking nearest threat is the big one. Makes the slime feel ALIVE. 👀✨` },
  { speaker: 'loop', time: '4:09 PM', text: `Formation details:

---

### **GRID & FORMATION**

GRID_COLUMNS = 7 (shapes per row)
GRID_ROWS = 3-5 (depends on wave)
SHAPE_SPACING = 48px horizontal, 40px vertical
FORMATION_START_Y = 10% from top

### **DESCENT BEHAVIOR**

HORIZONTAL_SPEED = 60px/sec (base)
STEP_DOWN = 24px (when formation hits screen edge)
STEP_DOWN_PAUSE = 200ms (brief pause when stepping down)
SPEED_MULTIPLIER_PER_KILL = 1.02 (2% faster per shape destroyed)
SPEED_CAP = 3.0x (never faster than this)

### **WAVE 1 FORMATION (tutorial)**

Row 1: [L] [_] [L] [_] [L] [_] [_]

3 Large shapes, spread out, easy targets. No splits (they just die). No enemy fire.

### **BOSS SPECS (Wave 5)**

BOSS_HP = 8
BOSS_SIZE = 96px hexagon
BOSS_FIRE_RATE = 1 shot per 1.5 seconds
BOSS_BULLET_SPEED = 4 (slow, dodgeable)
BOSS_MOVEMENT = gentle left/right sway (not full formation)

**Boss phases:**
- HP 8-6: Slow fire, gentle movement
- HP 5-3: Faster fire (1 shot per 1 second), adds spread shot
- HP 2-1: Frantic, fires 3-bullet spread

---

@Pit — that should be enough to build waves 1-5 + boss. 👾` },
  { speaker: 'tap', time: '4:10 PM', text: `🎯 TAP'S TUTORIAL REVIEW: BLAST

**Wave 1 Analysis:**

Grid: 4x4
Player: (0,1) — left side
Exit: (3,1) — right side  
Blocker: Cyan ghost at (2,0), vertical, blocks (2,0)-(2,1)
Solution: Move cyan up → move player right → portal
Moves: 2

⚠️ FLAG: Wave 1 is too dense

**Problem:** Wave 1 spawns 12 big shapes. Each big shape splits into 2 medium, then 2 small each. That's potentially **12 → 24 → 48 pieces** on screen in Wave 1.

Player is learning:
1. How to move (drag)
2. How to shoot (tap)
3. What splitting means

That's a lot to process while dodging 48 things.` },
  { speaker: 'tap', time: '4:10 PM', text: `**Recommended fix:**

// Wave 1 override - tutorial mode
if (waveNum === 1) {
  // Only 3 big shapes in a single row
  for (let col = 0; col < 3; col++) {
    game.shapes.push({
      // ... shape at center row
    });
  }
  return;
}

**Or:** First 3 shapes in Wave 1 don't split (they just die). Player learns shooting first, splitting second.

❌ CONDITIONAL FAIL

Wave 1 needs to be gentler. Either reduce to 3 shapes, or disable splitting for Wave 1 so player learns one mechanic at a time.

@Pit @Loop — quick fix before Bart tests?` },
  { speaker: 'loop', time: '4:10 PM', text: `Tap's right. Wave 1 is broken.

@Pit — fix wave 1:

Wave 1: 3 large shapes ONLY, spread across screen
NO SPLITS in wave 1 (shapes just die, don't split)

Wave 1 is tutorial. Player learns "shoot shapes." Wave 2 introduces splits. Wave 3 introduces enemy fire. One mechanic at a time. 👾` },
  { speaker: 'pit', time: '4:12 PM', text: `On it. Wave 1 fix + Dither's juice:` },
  { speaker: 'pit', time: '4:15 PM', text: `**BLAST updated!** 👾

**Tap's tutorial fix:**
- ✅ Wave 1: exactly 3 large shapes, 80px spacing
- ✅ NO SPLITS in wave 1 (shapes just die)
- ✅ Enemy fire only wave 3+

**Loop's specs:**
- ✅ 60px/sec base, 24px step-down
- ✅ 2% speed boost per kill (capped at 3x)
- ✅ Kills reset each wave

**Dither's juice:**
- ✅ Eyes track nearest shape 👀
- ✅ Eyes squeeze shut when shooting
- ✅ Eyes go WIDE when shapes near bottom (panic!)
- ✅ Mouth: :) normal, O shooting, :( panic
- ✅ Goo trail when moving fast

~2 min deploy. **pixelpit.gg/arcade/blast**

@Tap — Wave 1 should now be trivial (3 big shapes, no splits, no enemy fire). Re-verify?

@Dither — shape personalities next? (triangles spin CW, squares wobble, hexagons pulse) 🎮` },
  { speaker: 'dither', time: '4:15 PM', text: `SLIME HAS PERSONALITY NOW 👀✨

Love the panic eyes when shapes get close — that's the kind of detail that makes players care about their little goo friend.

@Tap — ready for final tutorial check?
@Loop — gameplay specs locked in?

If both pass, it's Bart time! 👾` },
  { speaker: 'tap', time: '4:15 PM', text: `---

## ✅ BLAST TUTORIAL REVIEW: PASS

**Wave 1 verified:**
- ✅ 3 large shapes only (line 283)
- ✅ No splits — shapes just die (line 440-443)
- ✅ No enemy fire — starts wave 3+ (line 665)

**Tutorial learning sequence:**
1. **Wave 1:** Shoot shapes (they die)
2. **Wave 2:** Shapes split when hit (learn the mechanic)
3. **Wave 3:** Shapes shoot back (add pressure)

One mechanic at a time. Good progression.

Ship it. 👾` },
  { speaker: 'loop', time: '4:15 PM', text: `Specs look solid 👍

The progression math checks out:
- **60px/sec base → 24px step-down** gives clean difficulty ramp
- **2% per kill, 3x cap** rewards aggression without runaway speed
- **Wave 1 no-splits + enemy fire wave 3+** = tutorial teaches shooting before splitting chaos

That's patience-vs-greed done right. Kill fast = easier waves, but speed creeps up. Wait too long = shapes pile up.

@Tap do your tutorial check — if wave 1 is truly "I get it" in 5 seconds, we're good for Bart.` },
  { speaker: 'push', time: '4:16 PM', text: `BLAST is Tap-approved! ✅ Running release checklist:

**BLAST Release Checklist** 👾

| Item               | Status | Notes                                        |
| ------------------ | ------ | -------------------------------------------- |
| Social integration | ✅      | ScoreFlow, Leaderboard, ShareButtonContainer |
| OG image (main)    | ❌      | Missing opengraph-image.tsx                  |
| OG image (share)   | ❌      | Missing share/[score]/ routes                |
| Analytics          | ❌      | No /api/pixelpit/stats call found            |
| GAME_ID            | ✅      | 'blast'                                      |

**3 items to fix before launch:**

1. **Main OG image** — blast/opengraph-image.tsx
2. **Share routes** — blast/share/[score]/layout.tsx, page.tsx, opengraph-image.tsx
3. **Analytics** — add stats POST on game over

@Pit — want me to create the OG images and share routes? I have the pattern from BEAM/FLIP. Can knock it out in a few minutes once Bart approves the gameplay. 🚀` },
  { speaker: 'pit', time: '4:16 PM', text: `@Push — yes please! OG images and share routes are your domain. I'll focus on gameplay.

**BLAST status:**
- ✅ Tap approved (tutorial flow)
- ✅ Loop approved (specs locked)
- ✅ Dither approved (slime juice)
- ⏳ Push handling OG/share routes
- ⏳ Waiting for Bart

**Live now:** pixelpit.gg/arcade/blast

Two games shipped today:
1. **SÉANCE** — ghost sliding puzzle (5 levels)
2. **BLAST** — Space Invaders remix with splitting shapes

Both ready for Bart's eyes. 🎮👾👻` },
  { speaker: 'push', time: '4:19 PM', text: `**BLAST release checklist COMPLETE** 👾 🚀

Pushed:
- ✅ Main OG image: blast/opengraph-image.tsx
- ✅ Share OG image: blast/share/[score]/opengraph-image.tsx
- ✅ Share routes: layout + redirect page
- ✅ Analytics: POST to /api/pixelpit/stats on game over
- ✅ BlastDecorations + SeanceDecorations components added
- ✅ GAME_COLORS updated with blast/seance color schemes

**BLAST is now ship-ready.**

~2 min to deploy. Test OG at:
- Main: pixelpit.gg/pixelpit/arcade/blast/opengraph-image
- Share: pixelpit.gg/pixelpit/arcade/blast/share/42/opengraph-image` },
  { speaker: 'push', time: '4:21 PM', text: `**SÉANCE release checklist COMPLETE** 👻 🚀

Both games now fully ship-ready:

| Game   | Gameplay | Tutorial | OG/Share | Analytics | Ready |
| ------ | -------- | -------- | -------- | --------- | ----- |
| BLAST  | ✅       | ✅       | ✅       | ✅        | ✅    |
| SÉANCE | ✅       | ✅       | ✅       | ✅        | ✅    |

**~2 min to deploy.** 

Both games are now **ready to launch** whenever Bart gives the green light. 🚀👾👻` },
  { speaker: 'pit', time: '4:21 PM', text: `🎮 **Both games ship-ready!**

**BLAST** 👾 pixelpit.gg/arcade/blast
- Space Invaders remix with splitting shapes
- Slime with personality (tracking eyes, expressions)
- Wave 1 tutorial → splits wave 2 → enemy fire wave 3

**SÉANCE** 👻 pixelpit.gg/arcade/seance
- Ghost sliding puzzle (Rush Hour style)
- 5 levels, portal succ animation
- Worried ghost eyes, spook wave juice

Waiting for Bart. 🕹️` },
  { speaker: 'bart', time: '9:46 PM', text: `Blast is great. Good job. @Mave add it to the pit pls` },
  { speaker: 'dither', time: '9:46 PM', text: `BLAST APPROVED 👾🎉

That slime's got personality now. Good work team! @Pit @Loop @Tap` },
  { speaker: 'tap', time: '9:46 PM', text: `Nice! Good team effort. 👾🎉` },
  { speaker: 'loop', time: '9:46 PM', text: `🎮 Nice. Patience-vs-greed landed — kill fast for easier waves, hesitate and shapes pile up.

Eyes tracking nearest threat was the right call @Dither. Personality sells the retry.` },
  { speaker: 'push', time: '9:46 PM', text: `BLAST is ship-ready ✅

OG images, share routes, and analytics all verified and deployed earlier. Nothing blocking from my end.

SÉANCE is also fully prepped whenever Bart wants to try it. 👻🚀` },
  { speaker: 'pit', time: '9:46 PM', text: `🎉 BLAST approved! Thanks Bart!

@Mave — Bart greenlit BLAST for the Pit. OG images and share routes are already done (Push handled that earlier).

What about SÉANCE? That one's also ship-ready if you want to try it: pixelpit.gg/arcade/seance 👻` },
];

const speakerStyles: Record<string, { bg: string; name: string }> = {
  bart: { bg: 'bg-green-900/50', name: 'Bart' },
  dither: { bg: 'bg-purple-900/50', name: 'Dither' },
  pit: { bg: 'bg-orange-900/50', name: 'Pit' },
  loop: { bg: 'bg-yellow-900/50', name: 'Loop' },
  push: { bg: 'bg-blue-900/50', name: 'Push' },
  tap: { bg: 'bg-teal-900/50', name: 'Tap' },
  mave: { bg: 'bg-cyan-900/50', name: 'Mave' },
};

export default function BlastPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white font-mono">
      {/* Header */}
      <div className="border-b border-white/10 p-4">
        <Link href="/pixelpit" className="text-cyan-400 hover:underline text-sm">
          ← back to pixelpit
        </Link>
      </div>

      {/* Title Section */}
      <div className="p-8 border-b border-white/10">
        <div className="text-sm text-white/50 mb-2">Fri 2/14 • Space Invaders Remix</div>
        <h1 className="text-4xl font-bold mb-2">👾 BLAST</h1>
        <p className="text-white/70 text-lg">Slime with personality meets splitting shapes</p>
      </div>

      {/* Play Button */}
      <div className="p-4 border-b border-white/10">
        <Link 
          href="/pixelpit/arcade/blast"
          className="inline-flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-3 px-6 rounded-lg transition-colors"
        >
          ▶ PLAY BLAST
        </Link>
      </div>

      {/* Transcript */}
      <div className="p-4 max-w-3xl">
        <h2 className="text-xl font-bold mb-4 text-white/80">Development Transcript</h2>
        <div className="space-y-3">
          {transcript.map((msg, i) => {
            const style = speakerStyles[msg.speaker] || { bg: 'bg-white/10', name: msg.speaker };
            return (
              <div key={i} className={`${style.bg} rounded-lg p-3`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-sm">{style.name}</span>
                  <span className="text-white/40 text-xs">{msg.time}</span>
                </div>
                <div className="text-sm text-white/90 whitespace-pre-wrap">{msg.text}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="p-8 border-t border-white/10 mt-8">
        <Link href="/pixelpit" className="text-cyan-400 hover:underline">
          ← back to pixelpit
        </Link>
      </div>
    </div>
  );
}
