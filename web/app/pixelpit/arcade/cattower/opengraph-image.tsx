import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'CAT TOWER - Pixelpit Arcade';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)',
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
        {/* Floating circles background */}
        <div
          style={{
            position: 'absolute',
            top: 60,
            left: 100,
            width: 120,
            height: 120,
            borderRadius: 60,
            background: '#FF6B6B30',
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
            background: '#FFB34730',
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
            background: '#7BED9F30',
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
            background: '#70A1FF30',
          }}
        />

        {/* Cat decorations */}
        <div
          style={{
            position: 'absolute',
            top: 80,
            left: 150,
            fontSize: 80,
          }}
        >
          🐱
        </div>
        <div
          style={{
            position: 'absolute',
            top: 120,
            right: 180,
            fontSize: 60,
          }}
        >
          🐈
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: 120,
            left: 180,
            fontSize: 70,
          }}
        >
          😺
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: 100,
            right: 150,
            fontSize: 65,
          }}
        >
          🐾
        </div>

        {/* Main title */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              fontSize: 100,
              fontWeight: 800,
              color: '#FFB347',
              letterSpacing: 8,
            }}
          >
            CAT
          </div>
          <div
            style={{
              fontSize: 100,
              fontWeight: 800,
              color: '#70A1FF',
              letterSpacing: 8,
              marginTop: -20,
            }}
          >
            TOWER
          </div>
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 32,
            color: '#f8fafc',
            letterSpacing: 4,
            marginTop: 30,
          }}
        >
          STACK THE CATS!
        </div>

        {/* Pixelpit branding */}
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            display: 'flex',
            fontSize: 24,
            letterSpacing: 4,
          }}
        >
          <span style={{ color: '#FFB347' }}>PIXEL</span>
          <span style={{ color: '#70A1FF' }}>PIT</span>
          <span style={{ color: '#f8fafc80', marginLeft: 12 }}>ARCADE</span>
        </div>

        {/* Corner accents */}
        <div
          style={{
            position: 'absolute',
            top: 30,
            left: 30,
            width: 40,
            height: 40,
            borderTop: '4px solid #FF6B6B',
            borderLeft: '4px solid #FF6B6B',
            borderRadius: 4,
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 30,
            right: 30,
            width: 40,
            height: 40,
            borderTop: '4px solid #FFB347',
            borderRight: '4px solid #FFB347',
            borderRadius: 4,
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 30,
            left: 30,
            width: 40,
            height: 40,
            borderBottom: '4px solid #7BED9F',
            borderLeft: '4px solid #7BED9F',
            borderRadius: 4,
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 30,
            right: 30,
            width: 40,
            height: 40,
            borderBottom: '4px solid #70A1FF',
            borderRight: '4px solid #70A1FF',
            borderRadius: 4,
          }}
        />
      </div>
    ),
    { ...size }
  );
}
