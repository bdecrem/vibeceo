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
 * RAIN-specific decorations: falling drops.
 */
export function RainDecorations() {
  // Positions for decorative drops
  const drops = [
    { x: 200, y: 120 },
    { x: 400, y: 80 },
    { x: 800, y: 150 },
    { x: 1000, y: 100 },
    { x: 150, y: 480 },
    { x: 350, y: 520 },
    { x: 850, y: 460 },
    { x: 1050, y: 500 },
  ];

  return (
    <>
      {/* Ambient gradient */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 200,
          background: 'linear-gradient(transparent, rgba(34, 211, 238, 0.15))',
        }}
      />

      {/* Decorative drops */}
      {drops.map((drop, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: drop.x,
            top: drop.y,
            width: 20,
            height: 28,
            borderRadius: '50%',
            background: `radial-gradient(circle at 30% 30%, #fbbf24, #f472b6)`,
            boxShadow: '0 0 20px rgba(244, 114, 182, 0.5)',
            opacity: 0.6,
          }}
        />
      ))}
    </>
  );
}
