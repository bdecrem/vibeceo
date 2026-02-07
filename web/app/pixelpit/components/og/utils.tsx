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
  flappy: {
    background: '#71c5cf',       // sky blue
    primary: '#f7dc6f',          // bird yellow
    secondary: '#73bf2e',        // pipe green
    accent: '#ffffff',           // white text
    branding: '#ffffff',         // white branding
  },
  flip: {
    background: '#09090b',       // void black
    primary: '#22d3ee',          // cyan glow
    secondary: '#f8fafc',        // white player
    accent: '#ef4444',           // red spikes
    branding: '#71717a',         // muted gray
  },
  batdash: {
    background: '#0f172a',       // dark blue night
    primary: '#fef08a',          // yellow (moon/text)
    secondary: '#a855f7',        // purple accent
    accent: '#1e293b',           // building color
    branding: '#f8fafc',         // white text
  },
  catch: {
    background: '#000000',       // void black (shadows = safe)
    primary: '#22d3ee',          // cyan player
    secondary: '#fbbf24',        // gold coins (the trap)
    accent: '#ffffff',           // danger white
    branding: '#71717a',         // muted gray
  },
  cavemoth: {
    background: '#0a0a1a',       // midnight blue-black cave
    primary: '#4ecdc4',          // seafoam glow (moth)
    secondary: '#c6f68d',        // phosphorescent green
    accent: '#9b59b6',           // amethyst crystals
    branding: '#8b7fa8',         // muted lavender
  },
  drop: {
    background: 'linear-gradient(180deg, #5BA3D9 0%, #4A8DB7 100%)',
    primary: '#ffffff',          // white score
    secondary: '#FFD43B',        // gold accent
    accent: '#FF2244',           // red ball / CTA
    branding: '#ffffff80',       // semi-transparent white
  },
};
