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
 * EMOJI BLASTER-specific decorations: floating circles and emojis.
 * Bright, playful aesthetic with cream/pink gradient.
 */
export function EmojiDecorations() {
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
      {/* Floating circles background */}
      <div
        style={{
          position: 'absolute',
          top: 60,
          left: 100,
          width: 120,
          height: 120,
          borderRadius: 60,
          background: '#ec489930',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 200,
          right: 150,
          width: 80,
          height: 80,
          borderRadius: 40,
          background: '#06b6d430',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 100,
          left: 200,
          width: 100,
          height: 100,
          borderRadius: 50,
          background: '#facc1530',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 150,
          right: 100,
          width: 140,
          height: 140,
          borderRadius: 70,
          background: '#a855f730',
        }}
      />

      {/* Emoji decorations */}
      <div
        style={{
          position: 'absolute',
          top: 80,
          left: 150,
          fontSize: 70,
        }}
      >
        😀
      </div>
      <div
        style={{
          position: 'absolute',
          top: 120,
          right: 180,
          fontSize: 55,
        }}
      >
        🎯
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 120,
          left: 180,
          fontSize: 60,
        }}
      >
        ⭐
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 100,
          right: 150,
          fontSize: 55,
        }}
      >
        💀
      </div>
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

/**
 * CAT TOWER-specific decorations: stacked cat boxes.
 * Colorful tower aesthetic with cat silhouettes.
 */
export function CatTowerDecorations() {
  const catColors = ['#FF6B6B', '#FFB347', '#FFE66D', '#7BED9F', '#70A1FF', '#9B59B6', '#FF85C0'];

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
      {/* Left tower stack */}
      <div
        style={{
          position: 'absolute',
          left: 80,
          bottom: 80,
          display: 'flex',
          flexDirection: 'column-reverse',
          alignItems: 'center',
          gap: 4,
        }}
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              width: 100 - i * 8,
              height: 30,
              background: catColors[i % catColors.length],
              borderRadius: 8,
              opacity: 0.4,
            }}
          />
        ))}
      </div>

      {/* Right tower stack */}
      <div
        style={{
          position: 'absolute',
          right: 80,
          bottom: 80,
          display: 'flex',
          flexDirection: 'column-reverse',
          alignItems: 'center',
          gap: 4,
        }}
      >
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            style={{
              width: 90 - i * 6,
              height: 30,
              background: catColors[(i + 3) % catColors.length],
              borderRadius: 8,
              opacity: 0.4,
            }}
          />
        ))}
      </div>

      {/* Floating cat face decorations */}
      <div
        style={{
          position: 'absolute',
          top: 80,
          left: 200,
          fontSize: 50,
          opacity: 0.3,
        }}
      >
        🐱
      </div>
      <div
        style={{
          position: 'absolute',
          top: 120,
          right: 220,
          fontSize: 40,
          opacity: 0.3,
        }}
      >
        😺
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 160,
          left: 300,
          fontSize: 35,
          opacity: 0.25,
        }}
      >
        😸
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 200,
          right: 280,
          fontSize: 45,
          opacity: 0.25,
        }}
      >
        🐈
      </div>
    </div>
  );
}

/**
 * SPROUT RUN-specific decorations: hills, sun, grass, sprout.
 * Warm nature aesthetic with parallax hills.
 */
export function SproutRunDecorations() {
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
      {/* Sun with glow */}
      <div
        style={{
          position: 'absolute',
          top: 40,
          right: 150,
          width: 100,
          height: 100,
          borderRadius: 50,
          background: '#fbbf24',
          boxShadow: '0 0 60px #fde047, 0 0 100px #fef08a',
        }}
      />

      {/* Far hills */}
      <div
        style={{
          position: 'absolute',
          bottom: 100,
          left: 0,
          right: 0,
          height: 120,
          background: '#bbf7d0',
          borderRadius: '100px 100px 0 0',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 100,
          left: -100,
          width: 500,
          height: 150,
          background: '#bbf7d0',
          borderRadius: '250px 250px 0 0',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 100,
          right: -50,
          width: 400,
          height: 130,
          background: '#bbf7d0',
          borderRadius: '200px 200px 0 0',
        }}
      />

      {/* Mid hills */}
      <div
        style={{
          position: 'absolute',
          bottom: 80,
          left: 100,
          width: 600,
          height: 100,
          background: '#86efac',
          borderRadius: '300px 300px 0 0',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 80,
          right: 50,
          width: 500,
          height: 90,
          background: '#86efac',
          borderRadius: '250px 250px 0 0',
        }}
      />

      {/* Near hills */}
      <div
        style={{
          position: 'absolute',
          bottom: 60,
          left: -50,
          width: 700,
          height: 80,
          background: '#4ade80',
          borderRadius: '350px 350px 0 0',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 60,
          right: -100,
          width: 600,
          height: 70,
          background: '#4ade80',
          borderRadius: '300px 300px 0 0',
        }}
      />

      {/* Ground */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 70,
          background: '#92400e',
        }}
      />

      {/* Grass stripe */}
      <div
        style={{
          position: 'absolute',
          bottom: 60,
          left: 0,
          right: 0,
          height: 20,
          background: '#22c55e',
        }}
      />

      {/* Sprout character on left */}
      <div
        style={{
          position: 'absolute',
          bottom: 80,
          left: 150,
          width: 60,
          height: 60,
          background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
          borderRadius: 30,
          border: '4px solid #15803d',
          boxShadow: '0 4px 20px rgba(34,197,94,0.4)',
        }}
      />

      {/* Sundrop collectible */}
      <div
        style={{
          position: 'absolute',
          top: 200,
          left: 350,
          width: 30,
          height: 30,
          borderRadius: 15,
          background: '#fbbf24',
          boxShadow: '0 0 20px #fde047',
        }}
      />

      {/* Rock obstacle */}
      <div
        style={{
          position: 'absolute',
          bottom: 80,
          right: 200,
          width: 50,
          height: 40,
          background: '#78716c',
          borderRadius: '25px 25px 8px 8px',
          border: '3px solid #57534e',
        }}
      />

      {/* Flying birds */}
      <div
        style={{
          position: 'absolute',
          top: 100,
          left: 300,
          fontSize: 24,
          opacity: 0.4,
        }}
      >
        🐦
      </div>
      <div
        style={{
          position: 'absolute',
          top: 140,
          left: 380,
          fontSize: 18,
          opacity: 0.3,
        }}
      >
        🐦
      </div>
      <div
        style={{
          position: 'absolute',
          top: 80,
          right: 350,
          fontSize: 20,
          opacity: 0.35,
        }}
      >
        🐦
      </div>
    </div>
  );
}

/**
 * FLIP-specific decorations: tunnel walls, spikes, player.
 * INDIE BITE aesthetic with cyan glow.
 * Note: Using simple rectangles instead of triangles (Satori border-triangle support is limited)
 */
export function FlipDecorations() {
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
      {/* Tunnel walls */}
      <div
        style={{
          position: 'absolute',
          top: 100,
          left: 0,
          right: 0,
          height: 3,
          background: '#27272a',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 100,
          left: 0,
          right: 0,
          height: 3,
          background: '#27272a',
        }}
      />

      {/* Ceiling spikes (simplified as rectangles) */}
      <div
        style={{
          position: 'absolute',
          top: 103,
          left: 150,
          width: 8,
          height: 40,
          background: '#ef4444',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 103,
          left: 450,
          width: 10,
          height: 50,
          background: '#ef4444',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 103,
          right: 250,
          width: 8,
          height: 35,
          background: '#ef4444',
        }}
      />

      {/* Floor spikes (simplified as rectangles) */}
      <div
        style={{
          position: 'absolute',
          bottom: 103,
          left: 300,
          width: 8,
          height: 45,
          background: '#ef4444',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 103,
          right: 180,
          width: 10,
          height: 50,
          background: '#ef4444',
        }}
      />

      {/* Player silhouette */}
      <div
        style={{
          position: 'absolute',
          top: 240,
          left: 200,
          width: 25,
          height: 25,
          background: '#22d3ee40',
          boxShadow: '0 0 20px #22d3ee40',
        }}
      />
    </div>
  );
}

/**
 * CAVE MOTH decorations: crystal cave walls, stalactites/stalagmites, moth silhouette.
 * Amethyst + seafoam bioluminescent aesthetic.
 */
export function CaveMothDecorations() {
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
      {/* Cave walls */}
      <div
        style={{
          position: 'absolute',
          top: 100,
          left: 0,
          right: 0,
          height: 3,
          background: '#2d1b4e',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 100,
          left: 0,
          right: 0,
          height: 3,
          background: '#2d1b4e',
        }}
      />

      {/* Ceiling stalactites (amethyst) */}
      <div style={{ position: 'absolute', top: 103, left: 150, width: 8, height: 40, background: '#9b59b6' }} />
      <div style={{ position: 'absolute', top: 103, left: 450, width: 10, height: 50, background: '#9b59b6' }} />
      <div style={{ position: 'absolute', top: 103, right: 250, width: 8, height: 35, background: '#9b59b6' }} />

      {/* Floor stalagmites (amethyst) */}
      <div style={{ position: 'absolute', bottom: 103, left: 300, width: 8, height: 45, background: '#9b59b6' }} />
      <div style={{ position: 'absolute', bottom: 103, right: 180, width: 10, height: 50, background: '#9b59b6' }} />

      {/* Ambient sparkles */}
      <div style={{ position: 'absolute', top: 180, left: 250, width: 4, height: 4, borderRadius: 2, background: '#c6f68d60' }} />
      <div style={{ position: 'absolute', top: 320, left: 700, width: 3, height: 3, borderRadius: 2, background: '#c6f68d40' }} />

      {/* Moth silhouette */}
      <div
        style={{
          position: 'absolute',
          top: 240,
          left: 200,
          width: 12,
          height: 18,
          borderRadius: 6,
          background: '#4ecdc440',
          boxShadow: '0 0 20px #4ecdc440',
        }}
      />
    </div>
  );
}

/**
 * FLAPPY-specific decorations: pipes, clouds, bird silhouette.
 * Classic sky blue with green pipes.
 */
export function FlappyDecorations() {
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
      {/* Clouds */}
      <div
        style={{
          position: 'absolute',
          top: 50,
          left: 80,
          width: 140,
          height: 50,
          background: '#ffffff60',
          borderRadius: 25,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 40,
          left: 110,
          width: 80,
          height: 60,
          background: '#ffffff60',
          borderRadius: 30,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 70,
          right: 120,
          width: 120,
          height: 40,
          background: '#ffffff60',
          borderRadius: 20,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 60,
          right: 140,
          width: 70,
          height: 55,
          background: '#ffffff60',
          borderRadius: 28,
        }}
      />

      {/* Left pipe - top */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 120,
          width: 50,
          height: 160,
          background: '#73bf2e',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 140,
          left: 115,
          width: 60,
          height: 22,
          background: '#5aa020',
          borderRadius: 3,
        }}
      />
      {/* Left pipe - bottom */}
      <div
        style={{
          position: 'absolute',
          bottom: 60,
          left: 120,
          width: 50,
          height: 150,
          background: '#73bf2e',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 188,
          left: 115,
          width: 60,
          height: 22,
          background: '#5aa020',
          borderRadius: 3,
        }}
      />

      {/* Right pipe - top */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 120,
          width: 50,
          height: 120,
          background: '#73bf2e',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 100,
          right: 115,
          width: 60,
          height: 22,
          background: '#5aa020',
          borderRadius: 3,
        }}
      />
      {/* Right pipe - bottom */}
      <div
        style={{
          position: 'absolute',
          bottom: 60,
          right: 120,
          width: 50,
          height: 190,
          background: '#73bf2e',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 228,
          right: 115,
          width: 60,
          height: 22,
          background: '#5aa020',
          borderRadius: 3,
        }}
      />

      {/* Ground */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 60,
          background: '#ded895',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 52,
          left: 0,
          right: 0,
          height: 8,
          background: '#c9b77c',
        }}
      />

      {/* Bird silhouette */}
      <div
        style={{
          position: 'absolute',
          top: 180,
          left: 280,
          width: 50,
          height: 50,
          background: '#f7dc6f80',
          borderRadius: 25,
        }}
      />
    </div>
  );
}

/**
 * CATCH-specific decorations: shadow pools, falling coins, player.
 * Light kills, shadows heal. The coins are a trap.
 */
export function CatchDecorations() {
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
      {/* Shadow safe zones (dark pools) */}
      <div
        style={{
          position: 'absolute',
          left: 120,
          top: 200,
          width: 160,
          height: 160,
          borderRadius: 80,
          background: 'linear-gradient(180deg, #00000080 0%, #00000040 70%, #00000000 100%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          right: 150,
          top: 280,
          width: 140,
          height: 140,
          borderRadius: 70,
          background: 'linear-gradient(180deg, #00000080 0%, #00000040 70%, #00000000 100%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 450,
          bottom: 150,
          width: 180,
          height: 180,
          borderRadius: 90,
          background: 'linear-gradient(180deg, #00000080 0%, #00000040 70%, #00000000 100%)',
        }}
      />

      {/* Falling coins (the trap) */}
      <div
        style={{
          position: 'absolute',
          left: 200,
          top: 80,
          width: 30,
          height: 30,
          borderRadius: 15,
          background: '#fbbf24',
          boxShadow: '0 0 20px #fbbf24',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 500,
          top: 120,
          width: 26,
          height: 26,
          borderRadius: 13,
          background: '#fbbf24',
          boxShadow: '0 0 18px #fbbf24',
        }}
      />
      <div
        style={{
          position: 'absolute',
          right: 200,
          top: 60,
          width: 28,
          height: 28,
          borderRadius: 14,
          background: '#fbbf24',
          boxShadow: '0 0 20px #fbbf24',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 350,
          top: 180,
          width: 24,
          height: 24,
          borderRadius: 12,
          background: '#fbbf24',
          boxShadow: '0 0 16px #fbbf24',
        }}
      />
      <div
        style={{
          position: 'absolute',
          right: 350,
          top: 140,
          width: 32,
          height: 32,
          borderRadius: 16,
          background: '#fbbf24',
          boxShadow: '0 0 22px #fbbf24',
        }}
      />

      {/* Player (cyan, in shadow) */}
      <div
        style={{
          position: 'absolute',
          left: 180,
          top: 260,
          width: 30,
          height: 30,
          borderRadius: 15,
          background: '#22d3ee',
          boxShadow: '0 0 25px #22d3ee40',
        }}
      />

      {/* Brightness gradient overlay (danger zone at top) */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 100,
          background: 'linear-gradient(180deg, #ffffff15 0%, #ffffff00 100%)',
        }}
      />
    </div>
  );
}

/**
 * TAP BEATS-specific decorations: falling notes, lane lines, neon arcade.
 * DDR-inspired aesthetic with cyan/pink/gold lanes.
 */
export function TapBeatsDecorations() {
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
      {/* Lane dividers */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 400,
          width: 2,
          background: '#ffffff20',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 800,
          width: 2,
          background: '#ffffff20',
        }}
      />

      {/* Hit zone circles */}
      <div
        style={{
          position: 'absolute',
          bottom: 80,
          left: 200,
          width: 70,
          height: 70,
          borderRadius: 35,
          border: '3px solid #22d3ee',
          background: '#22d3ee30',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 80,
          left: 565,
          width: 70,
          height: 70,
          borderRadius: 35,
          border: '3px solid #ec4899',
          background: '#ec489930',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 80,
          left: 930,
          width: 70,
          height: 70,
          borderRadius: 35,
          border: '3px solid #facc15',
          background: '#facc1530',
        }}
      />

      {/* Falling notes - cyan lane */}
      <div
        style={{
          position: 'absolute',
          top: 100,
          left: 218,
          width: 36,
          height: 36,
          borderRadius: 18,
          background: '#22d3ee',
          boxShadow: '0 0 20px #22d3ee',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 280,
          left: 218,
          width: 36,
          height: 36,
          borderRadius: 18,
          background: '#22d3ee',
          boxShadow: '0 0 20px #22d3ee',
        }}
      />

      {/* Falling notes - pink lane */}
      <div
        style={{
          position: 'absolute',
          top: 60,
          left: 582,
          width: 36,
          height: 36,
          borderRadius: 18,
          background: '#ec4899',
          boxShadow: '0 0 20px #ec4899',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 200,
          left: 582,
          width: 36,
          height: 36,
          borderRadius: 18,
          background: '#ec4899',
          boxShadow: '0 0 20px #ec4899',
        }}
      />

      {/* Falling notes - gold lane */}
      <div
        style={{
          position: 'absolute',
          top: 140,
          left: 948,
          width: 36,
          height: 36,
          borderRadius: 18,
          background: '#facc15',
          boxShadow: '0 0 20px #facc15',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 320,
          left: 948,
          width: 36,
          height: 36,
          borderRadius: 18,
          background: '#facc15',
          boxShadow: '0 0 20px #facc15',
        }}
      />

      {/* "PERFECT" text decorations */}
      <div
        style={{
          position: 'absolute',
          bottom: 180,
          left: 120,
          fontSize: 16,
          fontWeight: 700,
          color: '#a3e635',
          letterSpacing: 2,
          opacity: 0.4,
        }}
      >
        PERFECT
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 200,
          right: 140,
          fontSize: 16,
          fontWeight: 700,
          color: '#a3e635',
          letterSpacing: 2,
          opacity: 0.4,
        }}
      >
        PERFECT
      </div>
    </div>
  );
}

/**
 * DROP-specific decorations: helix tower platforms, ball, storm zones.
 * Nintendo-bright aesthetic over sky blue gradient.
 */
export function DropDecorations() {
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
      {/* Central tower beam */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 575,
          width: 50,
          height: 630,
          background: '#ffffff10',
        }}
      />

      {/* Platform arcs — colorful rings with gaps */}
      <div
        style={{
          position: 'absolute',
          top: 50,
          left: 300,
          width: 600,
          height: 24,
          background: '#FF6B6B',
          borderRadius: 12,
          opacity: 0.4,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 50,
          left: 520,
          width: 80,
          height: 24,
          background: '#5BA3D9',
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: 120,
          left: 280,
          width: 640,
          height: 24,
          background: '#FFA94D',
          borderRadius: 12,
          opacity: 0.4,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 120,
          left: 680,
          width: 90,
          height: 24,
          background: '#5BA3D9',
        }}
      />

      {/* Storm zone */}
      <div
        style={{
          position: 'absolute',
          top: 120,
          left: 380,
          width: 100,
          height: 24,
          background: '#1a0808',
          borderRadius: 6,
          boxShadow: '0 0 20px #CC110060',
        }}
      />

      <div
        style={{
          position: 'absolute',
          bottom: 120,
          left: 310,
          width: 580,
          height: 24,
          background: '#69DB7C',
          borderRadius: 12,
          opacity: 0.4,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 120,
          left: 500,
          width: 80,
          height: 24,
          background: '#4A8DB7',
        }}
      />

      <div
        style={{
          position: 'absolute',
          bottom: 60,
          left: 290,
          width: 620,
          height: 24,
          background: '#CC5DE8',
          borderRadius: 12,
          opacity: 0.4,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 60,
          left: 720,
          width: 85,
          height: 24,
          background: '#4A8DB7',
        }}
      />

      {/* Fireball powerup glow */}
      <div
        style={{
          position: 'absolute',
          bottom: 120,
          left: 700,
          width: 50,
          height: 24,
          background: '#FFD700',
          borderRadius: 12,
          boxShadow: '0 0 20px #FFD700',
          opacity: 0.6,
        }}
      />

      {/* Ball — red with glow */}
      <div
        style={{
          position: 'absolute',
          top: 170,
          left: 582,
          width: 36,
          height: 36,
          borderRadius: 18,
          background: '#FF2244',
          boxShadow: '0 0 25px #FF224480, 0 0 50px #FF224430',
        }}
      />

      {/* Speed lines */}
      <div style={{ position: 'absolute', top: 155, left: 594, width: 12, height: 2, background: '#FF224450', borderRadius: 1 }} />
      <div style={{ position: 'absolute', top: 148, left: 596, width: 8, height: 2, background: '#FF224430', borderRadius: 1 }} />
    </div>
  );
}
