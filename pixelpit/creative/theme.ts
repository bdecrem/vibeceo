/**
 * PIXELPIT DESIGN SYSTEM — V3 NEON PLAYROOM
 *
 * Dark background + punchy saturated colors + friendly pixels.
 * The source of truth for all design tokens.
 */

// =============================================================================
// COLORS
// =============================================================================

export const COLORS = {
  // Backgrounds — dark slate foundation
  bg: {
    deep: '#0f172a',      // slate-900 — main background
    surface: '#1e293b',   // slate-800 — cards, panels
    elevated: '#334155',  // slate-700 — hover states
  },

  // Primary palette — punchy, saturated
  primary: {
    pink: '#ec4899',      // Hot pink — THE lead color
    cyan: '#22d3ee',      // Electric cyan — secondary
    yellow: '#fbbf24',    // Amber — energy, coins, timers
    green: '#34d399',     // Emerald — success, health
    purple: '#a78bfa',    // Violet — special, magic
  },

  // Accent — darker variants for card backgrounds
  accent: {
    pink: '#be185d',      // Pink-700
    cyan: '#0891b2',      // Cyan-600
    yellow: '#d97706',    // Amber-600
    green: '#059669',     // Emerald-600
    purple: '#7c3aed',    // Violet-600
  },

  // Text
  text: {
    primary: '#f8fafc',   // slate-50 — headings, important
    secondary: '#94a3b8', // slate-400 — body text
    muted: '#64748b',     // slate-500 — labels, hints
  },

  // Semantic
  semantic: {
    danger: '#ef4444',    // Red — damage, errors
    warning: '#f59e0b',   // Orange — caution
    success: '#10b981',   // Green — wins, confirmations
    info: '#06b6d4',      // Cyan — hints, tips
  },
} as const;

// =============================================================================
// CHARACTER COLORS
// =============================================================================

export const CHARACTERS = {
  dot: {
    name: 'DOT',
    role: 'Creative Head',
    color: '#ec4899',     // Hot pink
    bg: '#be185d',        // Pink-700
    emoji: '🎨',
    tagline: 'make it pretty',
  },
  pit: {
    name: 'PIT',
    role: 'Lead Developer',
    color: '#22d3ee',     // Electric cyan
    bg: '#0891b2',        // Cyan-600
    emoji: '🎮',
    tagline: 'ship it',
  },
  bug: {
    name: 'BUG',
    role: 'QA Lead',
    color: '#34d399',     // Emerald
    bg: '#059669',        // Emerald-600
    emoji: '🔍',
    tagline: 'found one',
  },
  chip: {
    name: 'CHIP',
    role: 'Audio Lead',
    color: '#fbbf24',     // Amber
    bg: '#d97706',        // Amber-600
    emoji: '🎵',
    tagline: 'turn it up',
  },
} as const;

// =============================================================================
// SHADOWS
// =============================================================================

export const SHADOWS = {
  sm: '2px 2px 0px 0px rgba(0,0,0,0.8)',
  md: '3px 3px 0px 0px rgba(0,0,0,0.8)',
  lg: '4px 4px 0px 0px rgba(0,0,0,0.8)',
  xl: '6px 6px 0px 0px rgba(0,0,0,0.8)',
  '2xl': '8px 8px 0px 0px rgba(0,0,0,0.8)',

  // Colored glow variants for dark mode
  glow: {
    pink: '0 0 20px rgba(236, 72, 153, 0.3)',
    cyan: '0 0 20px rgba(34, 211, 238, 0.3)',
    yellow: '0 0 20px rgba(251, 191, 36, 0.3)',
  },

  // Inset for pressed states
  inset: 'inset 0 -2px 0px rgba(0,0,0,0.3)',
} as const;

// =============================================================================
// BORDERS
// =============================================================================

export const BORDERS = {
  thin: '1px solid rgba(255,255,255,0.1)',
  normal: '2px solid rgba(255,255,255,0.2)',
  thick: '4px solid rgba(255,255,255,0.2)',

  // Colored borders for emphasis
  accent: {
    pink: '2px solid #ec4899',
    cyan: '2px solid #22d3ee',
    yellow: '2px solid #fbbf24',
  },
} as const;

// =============================================================================
// TYPOGRAPHY
// =============================================================================

export const TYPOGRAPHY = {
  // Font family — mono only
  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, monospace',

  // Sizes
  size: {
    xs: '10px',
    sm: '12px',
    md: '14px',
    lg: '18px',
    xl: '24px',
    '2xl': '32px',
    '3xl': '40px',
  },

  // Letter spacing
  tracking: {
    tight: '-0.025em',
    normal: '0',
    wide: '0.05em',
    wider: '0.1em',
    widest: '0.2em',
  },
} as const;

// =============================================================================
// SPACING
// =============================================================================

export const SPACING = {
  px: '1px',
  0: '0',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
} as const;

// =============================================================================
// ANIMATION
// =============================================================================

export const ANIMATION = {
  // Durations
  duration: {
    fast: '100ms',
    normal: '200ms',
    slow: '500ms',
  },

  // Button press
  press: {
    transform: 'translate(2px, 2px)',
    shadow: 'none',
  },

  // Hover lift
  hover: {
    transform: 'translateY(-2px)',
  },

  // Pulse for active elements
  pulse: {
    animation: 'pulse 2s ease-in-out infinite',
    keyframes: `
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    `,
  },
} as const;

// =============================================================================
// TAILWIND CLASS HELPERS
// =============================================================================

export const TW = {
  // Base pixel text style
  pixelText: 'font-mono tracking-tight',

  // Button base
  buttonBase: 'font-mono tracking-wider uppercase border-2 transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none',

  // Card base (dark mode)
  cardBase: 'bg-slate-800 border border-white/10 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]',

  // Hard shadow (Tailwind arbitrary value)
  shadowHard: 'shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]',
  shadowHardSm: 'shadow-[3px_3px_0px_0px_rgba(0,0,0,0.8)]',
  shadowHardLg: 'shadow-[6px_6px_0px_0px_rgba(0,0,0,0.8)]',
} as const;

// =============================================================================
// THEME CONFIG
// =============================================================================

export type ThemeMode = 'neon' | 'arcade';

export const THEME_CONFIG = {
  neon: {
    background: '#0f172a',      // Deep slate
    surface: '#1e293b',
    text: '#f8fafc',
    textMuted: '#94a3b8',
    accent: COLORS.primary.pink,
    accentSecondary: COLORS.primary.cyan,
  },
  arcade: {
    background: '#09090b',      // Near black
    surface: '#18181b',
    text: '#ffffff',
    textMuted: '#71717a',
    accent: '#a3e635',          // Lime
    accentSecondary: '#22d3ee', // Cyan
  },
} as const;
