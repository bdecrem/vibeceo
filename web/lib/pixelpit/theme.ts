/**
 * PIXELPIT DESIGN SYSTEM — RAIN
 *
 * Dark background + warm soft colors + friendly glows.
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

  // Primary palette — warm, soft
  primary: {
    gold: '#fbbf24',      // Amber — THE lead color
    teal: '#22d3ee',      // Electric cyan — secondary
    pink: '#f472b6',      // Soft pink — accent
    green: '#34d399',     // Emerald — success, health
    coral: '#f87171',     // Soft red — danger
  },

  // Accent — darker variants for card backgrounds
  accent: {
    gold: '#d97706',      // Amber-600
    teal: '#0891b2',      // Cyan-600
    pink: '#be185d',      // Pink-700
    green: '#059669',     // Emerald-600
  },

  // Text
  text: {
    primary: '#f8fafc',   // slate-50 — headings, important
    secondary: '#94a3b8', // slate-400 — body text
    muted: '#64748b',     // slate-500 — labels, hints
  },

  // Semantic
  semantic: {
    danger: '#f87171',    // Coral — damage, errors
    warning: '#f59e0b',   // Orange — caution
    success: '#34d399',   // Green — wins, confirmations
    info: '#22d3ee',      // Teal — hints, tips
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
// SHADOWS & GLOWS
// =============================================================================

export const SHADOWS = {
  // Soft glows (preferred)
  glow: {
    gold: '0 0 20px rgba(251, 191, 36, 0.5)',
    teal: '0 0 20px rgba(34, 211, 238, 0.5)',
    pink: '0 0 20px rgba(244, 114, 182, 0.5)',
    green: '0 0 20px rgba(52, 211, 153, 0.5)',
  },

  // Text glows
  textGlow: {
    gold: '0 0 20px rgba(251, 191, 36, 0.8)',
    teal: '0 0 20px rgba(34, 211, 238, 0.8)',
    pink: '0 0 20px rgba(244, 114, 182, 0.8)',
  },

  // Subtle card shadow (optional)
  card: '0 4px 20px rgba(0, 0, 0, 0.3)',
} as const;

// =============================================================================
// BORDERS
// =============================================================================

export const BORDERS = {
  thin: '1px solid rgba(255,255,255,0.1)',
  normal: '2px solid rgba(255,255,255,0.2)',

  // Colored borders for emphasis
  accent: {
    gold: '2px solid rgba(251, 191, 36, 0.6)',
    teal: '2px solid rgba(34, 211, 238, 0.6)',
    pink: '2px solid rgba(244, 114, 182, 0.6)',
  },
} as const;

// =============================================================================
// BORDER RADIUS
// =============================================================================

export const RADIUS = {
  sm: '4px',
  md: '8px',
  lg: '12px',
  full: '9999px',
} as const;

// =============================================================================
// TYPOGRAPHY
// =============================================================================

export const TYPOGRAPHY = {
  // Font family — mono only
  fontFamily: "'Space Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",

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

  // Hover glow
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
  // Base text style
  text: 'font-mono',

  // Button base (soft style)
  buttonBase: 'font-mono rounded-lg transition-all',

  // Card base (dark mode, rounded)
  cardBase: 'bg-slate-800 border border-white/10 rounded-lg',

  // Glow effects
  glowGold: 'shadow-[0_0_20px_rgba(251,191,36,0.5)]',
  glowTeal: 'shadow-[0_0_20px_rgba(34,211,238,0.5)]',
  glowPink: 'shadow-[0_0_20px_rgba(244,114,182,0.5)]',
} as const;

// =============================================================================
// GAME THEME (for canvas games)
// =============================================================================

export const GAME_THEME = {
  bg: '#0f172a',
  accent: '#f472b6',      // pink — drops, special
  secondary: '#22d3ee',   // teal — player, buttons
  highlight: '#fbbf24',   // gold — scores, particles
} as const;
