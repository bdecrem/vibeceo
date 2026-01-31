'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Group, GroupType, CreateGroupResult, JoinGroupResult } from '../types';

interface UseGroupsReturn {
  groups: Group[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  createGroup: (name: string, type: GroupType, opts?: { phones?: string[]; gameUrl?: string; score?: number }) => Promise<CreateGroupResult>;
  joinGroup: (code: string) => Promise<JoinGroupResult>;
}

/**
 * Hook for managing user's groups.
 *
 * @example
 * ```tsx
 * const { groups, loading, createGroup, joinGroup } = useGroups();
 *
 * // Create a new group
 * const result = await createGroup('Team Alpha', 'leaderboard', {
 *   phones: ['555-1234'],
 *   gameUrl: 'https://pixelpit.io/arcade/superbeam',
 *   score: 42,
 * });
 *
 * // Join existing group
 * const joinResult = await joinGroup('a1b2');
 * ```
 */
export function useGroups(): UseGroupsReturn {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!window.PixelpitSocial) {
      setError('Social library not loaded');
      return;
    }

    const user = window.PixelpitSocial.getUser();
    if (!user) {
      setGroups([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await window.PixelpitSocial.getGroups();
      setGroups(result.groups || []);
    } catch (e) {
      console.error('Failed to load groups', e);
      setError('Failed to load groups');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (window.PixelpitSocial) {
      load();
    }
  }, [load]);

  const createGroup = useCallback(async (
    name: string,
    type: GroupType,
    opts?: { phones?: string[]; gameUrl?: string; score?: number }
  ): Promise<CreateGroupResult> => {
    if (!window.PixelpitSocial) {
      return { success: false, error: 'Social library not loaded' };
    }

    const result = await window.PixelpitSocial.createGroup(name, type, opts);
    if (result.success) {
      // Reload groups list
      await load();
    }
    return result;
  }, [load]);

  const joinGroup = useCallback(async (code: string): Promise<JoinGroupResult> => {
    if (!window.PixelpitSocial) {
      return { success: false, error: 'Social library not loaded' };
    }

    const result = await window.PixelpitSocial.joinGroup(code);
    if (result.success) {
      // Reload groups list
      await load();
    }
    return result;
  }, [load]);

  return {
    groups,
    loading,
    error,
    reload: load,
    createGroup,
    joinGroup,
  };
}
