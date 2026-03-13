"use client";

import Link from "next/link";
import { theme } from "../theme";
import { fontClass } from "../fonts";
import type { Project } from "../projects";
import { StatusIndicator } from "./StatusIndicator";

export function ProjectRow({ project, isExpanded, onToggle }: { project: Project; isExpanded: boolean; onToggle: () => void }) {
  const t = theme;
  const isRetired = project.status === "retired" || project.status === "abandonware" || project.status === "neglected";

  return (
    <div className={`transition-all duration-200 ${isExpanded ? "bg-white/[0.02]" : "hover:bg-white/[0.015]"}`}>
      <button onClick={onToggle} className="w-full text-left px-4 sm:px-6 py-4 flex items-center gap-3 sm:gap-4">
        <span className={`${fontClass("heading")} font-medium shrink-0`} style={{ color: isRetired ? t.textMuted : t.textPrimary }}>{project.name}</span>
        <StatusIndicator status={project.status} emoji={project.statusEmoji} />
        <span className="flex-1" />
        <span className="hidden sm:block text-right max-w-xs truncate text-sm" style={{ color: t.textFaint }}>{project.shortDesc}</span>
        <span className="w-5 text-center transition-transform duration-200 text-sm" style={{ color: t.textGhost, transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}>›</span>
      </button>

      <div className={`overflow-hidden transition-all duration-300 ease-out ${isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}>
        <div className="px-4 sm:px-6 pb-5">
          <p className="sm:hidden mb-3 text-sm" style={{ color: t.textMuted }}>{project.shortDesc}</p>
          <p className="text-sm leading-relaxed mb-4 max-w-2xl" style={{ color: t.textBody }}>{project.fullDesc}</p>
          <div className="flex flex-wrap items-center gap-4">
            <Link href={project.url} target="_blank" rel="noopener noreferrer"
              className={`${fontClass("heading")} inline-flex items-center gap-2 text-sm transition-colors hover:opacity-80`}
              style={{ color: t.link, textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: "2px" }}>
              {project.url.replace('https://', '')}
              <span className="text-xs" style={{ textDecoration: "none" }}>↗</span>
            </Link>
            {project.artifacts?.map((artifact, i) => (
              <a key={i} href={artifact.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm transition-colors hover:opacity-80" style={{ color: t.textMuted }}>
                [{artifact.label}]
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
