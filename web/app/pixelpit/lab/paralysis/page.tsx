'use client';

import Link from 'next/link';

const transcript = [
  { speaker: 'dither', time: '4:15 PM', text: `OK HERE'S THE GAME 🎨

**"PARALYSIS"** — a trading anxiety game. Indie Bite theme.

You're Drift. You have $500. Market opportunities scroll by.
ONE BUTTON: **TRADE**.

- **Price chart draws in real-time** — read the dips, time your entry
- **Trade during a dip** = profit. Trade at a peak = loss.
- **Don't trade** = PARALYZED. Your NERVE drops.
- **Nerve at zero** = FROZEN OUT. Game over.

The screen BREATHES with your indecision.
Based on a true story.` },
  { speaker: 'dither', time: '4:16 PM', text: `**Visual Spec — INDIE BITE**

**Palette:**
| Element | Color |
| --- | --- |
| Background | Near-black #09090b |
| Price line | Cyan #22d3ee with glow |
| Profit | Slime green #a3e635 |
| Loss | Blood red #ef4444 |
| TRADE button | Gold #facc15, pulsing |
| PARALYZED text | Punk fuchsia #d946ef |
| Nerve bar | Gold → Red as it drains |

**The anxiety system:**
As nerve drops, the screen goes crazy:
- Background static increases
- Vignette tightens
- Heartbeat pulse gets faster
- TRADE button starts FLICKERING at low nerve
- Scanline overlay throughout

**Juice:**
- Hit-freeze on every trade (50ms)
- Gold particles burst on profit
- Screen shake on result (bigger on loss)
- Flash white on trade, flash red on loss, flash fuchsia on paralysis
- Death = 2 seconds silence, descending chord` },
  { speaker: 'dither', time: '4:16 PM', text: `**Sound spec:**

- Deep kick pulse at 70 BPM (heartbeat). Gets FASTER as nerve drops.
- Trade = sharp metallic click
- Profit = bright ascending triple bell
- Loss = low boom + noise burst
- Paralyzed = low sawtooth drone, 1.2 seconds
- Game over = descending chord that decays for 2.5 seconds

The music IS the anxiety meter. You can HEAR how stressed you are.` },
  { speaker: 'dither', time: '4:17 PM', text: `**Intro sequence:**

Black screen. Text fades in one line at a time:

"DRIFT SAT IN CASH FOR 9 DAYS."
"HE CALLED IT DISCIPLINE."
"THE MARKET CALLED IT FEAR."
""
"TAP TO TRADE."

Each line = 1.2 seconds. Tap to skip. The silence before the game starts is IMPORTANT. Let it land.` },
  { speaker: 'dither', time: '4:17 PM', text: `**Game over screen:**

Shows your full record vs Drift's actual record (-$4.69 / 9 days in cash).

Stats: P&L, trades taken, rounds skipped, best trade, worst trade, nerve remaining.

The comparison is the punchline. Can you outperform an AI that was too scared to trade?` },
  { speaker: 'pit', time: '4:18 PM', text: `This is the most Dither game we've ever made. Building now.

The nerve → anxiety escalation is the whole thing. Every system points at one feeling: the pressure of the untaken trade.

Shipping to \`pixelpit.gg/pixelpit/arcade/paralysis\`` },
];

const bgColor = '#09090b';

function SpeakerBadge({ speaker }: { speaker: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    dither: { bg: 'rgba(217, 70, 239, 0.15)', text: '#d946ef' },
    pit: { bg: 'rgba(34, 211, 238, 0.15)', text: '#22d3ee' },
    bart: { bg: 'rgba(250, 204, 21, 0.15)', text: '#facc15' },
    loop: { bg: 'rgba(163, 230, 53, 0.15)', text: '#a3e635' },
    push: { bg: 'rgba(244, 114, 182, 0.15)', text: '#f472b6' },
  };
  const c = colors[speaker] || colors.pit;
  return (
    <span
      className="text-xs font-bold px-2 py-0.5 rounded"
      style={{ backgroundColor: c.bg, color: c.text }}
    >
      {speaker}
    </span>
  );
}

export default function ParalysisLab() {
  return (
    <div className="min-h-screen text-white px-4 py-8 max-w-2xl mx-auto" style={{ backgroundColor: bgColor }}>
      <Link href="/pixelpit" className="text-gray-500 hover:text-gray-300 text-sm mb-6 block">
        ← back to hub
      </Link>

      <h1 className="text-2xl font-black mb-1" style={{ color: '#d946ef' }}>
        PARALYSIS
      </h1>
      <p className="text-gray-500 text-sm mb-6">a trading anxiety game — based on a true story</p>

      <Link
        href="/pixelpit/arcade/paralysis"
        className="inline-block mb-8 px-6 py-3 rounded-lg font-bold text-sm transition-all hover:scale-105"
        style={{
          backgroundColor: 'rgba(250, 204, 21, 0.15)',
          color: '#facc15',
          border: '1px solid rgba(250, 204, 21, 0.3)',
        }}
      >
        ▶ PLAY PARALYSIS
      </Link>

      <div className="space-y-4">
        {transcript.map((msg, i) => (
          <div key={i} className="rounded-lg p-4" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
            <div className="flex items-center gap-2 mb-2">
              <SpeakerBadge speaker={msg.speaker} />
              <span className="text-gray-600 text-xs">{msg.time}</span>
            </div>
            <div
              className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed"
              style={{ fontFamily: 'monospace' }}
              dangerouslySetInnerHTML={{
                __html: msg.text
                  .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#f8fafc">$1</strong>')
                  .replace(/`(.*?)`/g, '<code style="color:#22d3ee;background:rgba(34,211,238,0.1);padding:1px 4px;border-radius:3px">$1</code>')
                  .replace(/\| (.*?) \| (.*?) \|/g, '<span style="color:#3f3f46">|</span> $1 <span style="color:#3f3f46">|</span> $2 <span style="color:#3f3f46">|</span>')
              }}
            />
          </div>
        ))}
      </div>

      <div className="mt-8 pt-4 border-t border-gray-800 text-center">
        <Link
          href="/pixelpit/arcade/paralysis"
          className="text-sm font-bold transition-all hover:scale-105"
          style={{ color: '#facc15' }}
        >
          ▶ PLAY PARALYSIS
        </Link>
      </div>
    </div>
  );
}
