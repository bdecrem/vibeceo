import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'SLINGSHOT - Pixelpit Arcade';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div style={{
        background: '#0a0a0a',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}>
        {/* Target circles */}
        <div style={{
          position: 'absolute',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{
            width: 300,
            height: 300,
            borderRadius: 9999,
            border: '3px solid #2D959680',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <div style={{
              width: 200,
              height: 200,
              borderRadius: 9999,
              border: '2px solid #FFD70060',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <div style={{
                width: 80,
                height: 80,
                borderRadius: 9999,
                background: '#ec489940',
              }} />
            </div>
          </div>
        </div>

        {/* Title */}
        <div style={{
          fontSize: 140,
          fontWeight: 700,
          color: '#FFD700',
          letterSpacing: 20,
          textShadow: '0 0 40px #FFD70060',
          zIndex: 1,
        }}>
          SLINGSHOT
        </div>

        {/* Subtitle */}
        <div style={{
          fontSize: 28,
          color: '#2D9596',
          letterSpacing: 8,
          marginTop: 12,
          zIndex: 1,
        }}>
          HOLD · CHARGE · RELEASE
        </div>

        {/* Branding */}
        <div style={{
          position: 'absolute',
          bottom: 40,
          fontSize: 24,
          color: '#ffffff60',
          letterSpacing: 6,
        }}>
          PIXELPIT ARCADE
        </div>

        {/* Corner accents */}
        <div style={{ position: 'absolute', top: 30, left: 30, width: 40, height: 40, borderTop: '2px solid #FFD70040', borderLeft: '2px solid #FFD70040' }} />
        <div style={{ position: 'absolute', top: 30, right: 30, width: 40, height: 40, borderTop: '2px solid #FFD70040', borderRight: '2px solid #FFD70040' }} />
        <div style={{ position: 'absolute', bottom: 30, left: 30, width: 40, height: 40, borderBottom: '2px solid #FFD70040', borderLeft: '2px solid #FFD70040' }} />
        <div style={{ position: 'absolute', bottom: 30, right: 30, width: 40, height: 40, borderBottom: '2px solid #FFD70040', borderRight: '2px solid #FFD70040' }} />
      </div>
    ),
    { ...size }
  );
}
