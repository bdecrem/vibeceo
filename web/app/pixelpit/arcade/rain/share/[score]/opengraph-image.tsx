import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'RAIN Score - Pixelpit Arcade';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: { score: string } }) {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#0f172a',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ fontSize: 48, color: '#22d3ee', marginBottom: 20 }}>
          RAIN
        </div>
        <div style={{ fontSize: 180, fontWeight: 700, color: '#fbbf24' }}>
          {params.score}
        </div>
        <div style={{ fontSize: 28, color: '#f472b6', marginTop: 20 }}>
          CAN YOU CATCH MORE?
        </div>
        <div style={{ position: 'absolute', bottom: 30, fontSize: 18, color: '#94a3b8' }}>
          PIXELPIT ARCADE
        </div>
      </div>
    ),
    { ...size }
  );
}
