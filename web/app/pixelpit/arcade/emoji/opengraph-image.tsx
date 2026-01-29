import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Emoji Blaster - Pixelpit Arcade';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(180deg, #fef3c7 0%, #fce7f3 100%)',
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
            fontSize: 80,
          }}
        >
          😀
        </div>
        <div
          style={{
            position: 'absolute',
            top: 120,
            right: 180,
            fontSize: 60,
          }}
        >
          🎯
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: 120,
            left: 180,
            fontSize: 70,
          }}
        >
          ⭐
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: 100,
            right: 150,
            fontSize: 65,
          }}
        >
          💀
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
              color: '#ec4899',
              letterSpacing: 8,
            }}
          >
            EMOJI
          </div>
          <div
            style={{
              fontSize: 100,
              fontWeight: 800,
              color: '#facc15',
              letterSpacing: 8,
              marginTop: -20,
            }}
          >
            BLASTER
          </div>
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 32,
            color: '#1e1b4b',
            letterSpacing: 4,
            marginTop: 30,
          }}
        >
          TAP THE HAPPY ONES!
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
          <span style={{ color: '#ec4899' }}>PIXEL</span>
          <span style={{ color: '#06b6d4' }}>PIT</span>
          <span style={{ color: '#1e1b4b80', marginLeft: 12 }}>ARCADE</span>
        </div>

        {/* Corner accents */}
        <div
          style={{
            position: 'absolute',
            top: 30,
            left: 30,
            width: 40,
            height: 40,
            borderTop: '4px solid #ec4899',
            borderLeft: '4px solid #ec4899',
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
            borderTop: '4px solid #facc15',
            borderRight: '4px solid #facc15',
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
            borderBottom: '4px solid #06b6d4',
            borderLeft: '4px solid #06b6d4',
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
            borderBottom: '4px solid #a855f7',
            borderRight: '4px solid #a855f7',
            borderRadius: 4,
          }}
        />
      </div>
    ),
    { ...size }
  );
}
