'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ProfileResult } from '../types';

interface UseProfileOptions {
  userId: number | null;
  autoLoad?: boolean;
}

interface UseProfileReturn {
  profile: ProfileResult | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching user profile with progression data.
 *
 * @param options.userId - User ID to fetch profile for
 * @param options.autoLoad - Whether to load on mount (default: true)
 *
 * @example
 * ```tsx
 * const { profile, loading, error, refetch } = useProfile({
 *   userId: user?.id ?? null,
 * });
 *
 * if (profile) {
 *   console.log(`Level ${profile.level}, ${profile.streak} day streak`);
 * }
 * ```
 */
export function useProfile({
  userId,
  autoLoad = true,
}: UseProfileOptions): UseProfileReturn {
  const [profile, setProfile] = useState<ProfileResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      return;
    }

    if (!window.PixelpitSocial) {
      setError('Social library not loaded');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await window.PixelpitSocial.getProfile(userId);
      setProfile(result);
    } catch (e) {
      console.error('Failed to load profile', e);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (autoLoad && userId && window.PixelpitSocial) {
      load();
    }
  }, [autoLoad, userId, load]);

  return {
    profile,
    loading,
    error,
    refetch: load,
  };
}
