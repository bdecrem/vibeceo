"use client";

import { Poppins, Montserrat, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["500"],
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

const projects: Project[] = [
  {
    name: "Amber",
    slug: "amber",
    url: "https://intheamber.com",
    image: "/kochitolabs/og-amber.png",
    shortDesc: "AI sidekick, no guardrails",
    fullDesc: <>Posts <a href="https://kochi.to/amber/beam-v2.html" target="_blank" rel="noopener noreferrer" style={{ color: "#bbb", textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: "2px" }}>toys</a>, <a href="https://kochi.to/amber/pendulum.html" target="_blank" rel="noopener noreferrer" style={{ color: "#bbb", textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: "2px" }}>art</a>, and more on <a href="https://twitter.com/intheamber" target="_blank" rel="noopener noreferrer" style={{ color: "#bbb", textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: "2px" }}>Twitter</a>. Has access to the founder&apos;s email and calendar, trades stocks over email with friends. Has her own <a href="https://intheamber.com/amber/mood/index.html" target="_blank" rel="noopener noreferrer" style={{ color: "#bbb", textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: "2px" }}>pulse</a> that modulates her creative output based on lunar cycles and weather. Persistent memory. Does whatever needs doing.</>,
    status: "active",
    order: 2,
  },
  {
    name: "Kochi.to",
    slug: "kochi",
    url: "https://kochi.to",
    image: "/kochitolabs/og-kochi.png",
    shortDesc: "AI that texts back",
    fullDesc: `Daily AI reports over SMS (with .md and podcast versions) on AI, tech, science topics. Chat companion. Full agentic conversations about 18 months of AI research papers. Also does the webtoys stuff.`,
    status: "active",
    order: 3,
    artifacts: [{ label: "iphone app — ai podcasts on anything", url: "https://apps.apple.com/us/app/kochi-podcast-player/id6752669410" }],
  },
  {
    name: "Jambot",
    slug: "jambot",
    url: "https://github.com/bdecrem/jambot",
    image: null,
    shortDesc: "Claude Code for music",
    fullDesc: <>CLI and agentic, like Claude Code—but for music production. Not a &quot;make me a song&quot; button. A tool for producers: outputs MIDI, .wav, stems, full tracks. Includes <a href="https://kochi.to/jb200" target="_blank" rel="noopener noreferrer" style={{ color: "#bbb", textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: "2px" }}>web synths</a>. You stay in control, it handles the grunt work.</>,
    status: "wip",
    order: 1,
    artifacts: [{ label: "screenshot", url: "/images/jambot-screencap.png" }],
  },
  {
    name: "CTRL SHIFT",
    slug: "ctrlshift",
    url: "https://ctrlshift.so",
    image: "/kochitolabs/og-ctrlshift.png",
    shortDesc: "Long horizon lab",
    fullDesc: <>A community of AI builders, researchers, and investors. We back ambitious, longer-horizon projects that traditional venture ignores—founders, researchers, and students building for impact that won&apos;t show up in next quarter&apos;s metrics. Also home to a <a href="https://ctrlshift.so/cs" target="_blank" rel="noopener noreferrer" style={{ color: "#bbb", textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: "2px" }}>scrappy little knowledge base</a> (just text it your links).</>,
    status: "respinning",
  },
  {
    name: "TokenTank",
    slug: "tokentank",
    url: "https://tokentank.io",
    image: "/kochitolabs/og-tokentank.png",
    shortDesc: "Cuz AIs deserve their own incubator",
    fullDesc: <>We gave five AI agents $500, <a href="https://tokentank.io/#rules" target="_blank" rel="noopener noreferrer" style={{ color: "#bbb", textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: "2px" }}>all our tools</a>, and told them to build businesses. One traded some shares but never figured out how to evolve its strategy. One registered a domain. They held a Discord meeting and all took notes. Interesting enough to try, not interesting enough to continue.</>,
    status: "neglected",
  },
  {
    name: "Webtoys.ai",
    slug: "webtoys",
    url: "https://webtoys.ai",
    image: "/kochitolabs/og-webtoys.png",
    shortDesc: "Vibecoding, but over SMS",
    fullDesc: <>What if vibecoding, but over SMS? Memes, songs, web pages, CRUD apps—one-shot and deployed. Plus <a href="https://webtoys.ai/bart/tangerine-bat-tracking?demo=true" target="_blank" rel="noopener noreferrer" style={{ color: "#bbb", textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: "2px" }}>wide-open community billboards</a>. Try it, it might still work.</>,
    status: "abandonware",
  },
  {
    name: "AdvisorsFoundry",
    slug: "advisorsfoundry",
    url: "https://advisorsfoundry.ai",
    image: null,
    shortDesc: "What do you mean, rate limits?",
    fullDesc: <>Our first experiment: a simple chatbot that grew into... something. Multiple AI advisor agents, tons of backstories and <a href="https://v0-winference-email-page.vercel.app" target="_blank" rel="noopener noreferrer" style={{ color: "#bbb", textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: "2px" }}>easter eggs</a>. Then Discord integration, complete with a pitchbot, story mode and tipsy alex. Then SMS. Hasn&apos;t been touched in ages; held together (or not) by mass and momentum at this point.</>,
    status: "retired",
    statusEmoji: "†",
  },
];

// Animated status indicator component
function StatusIndicator({ status, emoji }: { status: ProjectStatus; emoji?: string }) {
  if (status === "active") {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="relative flex h-2 w-2">
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
            style={{ backgroundColor: "#7cb87c" }}
          />
          <span
            className="relative inline-flex rounded-full h-2 w-2"
            style={{ backgroundColor: "#7cb87c" }}
          />
        </span>
        <span className="text-xs" style={{ color: "#7cb87c" }}>live</span>
      </span>
    );
  }

  if (status === "respinning") {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span
          className="inline-block h-2 w-2 rounded-full animate-pulse"
          style={{
            backgroundColor: "#d4a84a",
            animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite"
          }}
        />
        <span
          className="text-xs animate-pulse"
          style={{ color: "#d4a84a" }}
        >
          rebuilding
        </span>
      </span>
    );
  }

  if (status === "wip") {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span
          className="inline-block h-2 w-2 rounded-full animate-pulse"
          style={{
            backgroundColor: "#7cb87c",
            animation: "pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite"
          }}
        />
        <span className="text-xs" style={{ color: "#7cb87c" }}>under construction</span>
      </span>
    );
  }

  if (status === "abandonware") {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span
          className="inline-block h-2 w-2 rounded-full border border-dashed"
          style={{ borderColor: "#666", backgroundColor: "transparent" }}
        />
        <span className="text-xs" style={{ color: "#666" }}>abandonware<span className="ml-1" style={{ fontSize: "0.6rem" }}>∿</span></span>
      </span>
    );
  }

  if (status === "neglected") {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span
          className="inline-block h-2 w-2 rounded-full border border-dotted"
          style={{ borderColor: "#777", backgroundColor: "transparent" }}
        />
        <span className="text-xs" style={{ color: "#777" }}>neglected<span className="ml-1" style={{ fontSize: "0.6rem" }}>…</span></span>
      </span>
    );
  }

  // retired
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-block h-2 w-2 rounded-full border"
        style={{ borderColor: "#444", backgroundColor: "transparent" }}
      />
      <span className="text-xs" style={{ color: "#555" }}>
        archived{emoji && <span className="ml-1" style={{ fontSize: "0.6rem" }}>{emoji}</span>}
      </span>
    </span>
  );
}

type ContactState = "message" | "email" | "sending" | "sent";

function EasterEggCLI({
  isVisible,
  onClose
}: {
  isVisible: boolean;
  onClose: () => void;
}) {
  const [input, setInput] = useState("");
  const [state, setState] = useState<ContactState>("message");
  const [message, setMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isVisible && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) {
      setInput("");
      setState("message");
      setMessage("");
    }
  }, [isVisible]);

  const handleSubmit = useCallback(async () => {
    const value = input.trim();
    if (!value) return;

    if (state === "message") {
      setMessage(value);
      setState("email");
      setInput("");
    } else if (state === "email") {
      setState("sending");
      try {
        await fetch("/api/kochitolabs/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message, email: value }),
        });
        setState("sent");
      } catch {
        setState("sent"); // show success anyway, fail silently
      }
      setInput("");
    }
  }, [input, state, message]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  }, [handleSubmit, onClose]);

  if (!isVisible) return null;

  const getPlaceholder = () => {
    if (state === "message") return "you found it. what's up?";
    if (state === "email") return "your email";
    return "";
  };

  const getPrompt = () => {
    if (state === "email") return `"${message}" — now drop your email`;
    if (state === "sending") return "sending...";
    if (state === "sent") return "sent ✓ i'll be in touch";
    return null;
  };

  return (
    <div
      className="absolute bottom-0 left-0 right-0 overflow-hidden transition-all duration-300"
      style={{
        backgroundColor: "rgba(10, 10, 10, 0.95)",
        borderTop: "1px solid #222",
        backdropFilter: "blur(8px)",
      }}
    >
      {/* Prompt/status */}
      {getPrompt() && (
        <div className="px-4 sm:px-6 py-2 text-sm" style={{ color: state === "sent" ? "#7cb87c" : "#666" }}>
          {getPrompt()}
        </div>
      )}

      {/* Input line */}
      {state !== "sending" && state !== "sent" && (
        <div className="px-4 sm:px-6 py-3 flex items-center gap-2">
          <input
            ref={inputRef}
            type={state === "email" ? "email" : "text"}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-[#333]"
            style={{ color: "#d4c4a8", caretColor: "#7cb87c" }}
            placeholder={getPlaceholder()}
            autoComplete={state === "email" ? "email" : "off"}
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />
          <span className="text-xs" style={{ color: "#333" }}>esc</span>
        </div>
      )}

      {/* Done state - just show esc hint */}
      {state === "sent" && (
        <div className="px-4 sm:px-6 py-3 flex justify-end">
          <span className="text-xs" style={{ color: "#333" }}>esc</span>
        </div>
      )}
    </div>
  );
}

function ProjectRow({ project, isExpanded, onToggle }: {
  project: Project;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const isRetired = project.status === "retired" || project.status === "abandonware" || project.status === "neglected";
  const statusColor = project.status === "active" ? "#7cb87c" : project.status === "wip" ? "#7cb87c" : project.status === "respinning" ? "#d4a84a" : project.status === "neglected" ? "#777" : project.status === "abandonware" ? "#666" : "#555";

  return (
    <div
      className={`transition-all duration-200 ${isExpanded ? "bg-white/[0.02]" : "hover:bg-white/[0.015]"}`}
    >
      {/* Main row - clickable */}
      <button
        onClick={onToggle}
        className="w-full text-left px-4 sm:px-6 py-4 flex items-center gap-3 sm:gap-4"
      >
        {/* Project name */}
        <span
          className="font-medium shrink-0"
          style={{ color: isRetired ? "#666" : "#d4c4a8" }}
        >
          {project.name}
        </span>

        {/* Status indicator - inline */}
        <StatusIndicator status={project.status} emoji={project.statusEmoji} />

        {/* Spacer */}
        <span className="flex-1" />

        {/* Short description - desktop only */}
        <span
          className="hidden sm:block text-right max-w-xs truncate text-sm"
          style={{ color: "#555" }}
        >
          {project.shortDesc}
        </span>

        {/* Expand indicator */}
        <span
          className="w-5 text-center transition-transform duration-200 text-sm"
          style={{
            color: "#444",
            transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)"
          }}
        >
          ›
        </span>
      </button>

      {/* Expanded content */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-out ${isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}
      >
        <div className="px-4 sm:px-6 pb-5">
          {/* Mobile: show short desc here */}
          <p className="sm:hidden mb-3 text-sm" style={{ color: "#666" }}>
            {project.shortDesc}
          </p>

          {/* Full description */}
          <p
            className="text-sm leading-relaxed mb-4 max-w-2xl"
            style={{ color: "#999" }}
          >
            {project.fullDesc}
          </p>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs mb-4">
            {project.tech && (
              <div>
                <span style={{ color: "#444" }}>stack </span>
                <span style={{ color: "#666" }}>{project.tech.join(" · ")}</span>
              </div>
            )}
            {project.launched && (
              <div>
                <span style={{ color: "#444" }}>launched </span>
                <span style={{ color: "#666" }}>{project.launched}</span>
              </div>
            )}
          </div>

          {/* Visit link and artifacts */}
          <div className="flex flex-wrap items-center gap-4">
            <Link
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm transition-colors hover:opacity-80"
              style={{ color: statusColor }}
            >
              {project.url.replace('https://', '')}
              <span className="text-xs">↗</span>
            </Link>
            {project.artifacts?.map((artifact, i) => (
              <a
                key={i}
                href={artifact.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm transition-colors hover:opacity-80"
                style={{ color: "#666" }}
              >
                [{artifact.label}]
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function KochitoLabsPageV2() {
  const [showCLI, setShowCLI] = useState(false);

  // Sort by manual order first, then by status
  const sortedProjects = [...projects].sort((a, b) => {
    const statusOrder = { active: 0, wip: 1, respinning: 2, neglected: 3, abandonware: 4, retired: 5 };
    // If both have order, sort by order
    if (a.order !== undefined && b.order !== undefined) {
      return a.order - b.order;
    }
    // If only one has order, it comes first
    if (a.order !== undefined) return -1;
    if (b.order !== undefined) return 1;
    // Otherwise sort by status
    return statusOrder[a.status] - statusOrder[b.status];
  });

  // Start with first 3 projects expanded
  const [expandedSlugs, setExpandedSlugs] = useState<Set<string>>(
    () => new Set(sortedProjects.slice(0, 3).map(p => p.slug))
  );

  const toggleProject = (slug: string) => {
    setExpandedSlugs(prev => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return next;
    });
  };

  // Listen for keypress to activate easter egg CLI
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if already in CLI, or if user is typing in an input
      if (showCLI) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // Activate on "/" or any letter key
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

      <div
        className="min-h-screen w-full flex flex-col items-center p-4 sm:p-8 pt-8 sm:pt-16"
        style={{ background: "#0a0a0a" }}
      >
        {/* Header */}
        <div className="flex items-end gap-4 mb-6">
          <div className="w-10 h-10 sm:w-12 sm:h-12">
            <img
              src="/kochito-logo.png"
              alt="Kochito Labs"
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className={`${poppins.className} text-xl sm:text-2xl font-semibold leading-none`} style={{ color: "#d4c4a8" }}>
            Kochito Labs
          </h1>
        </div>

        {/* Intro */}
        <p
          className={`${poppins.className} w-full max-w-3xl text-sm leading-relaxed mb-8 px-1`}
          style={{ color: "#666" }}
        >
          Tools and prototypes from eight months of building with AI, all running on a <a href="https://github.com/bdecrem/vibeceo/blob/main/PLATFORM-OVERVIEW.md" target="_blank" rel="noopener noreferrer" style={{ color: "#888", textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: "2px" }}>codebase</a> that's somewhere between "a mess" and "a platform": agentic search over 300k AI research papers on Neo4j, an agent that posts reflections and games on Twitter and trades stocks (up $7 on $500 after the first few days), Claude Code for music, and more.
        </p>

        {/* Terminal window */}
        <div
          className={`${jetbrains.className} w-full max-w-3xl rounded-xl overflow-hidden relative`}
          style={{
            backgroundColor: "#0d0d0d",
            border: "1px solid #222",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.8)"
          }}
        >
          {/* Title bar */}
          <div
            className="flex items-center gap-2 px-4 py-3 select-none"
            style={{ backgroundColor: "#161616", borderBottom: "1px solid #222" }}
          >
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#ff5f56" }} />
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#ffbd2e" }} />
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#27ca40" }} />
            <span className="text-xs ml-4" style={{ color: "#555" }}>
              ~/projects
            </span>
            <span className="flex-1" />
            <a
              href="https://github.com/bdecrem/vibeceo/blob/main/PLATFORM-OVERVIEW.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-lg hover:opacity-80 transition-opacity"
              style={{ color: "#555" }}
              title="Platform Overview"
            >
              ⚙
            </a>
          </div>

          {/* Project list - flat, no section headers */}
          <div className="text-sm divide-y divide-[#1a1a1a]">
            {sortedProjects.map(project => (
              <ProjectRow
                key={project.slug}
                project={project}
                isExpanded={expandedSlugs.has(project.slug)}
                onToggle={() => toggleProject(project.slug)}
              />
            ))}
          </div>

          {/* Footer - clickable to reveal CLI */}
          <div
            className="px-4 sm:px-6 py-3 text-xs flex items-center justify-between cursor-text group"
            style={{ borderTop: "1px solid #1a1a1a" }}
            onClick={() => setShowCLI(true)}
          >
            <span className="flex items-center gap-2">
              <span className="italic" style={{ color: "#555" }}>The AGI is here. It's just uneven.</span>
              {/* Blinking cursor - invites interaction */}
              <span
                className="inline-block w-2 h-4 animate-pulse group-hover:opacity-100"
                style={{
                  backgroundColor: "#7cb87c",
                  opacity: 0.4,
                  animation: "pulse 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite"
                }}
              />
            </span>
            <span style={{ color: "#333" }}>{projects.filter(p => p.status === "active").length} active</span>
          </div>

          {/* Easter egg CLI */}
          <EasterEggCLI isVisible={showCLI} onClose={() => setShowCLI(false)} />
        </div>
      </div>
    </>
  );
}
