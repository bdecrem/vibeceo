/**
 * Pixelpit Progression System
 *
 * Shared utilities for XP, levels, and streaks.
 * Used by both API routes and client-side code.
 *
 * Leveling: 200 XP to level 2, then 500 XP per level after
 * Level 1: 0, Level 2: 200, Level 3: 700, Level 4: 1200, ...
 */

/**
 * Get level from total XP
 */
export function getLevel(xp: number): number {
  if (xp < 200) return 1;
  return Math.floor((xp - 200) / 500) + 2;
}

/**
 * Get XP progress within current level
 */
export function getXpProgress(xp: number): number {
  if (xp < 200) return xp;
  return (xp - 200) % 500;
}

/**
 * Get XP needed to complete current level
 */
export function getXpNeeded(xp: number): number {
  if (xp < 200) return 200;
  return 500;
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
 * Normalized: every game awards 10-50 XP per play (before multiplier).
 * @param maxScore - The game's "great score" benchmark (p90). Score at or above this = 50 XP.
 */
export function calculateXpGain(score: number, streak: number, maxScore: number = 50): number {
  const base = Math.min(50, Math.max(10, Math.floor(score / maxScore * 50)));
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
  levelProgress: number;
  levelNeeded: number;
  leveledUp: boolean;
  streak: number;
  multiplier: number;
}
