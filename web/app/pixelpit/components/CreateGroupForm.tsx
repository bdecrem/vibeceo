'use client';

import React, { useState } from 'react';
import type { GroupType, LeaderboardColors } from './types';

interface CreateGroupFormProps {
  colors: LeaderboardColors;
  gameUrl: string;
  score?: number;
  onClose: () => void;
  onCreated: (group: { code: string; name: string; type: string }, smsLink?: string) => void;
}

/**
 * Form for creating a new group.
 *
 * @example
 * ```tsx
 * <CreateGroupForm
 *   colors={COLORS}
 *   gameUrl="https://pixelpit.io/arcade/superbeam"
 *   score={42}
 *   onClose={() => setShowForm(false)}
 *   onCreated={(group, smsLink) => {
 *     if (smsLink) window.location.href = smsLink;
 *   }}
 * />
 * ```
 */
export function CreateGroupForm({
  colors,
  gameUrl,
  score,
  onClose,
  onCreated,
}: CreateGroupFormProps) {
  const [type, setType] = useState<GroupType>('leaderboard');
  const [name, setName] = useState('');
  const [phones, setPhones] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    if (!window.PixelpitSocial) {
      setError('Social library not loaded');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const phoneList = phones
        .split(/[,\n]/)
        .map((p) => p.trim())
        .filter((p) => p.length > 0);

      const result = await window.PixelpitSocial.createGroup(name.trim(), type, {
        phones: phoneList.length > 0 ? phoneList : undefined,
        gameUrl,
        score,
      });

      if (result.success && result.group) {
        onCreated(result.group, result.smsLink);
      } else {
        setError(result.error || 'Failed to create group');
      }
    } catch (e) {
      console.error('Error creating group:', e);
      setError('Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 300,
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: colors.surface,
          borderRadius: 16,
          padding: '28px 32px',
          width: '100%',
          maxWidth: 360,
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}>
          <h3 style={{
            fontFamily,
            fontSize: 14,
            fontWeight: 600,
            color: colors.primary,
            letterSpacing: 2,
            margin: 0,
          }}>
            CREATE GROUP
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: colors.muted,
              fontSize: 20,
              cursor: 'pointer',
              padding: 4,
            }}
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Type Selection */}
          <div style={{ marginBottom: 20 }}>
            <label style={{
              fontFamily,
              fontSize: 11,
              color: colors.muted,
              letterSpacing: 1,
              display: 'block',
              marginBottom: 8,
            }}>
              TYPE
            </label>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={() => setType('streak')}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  background: type === 'streak' ? colors.primary : 'rgba(255,255,255,0.05)',
                  color: type === 'streak' ? colors.bg : colors.text,
                  border: 'none',
                  borderRadius: 8,
                  fontFamily,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  letterSpacing: 1,
                }}
              >
                STREAK (2ppl)
              </button>
              <button
                type="button"
                onClick={() => setType('leaderboard')}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  background: type === 'leaderboard' ? colors.primary : 'rgba(255,255,255,0.05)',
                  color: type === 'leaderboard' ? colors.bg : colors.text,
                  border: 'none',
                  borderRadius: 8,
                  fontFamily,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  letterSpacing: 1,
                }}
              >
                LEADERBOARD
              </button>
            </div>
          </div>

          {/* Name Input */}
          <div style={{ marginBottom: 20 }}>
            <label style={{
              fontFamily,
              fontSize: 11,
              color: colors.muted,
              letterSpacing: 1,
              display: 'block',
              marginBottom: 8,
            }}>
              NAME
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              placeholder="Squad, Me+Amy, etc."
              style={{
                width: '100%',
                padding: '12px 14px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                color: colors.text,
                fontFamily,
                fontSize: 13,
                outline: 'none',
              }}
            />
          </div>

          {/* Phone Numbers */}
          <div style={{ marginBottom: 24 }}>
            <label style={{
              fontFamily,
              fontSize: 11,
              color: colors.muted,
              letterSpacing: 1,
              display: 'block',
              marginBottom: 8,
            }}>
              INVITE (phone numbers, optional)
            </label>
            <input
              type="text"
              value={phones}
              onChange={(e) => setPhones(e.target.value)}
              placeholder="555-1234, 555-5678"
              style={{
                width: '100%',
                padding: '12px 14px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                color: colors.text,
                fontFamily,
                fontSize: 13,
                outline: 'none',
              }}
            />
            <p style={{
              fontFamily,
              fontSize: 10,
              color: colors.muted,
              marginTop: 6,
              opacity: 0.7,
            }}>
              Opens iMessage with challenge link
            </p>
          </div>

          {/* Error */}
          {error && (
            <p style={{
              fontFamily,
              fontSize: 12,
              color: '#f87171',
              marginBottom: 16,
            }}>
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px 20px',
              background: colors.primary,
              color: colors.bg,
              border: 'none',
              borderRadius: 8,
              fontFamily,
              fontSize: 13,
              fontWeight: 600,
              cursor: loading ? 'wait' : 'pointer',
              opacity: loading ? 0.7 : 1,
              letterSpacing: 1,
            }}
          >
            {loading ? 'Creating...' : 'Create Group (+10 XP)'}
          </button>
        </form>
      </div>
    </div>
  );
}
