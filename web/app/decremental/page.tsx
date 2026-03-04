"use client";

import { Poppins, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

type ProjectStatus = "active" | "respinning" | "retired" | "abandonware" | "neglected" | "wip";

interface Project {
  name: string;
  slug: string;
  url: string;
  image: string | null;
  shortDesc: string;
  fullDesc: string | React.ReactNode;
  status: ProjectStatus;
  tech?: string[];
  launched?: string;
  statusEmoji?: string;
  order?: number;
  artifacts?: { label: string; url: string }[];
}

// VOICE B copy — indie readme, lowercase, terse
const projects: Project[] = [
  {
    name: "claudio",
    slug: "claudio",
    url: "https://claudio.la",
    image: null,
    shortDesc: "native ios client for openclaw",
    fullDesc: "point at your openclaw server and go. no accounts, no tracking, no data collection.",
    status: "wip",
    order: -5,
  },
  {
    name: "jambot",
    slug: "jambot",
    url: "https://github.com/bdecrem/jambot",
    image: null,
    shortDesc: "cli for music production",
    fullDesc: <>outputs midi, wav, stems. not a &quot;make me a song&quot; button. includes <a href="https://kochi.to/jb200" target="_blank" rel="noopener noreferrer" style={{ color: "#888", textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: "2px" }}>web synths</a>.</>,
    status: "wip",
    order: -1,
    artifacts: [{ label: "screenshot", url: "/images/jambot-screencap.png" }],
  },
  {
    name: "mutabl",
    slug: "mutabl",
    url: "https://mutabl.co",
    image: null,
    shortDesc: "apps that evolve",
    fullDesc: "ask your todo list for a new feature, it builds it. source is yours.",
    status: "respinning",
    order: -2,
  },
  {
    name: "das kollektiv (und more)",
    slug: "daskollektiv",
    url: "https://daskollektiv.rip",
    image: null,
    shortDesc: "agents. hardware. questionable wiring",
    fullDesc: "openclaw experiments on weird hardware. marg lives on a pwnagotchi and talks to cameras. a pico, some e-ink, and whatever else is lying around.",
    status: "wip",
    order: -4,
  },
  {
    name: "shipshot",
    slug: "shipshot",
    url: "https://shipshot.io",
    image: null,
    shortDesc: "daily startup idea generator",
    fullDesc: "market analysis included. usefulness tbd.",
    status: "respinning",
    order: 1,
  },
  {
    name: "amber",
    slug: "amber",
    url: "https://intheamber.com",
    image: "/kochitolabs/og-amber.png",
    shortDesc: "ai sidekick, no guardrails",
    fullDesc: <>posts <a href="https://kochi.to/amber/beam-v2.html" target="_blank" rel="noopener noreferrer" style={{ color: "#888", textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: "2px" }}>toys</a> and <a href="https://intheamber.com/amber/soul.html" target="_blank" rel="noopener noreferrer" style={{ color: "#888", textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: "2px" }}>art</a> on <a href="https://twitter.com/intheamber" target="_blank" rel="noopener noreferrer" style={{ color: "#888", textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: "2px" }}>twitter</a>. has access to my email. trades stocks with friends. <a href="https://intheamber.com/amber/mood/index.html" target="_blank" rel="noopener noreferrer" style={{ color: "#888", textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: "2px" }}>mood</a> shifts with the moon. does whatever needs doing.</>,
    status: "active",
    order: 2,
  },
  {
    name: "kochi.to",
    slug: "kochi",
    url: "https://kochi.to",
    image: "/kochitolabs/og-kochi.png",
    shortDesc: "ai over sms",
    fullDesc: "daily reports, research papers, chat companion. also an iphone podcast app.",
    status: "neglected",
    order: 3,
    artifacts: [{ label: "iphone app", url: "https://apps.apple.com/us/app/kochi-podcast-player/id6752669410" }],
  },
  {
    name: "pixelpit",
    slug: "pixelpit",
    url: "https://pixelpit.gg",
    image: null,
    shortDesc: "ai game studio",
    fullDesc: "haiku agents build one arcade game per day. currently on pause.",
    status: "neglected",
  },
  {
    name: "ctrl shift",
    slug: "ctrlshift",
    url: "https://ctrlshift.so",
    image: "/kochitolabs/og-ctrlshift.png",
    shortDesc: "long horizon lab",
    fullDesc: <>backing founders, researchers, students building for impact that won&apos;t show in next quarter&apos;s metrics. also a <a href="https://ctrlshift.so/cs" target="_blank" rel="noopener noreferrer" style={{ color: "#888", textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: "2px" }}>knowledge base</a>.</>,
    status: "retired",
    statusEmoji: "†",
  },
  {
    name: "tokentank",
    slug: "tokentank",
    url: "https://kochi.to/token-tank",
    image: "/kochitolabs/og-tokentank.png",
    shortDesc: "ai incubator for ais",
    fullDesc: "gave 5 ai agents $500 to build businesses. one registered a domain. they held a meeting.",
    status: "retired",
    statusEmoji: "†",
  },
  {
    name: "webtoys",
    slug: "webtoys",
    url: "https://webtoys.ai",
    image: "/kochitolabs/og-webtoys.png",
    shortDesc: "vibecoding over sms",
    fullDesc: <>text a prompt, get a deployed web page. try it, <a href="https://webtoys.ai/bart/tangerine-bat-tracking?demo=true" target="_blank" rel="noopener noreferrer" style={{ color: "#888", textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: "2px" }}>might still work</a>.</>,
    status: "retired",
    statusEmoji: "†",
  },
  {
    name: "advisorsfoundry",
    slug: "advisorsfoundry",
    url: "https://advisorsfoundry.ai",
    image: null,
    shortDesc: "the first experiment",
    fullDesc: <>chatbot that grew into something. discord bots, <a href="https://v0-winference-email-page.vercel.app" target="_blank" rel="noopener noreferrer" style={{ color: "#888", textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: "2px" }}>easter eggs</a>, sms. held together by inertia.</>,
    status: "retired",
    statusEmoji: "†",
  },
];

// Pixel grid logo
function AsciiLogo() {
  const grid = [
    [0,1,0,0,0,1,0],
    [0,2,0,0,0,2,0],
    [0,2,0,0,0,2,0],
    [2,2,2,2,2,2,2],
    [3,3,3,3,3,3,3],
    [3,0,0,0,0,0,3],
    [3,0,3,0,3,0,3],
    [3,0,3,0,3,0,3],
    [3,0,0,0,0,0,3],
    [3,3,3,3,3,3,3],
    [3,3,3,3,3,3,3],
    [2,2,2,2,2,2,2],
  ];

  const colors: Record<number, string> = {
    0: 'transparent',
    1: 'rgba(212, 196, 168, 0.3)',
    2: 'rgba(212, 196, 168, 0.6)',
    3: '#d4c4a8',
  };

  const cellSize = 4;

  return (
    <div
      className="select-none"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${grid[0].length}, ${cellSize}px)`,
        gridTemplateRows: `repeat(${grid.length}, ${cellSize}px)`,
        gap: '1px',
      }}
    >
      {grid.flat().map((val, i) => (
        <div
          key={i}
          style={{
            backgroundColor: colors[val],
            width: cellSize,
            height: cellSize,
          }}
        />
      ))}
    </div>
  );
}

function StatusIndicator({ status, emoji }: { status: ProjectStatus; emoji?: string }) {
  if (status === "active") {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: "#7cb87c" }} />
          <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: "#7cb87c" }} />
        </span>
        <span className="text-xs" style={{ color: "#7cb87c" }}>live</span>
      </span>
    );
  }

  if (status === "wip") {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: "#7cb87c", animation: "pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite" }} />
        <span className="text-xs" style={{ color: "#7cb87c" }}>wip</span>
      </span>
    );
  }

  if (status === "respinning") {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: "#c9b458", animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }} />
        <span className="text-xs" style={{ color: "#c9b458" }}>booting up</span>
      </span>
    );
  }

  if (status === "neglected") {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block h-2 w-2 rounded-full border border-dotted" style={{ borderColor: "#777", backgroundColor: "transparent" }} />
        <span className="text-xs" style={{ color: "#777" }}>neglect (benign)</span>
      </span>
    );
  }

  if (status === "abandonware") {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block h-2 w-2 rounded-full border border-dashed" style={{ borderColor: "#666", backgroundColor: "transparent" }} />
        <span className="text-xs" style={{ color: "#666" }}>~</span>
      </span>
    );
  }

  // retired
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-block h-2 w-2 rounded-full border" style={{ borderColor: "#444", backgroundColor: "transparent" }} />
      <span className="text-xs" style={{ color: "#555" }}>
        🫗†
      </span>
    </span>
  );
}

type ContactState = "message" | "email" | "sending" | "sent";

function EasterEggCLI({ isVisible, onClose }: { isVisible: boolean; onClose: () => void }) {
  const [input, setInput] = useState("");
  const [state, setState] = useState<ContactState>("message");
  const [message, setMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isVisible && inputRef.current) inputRef.current.focus();
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) { setInput(""); setState("message"); setMessage(""); }
  }, [isVisible]);

  const handleSubmit = useCallback(async () => {
    const value = input.trim();
    if (!value) return;
    if (state === "message") { setMessage(value); setState("email"); setInput(""); }
    else if (state === "email") {
      setState("sending");
      try { await fetch("/api/kochitolabs/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message, email: value }) }); } catch {}
      setState("sent"); setInput("");
    }
  }, [input, state, message]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); handleSubmit(); }
    else if (e.key === "Escape") { e.preventDefault(); onClose(); }
  }, [handleSubmit, onClose]);

  if (!isVisible) return null;

  return (
    <div className="absolute bottom-0 left-0 right-0 overflow-hidden transition-all duration-300" style={{ backgroundColor: "rgba(10, 10, 10, 0.95)", borderTop: "1px solid #222", backdropFilter: "blur(8px)" }}>
      {state === "email" && <div className="px-4 sm:px-6 py-2 text-sm" style={{ color: "#666" }}>&quot;{message}&quot; — now drop your email</div>}
      {state === "sending" && <div className="px-4 sm:px-6 py-2 text-sm" style={{ color: "#666" }}>sending...</div>}
      {state === "sent" && <div className="px-4 sm:px-6 py-2 text-sm" style={{ color: "#7cb87c" }}>sent. i&apos;ll be in touch.</div>}
      {state !== "sending" && state !== "sent" && (
        <div className="px-4 sm:px-6 py-3 flex items-center gap-2">
          <input ref={inputRef} type={state === "email" ? "email" : "text"} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-[#333]" style={{ color: "#d4c4a8", caretColor: "#7cb87c" }}
            placeholder={state === "message" ? "you found it. what's up?" : "your email"} autoComplete={state === "email" ? "email" : "off"} autoCorrect="off" autoCapitalize="off" spellCheck={false}
          />
          <span className="text-xs" style={{ color: "#333" }}>esc</span>
        </div>
      )}
      {state === "sent" && <div className="px-4 sm:px-6 py-3 flex justify-end"><span className="text-xs" style={{ color: "#333" }}>esc</span></div>}
    </div>
  );
}

function ProjectRow({ project, isExpanded, onToggle }: { project: Project; isExpanded: boolean; onToggle: () => void }) {
  const isRetired = project.status === "retired" || project.status === "abandonware" || project.status === "neglected";

  return (
    <div className={`transition-all duration-200 ${isExpanded ? "bg-white/[0.02]" : "hover:bg-white/[0.015]"}`}>
      <button onClick={onToggle} className="w-full text-left px-4 sm:px-6 py-4 flex items-center gap-3 sm:gap-4">
        <span className={`${jetbrains.className} font-medium shrink-0`} style={{ color: isRetired ? "#555" : "#d4c4a8" }}>{project.name}</span>
        <StatusIndicator status={project.status} emoji={project.statusEmoji} />
        <span className="flex-1" />
        <span className="hidden sm:block text-right max-w-xs truncate text-sm" style={{ color: "#444" }}>{project.shortDesc}</span>
        <span className="w-5 text-center transition-transform duration-200 text-sm" style={{ color: "#333", transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}>›</span>
      </button>

      <div className={`overflow-hidden transition-all duration-300 ease-out ${isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}>
        <div className="px-4 sm:px-6 pb-5">
          <p className="sm:hidden mb-3 text-sm" style={{ color: "#555" }}>{project.shortDesc}</p>
          <p className="text-sm leading-relaxed mb-4 max-w-2xl" style={{ color: "#888" }}>{project.fullDesc}</p>
          <div className="flex flex-wrap items-center gap-4">
            <Link href={project.url} target="_blank" rel="noopener noreferrer"
              className={`${jetbrains.className} inline-flex items-center gap-2 text-sm transition-colors hover:opacity-80`}
              style={{ color: "#888", textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: "2px" }}>
              {project.url.replace('https://', '')}
              <span className="text-xs" style={{ textDecoration: "none" }}>↗</span>
            </Link>
            {project.artifacts?.map((artifact, i) => (
              <a key={i} href={artifact.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm transition-colors hover:opacity-80" style={{ color: "#555" }}>
                [{artifact.label}]
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VoiceBTerminal() {
  const [showCLI, setShowCLI] = useState(false);

  const sortedProjects = [...projects].sort((a, b) => {
    const statusOrder = { active: 0, wip: 1, respinning: 2, neglected: 3, abandonware: 4, retired: 5 };
    if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
    if (a.order !== undefined) return -1;
    if (b.order !== undefined) return 1;
    return statusOrder[a.status] - statusOrder[b.status];
  });

  const [expandedSlugs, setExpandedSlugs] = useState<Set<string>>(
    () => new Set(sortedProjects.slice(0, 3).map(p => p.slug))
  );

  const toggleProject = (slug: string) => {
    setExpandedSlugs(prev => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug); else next.add(slug);
      return next;
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showCLI) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "/" || (e.key.length === 1 && e.key.match(/[a-z]/i))) {
        e.preventDefault();
        setShowCLI(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showCLI]);

  return (
    <>
      <style jsx global>{`
        html { background: #0a0a0a; }
        body { margin: 0; padding: 0; background: #0a0a0a; }
      `}</style>

      <div className="min-h-screen w-full flex flex-col items-center p-4 sm:p-8 pt-8 sm:pt-16" style={{ background: "#0a0a0a" }}>
        {/* Header */}
        <div className="w-full max-w-3xl mb-6">
          <h1 className={`${jetbrains.className} text-xl sm:text-2xl font-medium leading-none`} style={{ color: "#d4c4a8" }}>
            Decremental
          </h1>
        </div>

        {/* Intro — voice b: terse, lowercase */}
        <p className={`${poppins.className} w-full max-w-3xl text-sm leading-relaxed mb-8 px-1`} style={{ color: "#555" }}>
          nine months of building (tinkering) with ai (claude code), mostly around agentic loops, creativity, and other things <a href="https://linkedin.com/in/bartdecrem" target="_blank" rel="noopener noreferrer" style={{ color: "#555", textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: "2px" }}>i am</a> interested in. a lot of unfinished thoughts, one main <a href="https://github.com/bdecrem/vibeceo" target="_blank" rel="noopener noreferrer" style={{ color: "#555", textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: "2px" }}>repo</a>, some of it open source. most of this works …mostly. i&apos;m on <a href="https://twitter.com/bartdecrem" target="_blank" rel="noopener noreferrer" style={{ color: "#555", textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: "2px" }}>twitter</a>.
        </p>

        {/* Terminal window */}
        <div className={`${jetbrains.className} w-full max-w-3xl overflow-hidden relative`} style={{ backgroundColor: "#0d0d0d", border: "1px solid #1a1a1a", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.8)" }}>
          {/* Title bar */}
          <div className="flex items-center gap-2 px-4 py-3 select-none" style={{ backgroundColor: "#111", borderBottom: "1px solid #1a1a1a" }}>
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#6b4a4a" }} />
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#6b5c4a" }} />
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#4a5c4a" }} />
            <span className="text-xs ml-4" style={{ color: "#333" }}>~/projects</span>
            <span className="flex-1" />
            <a href="https://github.com/bdecrem/vibeceo/blob/main/PLATFORM-OVERVIEW.md" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity" style={{ color: "#444", fontSize: "16px" }} title="Platform Overview">⚙</a>
          </div>

          {/* Project list */}
          <div className="text-sm divide-y divide-[#151515]">
            {sortedProjects.map(project => (
              <ProjectRow key={project.slug} project={project} isExpanded={expandedSlugs.has(project.slug)} onToggle={() => toggleProject(project.slug)} />
            ))}
          </div>

          {/* Footer */}
          <div className="px-4 sm:px-6 py-3 text-xs flex items-center justify-between cursor-text group" style={{ borderTop: "1px solid #151515" }} onClick={() => setShowCLI(true)}>
            <span className="flex items-center gap-2">
              <span style={{ color: "#333" }}>the future&apos;s here. it&apos;s just uneven.</span>
              <span className="inline-block w-1.5 h-3.5 animate-pulse group-hover:opacity-100" style={{ backgroundColor: "#7cb87c", opacity: 0.3, animation: "pulse 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }} />
            </span>
            <span style={{ color: "#222" }}>{projects.filter(p => p.status === "active").length} live</span>
          </div>

          <EasterEggCLI isVisible={showCLI} onClose={() => setShowCLI(false)} />
        </div>
      </div>
    </>
  );
}
