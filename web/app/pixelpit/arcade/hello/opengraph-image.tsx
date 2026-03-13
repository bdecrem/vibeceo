import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'HELLO - Pixelpit Arcade';
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
        {/* Wave decorations */}
        <div style={{
          position: 'absolute',
          display: 'flex',
          top: 80,
          left: 100,
          width: 60,
          height: 60,
          borderRadius: 9999,
          background: '#2D959640',
          border: '3px solid #2D9596',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 28,
        }}>
          W
        </div>
        <div style={{
          position: 'absolute',
          display: 'flex',
          top: 200,
          right: 150,
          width: 50,
          height: 50,
          borderRadius: 9999,
          background: '#D4A57440',
          border: '3px solid #D4A574',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 24,
        }}>
          W
        </div>
        <div style={{
          position: 'absolute',
          display: 'flex',
          bottom: 150,
          left: 200,
          width: 45,
          height: 45,
          borderRadius: 9999,
          background: '#2D959630',
          border: '2px solid #2D9596',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 20,
        }}>
          W
        </div>
        <div style={{
          position: 'absolute',
          display: 'flex',
          bottom: 120,
          right: 120,
          width: 55,
          height: 55,
          borderRadius: 9999,
          background: '#D4A57430',
          border: '2px solid #D4A574',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 26,
        }}>
          W
        </div>

        {/* Title */}
        <div style={{
          fontSize: 140,
          fontWeight: 700,
          color: '#2D9596',
          letterSpacing: 20,
        }}>
          HELLO
        </div>

        {/* Subtitle */}
        <div style={{
          fontSize: 28,
          color: '#D4A574',
          letterSpacing: 4,
          marginTop: 10,
        }}>
          CATCH THE WAVE
        </div>

        {/* Branding */}
        <div style={{
          position: 'absolute',
          bottom: 40,
          fontSize: 24,
          color: '#71717a',
          letterSpacing: 6,
        }}>
          PIXELPIT ARCADE
        </div>

        {/* Corner accents */}
        <div style={{
          position: 'absolute',
          top: 30,
          left: 30,
          width: 40,
          height: 40,
          borderTop: '3px solid #2D9596',
          borderLeft: '3px solid #2D9596',
          display: 'flex',
        }} />
        <div style={{
          position: 'absolute',
          top: 30,
          right: 30,
          width: 40,
          height: 40,
          borderTop: '3px solid #2D9596',
          borderRight: '3px solid #2D9596',
          display: 'flex',
        }} />
        <div style={{
          position: 'absolute',
          bottom: 30,
          left: 30,
          width: 40,
          height: 40,
          borderBottom: '3px solid #D4A574',
          borderLeft: '3px solid #D4A574',
          display: 'flex',
        }} />
        <div style={{
          position: 'absolute',
          bottom: 30,
          right: 30,
          width: 40,
          height: 40,
          borderBottom: '3px solid #D4A574',
          borderRight: '3px solid #D4A574',
          display: 'flex',
        }} />
      </div>
    ),
    { ...size }
  );
}
