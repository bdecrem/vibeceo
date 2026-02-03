import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Sprout Run - Pixelpit Arcade';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(180deg, #fef3c7 0%, #a7f3d0 50%, #6ee7b7 100%)',
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
        {/* Sun with glow */}
        <div
          style={{
            position: 'absolute',
            top: 40,
            right: 150,
            width: 120,
            height: 120,
            borderRadius: 60,
            background: '#fbbf24',
            boxShadow: '0 0 80px #fde047, 0 0 120px #fef08a',
          }}
        />

        {/* Far hills */}
        <div
          style={{
            position: 'absolute',
            bottom: 100,
            left: -100,
            width: 600,
            height: 180,
            background: '#bbf7d0',
            borderRadius: '300px 300px 0 0',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 100,
            right: -50,
            width: 500,
            height: 160,
            background: '#bbf7d0',
            borderRadius: '250px 250px 0 0',
          }}
        />

        {/* Mid hills */}
        <div
          style={{
            position: 'absolute',
            bottom: 80,
            left: 100,
            width: 700,
            height: 120,
            background: '#86efac',
            borderRadius: '350px 350px 0 0',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 80,
            right: 50,
            width: 600,
            height: 110,
            background: '#86efac',
            borderRadius: '300px 300px 0 0',
          }}
        />

        {/* Near hills */}
        <div
          style={{
            position: 'absolute',
            bottom: 60,
            left: -50,
            width: 800,
            height: 90,
            background: '#4ade80',
            borderRadius: '400px 400px 0 0',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 60,
            right: -100,
            width: 700,
            height: 80,
            background: '#4ade80',
            borderRadius: '350px 350px 0 0',
          }}
        />

        {/* Ground */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 70,
            background: '#92400e',
          }}
        />

        {/* Grass stripe */}
        <div
          style={{
            position: 'absolute',
            bottom: 60,
            left: 0,
            right: 0,
            height: 25,
            background: '#22c55e',
          }}
        />

        {/* Sprout character */}
        <div
          style={{
            position: 'absolute',
            bottom: 90,
            left: 200,
            width: 80,
            height: 80,
            background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
            borderRadius: 40,
            border: '5px solid #15803d',
            boxShadow: '0 6px 30px rgba(34,197,94,0.5)',
          }}
        />

        {/* Sundrop collectibles */}
        <div
          style={{
            position: 'absolute',
            bottom: 200,
            left: 400,
            width: 35,
            height: 35,
            borderRadius: 18,
            background: '#fbbf24',
            boxShadow: '0 0 25px #fde047',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 280,
            right: 350,
            width: 30,
            height: 30,
            borderRadius: 15,
            background: '#fbbf24',
            boxShadow: '0 0 20px #fde047',
          }}
        />

        {/* Rock obstacle */}
        <div
          style={{
            position: 'absolute',
            bottom: 85,
            right: 250,
            width: 60,
            height: 50,
            background: '#78716c',
            borderRadius: '30px 30px 10px 10px',
            border: '4px solid #57534e',
          }}
        />

        {/* Flying birds */}
        <div style={{ position: 'absolute', top: 100, left: 350, fontSize: 30, opacity: 0.4 }}>
          v
        </div>
        <div style={{ position: 'absolute', top: 140, left: 420, fontSize: 24, opacity: 0.35 }}>
          v
        </div>
        <div style={{ position: 'absolute', top: 90, right: 400, fontSize: 26, opacity: 0.35 }}>
          v
        </div>

        {/* Main title */}
        <div
          style={{
            fontSize: 120,
            fontWeight: 800,
            color: '#15803d',
            letterSpacing: 8,
            textShadow: '0 4px 0 #166534, 0 8px 30px rgba(21,128,61,0.3)',
            marginBottom: 10,
          }}
        >
          SPROUT RUN
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 32,
            color: '#92400e',
            letterSpacing: 6,
            marginBottom: 40,
            fontWeight: 600,
          }}
        >
          TAP TO BOOST
        </div>

        {/* Pixelpit branding */}
        <div
          style={{
            position: 'absolute',
            bottom: 30,
            fontSize: 22,
            letterSpacing: 6,
            opacity: 0.7,
            display: 'flex',
          }}
        >
          <span style={{ color: '#fbbf24', fontWeight: 700 }}>PIXEL</span>
          <span style={{ color: '#22c55e', fontWeight: 700 }}>PIT</span>
          <span style={{ color: '#78716c', marginLeft: 8 }}>ARCADE</span>
        </div>

        {/* Corner accents */}
        <div
          style={{
            position: 'absolute',
            top: 25,
            left: 25,
            width: 40,
            height: 40,
            borderTop: '4px solid #fbbf24',
            borderLeft: '4px solid #fbbf24',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 25,
            right: 25,
            width: 40,
            height: 40,
            borderTop: '4px solid #fbbf24',
            borderRight: '4px solid #fbbf24',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 25,
            left: 25,
            width: 40,
            height: 40,
            borderBottom: '4px solid #fbbf24',
            borderLeft: '4px solid #fbbf24',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 25,
            right: 25,
            width: 40,
            height: 40,
            borderBottom: '4px solid #fbbf24',
            borderRight: '4px solid #fbbf24',
          }}
        />
      </div>
    ),
    { ...size }
  );
}
