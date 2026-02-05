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

// Group types
export type GroupType = 'streak' | 'leaderboard';

export interface GroupMember {
  userId: number;
  handle: string;
  lastPlayAt: string | null;
}

export interface Group {
  id: number;
  code: string;
  name: string;
  type: GroupType;
  streak?: number;
  maxStreak?: number;
  streakSavedAt?: string;
  members: GroupMember[];
}

export interface GroupsResult {
  groups: Group[];
}

export interface CreateGroupResult {
  success: boolean;
  group?: { id: number; code: string; name: string; type: string };
  xpEarned?: number;
  smsLink?: string;
  error?: string;
}

export interface JoinGroupResult {
  success: boolean;
  group?: { id: number; code: string; name: string; type: string };
  alreadyMember?: boolean;
  error?: string;
}

// Leaderboard types
export interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  isRegistered: boolean;
  level?: number;
}

// Progression types
export interface ProgressionResult {
  xpEarned: number;
  xpTotal: number;
  level: number;
  levelProgress: number;
  levelNeeded: number;
  leveledUp: boolean;
  streak: number;
  multiplier: number;
}

export interface ProfileResult {
  handle: string;
  xp: number;
  level: number;
  levelProgress: number;
  levelNeeded: number;
  streak: number;
  maxStreak: number;
}

// API Response types
export interface ScoreSubmitResult {
  success: boolean;
  rank?: number;
  entry?: { id: number };
  error?: string;
  progression?: ProgressionResult;
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
  /** XP divisor for this game. Default 100 (score/100 = XP). Use 1 for full score as XP. */
  xpDivisor?: number;
  onRankReceived?: (rank: number, entryId?: number) => void;
  onUserLogin?: (user: PixelpitUser) => void;
  onProgression?: (progression: ProgressionResult) => void;
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
  /** Enable group tabs and filtering. Default false. */
  groupsEnabled?: boolean;
  /** Game URL for share links when groups enabled */
  gameUrl?: string;
  /** Whether social.js has loaded. Pass this to trigger reload when library becomes available. */
  socialLoaded?: boolean;
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
  submitScore: (game: string, score: number, opts?: { nickname?: string; xpDivisor?: number; groupCode?: string }) => Promise<ScoreSubmitResult>;
  getLeaderboard: (game: string, limit?: number, opts?: { entryId?: number }) => Promise<LeaderboardResult>;
  getProfile: (userId: number) => Promise<ProfileResult | null>;
  login: (handle: string, code: string) => Promise<AuthResult>;
  register: (handle: string, code: string) => Promise<AuthResult>;
  checkHandle: (handle: string) => Promise<HandleCheckResult>;
  logout: () => void;
  checkSession: () => Promise<PixelpitUser | null>;
  ShareButton: (containerId: string, opts: { url: string; text: string; style?: 'button' | 'icon' | 'minimal' }) => void;
  showToast: (message: string, duration?: number) => void;
  // Share
  buildShareUrl: (url: string) => string;
  // Groups
  getGroups: () => Promise<GroupsResult>;
  createGroup: (name: string, type: GroupType, opts?: { phones?: string[]; gameUrl?: string; score?: number }) => Promise<CreateGroupResult>;
  joinGroup: (code: string) => Promise<JoinGroupResult>;
  getGroupLeaderboard: (gameId: string, groupCode: string, limit?: number) => Promise<LeaderboardResult & { group?: { id: number; type: string; name: string } }>;
  getSmsInviteLink: (phones: string[], groupCode: string, gameUrl: string, score?: number) => string;
  getGroupCodeFromUrl: () => string | null;
  storeGroupCode: (code: string) => void;
  getStoredGroupCode: () => string | null;
  clearStoredGroupCode: () => void;
}
