'use client';

import React, { useState, useEffect, useRef } from 'react';
import { CodeInput } from './CodeInput';
import { SettingsPanel } from './SettingsPanel';
import { useScoreSubmit } from './hooks/useScoreSubmit';
import type { ScoreFlowProps } from './types';

/**
 * Complete score submission flow component.
 *
 * Handles guest submissions, account creation, and returning user verification.
 * Uses a state machine to manage the flow:
 * - input → checking → submitted → saved
 * - With branches for returning users and handle conflicts
 *
 * @example
 * ```tsx
 * <ScoreFlow
 *   score={score}
 *   gameId="beam"
 *   colors={{
 *     bg: '#0a0f1a',
 *     surface: '#141d2b',
 *     primary: '#fbbf24',
 *     secondary: '#2dd4bf',
 *     text: '#f8fafc',
 *     muted: '#94a3b8',
 *     error: '#f87171',
 *   }}
 *   onRankReceived={(rank, entryId) => {
 *     setSubmittedRank(rank);
 *     setSubmittedEntryId(entryId);
 *   }}
 *   onUserLogin={(user) => setUser(user)}
 * />
 * ```
 */
export function ScoreFlow({ score, gameId, colors, maxScore, onRankReceived, onUserLogin, onProgression, onSettingsOpen }: ScoreFlowProps) {
  const {
    flowState,
    playerName,
    codeDigits,
    submittedRank,
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
  } = useScoreSubmit({ gameId, score, maxScore, onRankReceived, onUserLogin, onProgression });

  const [showSettings, setShowSettings] = useState(false);
  const fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
  const autoSubmitted = useRef(false);
  const initialName = useRef(playerName);

  // Auto-submit for logged-in users
  useEffect(() => {
    if (user && !autoSubmitted.current && submittedRank === null) {
      autoSubmitted.current = true;
      submitAsUser();
    }
  }, [user, submittedRank, submitAsUser]);

  // Auto-submit for guests with a saved name (from localStorage only, not typed input)
  useEffect(() => {
    if (!user && initialName.current.trim() && flowState === 'input' && !autoSubmitted.current && submittedRank === null) {
      autoSubmitted.current = true;
      submitAsGuest();
    }
  }, [user, flowState, submittedRank, submitAsGuest]);

  // Already logged in user - auto-submitted, show result
  if (user) {
    return (
      <div style={{ marginBottom: 20, width: '100%', maxWidth: 300, textAlign: 'center' }}>
        <div style={{
          color: colors.secondary,
          marginBottom: 10,
          fontFamily,
          fontSize: 14,
        }}>
          @{user.handle}
        </div>
        {submittedRank === null ? (
          <div style={{ color: colors.muted, fontSize: 12, fontFamily }}>
            submitting...
          </div>
        ) : (
          <div style={{
            color: colors.secondary,
            fontSize: 12,
            fontFamily,
          }}>
            Rank #{submittedRank}!
          </div>
        )}
        <button
          onClick={() => { onSettingsOpen ? onSettingsOpen() : setShowSettings(true); }}
          style={{
            position: 'fixed',
            bottom: 32,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 10,
            opacity: 0.35,
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={colors.muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
        {showSettings && (
          <SettingsPanel colors={colors} onClose={() => setShowSettings(false)} />
        )}
      </div>
    );
  }

  // Guest flow states
  return (
    <div style={{ marginBottom: 20, width: '100%', maxWidth: 300 }}>
      {/* Flow: input - initial handle entry */}
      {flowState === 'input' && (
        <>
          <input
            type="text"
            placeholder="your name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            maxLength={20}
            style={{
              width: '100%',
              padding: '15px 20px',
              fontSize: 14,
              fontFamily,
              background: colors.surface,
              border: `1px solid ${colors.primary}4d`,
              borderRadius: 8,
              color: colors.primary,
              textAlign: 'center',
              marginBottom: 10,
              letterSpacing: 2,
              outline: 'none',
            }}
          />
          <div style={{ textAlign: 'center' }}>
            <button
              onClick={submitAsGuest}
              style={{
                background: colors.primary,
                color: colors.bg,
                border: 'none',
                borderRadius: 6,
                padding: '12px 25px',
                fontSize: 13,
                fontFamily,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: `0 6px 20px ${colors.primary}40`,
                letterSpacing: 1,
              }}
            >
              submit
            </button>
          </div>
          {error && (
            <div style={{ marginTop: 10, color: colors.error, fontSize: 12, fontFamily }}>
              {error}
            </div>
          )}
        </>
      )}

      {/* Flow: checking - loading */}
      {(flowState === 'checking' || flowState === 'saving') && (
        <div style={{ color: colors.muted, fontSize: 12, fontFamily }}>
          {flowState === 'checking' ? 'checking...' : 'saving...'}
        </div>
      )}

      {/* Flow: returning - name is taken */}
      {flowState === 'returning' && (
        <div style={{
          background: colors.surface,
          border: `1px solid ${colors.primary}4d`,
          borderRadius: 12,
          padding: 20,
        }}>
          <div style={{ color: colors.primary, fontSize: 13, fontFamily, marginBottom: 15 }}>
            "{playerName}" is taken
          </div>
          <div style={{ color: colors.muted, fontSize: 11, fontFamily, marginBottom: 12 }}>
            enter code if it's you:
          </div>
          <div style={{ marginBottom: 15 }}>
            <CodeInput
              value={codeDigits}
              onChange={setCodeDigits}
              colors={{
                bg: colors.bg,
                border: `${colors.primary}66`,
                text: colors.text,
              }}
            />
          </div>
          <button
            onClick={handleReturningUser}
            style={{
              background: colors.primary,
              color: colors.bg,
              border: 'none',
              borderRadius: 6,
              padding: '10px 20px',
              fontSize: 12,
              fontFamily,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            submit
          </button>
          <button
            onClick={reset}
            style={{
              background: 'transparent',
              border: 'none',
              color: colors.muted,
              fontSize: 11,
              fontFamily,
              cursor: 'pointer',
              marginLeft: 10,
            }}
          >
            try another →
          </button>
          {error && (
            <div style={{ marginTop: 10, color: colors.error, fontSize: 11, fontFamily }}>
              {error}
            </div>
          )}
        </div>
      )}

      {/* Flow: submitted - guest score saved, offer account */}
      {flowState === 'submitted' && (
        <div style={{
          background: colors.surface,
          border: `1px solid ${colors.primary}4d`,
          borderRadius: 12,
          padding: 20,
        }}>
          <div style={{ color: colors.secondary, fontSize: 14, fontFamily, marginBottom: 5 }}>
            ✓ {playerName} — Rank #{submittedRank}
          </div>
          <div style={{ color: colors.muted, fontSize: 11, fontFamily, marginBottom: 15 }}>
            {isRegisteredHandle
              ? 'this is you? enter your code:'
              : 'keep this name? add a code:'}
          </div>
          <div style={{ marginBottom: 15 }}>
            <CodeInput
              value={codeDigits}
              onChange={setCodeDigits}
              colors={{
                bg: colors.bg,
                border: `${colors.primary}66`,
                text: colors.text,
              }}
            />
          </div>
          <button
            onClick={saveAccount}
            style={{
              background: colors.primary,
              color: colors.bg,
              border: 'none',
              borderRadius: 6,
              padding: '10px 20px',
              fontSize: 12,
              fontFamily,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {isRegisteredHandle ? 'login' : 'save'}
          </button>
          <button
            onClick={skipSave}
            style={{
              background: 'transparent',
              border: 'none',
              color: colors.muted,
              fontSize: 11,
              fontFamily,
              cursor: 'pointer',
              marginLeft: 10,
            }}
          >
            {isRegisteredHandle ? 'not me →' : 'skip →'}
          </button>
          {error && (
            <div style={{ marginTop: 10, color: colors.error, fontSize: 11, fontFamily }}>
              {error}
            </div>
          )}
        </div>
      )}

      {/* Flow: handleTaken - pick new handle */}
      {flowState === 'handleTaken' && (
        <div style={{
          background: colors.surface,
          border: `1px solid ${colors.error}4d`,
          borderRadius: 12,
          padding: 20,
        }}>
          <div style={{ color: colors.secondary, fontSize: 12, fontFamily, marginBottom: 4 }}>
            ✓ score saved
          </div>
          <div style={{ color: colors.error, fontSize: 12, fontFamily, marginBottom: 12 }}>
            "{playerName}" is taken — try another:
          </div>
          <input
            type="text"
            placeholder="try another"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            maxLength={20}
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: 14,
              fontFamily,
              background: colors.bg,
              border: `1px solid ${colors.primary}4d`,
              borderRadius: 6,
              color: colors.primary,
              textAlign: 'center',
              marginBottom: 12,
              letterSpacing: 2,
              outline: 'none',
            }}
          />
          <div style={{ marginBottom: 15 }}>
            <CodeInput
              value={codeDigits}
              onChange={setCodeDigits}
              colors={{
                bg: colors.bg,
                border: `${colors.primary}66`,
                text: colors.text,
              }}
            />
          </div>
          <button
            onClick={retryWithNewHandle}
            style={{
              background: colors.primary,
              color: colors.bg,
              border: 'none',
              borderRadius: 6,
              padding: '10px 20px',
              fontSize: 12,
              fontFamily,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            save
          </button>
          <button
            onClick={skipSave}
            style={{
              background: 'transparent',
              border: 'none',
              color: colors.muted,
              fontSize: 11,
              fontFamily,
              cursor: 'pointer',
              marginLeft: 10,
            }}
          >
            skip →
          </button>
          {error && (
            <div style={{ marginTop: 10, color: colors.error, fontSize: 11, fontFamily }}>
              {error}
            </div>
          )}
        </div>
      )}

      {/* Flow: saved - done */}
      {flowState === 'saved' && (
        <div style={{ color: colors.secondary, fontSize: 14, fontFamily }}>
          Rank #{submittedRank}!
        </div>
      )}
    </div>
  );
}
