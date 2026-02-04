import { ImageResponse } from 'next/og';
import { OG_SIZE } from '@/app/pixelpit/components';

export const runtime = 'edge';
export const alt = 'BAT DASH Score - Pixelpit Arcade';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image({ params }: { params: { score: string } }) {
  const score = params.score;

  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(180deg, #0f172a 0%, #020617 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          fontFamily: 'ui-monospace, monospace',
        }}
      >
        {/* Moon (solid color - Satori safe) */}
        <div
          style={{
            position: 'absolute',
            top: 40,
            right: 80,
            width: 60,
            height: 60,
            background: '#fef9c3',
            borderRadius: 30,
            boxShadow: '0 0 40px #fef9c380',
          }}
        />

        {/* Buildings silhouette */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 150,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            gap: 15,
          }}
        >
          {[80, 120, 90, 140, 100, 85, 130, 95, 110, 75, 125].map((h, i) => (
            <div
              key={i}
              style={{
                width: 60,
                height: h,
                background: '#1e293b',
                borderRadius: '4px 4px 0 0',
              }}
            />
          ))}
        </div>

        {/* Game name */}
        <div
          style={{
            fontSize: 36,
            fontWeight: 700,
            color: '#fef08a',
            letterSpacing: 6,
            marginBottom: 20,
            textShadow: '0 0 30px rgba(254,240,138,0.4)',
          }}
        >
          BAT DASH
        </div>

        {/* Score */}
        <div
          style={{
            fontSize: 140,
            fontWeight: 200,
            color: '#fef08a',
            textShadow: '0 0 60px rgba(254,240,138,0.5)',
            lineHeight: 1,
          }}
        >
          {score}
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 24,
            color: '#a855f7',
            letterSpacing: 4,
            marginTop: 20,
          }}
        >
          CAN YOU BEAT ME?
        </div>

        {/* Pixelpit branding */}
        <div
          style={{
            position: 'absolute',
            bottom: 170,
            fontSize: 14,
            letterSpacing: 3,
            display: 'flex',
          }}
        >
          <span style={{ color: '#fef08a' }}>pixel</span>
          <span style={{ color: '#a855f7' }}>pit</span>
          <span style={{ color: '#f8fafc', opacity: 0.6, marginLeft: 4 }}>.gg</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
