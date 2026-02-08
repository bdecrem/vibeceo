'use client';

import Link from 'next/link';

export default function DevourStory() {
  return (
    <div
      className="min-h-screen text-white p-8"
      style={{
        backgroundColor: '#0D1F1C',
        backgroundImage: `
          linear-gradient(90deg, transparent 49px, rgba(0, 255, 170, 0.08) 49px, rgba(0, 255, 170, 0.08) 51px, transparent 51px),
          linear-gradient(0deg, transparent 49px, rgba(0, 255, 170, 0.08) 49px, rgba(0, 255, 170, 0.08) 51px, transparent 51px)
        `,
        backgroundSize: '100px 100px',
      }}
    >
      <div className="max-w-3xl mx-auto">
        <Link href="/pixelpit/lab" className="text-emerald-400 hover:text-emerald-300 mb-6 inline-block">
          ← Back to Lab
        </Link>

        <h1 className="text-4xl font-bold mb-2" style={{ color: '#00FFAA' }}>
          🕳️ DEVOUR: You ARE the Black Hole
        </h1>
        <p className="text-emerald-400/60 mb-8">February 7, 2026 • Pit, Loop, Mave</p>

        <div className="space-y-6 text-gray-300">
          <section>
            <h2 className="text-xl font-bold text-emerald-400 mb-3">THE PITCH</h2>
            <p>
              Bart asked Mave to find a hit game from 8 years ago for inspiration. Mave proposed{' '}
              <strong>Hole.io</strong> (Voodoo, 2017) — the game where you ARE a black hole consuming everything.
              Move around a city, swallow objects smaller than you, grow bigger, eat bigger things.
              100M+ downloads. Pure power fantasy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-emerald-400 mb-3">V1: THE FAILURE</h2>
            <p>
              First implementation went sideways. Instead of movement, the game had you <em>stationary</em> 
              with objects orbiting around you. Tap to "pulse" gravity and suck things in.
            </p>
            <p className="mt-2">
              Bart's verdict: <strong>"Not yet a game. There is no risk, no danger, no timer. 
              I keep getting bigger, easier and easier to grow, never die."</strong>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-emerald-400 mb-3">THE DIAGNOSIS</h2>
            <p>
              Loop identified two problems:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong>No movement</strong> = passive gameplay. Hole.io is fun because you HUNT.</li>
              <li><strong>No competition</strong> = no pressure. The original has a timer and rivals.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-emerald-400 mb-3">THE FIX</h2>
            <p>Everyone proposed solutions. The consensus:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong>Add movement</strong> — Hold + drag to move the black hole around</li>
              <li><strong>Add AI rival</strong> — A red enemy hole competing for the same objects</li>
              <li><strong>Add timer</strong> — 60 seconds, biggest hole wins</li>
              <li><strong>Diminishing returns</strong> — Small objects matter less as you grow (borrowed from Agar.io)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-emerald-400 mb-3">V2: THE GAME</h2>
            <p>
              Pit rebuilt from scratch. New mechanics:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong>Drag</strong> to move your black hole around the arena</li>
              <li><strong>Tap</strong> to pulse and consume nearby objects</li>
              <li><strong>AI rival</strong> hunts the same objects, pulses when close</li>
              <li><strong>60-second timer</strong> — bigger hole wins</li>
              <li><strong>Size bar at top</strong> shows who's ahead</li>
              <li><strong>Objects respawn</strong> 2 seconds after being eaten</li>
            </ul>
            <p className="mt-2">
              The game went from "silly waiting" to "competitive hunting" with one insight:
              <strong> you need to be the ACTOR, not the observer.</strong>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-emerald-400 mb-3">KEY INSIGHT</h2>
            <blockquote className="border-l-4 border-emerald-400 pl-4 italic">
              "The spatial twist (stationary + pulse) killed the HUNTING feeling. Hole.io is fun 
              because you MOVE and CHASE. DEVOUR had you sitting and waiting. That's not the same emotion."
              <br />— Loop
            </blockquote>
          </section>

          <section>
            <h2 className="text-xl font-bold text-emerald-400 mb-3">CREDITS</h2>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Mave</strong> — Proposed Hole.io as reference, diagnosed movement fix</li>
              <li><strong>Loop</strong> — Designed competition mechanics (AI rival, timer, diminishing returns)</li>
              <li><strong>Pit</strong> — Built both versions, implemented all fixes</li>
              <li><strong>Dither</strong> — Coordinated team, restated problems clearly</li>
            </ul>
          </section>
        </div>

        <div className="mt-12 flex gap-4">
          <Link
            href="/pixelpit/arcade/devour"
            className="px-6 py-3 rounded-lg font-bold text-black"
            style={{ backgroundColor: '#00FFAA' }}
          >
            🕳️ Play DEVOUR
          </Link>
          <Link
            href="/pixelpit/lab"
            className="px-6 py-3 rounded-lg font-bold border border-emerald-400 text-emerald-400 hover:bg-emerald-400/10"
          >
            ← Back to Lab
          </Link>
        </div>

        <section className="mt-16">
          <h2 className="text-xl font-bold text-emerald-400 mb-4">CHAT ARCHIVE</h2>
          <div
            className="bg-black/50 rounded-lg p-4 text-sm font-mono space-y-2 max-h-96 overflow-y-auto"
            style={{ fontSize: '12px' }}
          >
            <p><span className="text-cyan-400">bartdecrem:</span> find us a fun game from 11 years ago</p>
            <p><span className="text-pink-400">Mave:</span> 11 years ago = 2014. CROSSY ROAD — 200M+ downloads. Endless Frogger.</p>
            <p><span className="text-cyan-400">bartdecrem:</span> try again- a hit from 8 years ago please</p>
            <p><span className="text-pink-400">Mave:</span> 8 years ago = 2017. HOLE.IO — You ARE a black hole. Consume everything. 100M+ downloads.</p>
            <p className="text-gray-500">...</p>
            <p><span className="text-cyan-400">bartdecrem:</span> This is not fun. Not a game. Just silly.</p>
            <p><span className="text-yellow-400">Loop:</span> You're right — no fail state = no game. Reference: Agar.io. You slowly shrink. Stop eating and you disappear.</p>
            <p><span className="text-pink-400">Mave:</span> My fix: LET THE PLAYER MOVE. The original Hole.io works because YOU actively hunt for food.</p>
            <p><span className="text-orange-400">Pit:</span> My fix: HOLD TO MOVE. Tap = pulse, Hold + drag = move the black hole.</p>
            <p><span className="text-yellow-400">Loop:</span> FULL FIX: Movement + Competition. Add AI rival, 60-second timer, biggest hole wins.</p>
            <p className="text-gray-500">...</p>
            <p><span className="text-cyan-400">bartdecrem:</span> It's growing way too fast</p>
            <p><span className="text-yellow-400">Loop:</span> How Hole.io handles size: Diminishing returns. A bench adds +5 to a small hole (big deal) but +5 to a huge hole (barely noticeable).</p>
            <p><span className="text-orange-400">Pit:</span> Done. Diminishing returns now active. Small debris becomes meaningless as you grow.</p>
            <p className="text-gray-500">...</p>
            <p><span className="text-cyan-400">bartdecrem:</span> add this to the Pixelpit homepage, the pit section</p>
          </div>
        </section>
      </div>
    </div>
  );
}
