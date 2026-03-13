"use client";

import { useState, useEffect, useCallback } from "react";
import { ACTIVE_THEME, themes, type ThemeName } from "./theme";
import { ThemeProvider, useTheme } from "./ThemeContext";
import { fontClassFor } from "./fonts";
import { projects } from "./projects";
import { ProjectRow } from "./components/ProjectRow";
import { EasterEggCLI } from "./components/EasterEggCLI";

const themeNames = Object.keys(themes) as ThemeName[];
const statusOrder = { active: 0, wip: 1, respinning: 2, neglected: 3, abandonware: 4, retired: 5 } as const;

function DecrementalInner({ onRoll }: { onRoll: () => void }) {
  const t = useTheme();
  const fc = (role: "heading" | "body") => fontClassFor(t, role);
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

      <div className="min-h-screen w-full flex flex-col items-center p-4 sm:p-8 pt-8 sm:pt-16" style={{ background: t.pageBg, transition: "background 0.4s ease" }}>
        {/* Header */}
        <div className="w-full max-w-3xl mb-6">
          <h1 className={`${fc("heading")} text-xl sm:text-2xl font-medium leading-none`} style={{ color: t.textPrimary, transition: "color 0.4s ease" }}>
            Decremental
          </h1>
        </div>

        {/* Intro */}
        <p className={`${fc("body")} w-full max-w-3xl text-sm leading-relaxed mb-8 px-1`} style={{ color: t.textMuted, transition: "color 0.4s ease" }}>
          {t.intro}{" "}
          <a href="https://linkedin.com/in/bartdecrem" target="_blank" rel="noopener noreferrer" style={{ color: t.textMuted, textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: "2px" }}>about me</a>.{" "}
          <a href="https://twitter.com/bartdecrem" target="_blank" rel="noopener noreferrer" style={{ color: t.textMuted, textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: "2px" }}>twitter</a>.
        </p>

        {/* Terminal window */}
        <div className={`${fc("heading")} w-full max-w-3xl overflow-hidden relative`} style={{ backgroundColor: t.terminalBg, border: `1px solid ${t.terminalBorder}`, boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.8)", transition: "background-color 0.4s ease, border-color 0.4s ease" }}>
          {/* Title bar */}
          <div className="flex items-center gap-2 px-4 py-3 select-none" style={{ backgroundColor: t.titleBarBg, borderBottom: `1px solid ${t.terminalBorder}`, transition: "background-color 0.4s ease" }}>
            <div className="w-2.5 h-2.5 rounded-full transition-colors duration-400" style={{ backgroundColor: t.titleBarDots[0] }} />
            <div className="w-2.5 h-2.5 rounded-full transition-colors duration-400" style={{ backgroundColor: t.titleBarDots[1] }} />
            <div className="w-2.5 h-2.5 rounded-full transition-colors duration-400" style={{ backgroundColor: t.titleBarDots[2] }} />
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
          <div className="px-4 sm:px-6 py-3 text-xs flex items-center justify-between group" style={{ borderTop: `1px solid ${t.divider}` }}>
            <span className="flex items-center gap-2 cursor-text" onClick={() => setShowCLI(true)}>
              <span style={{ color: t.textGhost }}>{t.tagline}</span>
              <span className="inline-block w-1.5 h-3.5 animate-pulse group-hover:opacity-100" style={{ backgroundColor: t.accent, opacity: 0.3, animation: "pulse 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }} />
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); onRoll(); }}
              className="select-none opacity-30 hover:opacity-60 transition-opacity duration-200"
              style={{ fontSize: "10px", lineHeight: 1, cursor: "pointer", background: "none", border: "none", padding: 0 }}
              title="roll theme"
            >
              🎲
            </button>
          </div>

          <EasterEggCLI isVisible={showCLI} onClose={() => setShowCLI(false)} />
        </div>
      </div>
    </>
  );
}

export default function Decremental() {
  const [themeName, setThemeName] = useState<ThemeName>(ACTIVE_THEME);

  const roll = useCallback(() => {
    setThemeName(prev => {
      const others = themeNames.filter(n => n !== prev);
      return others[Math.floor(Math.random() * others.length)];
    });
  }, []);

  return (
    <ThemeProvider themeName={themeName}>
      <DecrementalInner onRoll={roll} />
    </ThemeProvider>
  );
}
