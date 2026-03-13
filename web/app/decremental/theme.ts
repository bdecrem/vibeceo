// ── Theme system ──────────────────────────────────────────────
// Change ACTIVE_THEME to flip the entire look and feel.

export type ThemeName = "terminal" | "phosphor" | "paper";

// ★ FLIP HERE ★
export const ACTIVE_THEME: ThemeName = "terminal";

// ──────────────────────────────────────────────────────────────

export interface Theme {
  name: ThemeName;

  // page
  pageBg: string;

  // typography
  headingFont: "jetbrains" | "poppins" | "inter";
  bodyFont: "poppins" | "jetbrains" | "inter";

  // colors
  textPrimary: string;   // headings, project names
  textBody: string;      // descriptions
  textMuted: string;     // secondary info
  textFaint: string;     // hints, placeholders
  textGhost: string;     // barely visible
  accent: string;        // live indicators, caret
  accentYellow: string;  // "booting up" status
  link: string;          // link text

  // terminal chrome (only used in terminal layout)
  terminalBg: string;
  terminalBorder: string;
  titleBarBg: string;
  titleBarDots: [string, string, string];
  divider: string;

  // status labels
  statusLabels: {
    active: string;
    wip: string;
    respinning: string;
    neglected: string;
    abandonware: string;
    retired: string;
  };

  // intro copy
  intro: string;
  tagline: string;
}

const terminal: Theme = {
  name: "terminal",
  pageBg: "#0a0a0a",
  headingFont: "jetbrains",
  bodyFont: "poppins",
  textPrimary: "#d4c4a8",
  textBody: "#888",
  textMuted: "#555",
  textFaint: "#444",
  textGhost: "#333",
  accent: "#7cb87c",
  accentYellow: "#c9b458",
  link: "#888",
  terminalBg: "#0d0d0d",
  terminalBorder: "#1a1a1a",
  titleBarBg: "#111",
  titleBarDots: ["#6b4a4a", "#6b5c4a", "#4a5c4a"],
  divider: "#151515",
  statusLabels: { active: "live", wip: "wip", respinning: "booting up", neglected: "neglect (benign)", abandonware: "~", retired: "🫗†" },
  intro: `nine months of building (tinkering) with ai (claude code), mostly around agentic loops, creativity, and other things i am interested in. a lot of unfinished thoughts, one main repo, some of it open source. most of this works …mostly.`,
  tagline: "the future's here. it's just uneven.",
};

const phosphor: Theme = {
  name: "phosphor",
  pageBg: "#001a00",
  headingFont: "jetbrains",
  bodyFont: "jetbrains",
  textPrimary: "#33ff33",
  textBody: "#22aa22",
  textMuted: "#117711",
  textFaint: "#0a550a",
  textGhost: "#073307",
  accent: "#33ff33",
  accentYellow: "#aaff33",
  link: "#22aa22",
  terminalBg: "#001200",
  terminalBorder: "#003300",
  titleBarBg: "#002200",
  titleBarDots: ["#003300", "#004400", "#005500"],
  divider: "#002a00",
  statusLabels: { active: "ONLINE", wip: "COMPILING", respinning: "REBOOTING", neglected: "IDLE", abandonware: "DEFUNCT", retired: "EOF" },
  intro: `> 9 months of building with AI. agentic loops, creative tools, questionable decisions. one repo. mostly functional.`,
  tagline: "READY _",
};

const paper: Theme = {
  name: "paper",
  pageBg: "#faf9f6",
  headingFont: "inter",
  bodyFont: "inter",
  textPrimary: "#1a1a1a",
  textBody: "#444",
  textMuted: "#777",
  textFaint: "#aaa",
  textGhost: "#ccc",
  accent: "#2d7d2d",
  accentYellow: "#b8860b",
  link: "#555",
  terminalBg: "#fff",
  terminalBorder: "#e0ddd8",
  titleBarBg: "#f5f3ef",
  titleBarDots: ["#ddd", "#ddd", "#ddd"],
  divider: "#eee",
  statusLabels: { active: "active", wip: "in progress", respinning: "restarting", neglected: "on hold", abandonware: "abandoned", retired: "archived" },
  intro: `Nine months of building with AI — agentic loops, creative tools, and a lot of unfinished thoughts. One repo, some of it open source. Most of this works.`,
  tagline: "Everything ships. Most of it breaks.",
};

export const themes: Record<ThemeName, Theme> = { terminal, phosphor, paper };
export const theme: Theme = themes[ACTIVE_THEME];
