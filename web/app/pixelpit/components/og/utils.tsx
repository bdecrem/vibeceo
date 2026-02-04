/**
 * OG Image Utilities for Pixelpit games.
 *
 * Common elements used across game share images.
 */

import React from 'react';

/**
 * Corner accent decorations for OG images.
 */
export function CornerAccents({ color = '#FFD93D' }: { color?: string }) {
  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: 25,
          left: 25,
          width: 35,
          height: 35,
          borderTop: `3px solid ${color}`,
          borderLeft: `3px solid ${color}`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 25,
          right: 25,
          width: 35,
          height: 35,
          borderTop: `3px solid ${color}`,
          borderRight: `3px solid ${color}`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 25,
          left: 25,
          width: 35,
          height: 35,
          borderBottom: `3px solid ${color}`,
          borderLeft: `3px solid ${color}`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 25,
          right: 25,
          width: 35,
          height: 35,
          borderBottom: `3px solid ${color}`,
          borderRight: `3px solid ${color}`,
        }}
      />
    </>
  );
}

/**
 * Pixelpit Arcade branding footer.
 */
export function PixelpitBranding({ color = '#F5E6D3' }: { color?: string }) {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 30,
        fontSize: 20,
        color,
        letterSpacing: 6,
        opacity: 0.7,
      }}
    >
      PIXELPIT ARCADE
    </div>
  );
}

/**
 * Standard OG image size.
 */
export const OG_SIZE = { width: 1200, height: 630 };

/**
 * Default color schemes for games.
 */
export const GAME_COLORS = {
  beam: {
    background: '#1A1A2E',
    primary: '#fbbf24',
    secondary: '#4ECDC4',
    accent: '#C44DFF',
    branding: '#F5E6D3',
  },
  rain: {
    background: '#0f172a',
    primary: '#fbbf24',
    secondary: '#22d3ee',
    accent: '#f472b6',
    branding: '#f8fafc',
  },
  singularity: {
    background: '#000000',
    primary: '#ff4d00',
    secondary: '#ff4d00',
    accent: '#331100',
    branding: '#ff4d0099',
  },
  emoji: {
    background: '#fef3c7',
    primary: '#ec4899',
    secondary: '#facc15',
    accent: '#06b6d4',
    branding: '#1e1b4b',
  },
  pop: {
    background: '#0f172a',
    primary: '#ec4899',
    secondary: '#22d3ee',
    accent: '#fbbf24',
    branding: '#f8fafc',
  },
  catTower: {
    background: '#1a1a2e',
    primary: '#FFB347',
    secondary: '#70A1FF',
    accent: '#FFD700',
    branding: '#f8fafc',
  },
  sproutRun: {
    background: '#fef3c7',      // warm cream sky
    primary: '#22c55e',          // grass green
    secondary: '#fbbf24',        // sunshine gold
    accent: '#15803d',           // dark green
    branding: '#78716c',         // muted brown
  },
  tapBeats: {
    background: '#09090b',       // void black
    primary: '#ec4899',          // pink (center lane)
    secondary: '#22d3ee',        // cyan (left lane)
    accent: '#facc15',           // gold (right lane)
    branding: '#f8fafc',         // white text
  },
};
