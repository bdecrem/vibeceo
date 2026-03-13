// ── Theme system ──────────────────────────────────────────────
// Change ACTIVE_THEME to flip the entire look and feel.

export type ThemeName = "terminal" | "phosphor" | "paper" | "inkigayo" | "citrus" | "punk" | "blueprint";

// ★ FLIP HERE ★
export const ACTIVE_THEME: ThemeName = "citrus";

// ──────────────────────────────────────────────────────────────

export interface Theme {
  name: ThemeName;

  // page
  pageBg: string;

  // typography
  headingFont: "jetbrains" | "poppins" | "inter" | "fredoka" | "quicksand";
  bodyFont: "poppins" | "jetbrains" | "inter" | "fredoka" | "quicksand";

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

// ── INKIGAYO ──────────────────────────────────────────────────
// Deep purple-black void. Hot pink headlines. Lavender body text.
// Electric violet for "booting up." Title-bar dots: pink → violet → cyan.
// The terminal window glows faintly magenta at the border.
// Status labels are stan culture. The tagline is a lightstick wave.
const inkigayo: Theme = {
  name: "inkigayo",
  pageBg: "#08060e",
  headingFont: "poppins",
  bodyFont: "poppins",
  textPrimary: "#ff3c8e",     // hot pink — BLACKPINK energy
  textBody: "#b8a0cc",        // dusty lavender
  textMuted: "#7a6490",       // muted purple
  textFaint: "#4a3860",       // deep violet hint
  textGhost: "#2a1e3a",       // almost invisible plum
  accent: "#ff3c8e",          // hot pink pulse
  accentYellow: "#a855f7",    // electric violet (not yellow — we don't do yellow)
  link: "#c084fc",            // soft purple link
  terminalBg: "#0c0914",
  terminalBorder: "#2a1640",
  titleBarBg: "#120e1c",
  titleBarDots: ["#ff3c8e", "#a855f7", "#38bdf8"],  // pink → violet → cyan
  divider: "#1a1230",
  statusLabels: {
    active: "main",
    wip: "comeback",
    respinning: "debut",
    neglected: "hiatus",
    abandonware: "disbanded",
    retired: "graduated",
  },
  intro: `nine months of building with ai. one repo. some of it slaps. a lot of it is still in the practice room. everything ships, nothing is final.`,
  tagline: "♡ · · ·",
};

// ── CITRUS ────────────────────────────────────────────────────
// Warm dark brown-black, like soil under a grove. Headlines in
// bright tangerine orange. Body text in ripe lemon. Lime green
// accent for live status. Grapefruit pink for "booting up."
// Title-bar dots: lemon → orange → lime. Smells like summer.
const citrus: Theme = {
  name: "citrus",
  pageBg: "#f2ffe0",           // electric lime wash — almost hurts
  headingFont: "fredoka",       // bubbly, rounded, bouncy
  bodyFont: "quicksand",        // light, airy, friendly
  textPrimary: "#d94a00",     // bright persimmon — pops hard on green
  textBody: "#3d5a1e",        // forest green — reads clean
  textMuted: "#6b8f3a",       // sage
  textFaint: "#a4c46a",       // spring leaf
  textGhost: "#d2e8a8",       // faded grass
  accent: "#a3e635",          // electric chartreuse
  accentYellow: "#f97316",    // tangerine
  link: "#d94a00",            // persimmon
  terminalBg: "#f8ffed",      // barely-there lime white
  terminalBorder: "#c8e880",  // chartreuse edge
  titleBarBg: "#eefacc",      // pale acid yellow
  titleBarDots: ["#facc15", "#a3e635", "#22c55e"],  // yellow → chartreuse → green
  divider: "#ddf0a0",         // soft chartreuse
  statusLabels: {
    active: "live",
    wip: "wip",
    respinning: "booting up",
    neglected: "neglect (benign)",
    abandonware: "~",
    retired: "🫗†",
  },
  intro: `nine months of building with ai. one repo, lots of seeds planted. some bore fruit. some are still in the dirt. all of it is organic, none of it is polished.`,
  tagline: "squeeze harder.",
};

// ── PUNK ──────────────────────────────────────────────────────
// Xeroxed zine on a black floor. High contrast. Ugly on purpose.
// Safety yellow headlines on flat black. Body text in raw white —
// no antialiasing energy. Red for anything alive. Everything looks
// like it was stapled to a telephone pole at 3am.
const punk: Theme = {
  name: "punk",
  pageBg: "#000000",
  headingFont: "jetbrains",
  bodyFont: "jetbrains",
  textPrimary: "#ffe600",     // safety yellow — screams
  textBody: "#ccc",           // photocopy grey
  textMuted: "#888",          // worn ink
  textFaint: "#555",          // smudged
  textGhost: "#333",          // barely legible
  accent: "#ff0040",          // fire engine red
  accentYellow: "#ffe600",    // same yellow — no hierarchy, no rules
  link: "#ff0040",            // red underline like a correction
  terminalBg: "#0a0a0a",     // not quite black — like cheap paper
  terminalBorder: "#ffe600",  // yellow border — taped edges
  titleBarBg: "#000",
  titleBarDots: ["#ff0040", "#ff0040", "#ff0040"],  // all red. uniform. angry.
  divider: "#222",            // barely there
  statusLabels: {
    active: "live",
    wip: "wip",
    respinning: "booting up",
    neglected: "neglect (benign)",
    abandonware: "~",
    retired: "🫗†",
  },
  intro: `nine months. one repo. ai did most of the typing. i did most of the yelling. nothing here is finished. everything here is real.`,
  tagline: "NO FUTURE",
};

// ── BLUEPRINT ─────────────────────────────────────────────────
// Architect's drawing table. Rich Prussian blue ground, white
// chalk lines, faint cyan grid energy. Everything looks like it
// was drafted at 4am with a T-square and a pot of coffee.
// The terminal window is a drawing frame. You are looking at
// plans for things that may or may not get built.
const blueprint: Theme = {
  name: "blueprint",
  pageBg: "#0a1e3d",         // deep Prussian blue
  headingFont: "jetbrains",   // technical lettering
  bodyFont: "quicksand",      // lighter for annotations
  textPrimary: "#e8f0ff",     // bright chalk white-blue
  textBody: "#8badd4",        // faded ink on blue paper
  textMuted: "#5a82aa",       // old notation
  textFaint: "#3a6080",       // ghosted dimension line
  textGhost: "#1e405e",       // nearly invisible grid
  accent: "#ffffff",          // pure white — the one markup color
  accentYellow: "#7dd3fc",    // light cyan — revision marks
  link: "#bae6fd",            // pale sky — soft enough to not fight
  terminalBg: "#0c2244",      // slightly lighter blue field
  terminalBorder: "#1e4870",  // drafting frame edge
  titleBarBg: "#0e2a50",
  titleBarDots: ["#e8f0ff", "#e8f0ff", "#e8f0ff"],  // three white rivets
  divider: "#163558",         // faint grid line
  statusLabels: {
    active: "live",
    wip: "wip",
    respinning: "booting up",
    neglected: "neglect (benign)",
    abandonware: "~",
    retired: "🫗†",
  },
  intro: `nine months of drafts, revisions, and things that looked right on paper. one repo. some of it built. some of it still in pencil. scale: 1:1.`,
  tagline: "REV. 47 — NOT FOR CONSTRUCTION",
};

export const themes: Record<ThemeName, Theme> = { terminal, phosphor, paper, inkigayo, citrus, punk, blueprint };
export const theme: Theme = themes[ACTIVE_THEME];
