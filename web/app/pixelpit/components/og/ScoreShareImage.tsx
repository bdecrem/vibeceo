/**
 * Parameterized OG Image Generator for game scores.
 *
 * This is NOT a React component - it's a helper function that returns
 * JSX for use with next/og's ImageResponse.
 *
 * @example
 * ```tsx
 * // In opengraph-image.tsx:
 * import { ImageResponse } from 'next/og';
 * import { createScoreShareImage, OG_SIZE } from '@/app/pixelpit/components/og/ScoreShareImage';
 *
 * export default async function Image({ params }: { params: { score: string } }) {
 *   return new ImageResponse(
 *     createScoreShareImage({
 *       score: params.score,
 *       gameName: 'BEAM',
 *       colors: GAME_COLORS.beam,
 *     }),
 *     { ...OG_SIZE }
 *   );
 * }
 * ```
 */

import React from 'react';
import { CornerAccents, PixelpitBranding, OG_SIZE } from './utils';
import type { ScoreShareImageProps } from '../types';

export { OG_SIZE };

/**
 * Creates the JSX for a score share OG image.
 */
export function createScoreShareImage({
  score,
  gameName,
  tagline = 'CAN YOU BEAT ME?',
  colors,
  decorations,
}: ScoreShareImageProps): React.ReactElement {
  return (
    <div
      style={{
        background: colors.background,
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Game-specific decorations */}
      {decorations}

      {/* Game name */}
      <div
        style={{
          fontSize: 48,
          fontWeight: 700,
          color: colors.secondary,
          letterSpacing: 12,
          textShadow: `0 0 40px ${colors.secondary}99`,
          marginBottom: 20,
        }}
      >
        {gameName}
      </div>

      {/* Big score */}
      <div
        style={{
          fontSize: 220,
          fontWeight: 700,
          color: colors.primary,
          textShadow: `0 0 80px ${colors.primary}cc`,
          lineHeight: 1,
        }}
      >
        {score}
      </div>

      {/* Call to action */}
      <div
        style={{
          fontSize: 32,
          color: colors.accent,
          letterSpacing: 4,
          marginTop: 20,
        }}
      >
        {tagline}
      </div>

      {/* Corner accents */}
      <CornerAccents color={colors.primary} />

      {/* Pixelpit branding */}
      <PixelpitBranding color={colors.branding} />
    </div>
  );
}

/**
 * BEAM-specific decorations: horizontal walls with gaps.
 */
export function BeamDecorations() {
  return (
    <>
      {/* Background grid lines */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '0 200px',
          opacity: 0.15,
        }}
      >
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            style={{
              width: '100%',
              height: 2,
              background: '#4ECDC4',
            }}
          />
        ))}
      </div>

      {/* Vertical lane lines */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          justifyContent: 'center',
          gap: 120,
          opacity: 0.1,
        }}
      >
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            style={{
              width: 2,
              height: '100%',
              background: '#4ECDC4',
            }}
          />
        ))}
      </div>

      {/* Top wall accent */}
      <div
        style={{
          position: 'absolute',
          top: 60,
          left: 150,
          right: 150,
          height: 16,
          background: 'linear-gradient(90deg, transparent 0%, #C44DFF 20%, #C44DFF 40%, transparent 41%, transparent 59%, #C44DFF 60%, #C44DFF 80%, transparent 100%)',
          boxShadow: '0 0 40px #C44DFF',
        }}
      />

      {/* Bottom wall */}
      <div
        style={{
          position: 'absolute',
          bottom: 80,
          left: 150,
          right: 150,
          height: 16,
          background: 'linear-gradient(90deg, #C44DFF 0%, #C44DFF 30%, transparent 31%, transparent 69%, #C44DFF 70%, #C44DFF 100%)',
          boxShadow: '0 0 40px #C44DFF',
        }}
      />
    </>
  );
}

/**
 * SINGULARITY-specific decorations: grid, singularity glow, particles.
 * VOID PROTOCOL aesthetic: black void, blood orange accent (#ff4d00).
 */
export function SingularityDecorations() {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
      }}
    >
      {/* Singularity radial glow at top (using linear gradient approximation) */}
      <div
        style={{
          position: 'absolute',
          top: -100,
          left: 400,
          width: 400,
          height: 300,
          background: 'linear-gradient(180deg, #ff4d0066 0%, #33110033 50%, #00000000 100%)',
          borderRadius: 200,
        }}
      />

      {/* Grid lines - horizontal */}
      <div
        style={{
          position: 'absolute',
          top: 80,
          left: 0,
          right: 0,
          height: 1,
          background: '#1a0800',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 160,
          left: 0,
          right: 0,
          height: 1,
          background: '#1a0800',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 470,
          left: 0,
          right: 0,
          height: 1,
          background: '#1a0800',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 550,
          left: 0,
          right: 0,
          height: 1,
          background: '#1a0800',
        }}
      />

      {/* Grid lines - vertical */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 200,
          width: 1,
          background: '#1a0800',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 400,
          width: 1,
          background: '#1a0800',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 800,
          width: 1,
          background: '#1a0800',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 1000,
          width: 1,
          background: '#1a0800',
        }}
      />

      {/* Falling particles */}
      <div
        style={{
          position: 'absolute',
          left: 250,
          top: 100,
          width: 10,
          height: 10,
          borderRadius: 5,
          background: '#ff4d00',
          boxShadow: '0 0 15px #ff4d00',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 500,
          top: 80,
          width: 14,
          height: 14,
          borderRadius: 7,
          background: '#ff4d00',
          boxShadow: '0 0 15px #ff4d00',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 700,
          top: 120,
          width: 8,
          height: 8,
          borderRadius: 4,
          background: '#ff4d00',
          boxShadow: '0 0 15px #ff4d00',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 900,
          top: 90,
          width: 12,
          height: 12,
          borderRadius: 6,
          background: '#ff4d00',
          boxShadow: '0 0 15px #ff4d00',
        }}
      />

      {/* Containment paddle at bottom */}
      <div
        style={{
          position: 'absolute',
          bottom: 60,
          left: 500,
          width: 200,
          height: 12,
          background: '#ff4d00',
          boxShadow: '0 0 20px #ff4d00',
        }}
      />
    </div>
  );
}

/**
 * RAIN-specific decorations: falling drops.
 * Note: Satori (next/og) has limited support for fragments and some CSS.
 * Using explicit wrapper div and simplified styles.
 */
export function RainDecorations() {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
      }}
    >
      {/* Ambient glow at bottom */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 200,
          background: 'linear-gradient(180deg, #0f172a00 0%, #22d3ee26 100%)',
        }}
      />

      {/* Decorative drops - using fixed positions like BEAM does */}
      <div
        style={{
          position: 'absolute',
          left: 200,
          top: 120,
          width: 20,
          height: 28,
          borderRadius: 14,
          background: '#fbbf24',
          opacity: 0.5,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 400,
          top: 80,
          width: 20,
          height: 28,
          borderRadius: 14,
          background: '#f472b6',
          opacity: 0.5,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 800,
          top: 150,
          width: 20,
          height: 28,
          borderRadius: 14,
          background: '#fbbf24',
          opacity: 0.5,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 1000,
          top: 100,
          width: 20,
          height: 28,
          borderRadius: 14,
          background: '#f472b6',
          opacity: 0.5,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 150,
          top: 480,
          width: 20,
          height: 28,
          borderRadius: 14,
          background: '#fbbf24',
          opacity: 0.5,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 1050,
          top: 500,
          width: 20,
          height: 28,
          borderRadius: 14,
          background: '#f472b6',
          opacity: 0.5,
        }}
      />
    </div>
  );
}
