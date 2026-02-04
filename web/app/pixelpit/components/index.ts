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
export { ShareModal } from './ShareModal';
export { CreateGroupForm } from './CreateGroupForm';
export { GroupTabs } from './GroupTabs';
export { StreakBoard } from './StreakBoard';

// Hooks
export { usePixelpitSocial, getGuestName, saveGuestName } from './hooks/usePixelpitSocial';
export { useScoreSubmit } from './hooks/useScoreSubmit';
export { useLeaderboard } from './hooks/useLeaderboard';
export { useProfile } from './hooks/useProfile';
export { useGroups } from './hooks/useGroups';

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
  ProgressionResult,
  ProfileResult,
  // Groups
  GroupType,
  GroupMember,
  Group,
  GroupsResult,
  CreateGroupResult,
  JoinGroupResult,
} from './types';

// OG Image utilities
export {
  createScoreShareImage,
  BeamDecorations,
  CatTowerDecorations,
  EmojiDecorations,
  RainDecorations,
  SingularityDecorations,
  SproutRunDecorations,
  TapBeatsDecorations,
  OG_SIZE,
} from './og/ScoreShareImage';
export { CornerAccents, PixelpitBranding, GAME_COLORS } from './og/utils';
