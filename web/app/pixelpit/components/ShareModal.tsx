'use client';

import React, { useState, useEffect } from 'react';
import { CreateGroupForm } from './CreateGroupForm';
import type { Group, LeaderboardColors } from './types';

interface ShareModalProps {
  gameUrl: string;
  score?: number;
  colors: LeaderboardColors;
  onClose: () => void;
  onGroupShare?: (group: Group) => void;
}

/**
 * Share modal for logged-in users.
 * Shows share link, user's groups, and create group option.
 *
 * @example
 * ```tsx
 * <ShareModal
 *   gameUrl="https://pixelpit.io/arcade/superbeam"
 *   score={42}
 *   colors={COLORS}
 *   onClose={() => setShowShare(false)}
 *   onGroupShare={(group) => setActiveGroup(group)}
 * />
 * ```
 */
export function ShareModal({
  gameUrl,
  score,
  colors,
  onClose,
  onGroupShare,
}: ShareModalProps) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [copied, setCopied] = useState(false);

  const fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';

  // Build the share URL: /share/${score} path + ?ref= param
  const baseShareUrl = score !== undefined ? `${gameUrl}/share/${score}` : gameUrl;
  const shareUrl = window.PixelpitSocial?.buildShareUrl
    ? window.PixelpitSocial.buildShareUrl(baseShareUrl)
    : baseShareUrl;

  // Load groups on mount
  useEffect(() => {
    const loadGroups = async () => {
      if (!window.PixelpitSocial) {
        setLoading(false);
        return;
      }

      try {
        const result = await window.PixelpitSocial.getGroups();
        setGroups(result.groups || []);
      } catch (e) {
        console.error('Failed to load groups:', e);
      } finally {
        setLoading(false);
      }
    };

    loadGroups();
  }, []);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy:', e);
    }
  };

  const handleShareGroup = (group: Group) => {
    if (!window.PixelpitSocial) return;

    const user = window.PixelpitSocial.getUser();
    const handle = user?.handle || 'Someone';
    const sharePath = score !== undefined ? `${gameUrl}/share/${score}` : gameUrl;
    const baseUrl = `${sharePath}?pg=${group.code}`;
    const url = window.PixelpitSocial.buildShareUrl
      ? window.PixelpitSocial.buildShareUrl(baseUrl)
      : baseUrl;
    const scoreText = score !== undefined ? ` of ${score}` : '';
    const text = `${handle} wants you to beat their score${scoreText}! Play ${group.name}: ${url}`;

    // Try native share, fallback to clipboard
    if (navigator.share) {
      navigator.share({ title: 'Pixelpit', text, url }).catch(() => {
        navigator.clipboard.writeText(url);
      });
    } else {
      navigator.clipboard.writeText(url);
      if (window.PixelpitSocial.showToast) {
        window.PixelpitSocial.showToast('Link copied!');
      }
    }

    onGroupShare?.(group);
  };

  const handleGroupCreated = (
    group: { code: string; name: string; type: string },
    smsLink?: string
  ) => {
    setShowCreateForm(false);

    // Reload groups
    if (window.PixelpitSocial) {
      window.PixelpitSocial.getGroups().then((result) => {
        setGroups(result.groups || []);
      });
    }

    // Open SMS if provided
    if (smsLink) {
      window.location.href = smsLink;
    } else if (window.PixelpitSocial?.showToast) {
      window.PixelpitSocial.showToast('Group created! +10 XP');
    }
  };

  if (showCreateForm) {
    return (
      <CreateGroupForm
        colors={colors}
        gameUrl={gameUrl}
        score={score}
        onClose={() => setShowCreateForm(false)}
        onCreated={handleGroupCreated}
      />
    );
  }

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
        zIndex: 200,
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
          maxWidth: 380,
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
            SHARE
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

        {/* Your Link Section */}
        <div style={{ marginBottom: 24 }}>
          <label style={{
            fontFamily,
            fontSize: 11,
            color: colors.muted,
            letterSpacing: 1,
            display: 'block',
            marginBottom: 8,
          }}>
            YOUR LINK
          </label>
          <div style={{
            display: 'flex',
            gap: 8,
          }}>
            <div style={{
              flex: 1,
              padding: '10px 12px',
              background: 'rgba(255,255,255,0.05)',
              borderRadius: 6,
              fontFamily,
              fontSize: 11,
              color: colors.text,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {shareUrl}
            </div>
            <button
              onClick={handleCopyLink}
              style={{
                padding: '10px 16px',
                background: copied ? colors.secondary : colors.primary,
                color: colors.bg,
                border: 'none',
                borderRadius: 6,
                fontFamily,
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                letterSpacing: 1,
                whiteSpace: 'nowrap',
              }}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Divider */}
        <div style={{
          height: 1,
          background: 'rgba(255,255,255,0.05)',
          margin: '24px 0',
        }} />

        {/* Groups Section */}
        <div>
          <label style={{
            fontFamily,
            fontSize: 11,
            color: colors.muted,
            letterSpacing: 1,
            display: 'block',
            marginBottom: 12,
          }}>
            YOUR GROUPS
          </label>

          {loading ? (
            <p style={{
              fontFamily,
              fontSize: 12,
              color: colors.muted,
              textAlign: 'center',
              padding: '16px 0',
            }}>
              loading...
            </p>
          ) : groups.length === 0 ? (
            <p style={{
              fontFamily,
              fontSize: 12,
              color: colors.muted,
              textAlign: 'center',
              padding: '16px 0',
            }}>
              No groups yet
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {groups.map((group) => (
                <div
                  key={group.code}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 14px',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: 8,
                  }}
                >
                  <span style={{
                    fontFamily,
                    fontSize: 12,
                    color: colors.text,
                  }}>
                    {group.type === 'streak' && `🔥 `}
                    {group.name}
                    {group.type === 'streak' && group.streak ? ` (${group.streak})` : ''}
                    <span style={{ color: colors.muted, marginLeft: 8, fontSize: 10 }}>
                      ({group.type})
                    </span>
                  </span>
                  <button
                    onClick={() => handleShareGroup(group)}
                    style={{
                      padding: '6px 12px',
                      background: 'rgba(255,255,255,0.1)',
                      color: colors.text,
                      border: 'none',
                      borderRadius: 4,
                      fontFamily,
                      fontSize: 10,
                      cursor: 'pointer',
                    }}
                  >
                    Share
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Create New Group Button */}
          <button
            onClick={() => setShowCreateForm(true)}
            style={{
              width: '100%',
              marginTop: 16,
              padding: '14px 20px',
              background: 'transparent',
              color: colors.secondary,
              border: `1px solid ${colors.secondary}40`,
              borderRadius: 8,
              fontFamily,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              letterSpacing: 1,
            }}
          >
            + Create New Group
          </button>
        </div>
      </div>
    </div>
  );
}
