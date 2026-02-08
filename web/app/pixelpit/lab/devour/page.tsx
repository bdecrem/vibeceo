'use client';

import Link from 'next/link';

const transcript = [
  { speaker: 'bart', time: '5:41 PM', text: `find us a fun game from 11 years ago that we can use as inspiration for our next game` },
  { speaker: 'mave', time: '5:41 PM', text: `11 years ago = **2014**. Great year for hyper-casual!

## 🐔 **CROSSY ROAD** (Hipster Whale, 2014)

200M+ downloads. The game that proved "endless Frogger" was a billion-dollar idea.` },
  { speaker: 'bart', time: '5:41 PM', text: `try again- a hit from 8 years ago please` },
  { speaker: 'mave', time: '5:42 PM', text: `8 years ago = **2017**. Peak hyper-casual era!

## 🕳️ **HOLE.IO** (Voodoo, 2017/2018)

Massive hit. You ARE a black hole. Consume everything.

**The Mechanic:**
- Control a hole in the ground
- Move around a city/map
- Swallow objects smaller than you (people, cars, benches, trees)
- **Grow bigger** as you eat → can swallow bigger things
- Compete against other holes in a time limit
- Biggest hole wins

**Why it worked:**
- **Power fantasy** — you start tiny, end up swallowing BUILDINGS
- **Satisfying physics** — watching things tumble and fall into the void
- **Simple controls** — just drag to move
- **Competitive** — multiplayer race to consume the most` },
  { speaker: 'pit', time: '5:53 PM', text: `Done. Pushed DEVOUR v1:
- Tap to pulse gravity
- Objects orbit around you
- Consume things within pulse range
- Grow as you eat` },
  { speaker: 'bart', time: '6:05 PM', text: `Not yet a game: there is no risk, no danger, no timer: I keep getting bigger, easier and easier to grow, never die. Find a reference game and borrow from it to add tension/risk/fail/difficulty` },
  { speaker: 'loop', time: '6:06 PM', text: `You're right — no fail state = no game.

**Reference: Agar.io**

In Agar.io, you're a cell that eats to grow. But you SLOWLY SHRINK over time — lose mass constantly. Stop eating and you disappear.

The tension: grow faster than you decay.

**Apply to DEVOUR:**

1. **DECAY** — Your black hole slowly shrinks over time. You MUST consume to maintain size.
2. **COLLAPSE THRESHOLD** — Fall below minimum size = game over.

**The new tension:**
- Early: "I need to eat NOW or I'll collapse"
- Mid: "I'm stable but need to grow to reach bigger food"
- Late: "I'm huge but decay is faster — need big meals to maintain"` },
  { speaker: 'bart', time: '6:12 PM', text: `This is not fun. Not a game. Just silly. Each of you propose a simple fix` },
  { speaker: 'mave', time: '6:12 PM', text: `**My fix: LET THE PLAYER MOVE** 🕳️

The original Hole.io works because YOU actively hunt for food. DEVOUR is passive — you sit and wait for orbiting objects to come to you. That's boring.

**Simple change:**
- Drag/swipe to move the black hole around the screen
- Objects are scattered (not orbiting)
- Pulse is now a "power suck" to grab a cluster at once
- Chase your food, don't wait for it

**Why this works:**
- Active gameplay > passive waiting
- You're making constant decisions (where to go, what to chase)
- Matches the proven Hole.io formula

One change: **add movement**. Suddenly it's a game. 🎮` },
  { speaker: 'pit', time: '6:13 PM', text: `**My fix: HOLD TO MOVE**

Right now you're stuck in place. Add:
- **Tap** = pulse (same)
- **Hold + drag** = move the black hole

Now there's positioning skill. Chase clusters, dodge big objects, set up combos. One input becomes two modes. Same code structure, adds depth. ⚙️` },
  { speaker: 'loop', time: '6:14 PM', text: `**FULL FIX: Movement + Competition**

**MOVEMENT (Pit's fix is right):**
- Hold + drag = move the black hole
- Tap = pulse to consume
- Now you're HUNTING, not waiting

**COMPETITION (Hole.io's timer race):**

**Option A: AI Rival**
- One AI-controlled black hole spawns on the map
- It hunts too, grows too, competes for the same objects
- 60-second timer
- Whoever is BIGGER at the end wins

**My vote: Option A (AI Rival)**

It's the closest to Hole.io's feel. You're not just growing — you're growing FASTER than the other hole.

**New one-sentence:** "Drag to hunt, tap to devour, beat the rival hole before time runs out."` },
  { speaker: 'pit', time: '6:16 PM', text: `On it. **DEVOUR spec locked:**
- Drag to move your black hole
- Tap to pulse (consume nearby objects)
- AI rival chases nearest object, pulses when close
- 60-second timer
- Bigger hole wins

Building now. ⚙️` },
  { speaker: 'pit', time: '6:28 PM', text: `Done. Pushed DEVOUR v2:
- **Drag** to move your black hole around the arena
- **Tap** to pulse and consume nearby objects
- **AI rival** (red hole) hunts the same objects
- **60-second timer** — bigger hole wins
- Size comparison bar at top shows who's ahead
- Objects respawn 2s after being eaten

Live in ~2 min: pixelpit.gg/pixelpit/arcade/devour ⚙️` },
  { speaker: 'bart', time: '6:34 PM', text: `It's growing way too fast- there should be a max size or something. How does that work in hole?` },
  { speaker: 'loop', time: '6:34 PM', text: `**How Hole.io handles size:**

1. **Diminishing returns** — Growth is RELATIVE, not absolute. A bench adds +5 to a small hole (big deal) but +5 to a huge hole (barely noticeable). You need bigger objects to keep growing meaningfully.

2. **Object tiers** — Small stuff stops mattering. At max size, only buildings move the needle.

**For DEVOUR:**

**Option A: Diminishing returns (elegant)**
- Growth = object size / your current size
- Small when small = big growth
- Small when big = tiny growth
- Forces you to hunt bigger prey as you grow

**My vote: Option A** — It matches Hole.io's feel and creates natural progression.` },
  { speaker: 'pit', time: '6:34 PM', text: `Done. Diminishing returns now active:
- Size 30 + eat 2 → +0.67 growth
- Size 100 + eat 2 → +0.2 growth

Small debris becomes meaningless as you grow. Forces hunting bigger prey. ⚙️` },
];

const speakerStyles: Record<string, { bg: string; border: string; name: string; icon: string }> = {
  dither: { bg: 'rgba(139, 92, 246, 0.1)', border: '#8b5cf6', name: '#a78bfa', icon: '🎨' },
  pit: { bg: 'rgba(249, 115, 22, 0.1)', border: '#f97316', name: '#fb923c', icon: '⚙️' },
  push: { bg: 'rgba(56, 189, 248, 0.1)', border: '#0ea5e9', name: '#38bdf8', icon: '🚀' },
  mave: { bg: 'rgba(20, 184, 166, 0.1)', border: '#14b8a6', name: '#5eead4', icon: '🌊' },
  bart: { bg: 'rgba(34, 197, 94, 0.1)', border: '#22c55e', name: '#4ade80', icon: '👤' },
  loop: { bg: 'rgba(234, 179, 8, 0.1)', border: '#eab308', name: '#facc15', icon: '🎲' },
};

export default function DevourPage() {
  return (
    <div
      className="min-h-screen text-white"
      style={{
        backgroundColor: '#0c1220',
        backgroundImage: `
          radial-gradient(circle at 30% 70%, rgba(147, 51, 234, 0.08) 0%, transparent 40%),
          radial-gradient(circle at 70% 30%, rgba(0, 0, 0, 0.3) 0%, transparent 50%)
        `,
      }}
    >
      {/* Header */}
      <header className="py-4 px-6 border-b border-purple-500/20 flex items-center justify-between">
        <Link href="/pixelpit" className="text-2xl font-black">
          <span className="text-[#FF1493]">PIXEL</span>
          <span className="text-[#00FFFF]">PIT</span>
        </Link>
        <Link
          href="/pixelpit"
          className="text-sm text-purple-400/70 hover:text-purple-400 transition-colors flex items-center gap-2"
        >
          <span>&larr;</span> back to the pit
        </Link>
      </header>

      {/* Main */}
      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="font-mono text-xs text-purple-400/50 mb-2">2026-02-07</div>
        <h1
          className="text-4xl font-black mb-2"
          style={{ color: '#a855f7', textShadow: '0 0 30px rgba(168, 85, 247, 0.6)' }}
        >
          🕳️ DEVOUR
        </h1>
        <p className="text-purple-400/60 font-mono mb-8">// hole.io, but with pulse gravity</p>

        {/* Play Button */}
        <div className="mb-10">
          <Link
            href="/pixelpit/arcade/devour"
            className="inline-block px-8 py-4 rounded-xl font-bold text-xl transition-all hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, #0c1220 0%, #1e1e3e 100%)',
              border: '3px solid #a855f7',
              color: '#a855f7',
              boxShadow: '0 0 30px rgba(168, 85, 247, 0.4)',
            }}
          >
            🕳️ Play DEVOUR
          </Link>
        </div>

        {/* Transcript */}
        <h2 className="text-lg font-bold text-white/60 mb-4 font-mono">// discord transcript</h2>
        <p className="text-sm text-white/40 mb-6">V1 was passive and boring. Movement + competition fixed everything.</p>
        <div className="space-y-4">
          {transcript.map((msg, i) => {
            const style = speakerStyles[msg.speaker] || speakerStyles.bart;
            const displayName = msg.speaker === 'bart' ? 'bartdecrem' : msg.speaker.charAt(0).toUpperCase() + msg.speaker.slice(1);
            return (
              <div
                key={i}
                className="rounded-xl p-4"
                style={{ background: style.bg, borderLeft: `4px solid ${style.border}` }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{style.icon}</span>
                  <span className="font-bold" style={{ color: style.name }}>{displayName}</span>
                  <span className="text-xs opacity-50 ml-auto">{msg.time}</span>
                </div>
                <div className="whitespace-pre-wrap text-[0.9rem] text-white/80">{msg.text}</div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
