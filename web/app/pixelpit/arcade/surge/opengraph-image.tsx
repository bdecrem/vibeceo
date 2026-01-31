import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'SURGE - Pixelpit Arcade';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// SURGE colors
const COLORS = {
  bg: '#0a0a12',
  yellow: '#facc15',
  purple: '#7c3aed',
  purpleLight: '#a855f7',
  cream: '#f8fafc',
};

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: COLORS.bg,
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
        {/* Decorative grid pattern */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 8,
            padding: 100,
            opacity: 0.15,
          }}
        >
          {[...Array(35)].map((_, i) => (
            <div
              key={i}
              style={{
                width: 40,
                height: 40,
                borderRadius: 4,
                background: i % 7 === 3 ? COLORS.purple : COLORS.yellow,
              }}
            />
          ))}
        </div>

        {/* Black holes decoration */}
        <div
          style={{
            position: 'absolute',
            left: 150,
            top: 100,
            width: 60,
            height: 60,
            borderRadius: 30,
            background: COLORS.purple,
            boxShadow: `0 0 40px ${COLORS.purpleLight}`,
            opacity: 0.6,
          }}
        />
        <div
          style={{
            position: 'absolute',
            right: 200,
            top: 150,
            width: 45,
            height: 45,
            borderRadius: 22,
            background: COLORS.purple,
            boxShadow: `0 0 30px ${COLORS.purpleLight}`,
            opacity: 0.5,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 200,
            bottom: 120,
            width: 50,
            height: 50,
            borderRadius: 25,
            background: COLORS.purple,
            boxShadow: `0 0 35px ${COLORS.purpleLight}`,
            opacity: 0.5,
          }}
        />
        <div
          style={{
            position: 'absolute',
            right: 150,
            bottom: 100,
            width: 55,
            height: 55,
            borderRadius: 27,
            background: COLORS.purple,
            boxShadow: `0 0 35px ${COLORS.purpleLight}`,
            opacity: 0.6,
          }}
        />

        {/* Title */}
        <div
          style={{
            fontSize: 120,
            fontWeight: 700,
            color: COLORS.yellow,
            letterSpacing: 16,
            textShadow: `0 0 80px ${COLORS.yellow}cc`,
            marginBottom: 20,
          }}
        >
          SURGE
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 28,
            color: COLORS.purpleLight,
            letterSpacing: 6,
          }}
        >
          SPREAD THE ENERGY
        </div>

        {/* Corner accents */}
        <div
          style={{
            position: 'absolute',
            top: 25,
            left: 25,
            width: 35,
            height: 35,
            borderTop: `3px solid ${COLORS.yellow}`,
            borderLeft: `3px solid ${COLORS.yellow}`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 25,
            right: 25,
            width: 35,
            height: 35,
            borderTop: `3px solid ${COLORS.yellow}`,
            borderRight: `3px solid ${COLORS.yellow}`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 25,
            left: 25,
            width: 35,
            height: 35,
            borderBottom: `3px solid ${COLORS.yellow}`,
            borderLeft: `3px solid ${COLORS.yellow}`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 25,
            right: 25,
            width: 35,
            height: 35,
            borderBottom: `3px solid ${COLORS.yellow}`,
            borderRight: `3px solid ${COLORS.yellow}`,
          }}
        />

        {/* Pixelpit branding */}
        <div
          style={{
            position: 'absolute',
            bottom: 30,
            fontSize: 20,
            color: COLORS.cream,
            letterSpacing: 6,
            opacity: 0.7,
          }}
        >
          PIXELPIT ARCADE
        </div>
      </div>
    ),
    { ...size }
  );
}
