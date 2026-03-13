"use client";

import { useState, useEffect } from "react";
import { theme } from "./theme";
import { fontClass } from "./fonts";
import { projects } from "./projects";
import { ProjectRow } from "./components/ProjectRow";
import { EasterEggCLI } from "./components/EasterEggCLI";

const statusOrder = { active: 0, wip: 1, respinning: 2, neglected: 3, abandonware: 4, retired: 5 } as const;

export default function Decremental() {
  const t = theme;
  const [showCLI, setShowCLI] = useState(false);

  const sortedProjects = [...projects].sort((a, b) => {
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
        html { background: ${t.pageBg}; }
        body { margin: 0; padding: 0; background: ${t.pageBg}; }
      `}</style>

      <div className="min-h-screen w-full flex flex-col items-center p-4 sm:p-8 pt-8 sm:pt-16" style={{ background: t.pageBg }}>
        {/* Header */}
        <div className="w-full max-w-3xl mb-6">
          <h1 className={`${fontClass("heading")} text-xl sm:text-2xl font-medium leading-none`} style={{ color: t.textPrimary }}>
            Decremental
          </h1>
        </div>

        {/* Intro */}
        <p className={`${fontClass("body")} w-full max-w-3xl text-sm leading-relaxed mb-8 px-1`} style={{ color: t.textMuted }}>
          {t.intro}{" "}
          <a href="https://linkedin.com/in/bartdecrem" target="_blank" rel="noopener noreferrer" style={{ color: t.textMuted, textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: "2px" }}>about me</a>.{" "}
          <a href="https://twitter.com/bartdecrem" target="_blank" rel="noopener noreferrer" style={{ color: t.textMuted, textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: "2px" }}>twitter</a>.
        </p>

        {/* Terminal window */}
        <div className={`${fontClass("heading")} w-full max-w-3xl overflow-hidden relative`} style={{ backgroundColor: t.terminalBg, border: `1px solid ${t.terminalBorder}`, boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.8)" }}>
          {/* Title bar */}
          <div className="flex items-center gap-2 px-4 py-3 select-none" style={{ backgroundColor: t.titleBarBg, borderBottom: `1px solid ${t.terminalBorder}` }}>
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.titleBarDots[0] }} />
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.titleBarDots[1] }} />
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.titleBarDots[2] }} />
            <span className="text-xs ml-4" style={{ color: t.textGhost }}>~/projects</span>
            <span className="flex-1" />
            <a href="https://github.com/bdecrem/vibeceo/blob/main/PLATFORM-OVERVIEW.md" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity" style={{ color: t.textFaint, fontSize: "16px" }} title="Platform Overview">&#x2699;</a>
          </div>

          {/* Project list */}
          <div className="text-sm" style={{ borderColor: t.divider }}>
            {sortedProjects.map((project, i) => (
              <div key={project.slug} style={i > 0 ? { borderTop: `1px solid ${t.divider}` } : undefined}>
                <ProjectRow project={project} isExpanded={expandedSlugs.has(project.slug)} onToggle={() => toggleProject(project.slug)} />
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-4 sm:px-6 py-3 text-xs flex items-center justify-between cursor-text group" style={{ borderTop: `1px solid ${t.divider}` }} onClick={() => setShowCLI(true)}>
            <span className="flex items-center gap-2">
              <span style={{ color: t.textGhost }}>{t.tagline}</span>
              <span className="inline-block w-1.5 h-3.5 animate-pulse group-hover:opacity-100" style={{ backgroundColor: t.accent, opacity: 0.3, animation: "pulse 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }} />
            </span>
            <span style={{ color: t.textGhost }}>{projects.filter(p => p.status === "active").length} {t.statusLabels.active.toLowerCase()}</span>
          </div>

          <EasterEggCLI isVisible={showCLI} onClose={() => setShowCLI(false)} />
        </div>
      </div>
    </>
  );
}
