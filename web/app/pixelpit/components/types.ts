/**
 * Pixelpit Social Component Types
 *
 * Shared types for the social components used across all Pixelpit games.
 */

// User types
export interface PixelpitUser {
  id: number;
  handle: string;
}

// Leaderboard types
export interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  isRegistered: boolean;
}

// API Response types
export interface ScoreSubmitResult {
  success: boolean;
  rank?: number;
  entry?: { id: number };
  error?: string;
}

export interface LeaderboardResult {
  leaderboard: LeaderboardEntry[];
  playerEntry?: LeaderboardEntry | null;
}

export interface AuthResult {
  success: boolean;
  user?: PixelpitUser;
  error?: string;
}

export interface HandleCheckResult {
  exists: boolean;
}

// Score Flow states
export type ScoreFlowState =
  | 'input'       // Initial name entry
  | 'checking'    // Loading spinner
  | 'submitted'   // Score saved, offer account creation
  | 'returning'   // Name taken, enter code to prove ownership
  | 'handleTaken' // Pick new handle
  | 'saving'      // Saving account
  | 'saved';      // Done

// Component props
export interface ScoreFlowColors {
  bg: string;
  surface: string;
  primary: string;    // gold - action buttons
  secondary: string;  // teal - secondary accent
  text: string;
  muted: string;
  error: string;
}

export interface ScoreFlowProps {
  score: number;
  gameId: string;
  colors: ScoreFlowColors;
  onRankReceived?: (rank: number, entryId?: number) => void;
  onUserLogin?: (user: PixelpitUser) => void;
}

export interface LeaderboardColors {
  bg: string;
  surface: string;
  primary: string;
  secondary: string;
  text: string;
  muted: string;
}

export interface LeaderboardProps {
  gameId: string;
  limit?: number;
  entryId?: number;
  colors: LeaderboardColors;
  onClose?: () => void;
}

export interface CodeInputProps {
  value: string[];
  onChange: (digits: string[]) => void;
  colors: {
    bg: string;
    border: string;
    text: string;
  };
}

// OG Image types
export interface ScoreShareImageProps {
  score: string;
  gameName: string;
  tagline?: string;
  colors: {
    background: string;
    primary: string;
    secondary: string;
    accent: string;
    branding: string;
  };
  decorations?: React.ReactNode;
}

// Global window augmentation for PixelpitSocial
declare global {
  interface Window {
    PixelpitSocial?: PixelpitSocialAPI;
  }
}

export interface PixelpitSocialAPI {
  getUser: () => PixelpitUser | null;
  submitScore: (game: string, score: number, opts?: { nickname?: string }) => Promise<ScoreSubmitResult>;
  getLeaderboard: (game: string, limit?: number, opts?: { entryId?: number }) => Promise<LeaderboardResult>;
  login: (handle: string, code: string) => Promise<AuthResult>;
  register: (handle: string, code: string) => Promise<AuthResult>;
  checkHandle: (handle: string) => Promise<HandleCheckResult>;
  logout: () => void;
  ShareButton: (containerId: string, opts: { url: string; text: string; style?: 'button' | 'icon' | 'minimal' }) => void;
  showToast: (message: string, duration?: number) => void;
}
