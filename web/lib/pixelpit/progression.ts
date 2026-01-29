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
  levelProgress: number;
  levelNeeded: number;
  leveledUp: boolean;
  streak: number;
  multiplier: number;
}
