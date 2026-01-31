'use client';

import React, { useState, useEffect } from 'react';
import type { Group, LeaderboardColors } from './types';

interface StreakBoardProps {
  group: Group;
  colors: LeaderboardColors;
  onClose?: () => void;
}

/**
 * Display for streak groups - shows streak count and member status.
 * No scores, just accountability.
 *
 * @example
 * ```tsx
 * <StreakBoard
 *   group={streakGroup}
 *   colors={COLORS}
 *   onClose={() => setShowStreak(false)}
 * />
 * ```
 */
export function StreakBoard({ group, colors, onClose }: StreakBoardProps) {
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);
  const fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';

  // Calculate time remaining in streak window
  useEffect(() => {
    if (!group.streakSavedAt) {
      setTimeRemaining(null);
      return;
    }

    const updateTime = () => {
      const savedAt = new Date(group.streakSavedAt!);
      const windowEnd = new Date(savedAt.getTime() + 24 * 60 * 60 * 1000);
      const now = new Date();
      const diff = windowEnd.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining(null);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setTimeRemaining(`${hours}h ${minutes}m`);
    };

    updateTime();
    const interval = setInterval(updateTime, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [group.streakSavedAt]);

  // Check if all members have played today
  const today = new Date().toISOString().split('T')[0];
  const allPlayed = group.members.every((m) => {
    if (!m.lastPlayAt) return false;
    return new Date(m.lastPlayAt).toISOString().split('T')[0] === today;
  });

  const streakSafe = allPlayed && group.streak && group.streak > 0;

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
      {/* Group Name */}
      <h2 style={{
        fontFamily,
        fontSize: 14,
        fontWeight: 300,
        color: colors.muted,
        marginBottom: 6,
        letterSpacing: 3,
      }}>
        {group.name}
      </h2>

      {/* Group Code */}
      <button
        onClick={() => {
          navigator.clipboard.writeText(group.code);
          if (window.PixelpitSocial) {
            window.PixelpitSocial.showToast('Copied!');
          }
        }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: 'transparent',
          border: 'none',
          fontFamily,
          fontSize: 10,
          color: colors.muted,
          marginBottom: 10,
          opacity: 0.6,
          cursor: 'pointer',
          padding: '4px 8px',
        }}
      >
        code: {group.code}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
        </svg>
      </button>

      {/* Streak Count */}
      <div style={{
        fontFamily,
        fontSize: 72,
        fontWeight: 200,
        color: colors.primary,
        marginBottom: 30,
        textShadow: `0 0 40px ${colors.primary}60`,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <span style={{ fontSize: 48 }}>🔥</span>
        {group.streak || 0}
      </div>

      {/* Member Status Card */}
      <div style={{
        width: '100%',
        maxWidth: 300,
        background: colors.surface,
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: 12,
        boxShadow: '0 15px 40px rgba(0,0,0,0.4)',
        overflow: 'hidden',
        marginBottom: 24,
      }}>
        {group.members.map((member) => {
          // Check if played today (same calendar day) - simpler and more intuitive
          const today = new Date().toISOString().split('T')[0];
          const playedToday = member.lastPlayAt &&
            new Date(member.lastPlayAt).toISOString().split('T')[0] === today;
          const hasPlayed = playedToday;

          return (
            <div
              key={member.userId}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 20px',
                borderBottom: '1px solid rgba(255,255,255,0.03)',
              }}
            >
              <span style={{
                fontFamily,
                fontSize: 13,
                color: colors.text,
              }}>
                @{member.handle}
              </span>
              <span style={{
                fontFamily,
                fontSize: 14,
                color: hasPlayed ? colors.secondary : colors.muted,
              }}>
                {hasPlayed ? '✓' : '⏳ waiting'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Status Message */}
      <p style={{
        fontFamily,
        fontSize: 12,
        color: streakSafe ? colors.secondary : colors.muted,
        marginBottom: 30,
        letterSpacing: 1,
      }}>
        {streakSafe ? (
          'streak safe today'
        ) : timeRemaining ? (
          `ends in ${timeRemaining}`
        ) : group.streak === 0 ? (
          'play to start your streak!'
        ) : (
          'both need to play to continue'
        )}
      </p>

      {/* Close Button */}
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
