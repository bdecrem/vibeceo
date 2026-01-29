/**
 * Pixelpit Progression System
 *
 * Shared utilities for XP, levels, and streaks.
 * Used by both API routes and client-side code.
 */

export const XP_PER_LEVEL = 200;

/**
 * Get level from total XP
 */
export function getLevel(xp: number): number {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

/**
 * Get XP progress within current level (0 to XP_PER_LEVEL-1)
 */
export function getXpProgress(xp: number): number {
  return xp % XP_PER_LEVEL;
}

/**
 * Get streak multiplier based on consecutive days played
 */
export function getStreakMultiplier(streak: number): number {
  if (streak >= 14) return 2.5;
  if (streak >= 7) return 2.0;
  if (streak >= 3) return 1.5;
  return 1.0;
}

/**
 * Calculate XP earned from a score with streak multiplier.
 * Minimum 50 XP for playing (before multiplier).
 * @param xpDivisor - Divide score by this to get base XP (default 100, use 1 for full score)
 */
export function calculateXpGain(score: number, streak: number, xpDivisor: number = 100): number {
  const base = Math.max(50, Math.floor(score / xpDivisor));
  const multiplier = getStreakMultiplier(streak);
  return Math.floor(base * multiplier);
}

/**
 * Progression data returned after score submission
 */
export interface ProgressionResult {
  xpEarned: number;
  xpTotal: number;
  level: number;
  levelProgress: number; // XP into current level
  levelNeeded: number; // XP needed for next level (always XP_PER_LEVEL)
  leveledUp: boolean;
  streak: number;
  multiplier: number;
}
