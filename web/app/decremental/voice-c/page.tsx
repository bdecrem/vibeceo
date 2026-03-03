"use client";

import { JetBrains_Mono, Inter } from "next/font/google";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500"], display: "swap" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], weight: ["400"], display: "swap" });

// VOICE C: "Curious outsider" — the non-technical angle IS the story
// Leans into "I don't write code but I ship software" as the interesting thing.
// More reflective, slightly longer, but still understated.
// The perspective of someone who found a cheat code and is figuring out what to do with it.

const copy = {
  title: "Decremental",
  intro: [
    "I don't write code. I never have. But nine months ago I started building software with AI and now I can't stop.",
    "I'm a product person — spent my career figuring out what to build, then asking engineers to build it. That loop used to take weeks. Now it takes an afternoon. The tradeoff is that my codebase looks like a crime scene, but things ship.",
    "This is everything I've built. One monorepo, mostly Claude Code, mostly working.",
  ],
  projects: [
    {
      name: "Claudio",
      desc: "I wanted a native iPhone app for talking to my AI agents. Nothing good existed. So I made one. It connects to OpenClaw, no accounts required, doesn't collect anything. My first iOS app. Probably shows.",
      status: "building",
    },
    {
      name: "Jambot",
      desc: "I produce music as a hobby. I got tired of the gap between having an idea and hearing it. This is a CLI that outputs real MIDI and WAV — not a \"make me a song\" button, a tool for people who actually produce. Claude Code but for music.",
      status: "building",
    },
    {
      name: "Mutabl",
      desc: "What if your apps could grow? You start with a basic todo list, but it comes with an AI agent. Ask it for a calendar view, it builds one. Ask for tags, done. The source code stays yours. I keep building little tools and thought: why not let the tool build itself.",
      status: "building",
    },
    {
      name: "Amber",
      desc: "My AI sidekick. She has access to my email, my calendar, and my Twitter account. She makes art, trades stocks with friends, and has a mood that shifts with the moon and the weather. No guardrails. I trust her more than most interns I've had.",
      status: "live",
    },
    {
      name: "Kochi.to",
      desc: "AI that texts you back. I wanted a way to stay on top of AI research without doomscrolling. So I built an SMS bot that sends daily briefings, answers questions, and can have full conversations grounded in 18 months of papers. Then I gave it a podcast app.",
      status: "live",
    },
    {
      name: "Pixelpit",
      desc: "An autonomous AI game studio — a swarm of Haiku agents that ideate, build, test and ship one tiny arcade game per day. It worked surprisingly well until I got distracted by literally everything else here.",
      status: "neglected",
    },
    {
      name: "TokenTank",
      desc: "We gave five AI agents $500 and all our tools and told them to start companies. One figured out stock trading (barely). One registered a domain. They scheduled a Discord meeting and all showed up and took notes. Then nothing. Interesting experiment, not interesting enough to babysit.",
      status: "neglected",
    },
    {
      name: "Webtoys",
      desc: "Vibecoding over SMS. Text a prompt, get a deployed web page. It was genuinely fun. Try it, it might still work.",
      status: "abandonware",
    },
  ],
  footer: "I'm not sure what I'm building toward. But I know I'm building faster than I ever have, and the only bottleneck left is taste.",
};

const statusColors: Record<string, string> = {
  live: "#7cb87c",
  building: "#d4a84a",
  neglected: "#555",
  abandonware: "#444",
};

export default function VoiceC() {
  return (
    <>
      <style jsx global>{`
        html { background: #0a0a0a; }
        body { margin: 0; padding: 0; background: #0a0a0a; }
      `}</style>

      <div className="min-h-screen w-full flex flex-col items-center p-6 sm:p-12 pt-12 sm:pt-20" style={{ background: "#0a0a0a" }}>
        <div className="w-full max-w-2xl">

          {/* Nav */}
          <div className={`${jetbrains.className} text-xs mb-12 flex gap-4`}>
            <Link href="/decremental/voice-a" style={{ color: "#555" }}>a: builder's log</Link>
            <Link href="/decremental/voice-b" style={{ color: "#555" }}>b: indie readme</Link>
            <Link href="/decremental/voice-c" style={{ color: "#d4c4a8" }}>c: curious outsider</Link>
          </div>

          {/* Header */}
          <h1 className={`${jetbrains.className} text-xl sm:text-2xl font-medium mb-8`} style={{ color: "#d4c4a8" }}>
            {copy.title}
          </h1>

          {/* Intro — multiple short paragraphs */}
          <div className="mb-12 space-y-4">
            {copy.intro.map((p, i) => (
              <p key={i} className={`${inter.className} text-sm leading-relaxed`} style={{ color: i === 0 ? "#999" : "#777" }}>
                {p}
              </p>
            ))}
          </div>

          {/* Projects — each one tells a micro-story */}
          <div className="space-y-10">
            {copy.projects.map((p) => (
              <div key={p.name}>
                <div className="flex items-center gap-3 mb-2">
                  <span
                    className="inline-block w-2 h-2 rounded-full"
                    style={{ backgroundColor: statusColors[p.status] || "#444" }}
                  />
                  <span className={`${jetbrains.className} text-sm font-medium`} style={{ color: "#d4c4a8" }}>{p.name}</span>
                  <span className={`${jetbrains.className} text-xs`} style={{ color: statusColors[p.status] || "#444" }}>{p.status}</span>
                </div>
                <p className={`${inter.className} text-sm leading-relaxed pl-5`} style={{ color: "#777" }}>
                  {p.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="mt-16 pt-8" style={{ borderTop: "1px solid #1a1a1a" }}>
            <p className={`${inter.className} text-sm italic`} style={{ color: "#555" }}>
              {copy.footer}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
