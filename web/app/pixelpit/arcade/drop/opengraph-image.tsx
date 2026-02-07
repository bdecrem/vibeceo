import { ImageResponse } from 'next/og';
import { OG_SIZE, CornerAccents, PixelpitBranding } from '@/app/pixelpit/components';

export const runtime = 'edge';
export const alt = 'DROP - Pixelpit Arcade';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(180deg, #5BA3D9 0%, #87CEEB 30%, #4A8DB7 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          fontFamily: 'system-ui, sans-serif',
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
            background: 'linear-gradient(180deg, #ffffff15 0%, #ffffff08 100%)',
          }}
        />

        {/* Platform rings — stacked colored arcs suggesting the helix tower */}
        <div
          style={{
            position: 'absolute',
            top: 60,
            left: 340,
            width: 520,
            height: 28,
            background: '#FF6B6B',
            borderRadius: 14,
            boxShadow: '0 4px 20px #FF6B6B80',
          }}
        />
        {/* Gap in first platform */}
        <div
          style={{
            position: 'absolute',
            top: 60,
            left: 540,
            width: 80,
            height: 28,
            background: '#5BA3D9',
          }}
        />

        <div
          style={{
            position: 'absolute',
            top: 130,
            left: 320,
            width: 560,
            height: 28,
            background: '#FFA94D',
            borderRadius: 14,
            boxShadow: '0 4px 20px #FFA94D80',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 130,
            left: 680,
            width: 90,
            height: 28,
            background: '#6DB3DE',
          }}
        />

        {/* Storm zone — dark slab with red glow */}
        <div
          style={{
            position: 'absolute',
            top: 200,
            left: 360,
            width: 480,
            height: 28,
            background: '#FFD43B',
            borderRadius: 14,
            boxShadow: '0 4px 20px #FFD43B80',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 200,
            left: 440,
            width: 120,
            height: 28,
            background: '#1a0a0a',
            borderRadius: 6,
            boxShadow: '0 0 30px #CC110080',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 200,
            left: 600,
            width: 70,
            height: 28,
            background: '#7ABED4',
          }}
        />

        <div
          style={{
            position: 'absolute',
            top: 420,
            left: 350,
            width: 500,
            height: 28,
            background: '#69DB7C',
            borderRadius: 14,
            boxShadow: '0 4px 20px #69DB7C80',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 420,
            left: 500,
            width: 80,
            height: 28,
            background: '#4A8DB7',
          }}
        />

        <div
          style={{
            position: 'absolute',
            top: 490,
            left: 330,
            width: 540,
            height: 28,
            background: '#CC5DE8',
            borderRadius: 14,
            boxShadow: '0 4px 20px #CC5DE880',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 490,
            left: 710,
            width: 85,
            height: 28,
            background: '#4A8DB7',
          }}
        />

        {/* Ball — red with glow */}
        <div
          style={{
            position: 'absolute',
            top: 278,
            left: 580,
            width: 44,
            height: 44,
            borderRadius: 22,
            background: '#FF2244',
            boxShadow: '0 0 30px #FF224480, 0 0 60px #FF224440, 0 4px 8px #00000040',
          }}
        />

        {/* Fireball powerup arc — gold shimmer */}
        <div
          style={{
            position: 'absolute',
            top: 420,
            left: 700,
            width: 60,
            height: 28,
            background: '#FFD700',
            borderRadius: 14,
            boxShadow: '0 0 25px #FFD700',
          }}
        />

        {/* Motion trail lines behind ball */}
        <div
          style={{
            position: 'absolute',
            top: 260,
            left: 594,
            width: 16,
            height: 3,
            background: '#FF224460',
            borderRadius: 2,
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 268,
            left: 596,
            width: 12,
            height: 3,
            background: '#FF224440',
            borderRadius: 2,
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 252,
            left: 592,
            width: 20,
            height: 3,
            background: '#FF224430',
            borderRadius: 2,
          }}
        />

        {/* Title */}
        <div
          style={{
            fontSize: 120,
            fontWeight: 900,
            color: '#ffffff',
            letterSpacing: 8,
            textShadow: '0 6px 0 #00000020, 0 0 60px #ffffff40',
            position: 'relative',
            marginBottom: 12,
          }}
        >
          DROP
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 26,
            color: '#FFD43B',
            letterSpacing: 6,
            fontWeight: 800,
            position: 'relative',
          }}
        >
          60 SECONDS. FALL FAST.
        </div>

        <CornerAccents color="#FF2244" />
        <PixelpitBranding color="#ffffff80" />
      </div>
    ),
    { ...size }
  );
}
