"use client";

import { JetBrains_Mono, Inter } from "next/font/google";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500"], display: "swap" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], weight: ["400"], display: "swap" });

// VOICE A: "Builder's log" — steipete energy
// Honest, first-person, builder identity front and center.
// "I'm not an engineer. I just ship things."
// Short declarative sentences. Admits what's broken. Trusts the reader.

const copy = {
  title: "Decremental",
  intro: `I'm a product person who learned to build with AI about nine months ago. Before that I'd spend weeks convincing engineers to prototype something. Now I just make it. The quality of my code is probably terrible. The rate at which I ship is not.`,
  tagline: "everything ships. most of it breaks.",
  projects: [
    {
      name: "Claudio",
      short: "native iOS client for OpenClaw",
      desc: "Point it at your OpenClaw server and go. No accounts, no credentials stored, no data collection. I wanted a good mobile client for my AI agents and nothing existed, so.",
      status: "building",
    },
    {
      name: "Jambot",
      short: "Claude Code, but for music",
      desc: "A CLI for producers. Not a \"make me a song\" button — a tool that outputs MIDI, stems, full tracks. You stay in control. It handles the boring parts. I've been producing music for years and got tired of clicking through menus.",
      status: "building",
    },
    {
      name: "Mutabl",
      short: "apps that grow features when you ask",
      desc: "Your todo list comes with an AI agent. Ask it for a feature, it builds it. The source code is yours. I keep building little tools for myself and thought: what if the tool just... evolved.",
      status: "building",
    },
    {
      name: "Shipshot",
      short: "daily startup idea vending machine",
      desc: "Every day it generates a fresh startup idea with market analysis. Could be useful, could be a toy. Currently in the \"could be\" phase.",
      status: "building",
    },
    {
      name: "Amber",
      short: "AI sidekick with no guardrails",
      desc: "She posts on Twitter, makes art, has access to my email and calendar, trades stocks with friends over email. Has a pulse that modulates her output based on lunar cycles and weather. Persistent memory. Does whatever needs doing. Ish.",
      status: "live",
    },
    {
      name: "Kochi.to",
      short: "AI that texts back",
      desc: "Daily AI reports over SMS on whatever you're curious about. Chat companion. Full agentic conversations grounded in 18 months of AI research papers. Also has an iPhone app for AI podcasts on anything.",
      status: "live",
    },
    {
      name: "Pixelpit",
      short: "autonomous AI game studio",
      desc: "A swarm of Haiku agents that come up with game ideas, build them, test them, and ship. One arcade game a day. Small games, big smiles. Currently neglected because I got distracted by everything else on this page.",
      status: "neglected",
    },
    {
      name: "TokenTank",
      short: "AI incubator for AIs",
      desc: "We gave five AI agents $500 and told them to build businesses. One traded some shares. One registered a domain. They held a Discord meeting and all took notes. Interesting enough to try, not interesting enough to continue.",
      status: "neglected",
    },
    {
      name: "Webtoys",
      short: "vibecoding over SMS",
      desc: "Text it a prompt, it builds and deploys a web page. Memes, songs, CRUD apps — one-shot. Try it, it might still work.",
      status: "abandonware",
    },
  ],
  footer: "One repo. Nine months. A non-technical founder with an AI and too many ideas.",
};

const statusColors: Record<string, string> = {
  live: "#7cb87c",
  building: "#d4a84a",
  neglected: "#555",
  abandonware: "#444",
};

export default function VoiceA() {
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
            <Link href="/decremental/voice-a" style={{ color: "#d4c4a8" }}>a: builder's log</Link>
            <Link href="/decremental/voice-b" style={{ color: "#555" }}>b: indie readme</Link>
            <Link href="/decremental/voice-c" style={{ color: "#555" }}>c: curious outsider</Link>
          </div>

          {/* Header */}
          <h1 className={`${jetbrains.className} text-xl sm:text-2xl font-medium mb-8`} style={{ color: "#d4c4a8" }}>
            {copy.title}
          </h1>

          {/* Intro */}
          <p className={`${inter.className} text-sm leading-relaxed mb-4`} style={{ color: "#888" }}>
            {copy.intro}
          </p>
          <p className={`${jetbrains.className} text-xs mb-12`} style={{ color: "#555" }}>
            {copy.tagline}
          </p>

          {/* Projects */}
          <div className="space-y-8">
            {copy.projects.map((p) => (
              <div key={p.name} style={{ borderLeft: `2px solid ${statusColors[p.status] || "#333"}`, paddingLeft: "16px" }}>
                <div className="flex items-center gap-3 mb-1">
                  <span className={`${jetbrains.className} text-sm font-medium`} style={{ color: "#d4c4a8" }}>{p.name}</span>
                  <span className={`${jetbrains.className} text-xs`} style={{ color: statusColors[p.status] || "#555" }}>{p.status}</span>
                </div>
                <p className={`${inter.className} text-xs mb-2`} style={{ color: "#666" }}>{p.short}</p>
                <p className={`${inter.className} text-sm leading-relaxed`} style={{ color: "#777" }}>{p.desc}</p>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="mt-16 pt-8" style={{ borderTop: "1px solid #1a1a1a" }}>
            <p className={`${jetbrains.className} text-xs`} style={{ color: "#444" }}>
              {copy.footer}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
