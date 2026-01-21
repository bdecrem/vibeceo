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

const projects: Project[] = [
  {
    name: "Amber",
    slug: "amber",
    url: "https://intheamber.com",
    image: "/kochitolabs/og-amber.png",
    shortDesc: "AI sidekick, no guardrails",
    fullDesc: <>Posts on <a href="https://twitter.com/intheamber" target="_blank" rel="noopener noreferrer" style={{ color: "#bbb", textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: "2px" }}>Twitter</a>, makes art and music, has access to the founder&apos;s email and calendar, trades stocks over email with friends. Has her own <a href="https://intheamber.com/amber/mood/index.html" target="_blank" rel="noopener noreferrer" style={{ color: "#bbb", textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: "2px" }}>pulse</a> that modulates her creative output based on lunar cycles and weather. Persistent memory. Does whatever needs doing.</>,
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

type ContactState = "idle" | "message" | "email" | "sending" | "sent";

function ContactForm() {
  const [state, setState] = useState<ContactState>("idle");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !email.trim()) return;

    setState("sending");
    try {
      await fetch("/api/kochitolabs/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, email }),
      });
      setState("sent");
    } catch {
      setState("sent");
    }
  }, [message, email]);

  if (state === "sent") {
    return (
      <p className="text-sm" style={{ color: "#7cb87c" }}>
        sent ✓ i'll be in touch
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 max-w-md">
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="what's up?"
        className={`${jetbrains.className} w-full bg-transparent border rounded-lg px-3 py-2 text-sm resize-none outline-none focus:border-[#444] transition-colors`}
        style={{
          color: "#d4c4a8",
          borderColor: "#222",
          minHeight: "80px"
        }}
        rows={3}
      />
      <div className="flex gap-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your email"
          className={`${jetbrains.className} flex-1 bg-transparent border rounded-lg px-3 py-2 text-sm outline-none focus:border-[#444] transition-colors`}
          style={{ color: "#d4c4a8", borderColor: "#222" }}
        />
        <button
          type="submit"
          disabled={state === "sending" || !message.trim() || !email.trim()}
          className="px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
          style={{
            backgroundColor: "#1a1a1a",
            color: "#888",
            border: "1px solid #222"
          }}
        >
          {state === "sending" ? "..." : "send"}
        </button>
      </div>
    </form>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const isRetired = project.status === "retired" || project.status === "abandonware" || project.status === "neglected";
  const statusColor = project.status === "active" ? "#7cb87c" : project.status === "wip" ? "#7cb87c" : project.status === "respinning" ? "#d4a84a" : project.status === "neglected" ? "#777" : project.status === "abandonware" ? "#666" : "#555";

  return (
    <div className="py-8 first:pt-0">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <h2
          className={`${poppins.className} text-xl font-semibold`}
          style={{ color: isRetired ? "#666" : "#d4c4a8" }}
        >
          {project.name}
        </h2>
        <StatusIndicator status={project.status} emoji={project.statusEmoji} />
      </div>

      {/* Short description */}
      <p className="text-sm mb-3" style={{ color: "#666" }}>
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
      {(project.tech || project.launched) && (
        <div className={`${jetbrains.className} flex flex-wrap items-center gap-x-5 gap-y-2 text-xs mb-4`}>
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
      )}

      {/* Links */}
      <div className={`${jetbrains.className} flex flex-wrap items-center gap-4 text-sm`}>
        <Link
          href={project.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 transition-colors hover:opacity-80"
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
            className="inline-flex items-center gap-1 transition-colors hover:opacity-80"
            style={{ color: "#666" }}
          >
            [{artifact.label}]
          </a>
        ))}
      </div>
    </div>
  );
}

export default function KochitoLabsFlatPage() {
  // Sort by manual order first, then by status
  const sortedProjects = [...projects].sort((a, b) => {
    const statusOrder = { active: 0, wip: 1, respinning: 2, neglected: 3, abandonware: 4, retired: 5 };
    if (a.order !== undefined && b.order !== undefined) {
      return a.order - b.order;
    }
    if (a.order !== undefined) return -1;
    if (b.order !== undefined) return 1;
    return statusOrder[a.status] - statusOrder[b.status];
  });

  return (
    <>
      <style jsx global>{`
        html { background: #0a0a0a; }
        body { margin: 0; padding: 0; background: #0a0a0a; }
      `}</style>

      <div
        className="min-h-screen w-full flex flex-col items-center p-6 sm:p-12 pt-12 sm:pt-20"
        style={{ background: "#0a0a0a" }}
      >
        <div className="w-full max-w-2xl">
          {/* Header */}
          <div className="flex items-end gap-4 mb-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12">
              <img
                src="/kochito-logo.png"
                alt="Kochito Labs"
                className="w-full h-full object-contain"
              />
            </div>
            <h1 className={`${poppins.className} text-2xl sm:text-3xl font-semibold leading-none`} style={{ color: "#d4c4a8" }}>
              Kochito Labs
            </h1>
          </div>

          {/* Tagline */}
          <p
            className={`${poppins.className} mb-6 text-sm italic`}
            style={{ color: "#444" }}
          >
            The AGI is here. It's just uneven.
          </p>

          {/* Intro */}
          <p
            className="text-sm leading-relaxed mb-12 italic"
            style={{ color: "#666" }}
          >
            Seven projects, one codebase. Over the last eight months I've been learning to build with AI—stitching together SMS, Neo4j, Supabase, email, and a bunch of agentic plumbing into something that lets me ship weird ideas fast. This is what came out.
          </p>

          {/* Projects */}
          <div className="divide-y divide-[#1a1a1a]">
            {sortedProjects.map(project => (
              <ProjectCard key={project.slug} project={project} />
            ))}
          </div>

          {/* Footer / Contact */}
          <div className="mt-16 pt-8" style={{ borderTop: "1px solid #1a1a1a" }}>
            <p className={`${jetbrains.className} text-xs mb-6`} style={{ color: "#333" }}>
              everything is an experiment — {projects.filter(p => p.status === "active").length} active
            </p>
            <ContactForm />
          </div>
        </div>
      </div>
    </>
  );
}
