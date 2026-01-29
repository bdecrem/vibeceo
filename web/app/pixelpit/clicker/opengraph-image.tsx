import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'CLICKER - Pixelpit Arcade';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
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
          position: 'relative',
        }}
      >
        {/* Grid Background */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'linear-gradient(#ec489920 1px, transparent 1px), linear-gradient(90deg, #ec489920 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        {/* Corner Accents */}
        <div style={{ position: 'absolute', top: 40, left: 40, display: 'flex', flexDirection: 'column' }}>
          <div style={{ width: 40, height: 4, background: '#ec4899' }} />
          <div style={{ width: 4, height: 40, background: '#ec4899' }} />
        </div>
        <div style={{ position: 'absolute', top: 40, right: 40, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <div style={{ width: 40, height: 4, background: '#ec4899' }} />
          <div style={{ width: 4, height: 40, background: '#ec4899' }} />
        </div>
        <div style={{ position: 'absolute', bottom: 40, left: 40, display: 'flex', flexDirection: 'column' }}>
          <div style={{ width: 4, height: 40, background: '#ec4899' }} />
          <div style={{ width: 40, height: 4, background: '#ec4899' }} />
        </div>
        <div style={{ position: 'absolute', bottom: 40, right: 40, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <div style={{ width: 4, height: 40, background: '#ec4899' }} />
          <div style={{ width: 40, height: 4, background: '#ec4899' }} />
        </div>

        {/* Main Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: 96,
              fontWeight: 400,
              color: '#ec4899',
              fontFamily: 'ui-monospace, monospace',
              textShadow: '4px 4px 0px rgba(0,0,0,0.8)',
              marginBottom: 20,
            }}
          >
            CLICKER
          </div>
          <div
            style={{
              fontSize: 24,
              color: '#94a3b8',
              fontFamily: 'ui-monospace, monospace',
              textTransform: 'uppercase',
              letterSpacing: '4px',
              marginBottom: 40,
            }}
          >
            TAP ANYWHERE • NUMBER GOES UP
          </div>

          {/* Click Counter Visual */}
          <div
            style={{
              fontSize: 72,
              fontFamily: 'ui-monospace, monospace',
              color: '#22d3ee',
              textShadow: '4px 4px 0px rgba(0,0,0,0.8)',
              border: '4px solid #22d3ee',
              padding: '20px 40px',
              background: '#1e293b',
              boxShadow: '4px 4px 0px 0px rgba(0,0,0,0.8)',
            }}
          >
            000000
          </div>
        </div>

        {/* Bottom Branding */}
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            display: 'flex',
            alignItems: 'center',
            fontSize: 20,
            fontFamily: 'ui-monospace, monospace',
            letterSpacing: '3px',
          }}
        >
          <span style={{ color: '#ec4899' }}>PIXEL</span>
          <span style={{ color: '#22d3ee' }}>PIT</span>
          <span style={{ color: '#94a3b8', marginLeft: 20 }}>ARCADE</span>
        </div>
      </div>
    ),
    { ...size }
  );
}