'use client';

import { useState, useEffect, useCallback } from 'react';
import type { LeaderboardEntry } from '../types';

interface UseLeaderboardOptions {
  gameId: string;
  limit?: number;
  entryId?: number;
  autoLoad?: boolean;
}

interface UseLeaderboardReturn {
  leaderboard: LeaderboardEntry[];
  playerEntry: LeaderboardEntry | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

/**
 * Hook for fetching and managing leaderboard data.
 *
 * @param options.gameId - Game identifier
 * @param options.limit - Number of entries to fetch (default: 10)
 * @param options.entryId - Specific entry ID to include player position
 * @param options.autoLoad - Whether to load on mount (default: true)
 *
 * @example
 * ```tsx
 * const { leaderboard, playerEntry, loading, reload } = useLeaderboard({
 *   gameId: 'beam',
 *   limit: 8,
 *   entryId: submittedEntryId,
 * });
 * ```
 */
export function useLeaderboard({
  gameId,
  limit = 10,
  entryId,
  autoLoad = true,
}: UseLeaderboardOptions): UseLeaderboardReturn {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [playerEntry, setPlayerEntry] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!window.PixelpitSocial) {
      setError('Social library not loaded');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await window.PixelpitSocial.getLeaderboard(
        gameId,
        limit,
        entryId ? { entryId } : undefined
      );
      setLeaderboard(result.leaderboard);
      setPlayerEntry(result.playerEntry ?? null);
    } catch (e) {
      console.error('Failed to load leaderboard', e);
      setError('Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  }, [gameId, limit, entryId]);

  useEffect(() => {
    if (autoLoad && window.PixelpitSocial) {
      load();
    }
  }, [autoLoad, load]);

  return {
    leaderboard,
    playerEntry,
    loading,
    error,
    reload: load,
  };
}
