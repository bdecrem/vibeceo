/**
 * Pixelpit Social Components
 *
 * Reusable components for social features across all Pixelpit games.
 */

// Components
export { ScoreFlow } from './ScoreFlow';
export { Leaderboard } from './Leaderboard';
export { CodeInput, getCodeFromDigits, isCodeComplete } from './CodeInput';
export { ShareButtonContainer } from './ShareButtonContainer';

// Hooks
export { usePixelpitSocial, getGuestName, saveGuestName } from './hooks/usePixelpitSocial';
export { useScoreSubmit } from './hooks/useScoreSubmit';
export { useLeaderboard } from './hooks/useLeaderboard';

// Types
export type {
  PixelpitUser,
  LeaderboardEntry,
  ScoreFlowState,
  ScoreFlowColors,
  ScoreFlowProps,
  LeaderboardColors,
  LeaderboardProps,
  CodeInputProps,
  ScoreSubmitResult,
  LeaderboardResult,
  AuthResult,
  HandleCheckResult,
  PixelpitSocialAPI,
  ScoreShareImageProps,
} from './types';

// OG Image utilities
export {
  createScoreShareImage,
  BeamDecorations,
  RainDecorations,
  OG_SIZE,
} from './og/ScoreShareImage';
export { CornerAccents, PixelpitBranding, GAME_COLORS } from './og/utils';
