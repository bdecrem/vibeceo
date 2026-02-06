'use client';

import { useState, useCallback } from 'react';
import type { ScoreFlowState, PixelpitUser, ProgressionResult } from '../types';
import { saveGuestName } from './usePixelpitSocial';

interface UseScoreSubmitOptions {
  gameId: string;
  score: number;
  maxScore?: number;
  onRankReceived?: (rank: number, entryId?: number) => void;
  onUserLogin?: (user: PixelpitUser) => void;
  onProgression?: (progression: ProgressionResult) => void;
}

interface UseScoreSubmitReturn {
  // State
  flowState: ScoreFlowState;
  playerName: string;
  codeDigits: string[];
  submittedRank: number | null;
  submittedEntryId: number | null;
  error: string;
  user: PixelpitUser | null;
  /** True if the submitted handle belongs to a registered user (for login prompt) */
  isRegisteredHandle: boolean;
  /** Progression data from last score submission (registered users only) */
  progression: ProgressionResult | null;

  // Setters
  setPlayerName: (name: string) => void;
  setCodeDigits: (digits: string[]) => void;

  // Actions
  submitAsGuest: () => Promise<void>;
  submitAsUser: () => Promise<void>;
  handleReturningUser: () => Promise<void>;
  saveAccount: () => Promise<void>;
  retryWithNewHandle: () => Promise<void>;
  skipSave: () => void;
  reset: () => void;
}

/**
 * State machine hook for the score submission flow.
 *
 * Handles the full guest → account creation flow:
 * - input: Enter name, submit
 * - checking: Loading spinner
 * - submitted: Show rank, offer account creation
 * - returning: Name taken, enter code to prove ownership
 * - handleTaken: Pick new handle
 * - saving: Creating account
 * - saved: Done
 */
export function useScoreSubmit({
  gameId,
  score,
  maxScore,
  onRankReceived,
  onUserLogin,
  onProgression,
}: UseScoreSubmitOptions): UseScoreSubmitReturn {
  const [flowState, setFlowState] = useState<ScoreFlowState>('input');
  const [playerName, setPlayerName] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('pixelpit_guest_name') || '';
    }
    return '';
  });
  const [codeDigits, setCodeDigits] = useState(['', '', '', '']);
  const [submittedRank, setSubmittedRank] = useState<number | null>(null);
  const [submittedEntryId, setSubmittedEntryId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [user, setUser] = useState<PixelpitUser | null>(() => {
    if (typeof window !== 'undefined' && window.PixelpitSocial) {
      return window.PixelpitSocial.getUser();
    }
    return null;
  });
  const [isRegisteredHandle, setIsRegisteredHandle] = useState(false);
  const [progression, setProgression] = useState<ProgressionResult | null>(null);

  const getCode = () => codeDigits.join('');

  const linkEntryToUser = async (userId: number) => {
    if (!submittedEntryId) return;
    try {
      await fetch('/api/pixelpit/leaderboard', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId: submittedEntryId, userId }),
      });
    } catch (e) {
      // Silent fail - not critical
    }
  };

  const submitAsGuest = useCallback(async () => {
    if (!window.PixelpitSocial) return;

    if (!playerName.trim()) {
      setError('Enter a name first!');
      return;
    }

    setFlowState('checking');
    setError('');
    setIsRegisteredHandle(false);

    try {
      saveGuestName(playerName);
      const result = await window.PixelpitSocial.submitScore(gameId, score, { nickname: playerName, maxScore });
      if (result.success) {
        setSubmittedRank(result.rank ?? 0);
        setSubmittedEntryId(result.entry?.id ?? null);
        setFlowState('submitted');
        onRankReceived?.(result.rank ?? 0, result.entry?.id);

        // Check if this handle is already registered (for better UX messaging)
        try {
          const handleCheck = await window.PixelpitSocial.checkHandle(playerName);
          setIsRegisteredHandle(handleCheck.exists);
        } catch {
          // Silent fail - not critical
        }
      } else {
        setError('Failed to submit');
        setFlowState('input');
      }
    } catch (e) {
      setError('Network error');
      setFlowState('input');
    }
  }, [gameId, score, playerName, onRankReceived]);

  const submitAsUser = useCallback(async () => {
    if (!window.PixelpitSocial) return;

    const currentUser = window.PixelpitSocial.getUser();
    if (!currentUser) return;

    try {
      const result = await window.PixelpitSocial.submitScore(gameId, score, { maxScore });
      if (result.success && result.rank) {
        setSubmittedRank(result.rank);
        onRankReceived?.(result.rank, result.entry?.id);
        if (result.progression) {
          setProgression(result.progression);
          onProgression?.(result.progression);
        }
      }
    } catch (e) {
      setError('Network error');
    }
  }, [gameId, score, maxScore, onRankReceived, onProgression]);

  const handleReturningUser = useCallback(async () => {
    if (!window.PixelpitSocial) return;
    const code = getCode();
    if (code.length !== 4) {
      setError('Enter 4 characters');
      return;
    }

    setFlowState('checking');
    try {
      const result = await window.PixelpitSocial.login(playerName, code);
      if (result.success && result.user) {
        setUser(result.user);
        onUserLogin?.(result.user);
        // Now submit score as logged in user
        const scoreResult = await window.PixelpitSocial.submitScore(gameId, score);
        if (scoreResult.success && scoreResult.rank) {
          setSubmittedRank(scoreResult.rank);
          setFlowState('saved');
          onRankReceived?.(scoreResult.rank, scoreResult.entry?.id);
        }
      } else {
        setError(result.error || 'Wrong code');
        setFlowState('returning');
        setCodeDigits(['', '', '', '']);
      }
    } catch (e) {
      setError('Network error');
      setFlowState('returning');
    }
  }, [playerName, codeDigits, gameId, score, onRankReceived, onUserLogin]);

  const saveAccount = useCallback(async () => {
    if (!window.PixelpitSocial) return;
    const code = getCode();
    if (code.length !== 4) {
      setError('Enter 4 characters');
      return;
    }

    setFlowState('saving');
    try {
      // First try to register
      const result = await window.PixelpitSocial.register(playerName, code);
      if (result.success && result.user) {
        setUser(result.user);
        onUserLogin?.(result.user);
        await linkEntryToUser(result.user.id);
        setFlowState('saved');
      } else if (result.error?.includes('taken')) {
        // Handle taken - try to login with this code instead
        const loginResult = await window.PixelpitSocial.login(playerName, code);
        if (loginResult.success && loginResult.user) {
          // They knew the code! Log them in and link the entry
          setUser(loginResult.user);
          onUserLogin?.(loginResult.user);
          await linkEntryToUser(loginResult.user.id);
          setFlowState('saved');
        } else {
          // Wrong code for existing account
          setError('Name taken (wrong code)');
          setFlowState('handleTaken');
          setCodeDigits(['', '', '', '']);
        }
      } else {
        setError(result.error || 'Failed to save');
        setFlowState('submitted');
      }
    } catch (e) {
      setError('Network error');
      setFlowState('submitted');
    }
  }, [playerName, codeDigits, onUserLogin]);

  const retryWithNewHandle = useCallback(async () => {
    if (!window.PixelpitSocial) return;
    const code = getCode();
    if (code.length !== 4) {
      setError('Enter 4 characters');
      return;
    }
    if (!playerName.trim()) {
      setError('Enter a handle');
      return;
    }

    setFlowState('saving');
    try {
      const result = await window.PixelpitSocial.register(playerName, code);
      if (result.success && result.user) {
        setUser(result.user);
        onUserLogin?.(result.user);
        setFlowState('saved');
      } else if (result.error?.includes('taken')) {
        setError('Also taken! Try another');
        setFlowState('handleTaken');
        setCodeDigits(['', '', '', '']);
      } else {
        setError(result.error || 'Failed to save');
        setFlowState('handleTaken');
      }
    } catch (e) {
      setError('Network error');
      setFlowState('handleTaken');
    }
  }, [playerName, codeDigits, onUserLogin]);

  const skipSave = useCallback(() => {
    setFlowState('saved');
  }, []);

  const reset = useCallback(() => {
    setFlowState('input');
    setCodeDigits(['', '', '', '']);
    setError('');
    setSubmittedRank(null);
    setSubmittedEntryId(null);
    setIsRegisteredHandle(false);
    setProgression(null);
  }, []);

  return {
    flowState,
    playerName,
    codeDigits,
    submittedRank,
    submittedEntryId,
    error,
    user,
    isRegisteredHandle,
    progression,
    setPlayerName,
    setCodeDigits,
    submitAsGuest,
    submitAsUser,
    handleReturningUser,
    saveAccount,
    retryWithNewHandle,
    skipSave,
    reset,
  };
}
