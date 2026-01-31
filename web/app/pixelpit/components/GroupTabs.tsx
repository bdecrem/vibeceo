'use client';

import React from 'react';
import type { Group, LeaderboardColors } from './types';

interface GroupTabsProps {
  groups: Group[];
  activeTab: 'global' | string; // 'global' or group code
  onTabChange: (tab: 'global' | string) => void;
  colors: LeaderboardColors;
}

/**
 * Tab switcher for leaderboard views.
 * Shows Global + user's groups.
 *
 * @example
 * ```tsx
 * <GroupTabs
 *   groups={userGroups}
 *   activeTab={activeTab}
 *   onTabChange={setActiveTab}
 *   colors={COLORS}
 * />
 * ```
 */
export function GroupTabs({ groups, activeTab, onTabChange, colors }: GroupTabsProps) {
  const fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';

  return (
    <div style={{
      display: 'flex',
      gap: 8,
      marginBottom: 16,
      flexWrap: 'wrap',
      justifyContent: 'center',
    }}>
      {/* Global Tab */}
      <button
        onClick={() => onTabChange('global')}
        style={{
          padding: '8px 16px',
          background: activeTab === 'global' ? colors.primary : 'rgba(255,255,255,0.05)',
          color: activeTab === 'global' ? colors.bg : colors.text,
          border: 'none',
          borderRadius: 6,
          fontFamily,
          fontSize: 11,
          fontWeight: 600,
          cursor: 'pointer',
          letterSpacing: 1,
          transition: 'all 0.15s ease',
        }}
      >
        Global
      </button>

      {/* Group Tabs */}
      {groups.map((group) => (
        <button
          key={group.code}
          onClick={() => onTabChange(group.code)}
          style={{
            padding: '8px 16px',
            background: activeTab === group.code ? colors.primary : 'rgba(255,255,255,0.05)',
            color: activeTab === group.code ? colors.bg : colors.text,
            border: 'none',
            borderRadius: 6,
            fontFamily,
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
            letterSpacing: 1,
            transition: 'all 0.15s ease',
          }}
        >
          {group.type === 'streak' ? `🔥 ${group.name}` : group.name}
          {group.type === 'streak' && group.streak ? ` (${group.streak})` : ''}
        </button>
      ))}
    </div>
  );
}
