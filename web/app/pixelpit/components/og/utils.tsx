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
  fuse: {
    background: '#0d0d14',
    primary: '#ffd93d',
    secondary: '#ff6b35',
    accent: '#ff4757',
    branding: '#f8fafc',
  },
  surge: {
    background: '#0a0a12',
    primary: '#facc15',
    secondary: '#7c3aed',
    accent: '#a855f7',
    branding: '#f8fafc',
  },
  pop: {
    background: '#0f172a',
    primary: '#ec4899',     // Hot pink — THE lead
    secondary: '#22d3ee',   // Electric cyan
    accent: '#fbbf24',      // Amber — energy
    branding: '#f8fafc',
  },
};
