'use client';

import React, { useState } from 'react';
import { useLeaderboard } from './hooks/useLeaderboard';
import type { LeaderboardProps } from './types';

// Level badge colors by tier
function getLevelBadgeColor(level: number): string {
  if (level >= 20) return '#f59e0b'; // Gold
  if (level >= 10) return '#a855f7'; // Purple
  if (level >= 5) return '#3b82f6';  // Blue
  return '#6b7280';                   // Gray
}

// Level badge component
function LevelBadge({ level }: { level: number }) {
  const bgColor = getLevelBadgeColor(level);
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 18,
      height: 18,
      borderRadius: '50%',
      background: bgColor,
      color: '#fff',
      fontSize: 10,
      fontWeight: 700,
      marginLeft: 6,
      flexShrink: 0,
    }}>
      {level}
    </span>
  );
}

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
  const [showXpInfo, setShowXpInfo] = useState(false);

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

      <div
        onClick={() => setShowXpInfo(true)}
        style={{
          width: '100%',
          maxWidth: 400,
          marginBottom: 30,
          background: colors.surface,
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: 12,
          boxShadow: '0 15px 40px rgba(0,0,0,0.4)',
          overflow: 'hidden',
          cursor: 'pointer',
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
                  display: 'flex',
                  alignItems: 'center',
                }}>
                  {entry.isRegistered ? `@${entry.name}` : entry.name}
                  {entry.isRegistered && entry.level && <LevelBadge level={entry.level} />}
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
                    display: 'flex',
                    alignItems: 'center',
                  }}>
                    {playerEntry.isRegistered ? `@${playerEntry.name}` : playerEntry.name}
                    {playerEntry.isRegistered && playerEntry.level && <LevelBadge level={playerEntry.level} />}
                    <span style={{ marginLeft: 6, opacity: 0.7 }}>← you</span>
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

      {/* XP Info Modal */}
      {showXpInfo && (
        <div
          onClick={() => setShowXpInfo(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 200,
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: colors.surface,
              borderRadius: 16,
              padding: '24px 28px',
              maxWidth: 320,
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            }}
          >
            <h3 style={{
              fontFamily,
              fontSize: 14,
              fontWeight: 600,
              color: colors.primary,
              marginBottom: 16,
              letterSpacing: 1,
            }}>
              Level Up!
            </h3>
            <p style={{
              fontFamily,
              fontSize: 12,
              color: colors.text,
              lineHeight: 1.6,
              marginBottom: 12,
            }}>
              Registered players earn <span style={{ color: colors.primary }}>XP</span> for every game.
            </p>
            <p style={{
              fontFamily,
              fontSize: 12,
              color: colors.text,
              lineHeight: 1.6,
              marginBottom: 12,
            }}>
              Play daily to build a <span style={{ color: colors.secondary }}>streak</span> and earn bonus XP:
            </p>
            <div style={{
              fontFamily,
              fontSize: 11,
              color: colors.muted,
              lineHeight: 1.8,
              marginBottom: 16,
              paddingLeft: 8,
            }}>
              <div>3+ days: <span style={{ color: colors.text }}>1.5x XP</span></div>
              <div>7+ days: <span style={{ color: colors.text }}>2x XP</span></div>
              <div>14+ days: <span style={{ color: colors.text }}>2.5x XP</span></div>
            </div>
            <p style={{
              fontFamily,
              fontSize: 11,
              color: colors.muted,
              lineHeight: 1.6,
              marginBottom: 20,
            }}>
              The colored badge shows your level.
            </p>
            <button
              onClick={() => setShowXpInfo(false)}
              style={{
                width: '100%',
                background: colors.primary,
                color: colors.bg,
                border: 'none',
                borderRadius: 6,
                padding: '12px 20px',
                fontSize: 12,
                fontFamily,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
