"use client";

import { useTheme } from "../ThemeContext";
import type { ProjectStatus } from "../projects";

export function StatusIndicator({ status, emoji }: { status: ProjectStatus; emoji?: string }) {
  const t = useTheme();
  const label = t.statusLabels[status] ?? status;

  if (status === "active") {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: t.accent }} />
          <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: t.accent }} />
        </span>
        <span className="text-xs" style={{ color: t.accent }}>{label}</span>
      </span>
    );
  }

  if (status === "wip") {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: t.accent }} />
        <span className="text-xs" style={{ color: t.accent }}>{label}</span>
      </span>
    );
  }

  if (status === "respinning") {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: t.accentYellow, animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }} />
        <span className="text-xs" style={{ color: t.accentYellow }}>{label}</span>
      </span>
    );
  }

  if (status === "neglected") {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block h-2 w-2 rounded-full border border-dotted" style={{ borderColor: t.textMuted, backgroundColor: "transparent" }} />
        <span className="text-xs" style={{ color: t.textMuted }}>{label}</span>
      </span>
    );
  }

  if (status === "abandonware") {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block h-2 w-2 rounded-full border border-dashed" style={{ borderColor: t.textFaint, backgroundColor: "transparent" }} />
        <span className="text-xs" style={{ color: t.textFaint }}>~</span>
      </span>
    );
  }

  // retired
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-block h-2 w-2 rounded-full border" style={{ borderColor: t.textFaint, backgroundColor: "transparent" }} />
      <span className="text-xs" style={{ color: t.textMuted }}>{label}</span>
    </span>
  );
}
