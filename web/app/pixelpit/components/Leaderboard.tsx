'use client';

import React from 'react';
import { useLeaderboard } from './hooks/useLeaderboard';
import type { LeaderboardProps } from './types';

/**
 * Leaderboard display component.
 *
 * Shows top N entries with rank badges and highlights the player's position
 * if not in the top entries.
 *
 * @example
 * ```tsx
 * <Leaderboard
 *   gameId="beam"
 *   limit={8}
 *   entryId={submittedEntryId}
 *   colors={{
 *     bg: '#0a0f1a',
 *     surface: '#141d2b',
 *     primary: '#fbbf24',
 *     secondary: '#2dd4bf',
 *     text: '#f8fafc',
 *     muted: '#94a3b8',
 *   }}
 *   onClose={() => setGameState('gameover')}
 * />
 * ```
 */
export function Leaderboard({ gameId, limit = 10, entryId, colors, onClose }: LeaderboardProps) {
  const { leaderboard, playerEntry, loading, error } = useLeaderboard({
    gameId,
    limit,
    entryId,
  });

  const fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: colors.bg,
      zIndex: 100,
      padding: 40,
    }}>
      <h2 style={{
        fontFamily,
        fontSize: 18,
        fontWeight: 300,
        color: colors.primary,
        marginBottom: 30,
        letterSpacing: 4,
      }}>
        leaderboard
      </h2>

      <div style={{
        width: '100%',
        maxWidth: 400,
        marginBottom: 30,
        background: colors.surface,
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: 12,
        boxShadow: '0 15px 40px rgba(0,0,0,0.4)',
        overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{
            color: colors.muted,
            textAlign: 'center',
            padding: 40,
            fontFamily,
            fontSize: 12,
          }}>
            loading...
          </div>
        ) : error ? (
          <div style={{
            color: colors.muted,
            textAlign: 'center',
            padding: 40,
            fontFamily,
            fontSize: 12,
          }}>
            {error}
          </div>
        ) : leaderboard.length === 0 ? (
          <div style={{
            color: colors.muted,
            textAlign: 'center',
            padding: 40,
            fontFamily,
            fontSize: 12,
          }}>
            no scores yet. be the first!
          </div>
        ) : (
          <>
            {leaderboard.map((entry) => (
              <div
                key={entry.rank}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '14px 20px',
                  borderBottom: '1px solid rgba(255,255,255,0.03)',
                  background: entry.rank === 1 ? `${colors.primary}14` : 'transparent',
                  fontFamily,
                  fontSize: 12,
                }}
              >
                <span style={{
                  width: 30,
                  color: entry.rank === 1 ? colors.primary : colors.muted,
                }}>
                  {String(entry.rank).padStart(2, '0')}
                </span>
                <span style={{
                  flex: 1,
                  paddingLeft: 15,
                  color: entry.isRegistered ? colors.text : colors.primary,
                }}>
                  {entry.isRegistered ? `@${entry.name}` : entry.name}
                </span>
                <span style={{
                  fontWeight: 500,
                  color: colors.secondary,
                  fontSize: 14,
                }}>
                  {entry.score}
                </span>
              </div>
            ))}

            {/* Show player's position if not in top */}
            {playerEntry && (
              <>
                <div style={{
                  padding: '8px 20px',
                  textAlign: 'center',
                  color: colors.muted,
                  fontFamily,
                  fontSize: 10,
                  letterSpacing: 4,
                }}>
                  ···
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '14px 20px',
                    background: `${colors.secondary}1a`,
                    fontFamily,
                    fontSize: 12,
                  }}
                >
                  <span style={{ width: 30, color: colors.secondary }}>
                    {String(playerEntry.rank).padStart(2, '0')}
                  </span>
                  <span style={{
                    flex: 1,
                    paddingLeft: 15,
                    color: colors.secondary,
                  }}>
                    {playerEntry.isRegistered ? `@${playerEntry.name}` : playerEntry.name} ← you
                  </span>
                  <span style={{
                    fontWeight: 500,
                    color: colors.secondary,
                    fontSize: 14,
                  }}>
                    {playerEntry.score}
                  </span>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {onClose && (
        <button
          onClick={onClose}
          style={{
            background: colors.secondary,
            color: colors.bg,
            border: 'none',
            borderRadius: 6,
            padding: '14px 40px',
            fontSize: 13,
            fontFamily,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: `0 6px 20px ${colors.secondary}40`,
            letterSpacing: 1,
          }}
        >
          back
        </button>
      )}
    </div>
  );
}
