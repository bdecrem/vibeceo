import { ImageResponse } from 'next/og';
import { OG_SIZE, CornerAccents, PixelpitBranding } from '@/app/pixelpit/components';

export const runtime = 'edge';
export const alt = 'THREADS - Pixelpit Arcade';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div style={{
        background: '#0f172a',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}>
        <CornerAccents color="#fbbf24" />

        {/* Faint 4x4 grid in background */}
        <div style={{
          position: 'absolute',
          display: 'flex',
          flexWrap: 'wrap',
          width: 480,
          height: 300,
          gap: 8,
          opacity: 0.08,
        }}>
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} style={{
              width: 112,
              height: 68,
              background: '#f8fafc',
              borderRadius: 10,
            }} />
          ))}
        </div>

        {/* Level color pips */}
        <div style={{
          display: 'flex',
          gap: 12,
          marginBottom: 24,
        }}>
          {['#22d3ee', '#22c55e', '#fbbf24', '#fb923c', '#ef4444'].map((color, i) => (
            <div key={i} style={{
              width: 16,
              height: 16,
              borderRadius: 4,
              background: color,
            }} />
          ))}
        </div>

        {/* Title */}
        <div style={{
          fontSize: 120,
          fontWeight: 900,
          color: '#fbbf24',
          letterSpacing: 16,
          textShadow: '0 0 60px #fbbf2440',
        }}>
          THREADS
        </div>

        {/* Subtitle */}
        <div style={{
          fontSize: 24,
          color: '#22d3ee',
          letterSpacing: 8,
          fontWeight: 600,
          marginTop: 8,
        }}>
          FIND THE FOUR GROUPS
        </div>

        <PixelpitBranding color="#64748b" />
      </div>
    ),
    { ...size }
  );
}
