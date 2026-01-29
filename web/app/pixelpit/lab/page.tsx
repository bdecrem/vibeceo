'use client';

import Link from 'next/link';
import { useEffect } from 'react';

const posts = [
  {
    id: 'swarm-t7',
    date: '2025-01-28',
    title: 'Swarm T7: Visual QA + Triage',
    content: [
      'Our first swarm experiment. Gotta start somewhere. We picked an environment (Together.ai), a token budget, a model (openai/gpt-oss-20b), and a dead-simple base game: pop the bubbles. Tap to pop, score goes up. 80 lines.',
      '10 Makers — Amy, Bob, Chet, Dale, Earl, Fran, Gus, Hank, Ida, Joan — each reskin the base game with a theme: Soap Bubbles, Fireflies, Space Rocks, Candy Pop, Ghosts, Deep Sea, Neon Signs, Fruit Splash, Emoji Madness, Pixel Retro. All 10 run in parallel.',
      'Dither (Creative Head) screenshots each game at 6 seconds, sends to Claude Vision. Scores: ALIVE, THEME, POLISH. Results get triaged — GREEN ships with music, YELLOW gets a v2 redesign, RED is left alone.',
    ],
    links: [
      { href: '/pixelpit/swarm/t7/index.html', text: 'View Dashboard' },
    ],
    tags: ['SWARM', 'QA', 'MAKERS'],
  },
];

export default function LabBlog() {
  useEffect(() => {
    // Scroll to hash on load
    if (window.location.hash) {
      const el = document.getElementById(window.location.hash.slice(1));
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    }
  }, []);

  return (
    <div
      className="min-h-screen text-white"
      style={{
        backgroundColor: '#0D1F1C',
        backgroundImage: `
          linear-gradient(90deg, transparent 49px, rgba(0, 255, 170, 0.08) 49px, rgba(0, 255, 170, 0.08) 51px, transparent 51px),
          linear-gradient(0deg, transparent 49px, rgba(0, 255, 170, 0.08) 49px, rgba(0, 255, 170, 0.08) 51px, transparent 51px),
          radial-gradient(circle at 50px 50px, rgba(0, 255, 170, 0.15) 2px, transparent 2px)
        `,
        backgroundSize: '100px 100px',
      }}
    >
      {/* Header */}
      <header className="py-4 px-6 border-b border-[#00FFAA]/20 flex items-center justify-between">
        <Link href="/pixelpit" className="text-2xl font-black">
          <span className="text-[#FF1493]">PIXEL</span>
          <span className="text-[#00FFFF]">PIT</span>
        </Link>
        <Link
          href="/pixelpit"
          className="text-sm text-[#00FFAA]/70 hover:text-[#00FFAA] transition-colors flex items-center gap-2"
        >
          <span>&larr;</span> back to home
        </Link>
      </header>

      {/* Main */}
      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1
          className="text-4xl font-black mb-2"
          style={{ color: '#00FFAA', textShadow: '0 0 30px rgba(0, 255, 170, 0.6)' }}
        >
          THE LAB
        </h1>
        <p className="text-[#00FFAA]/60 font-mono mb-12">// experiments, prototypes, and dev notes</p>

        {posts.map((post) => (
          <article
            key={post.id}
            id={post.id}
            className="rounded-2xl p-6 mb-6 transition-all target:border-[#00FFAA] target:shadow-[0_0_20px_rgba(0,255,170,0.3)]"
            style={{
              background: 'rgba(0, 255, 170, 0.05)',
              border: '1px solid rgba(0, 255, 170, 0.2)',
            }}
          >
            <div className="font-mono text-xs text-[#00FFAA]/50 mb-2">{post.date}</div>
            <h2 className="text-xl font-bold text-[#00FFAA] mb-3">
              <a href={`#${post.id}`} className="hover:underline">
                {post.title}
              </a>
            </h2>
            <div className="text-white/80 leading-relaxed text-[0.95rem]">
              {post.content.map((p, i) => (
                <p key={i} className="mb-3 last:mb-0">
                  {p}
                </p>
              ))}
              {post.links && post.links.length > 0 && (
                <p className="flex gap-4 flex-wrap">
                  {post.links.map((link, i) => (
                    <Link key={i} href={link.href} className="text-[#00FFAA] hover:underline">
                      {link.text}
                    </Link>
                  ))}
                </p>
              )}
            </div>
            <div className="mt-4 flex gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="font-mono text-[0.7rem] px-2 py-1 rounded"
                  style={{ background: 'rgba(0, 255, 170, 0.15)', color: '#00FFAA' }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </article>
        ))}
      </main>

      {/* Footer */}
      <footer className="text-center py-8 border-t border-[#00FFAA]/10 text-white/40 text-sm">
        <Link href="/pixelpit" className="text-[#FF1493] hover:underline">
          pixelpit
        </Link>
        .gg &mdash; an AI game studio
      </footer>
    </div>
  );
}
