"use client";

import { Poppins, Montserrat, JetBrains_Mono } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

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
  description: string;
  status: ProjectStatus;
}

const projects: Project[] = [
  {
    name: "Amber",
    slug: "amber",
    url: "https://intheamber.com",
    image: "/kochitolabs/og-amber.png",
    description: "AI sidekick with her own pulse. Email, research, creative projects.",
    status: "active",
  },
  {
    name: "Kochi.to",
    slug: "kochi",
    url: "https://kochi.to",
    image: "/kochitolabs/og-kochi.png",
    description: "AI agents delivered daily over SMS. Crypto, arxiv, medical research.",
    status: "active",
  },
  {
    name: "Jambot",
    slug: "jambot",
    url: "https://kochi.to/jambot",
    image: null,
    description: "AI-powered music creation. Beats, loops, and live jams.",
    status: "active",
  },
  {
    name: "CTRL SHIFT",
    slug: "ctrlshift",
    url: "https://kochi.to/cs",
    image: "/kochitolabs/og-ctrlshift.png",
    description: "Curated link feed. Rethinking the format.",
    status: "respinning",
  },
  {
    name: "Token Tank",
    slug: "tokentank",
    url: "https://tokentank.io",
    image: "/kochitolabs/og-tokentank.png",
    description: "AI incubator experiment. 5 autonomous agents, 30 days.",
    status: "retired",
  },
  {
    name: "Webtoys.ai",
    slug: "webtoys",
    url: "https://webtoys.ai",
    image: "/kochitolabs/og-webtoys.png",
    description: "Ship web apps from your flip phone. SMS-to-code.",
    status: "retired",
  },
  {
    name: "AdvisorsFoundry",
    slug: "advisorsfoundry",
    url: "https://advisorsfoundry.com",
    image: null,
    description: "AI-powered advisor matching for startups.",
    status: "retired",
  },
];

const concepts = ["Grid", "Lab Bench", "Terminal", "Constellation"] as const;
type Concept = (typeof concepts)[number];

// ============================================
// CONCEPT SWITCHER
// ============================================
function ConceptSwitcher({
  current,
  onChange,
}: {
  current: Concept;
  onChange: (c: Concept) => void;
}) {
  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-3 py-2 rounded-full"
      style={{ backgroundColor: "rgba(42, 38, 34, 0.95)", border: "1px solid #3a3530" }}
    >
      <span className={`${montserrat.className} text-xs`} style={{ color: "#6b6560" }}>
        VIEW
      </span>
      {concepts.map((c) => (
        <button
          key={c}
          onClick={() => onChange(c)}
          className={`${montserrat.className} text-xs px-3 py-1.5 rounded-full transition-all`}
          style={{
            backgroundColor: current === c ? "#d4c4a8" : "transparent",
            color: current === c ? "#1f1c19" : "#9a9590",
            letterSpacing: "0.05em",
          }}
        >
          {c}
        </button>
      ))}
    </div>
  );
}

// ============================================
// HEADER (shared)
// ============================================
function Header({ minimal = false }: { minimal?: boolean }) {
  return (
    <header className={`flex flex-col items-center ${minimal ? "mb-8" : "mb-16"}`}>
      <div className="flex items-center gap-5 sm:gap-6 mb-4">
        <div className={minimal ? "w-10 h-10" : "w-14 h-14 sm:w-16 sm:h-16"}>
          <Image
            src="/kochito-logo.png"
            alt="Kochito Labs"
            width={64}
            height={64}
            className="w-full h-full object-contain"
            priority
          />
        </div>
        <div className="flex flex-col">
          <h1
            className={`${poppins.className} ${minimal ? "text-2xl" : "text-3xl sm:text-4xl"} font-semibold`}
            style={{ color: "#d4c4a8" }}
          >
            Kochito
          </h1>
          <span
            className={`${montserrat.className} ${minimal ? "text-sm" : "text-base sm:text-lg"} font-medium`}
            style={{ color: "#d4c4a8", letterSpacing: "0.25em", marginTop: "-2px" }}
          >
            LABS
          </span>
        </div>
      </div>
      {!minimal && (
        <p className={`${poppins.className} text-center text-sm sm:text-base`} style={{ color: "#9a9590" }}>
          AI experiments and tools from the lab
        </p>
      )}
    </header>
  );
}

// ============================================
// CONCEPT 1: GRID (original)
// ============================================
const statusConfig = {
  active: { label: "ACTIVE", dot: "●", color: "#7cb87c", statusLabel: "Live" },
  respinning: { label: "RESPINNING", dot: "◐", color: "#d4a84a", statusLabel: "Rebuilding" },
  retired: { label: "RETIRED", dot: "○", color: "#6b6560", statusLabel: "Archived" },
};

function GridCard({ project }: { project: Project }) {
  const config = statusConfig[project.status];
  const isRetired = project.status === "retired";

  return (
    <Link
      href={project.url}
      className={`group block rounded-xl overflow-hidden transition-all duration-300 ${
        isRetired ? "opacity-60 hover:opacity-80" : "hover:translate-y-[-4px] hover:shadow-lg"
      }`}
      style={{ backgroundColor: "#2a2622", border: "1px solid #3a3530" }}
    >
      <div
        className={`relative aspect-[1.91/1] overflow-hidden ${isRetired ? "grayscale" : ""}`}
        style={{ backgroundColor: "#1a1816" }}
      >
        {project.image ? (
          <Image src={project.image} alt={project.name} fill className="object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #2a2622 0%, #1a1816 100%)" }}>
            <span className={`${poppins.className} text-2xl font-semibold`} style={{ color: "#4a4540" }}>{project.name}</span>
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className={`${poppins.className} text-lg font-semibold`} style={{ color: "#d4c4a8" }}>{project.name}</h3>
          <span className={`${montserrat.className} text-xs font-medium flex items-center gap-1.5`} style={{ color: config.color }}>
            <span>{config.dot}</span>{config.statusLabel}
          </span>
        </div>
        <p className={`${poppins.className} text-sm leading-relaxed`} style={{ color: "#9a9590" }}>{project.description}</p>
      </div>
    </Link>
  );
}

function GridSectionHeader({ status }: { status: ProjectStatus }) {
  const config = statusConfig[status];
  return (
    <div className="flex items-center gap-3 mb-6">
      <span style={{ color: config.color, fontSize: "14px" }}>{config.dot}</span>
      <h2 className={`${montserrat.className} text-sm font-medium`} style={{ color: config.color, letterSpacing: "0.15em" }}>{config.label}</h2>
      <div className="flex-1 h-px" style={{ backgroundColor: "#3a3530" }} />
    </div>
  );
}

function GridConcept() {
  const active = projects.filter((p) => p.status === "active");
  const respinning = projects.filter((p) => p.status === "respinning");
  const retired = projects.filter((p) => p.status === "retired");

  return (
    <div className="max-w-5xl mx-auto">
      <Header />
      <section className="mb-12">
        <GridSectionHeader status="active" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">{active.map((p) => <GridCard key={p.slug} project={p} />)}</div>
      </section>
      <section className="mb-12">
        <GridSectionHeader status="respinning" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">{respinning.map((p) => <GridCard key={p.slug} project={p} />)}</div>
      </section>
      <section className="mb-12">
        <GridSectionHeader status="retired" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">{retired.map((p) => <GridCard key={p.slug} project={p} />)}</div>
      </section>
    </div>
  );
}

// ============================================
// CONCEPT 2: LAB BENCH (scattered)
// ============================================
const labBenchPositions = [
  { top: "12%", left: "5%", rotate: -3 },
  { top: "8%", left: "38%", rotate: 2 },
  { top: "15%", left: "68%", rotate: -1 },
  { top: "38%", left: "15%", rotate: 4 },
  { top: "42%", left: "52%", rotate: -2 },
  { top: "65%", left: "8%", rotate: 1 },
  { top: "62%", left: "42%", rotate: -4 },
];

function LabBenchCard({ project, style }: { project: Project; style: React.CSSProperties }) {
  const config = statusConfig[project.status];
  const isRetired = project.status === "retired";

  return (
    <Link
      href={project.url}
      className="absolute group transition-all duration-500 hover:z-20 hover:scale-105"
      style={{
        ...style,
        width: "280px",
        opacity: isRetired ? 0.5 : 1,
      }}
    >
      <div
        className="rounded-lg overflow-hidden shadow-2xl"
        style={{ backgroundColor: "#2a2622", border: "1px solid #3a3530" }}
      >
        <div className={`relative aspect-[1.6/1] ${isRetired ? "grayscale" : ""}`} style={{ backgroundColor: "#1a1816" }}>
          {project.image ? (
            <Image src={project.image} alt={project.name} fill className="object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #2a2622 0%, #1a1816 100%)" }}>
              <span className={`${poppins.className} text-xl font-semibold`} style={{ color: "#4a4540" }}>{project.name}</span>
            </div>
          )}
          {/* Status stamp */}
          <div
            className="absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium"
            style={{
              backgroundColor: "rgba(31, 28, 25, 0.9)",
              color: config.color,
              border: `1px solid ${config.color}`,
            }}
          >
            {config.statusLabel.toUpperCase()}
          </div>
        </div>
        <div className="p-3">
          <h3 className={`${poppins.className} text-base font-semibold mb-1`} style={{ color: "#d4c4a8" }}>{project.name}</h3>
          <p className={`${poppins.className} text-xs leading-relaxed`} style={{ color: "#7a7570" }}>{project.description}</p>
        </div>
      </div>
    </Link>
  );
}

function LabBenchConcept() {
  return (
    <div className="max-w-6xl mx-auto">
      <Header />
      <div className="relative min-h-[900px]">
        {/* Background texture - graph paper effect */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `
              linear-gradient(#d4c4a8 1px, transparent 1px),
              linear-gradient(90deg, #d4c4a8 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
          }}
        />
        {projects.map((project, i) => (
          <LabBenchCard
            key={project.slug}
            project={project}
            style={{
              top: labBenchPositions[i]?.top || `${20 + i * 12}%`,
              left: labBenchPositions[i]?.left || `${10 + (i % 3) * 30}%`,
              transform: `rotate(${labBenchPositions[i]?.rotate || 0}deg)`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================
// CONCEPT 3: TERMINAL
// ============================================
function TerminalConcept() {
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);

  const statusBadge = (status: ProjectStatus) => {
    switch (status) {
      case "active": return <span style={{ color: "#7cb87c" }}>[LIVE]</span>;
      case "respinning": return <span style={{ color: "#d4a84a" }}>[WIP]</span>;
      case "retired": return <span style={{ color: "#6b6560" }}>[OFF]</span>;
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <Header minimal />

      {/* Terminal window */}
      <div
        className="rounded-lg overflow-hidden"
        style={{ backgroundColor: "#0d0d0d", border: "1px solid #333" }}
      >
        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 py-3" style={{ backgroundColor: "#1a1a1a" }}>
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#ff5f56" }} />
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#ffbd2e" }} />
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#27ca40" }} />
          <span className={`${jetbrains.className} text-xs ml-4`} style={{ color: "#666" }}>
            kochito@lab ~ /projects
          </span>
        </div>

        {/* Terminal content */}
        <div className={`${jetbrains.className} p-6 text-sm`} style={{ color: "#d4c4a8" }}>
          <div className="mb-4" style={{ color: "#666" }}>
            $ ls -la projects/<span className="animate-pulse">▌</span>
          </div>

          <div className="mb-6" style={{ color: "#666" }}>
            total {projects.length}
          </div>

          {projects.map((project) => (
            <Link
              key={project.slug}
              href={project.url}
              className="block py-2 px-2 -mx-2 rounded transition-colors"
              style={{
                backgroundColor: hoveredSlug === project.slug ? "rgba(212, 196, 168, 0.1)" : "transparent",
              }}
              onMouseEnter={() => setHoveredSlug(project.slug)}
              onMouseLeave={() => setHoveredSlug(null)}
            >
              <div className="flex items-start gap-4">
                <span className="w-14 flex-shrink-0">{statusBadge(project.status)}</span>
                <span className="w-36 flex-shrink-0" style={{ color: project.status === "retired" ? "#666" : "#d4c4a8" }}>
                  {project.name}
                </span>
                <span style={{ color: "#666" }}>
                  {project.description}
                </span>
              </div>
              {hoveredSlug === project.slug && (
                <div className="mt-2 ml-[200px]" style={{ color: "#7cb87c" }}>
                  → {project.url}
                </div>
              )}
            </Link>
          ))}

          <div className="mt-8 pt-4" style={{ borderTop: "1px solid #333", color: "#666" }}>
            $ echo "everything is an experiment"
            <div className="mt-2" style={{ color: "#d4c4a8" }}>everything is an experiment</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// CONCEPT 4: CONSTELLATION
// ============================================
const constellationPositions = [
  { x: 50, y: 20 },   // Amber - top center
  { x: 25, y: 35 },   // Kochi - left
  { x: 75, y: 40 },   // Jambot - right
  { x: 50, y: 55 },   // CTRL SHIFT - center
  { x: 20, y: 75 },   // Token Tank - bottom left
  { x: 50, y: 85 },   // Webtoys - bottom center
  { x: 80, y: 70 },   // AdvisorsFoundry - bottom right
];

const connections = [
  [0, 1], [0, 2], [1, 3], [2, 3], // Active to respinning
  [3, 4], [3, 5], [3, 6], // Respinning to retired
  [4, 5], [5, 6], // Retired interconnect
];

function ConstellationConcept() {
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);

  const getNodeStyle = (project: Project) => {
    const baseSize = project.status === "active" ? 80 : project.status === "respinning" ? 60 : 40;
    const glowColor = project.status === "active" ? "#7cb87c" : project.status === "respinning" ? "#d4a84a" : "#4a4540";
    const opacity = project.status === "retired" ? 0.4 : 1;

    return {
      width: baseSize,
      height: baseSize,
      opacity,
      boxShadow: hoveredSlug === project.slug
        ? `0 0 30px ${glowColor}, 0 0 60px ${glowColor}40`
        : `0 0 15px ${glowColor}60`,
    };
  };

  return (
    <div className="max-w-5xl mx-auto">
      <Header minimal />

      <div className="relative h-[600px] mt-8">
        {/* SVG for connection lines */}
        <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 0 }}>
          {connections.map(([from, to], i) => {
            const fromPos = constellationPositions[from];
            const toPos = constellationPositions[to];
            return (
              <line
                key={i}
                x1={`${fromPos.x}%`}
                y1={`${fromPos.y}%`}
                x2={`${toPos.x}%`}
                y2={`${toPos.y}%`}
                stroke="#3a3530"
                strokeWidth="1"
                opacity="0.5"
              />
            );
          })}
        </svg>

        {/* Nodes */}
        {projects.map((project, i) => {
          const pos = constellationPositions[i];
          const nodeStyle = getNodeStyle(project);

          return (
            <Link
              key={project.slug}
              href={project.url}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 group"
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                zIndex: hoveredSlug === project.slug ? 10 : 1,
              }}
              onMouseEnter={() => setHoveredSlug(project.slug)}
              onMouseLeave={() => setHoveredSlug(null)}
            >
              {/* Node circle */}
              <div
                className="rounded-full overflow-hidden transition-all duration-300 flex items-center justify-center"
                style={{
                  ...nodeStyle,
                  backgroundColor: "#2a2622",
                  border: "2px solid #3a3530",
                }}
              >
                {project.image ? (
                  <Image
                    src={project.image}
                    alt={project.name}
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className={`${poppins.className} text-xs font-semibold text-center`} style={{ color: "#6b6560" }}>
                    {project.name.slice(0, 2)}
                  </span>
                )}
              </div>

              {/* Label (always visible) */}
              <div
                className="absolute left-1/2 transform -translate-x-1/2 mt-2 text-center whitespace-nowrap"
                style={{ top: "100%" }}
              >
                <span
                  className={`${poppins.className} text-xs font-medium`}
                  style={{ color: project.status === "retired" ? "#5a5550" : "#9a9590" }}
                >
                  {project.name}
                </span>
              </div>

              {/* Expanded info on hover */}
              {hoveredSlug === project.slug && (
                <div
                  className="absolute left-1/2 transform -translate-x-1/2 mt-8 p-3 rounded-lg w-48 text-center"
                  style={{
                    top: "100%",
                    backgroundColor: "rgba(42, 38, 34, 0.95)",
                    border: "1px solid #3a3530",
                  }}
                >
                  <p className={`${poppins.className} text-xs`} style={{ color: "#9a9590" }}>
                    {project.description}
                  </p>
                </div>
              )}
            </Link>
          );
        })}

        {/* Legend */}
        <div className="absolute bottom-0 left-0 flex items-center gap-6">
          {(["active", "respinning", "retired"] as const).map((status) => (
            <div key={status} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor: status === "active" ? "#7cb87c" : status === "respinning" ? "#d4a84a" : "#4a4540",
                }}
              />
              <span className={`${montserrat.className} text-xs`} style={{ color: "#6b6560" }}>
                {statusConfig[status].statusLabel}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================
// MAIN PAGE
// ============================================
export default function KochitoLabsLanding() {
  const [concept, setConcept] = useState<Concept>("Grid");

  return (
    <>
      <style jsx global>{`
        html { background: #1f1c19; }
        body { margin: 0; padding: 0; background: #1f1c19; }
      `}</style>

      <div className="min-h-screen w-full px-6 py-12 md:py-16" style={{ background: "#1f1c19" }}>
        {concept === "Grid" && <GridConcept />}
        {concept === "Lab Bench" && <LabBenchConcept />}
        {concept === "Terminal" && <TerminalConcept />}
        {concept === "Constellation" && <ConstellationConcept />}
      </div>

      <ConceptSwitcher current={concept} onChange={setConcept} />
    </>
  );
}
