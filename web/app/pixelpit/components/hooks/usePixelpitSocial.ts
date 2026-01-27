'use client';

import { useState, useEffect, useCallback } from 'react';
import type { PixelpitUser, PixelpitSocialAPI } from '../types';

interface UsePixelpitSocialReturn {
  loaded: boolean;
  user: PixelpitUser | null;
  api: PixelpitSocialAPI | null;
  login: (handle: string, code: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  register: (handle: string, code: string) => Promise<{ success: boolean; error?: string }>;
  refreshUser: () => void;
}

/**
 * Hook for interacting with the PixelpitSocial library.
 *
 * @param socialLoaded - Whether the social.js script has loaded (from Script onLoad)
 * @returns Social API methods and user state
 *
 * @example
 * ```tsx
 * const [scriptLoaded, setScriptLoaded] = useState(false);
 * const { loaded, user, api } = usePixelpitSocial(scriptLoaded);
 *
 * // In JSX:
 * <Script src="/pixelpit/social.js" onLoad={() => setScriptLoaded(true)} />
 * ```
 */
export function usePixelpitSocial(socialLoaded: boolean): UsePixelpitSocialReturn {
  const [user, setUser] = useState<PixelpitUser | null>(null);
  const [api, setApi] = useState<PixelpitSocialAPI | null>(null);

  // Initialize when social lib loads
  useEffect(() => {
    if (socialLoaded && window.PixelpitSocial) {
      setApi(window.PixelpitSocial);
      const currentUser = window.PixelpitSocial.getUser();
      setUser(currentUser);
    }
  }, [socialLoaded]);

  const refreshUser = useCallback(() => {
    if (window.PixelpitSocial) {
      setUser(window.PixelpitSocial.getUser());
    }
  }, []);

  const login = useCallback(async (handle: string, code: string) => {
    if (!window.PixelpitSocial) {
      return { success: false, error: 'Social library not loaded' };
    }
    const result = await window.PixelpitSocial.login(handle, code);
    if (result.success && result.user) {
      setUser(result.user);
    }
    return result;
  }, []);

  const logout = useCallback(() => {
    if (window.PixelpitSocial) {
      window.PixelpitSocial.logout();
      setUser(null);
    }
  }, []);

  const register = useCallback(async (handle: string, code: string) => {
    if (!window.PixelpitSocial) {
      return { success: false, error: 'Social library not loaded' };
    }
    const result = await window.PixelpitSocial.register(handle, code);
    if (result.success && result.user) {
      setUser(result.user);
    }
    return result;
  }, []);

  return {
    loaded: socialLoaded && !!api,
    user,
    api,
    login,
    logout,
    register,
    refreshUser,
  };
}

/**
 * Get saved guest name from localStorage
 */
export function getGuestName(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('pixelpit_guest_name') || '';
}

/**
 * Save guest name to localStorage
 */
export function saveGuestName(name: string): void {
  localStorage.setItem('pixelpit_guest_name', name);
}
