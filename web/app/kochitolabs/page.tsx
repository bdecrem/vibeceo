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

type ProjectStatus = "active" | "respinning" | "retired";

interface Project {
  name: string;
  slug: string;
  url: string;
  image: string | null;
  shortDesc: string;
  fullDesc: string;
  status: ProjectStatus;
  tech?: string[];
  launched?: string;
}

const projects: Project[] = [
  {
    name: "Amber",
    slug: "amber",
    url: "https://intheamber.com",
    image: "/kochitolabs/og-amber.png",
    shortDesc: "AI sidekick with her own pulse",
    fullDesc: `Amber is an AI companion that operates on her own rhythm—literally. She has a "pulse" system that modulates her creative output based on lunar cycles, weather, and time of day. She handles email correspondence, conducts research, manages creative projects, and maintains her own blog. Unlike typical AI assistants, Amber has persistent memory and develops ongoing relationships with the people she works with.`,
    status: "active",
    tech: ["Claude API", "SendGrid", "Supabase", "Next.js"],
    launched: "2024",
  },
  {
    name: "Kochi.to",
    slug: "kochi",
    url: "https://kochi.to",
    image: "/kochitolabs/og-kochi.png",
    shortDesc: "AI agents delivered daily over SMS",
    fullDesc: `Kochi.to brings AI research agents directly to your phone via SMS—no app required. Subscribe to daily briefings on crypto markets, arxiv papers, medical research, or other topics. Each agent is a specialist: the crypto agent tracks whale movements and market sentiment, the arxiv agent surfaces relevant papers with plain-English summaries. Includes a knowledge graph of academic papers with author enrichment.`,
    status: "active",
    tech: ["Twilio", "Claude API", "Neo4j", "TypeScript"],
    launched: "2024",
  },
  {
    name: "Jambot",
    slug: "jambot",
    url: "https://kochi.to/synthmachine/index.html",
    image: null,
    shortDesc: "AI-powered music creation",
    fullDesc: `Jambot is an AI music collaborator that generates beats, loops, and full arrangements. It includes synthesized drum machines (909, 808, 101) and creates tracks in various genres from acid house to lo-fi hip hop. Control it via SMS commands or natural language—tell it "make me a 120bpm techno beat with a rolling bassline" and it renders the audio.`,
    status: "active",
    tech: ["Web Audio API", "Claude API", "Custom Synth Engines"],
    launched: "2025",
  },
  {
    name: "CTRL SHIFT",
    slug: "ctrlshift",
    url: "https://ctrlshift.so",
    image: "/kochitolabs/og-ctrlshift.png",
    shortDesc: "Curated link feed, being rethought",
    fullDesc: `CTRL SHIFT started as a curated link aggregator. The original format worked but felt too similar to existing tools. Currently being rebuilt to explore a different approach: what if a link feed was more like a conversation than a list? The new version experiments with threading, context, and AI-assisted curation.`,
    status: "respinning",
    tech: ["Next.js", "Supabase"],
    launched: "2024",
  },
  {
    name: "Token Tank",
    slug: "tokentank",
    url: "https://tokentank.io",
    image: "/kochitolabs/og-tokentank.png",
    shortDesc: "AI incubator experiment — completed",
    fullDesc: `Token Tank was a 30-day experiment: give 5 AI agents each $100 and let them try to build businesses autonomously. Each agent had a distinct personality and strategy—Drift built shadow agents, Nix focused on developer tools, Arc explored creative automation. The full blog documents daily progress and lessons learned.`,
    status: "retired",
    tech: ["Claude Agent SDK", "Autonomous Agents", "Supabase"],
    launched: "2024",
  },
  {
    name: "Webtoys.ai",
    slug: "webtoys",
    url: "https://webtoys.ai",
    image: "/kochitolabs/og-webtoys.png",
    shortDesc: "SMS-to-web-app builder — sunset",
    fullDesc: `Webtoys was "vibecoding over SMS"—text a description of a web app you want, and it would generate and deploy it. Built landing pages, simple games, memes, and interactive tools. The engine that powered it now lives inside Kochi.to, where it handles web content generation for other features.`,
    status: "retired",
    tech: ["Twilio", "Claude API", "Vercel", "Next.js"],
    launched: "2024",
  },
  {
    name: "AdvisorsFoundry",
    slug: "advisorsfoundry",
    url: "https://advisorsfoundry.ai",
    image: null,
    shortDesc: "AI advisor matching — discontinued",
    fullDesc: `AdvisorsFoundry attempted to solve the "finding good advisors" problem for startups using AI matching. The matching worked well technically, but the real problem was market-sided: great advisors are already oversubscribed. Discontinued after learning that the bottleneck isn't matching—it's supply.`,
    status: "retired",
    tech: ["Next.js", "OpenAI", "Supabase"],
    launched: "2023",
  },
];

// Animated status indicator component
function StatusIndicator({ status }: { status: ProjectStatus }) {
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

  // retired
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-block h-2 w-2 rounded-full border"
        style={{ borderColor: "#444", backgroundColor: "transparent" }}
      />
      <span className="text-xs" style={{ color: "#555" }}>archived</span>
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
  const isRetired = project.status === "retired";
  const statusColor = project.status === "active" ? "#7cb87c" : project.status === "respinning" ? "#d4a84a" : "#555";

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
        <StatusIndicator status={project.status} />

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

          {/* Visit link */}
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
        </div>
      </div>
    </div>
  );
}

export default function KochitoLabsPage() {
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);
  const [showCLI, setShowCLI] = useState(false);

  const toggleProject = (slug: string) => {
    setExpandedSlug(prev => prev === slug ? null : slug);
  };

  // Sort: active first, then respinning, then retired
  const sortedProjects = [...projects].sort((a, b) => {
    const order = { active: 0, respinning: 1, retired: 2 };
    return order[a.status] - order[b.status];
  });

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
        <div className="flex items-end gap-4 mb-8">
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
          </div>

          {/* Project list - flat, no section headers */}
          <div className="text-sm divide-y divide-[#1a1a1a]">
            {sortedProjects.map(project => (
              <ProjectRow
                key={project.slug}
                project={project}
                isExpanded={expandedSlug === project.slug}
                onToggle={() => toggleProject(project.slug)}
              />
            ))}
          </div>

          {/* Minimal footer - clickable to reveal CLI */}
          <div
            className="px-4 sm:px-6 py-3 text-xs flex items-center justify-between cursor-text"
            style={{ borderTop: "1px solid #1a1a1a", color: "#333" }}
            onClick={() => setShowCLI(true)}
          >
            <span className="flex items-center gap-1">
              <span>everything is an experiment</span>
              {/* Subtle blinking cursor hint */}
              <span
                className="animate-pulse"
                style={{ color: "#2a2a2a" }}
              >
                _
              </span>
            </span>
            <span>{projects.filter(p => p.status === "active").length} active</span>
          </div>

          {/* Easter egg CLI */}
          <EasterEggCLI isVisible={showCLI} onClose={() => setShowCLI(false)} />
        </div>

        {/* Tagline */}
        <p
          className={`${poppins.className} mt-8 text-sm italic`}
          style={{ color: "#444" }}
        >
          The AGI is here. It's just uneven.
        </p>
      </div>
    </>
  );
}
