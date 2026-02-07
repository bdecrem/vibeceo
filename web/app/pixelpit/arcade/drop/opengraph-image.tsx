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
          background: 'linear-gradient(180deg, #0044CC 0%, #0033AA 40%, #001166 100%)',
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
        {/* Full-width color bars — chunky platform slabs */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: 1200,
            height: 40,
            background: '#FF3366',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 40,
            left: 0,
            width: 1200,
            height: 40,
            background: '#FF6633',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 80,
            left: 0,
            width: 1200,
            height: 40,
            background: '#FFCC00',
          }}
        />

        {/* Bottom bars */}
        <div
          style={{
            position: 'absolute',
            bottom: 80,
            left: 0,
            width: 1200,
            height: 40,
            background: '#FFCC00',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            left: 0,
            width: 1200,
            height: 40,
            background: '#FF6633',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: 1200,
            height: 40,
            background: '#FF3366',
          }}
        />

        {/* Gaps punched out of bars */}
        <div style={{ position: 'absolute', top: 0, left: 500, width: 120, height: 40, background: '#0044CC' }} />
        <div style={{ position: 'absolute', top: 40, left: 750, width: 100, height: 40, background: '#0040BF' }} />
        <div style={{ position: 'absolute', top: 80, left: 350, width: 110, height: 40, background: '#003DB5' }} />
        <div style={{ position: 'absolute', bottom: 80, left: 600, width: 110, height: 40, background: '#001D80' }} />
        <div style={{ position: 'absolute', bottom: 40, left: 300, width: 100, height: 40, background: '#001570' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 800, width: 120, height: 40, background: '#001166' }} />

        {/* Storm slab on top bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 200,
            width: 160,
            height: 40,
            background: '#110000',
            boxShadow: '0 0 40px #FF000080',
          }}
        />

        {/* Ball — BIG, centered, glowing */}
        <div
          style={{
            position: 'absolute',
            top: 240,
            left: 565,
            width: 70,
            height: 70,
            borderRadius: 35,
            background: '#FF2244',
            boxShadow: '0 0 50px #FF2244, 0 0 100px #FF224480, 0 8px 0 #CC0022',
          }}
        />

        {/* Speed lines — thick */}
        <div style={{ position: 'absolute', top: 215, left: 585, width: 30, height: 5, background: '#FF224480', borderRadius: 3 }} />
        <div style={{ position: 'absolute', top: 200, left: 590, width: 20, height: 5, background: '#FF224450', borderRadius: 3 }} />
        <div style={{ position: 'absolute', top: 228, left: 592, width: 16, height: 4, background: '#FF224440', borderRadius: 2 }} />

        {/* TITLE — MASSIVE CHUNKY */}
        <div
          style={{
            fontSize: 200,
            fontWeight: 900,
            color: '#ffffff',
            letterSpacing: 16,
            textShadow: '0 10px 0 #001166, 0 0 80px #4488FF80',
            position: 'relative',
            lineHeight: 1,
          }}
        >
          DROP
        </div>

        {/* Tagline — bold, gold */}
        <div
          style={{
            fontSize: 32,
            color: '#FFCC00',
            letterSpacing: 10,
            fontWeight: 900,
            position: 'relative',
            marginTop: 8,
            textShadow: '0 2px 0 #00000040',
          }}
        >
          60 SEC. FALL FAST.
        </div>

        <CornerAccents color="#FFCC00" />
        <PixelpitBranding color="#ffffff60" />
      </div>
    ),
    { ...size }
  );
}
