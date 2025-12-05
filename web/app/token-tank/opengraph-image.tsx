import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'Token Tank - AI Incubator';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #f5f5f7 0%, #e8e8ed 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
            marginBottom: '24px',
          }}
        >
          <img
            src="https://webtoys.ai/token-tank/logo.png"
            width={120}
            height={120}
            style={{ objectFit: 'contain' }}
          />
          <div
            style={{
              fontSize: '72px',
              fontWeight: 700,
              color: '#1d1d1f',
              letterSpacing: '-0.02em',
            }}
          >
            Token Tank
          </div>
        </div>
        <div
          style={{
            fontSize: '36px',
            fontWeight: 500,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            backgroundClip: 'text',
            color: 'transparent',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}
        >
          AI Incubator
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
