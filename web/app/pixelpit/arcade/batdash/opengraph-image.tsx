import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'BAT DASH - Pixelpit Arcade';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(180deg, #0f172a 0%, #020617 60%, #000 100%)',
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
        {/* Moon (solid - Satori safe) */}
        <div
          style={{
            position: 'absolute',
            top: 50,
            right: 120,
            width: 100,
            height: 100,
            background: '#fef9c3',
            borderRadius: 50,
            boxShadow: '0 0 60px #fef9c380',
          }}
        />
        
        {/* Background buildings silhouette */}
        <div
          style={{
            position: 'absolute',
            bottom: 100,
            left: 0,
            right: 0,
            height: 200,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            gap: 20,
          }}
        >
          {[120, 180, 140, 200, 160, 130, 190, 150, 170].map((h, i) => (
            <div
              key={i}
              style={{
                width: 80,
                height: h,
                background: '#1e293b',
                borderRadius: '4px 4px 0 0',
              }}
            />
          ))}
        </div>

        {/* Foreground buildings with windows */}
        <div
          style={{
            position: 'absolute',
            bottom: 60,
            left: 80,
            width: 100,
            height: 350,
            background: '#334155',
            borderRadius: '8px 8px 0 0',
            display: 'flex',
            flexDirection: 'column',
            padding: 15,
            gap: 15,
          }}
        >
          {[...Array(8)].map((_, i) => (
            <div key={i} style={{ display: 'flex', gap: 10 }}>
              <div style={{ width: 20, height: 25, background: i % 3 === 0 ? '#fef08a' : '#475569', borderRadius: 2 }} />
              <div style={{ width: 20, height: 25, background: i % 2 === 0 ? '#fef08a' : '#475569', borderRadius: 2 }} />
              <div style={{ width: 20, height: 25, background: i % 4 === 0 ? '#fef08a' : '#475569', borderRadius: 2 }} />
            </div>
          ))}
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: 60,
            right: 100,
            width: 120,
            height: 400,
            background: '#334155',
            borderRadius: '8px 8px 0 0',
            display: 'flex',
            flexDirection: 'column',
            padding: 15,
            gap: 15,
          }}
        >
          {[...Array(9)].map((_, i) => (
            <div key={i} style={{ display: 'flex', gap: 10 }}>
              <div style={{ width: 20, height: 25, background: i % 2 === 0 ? '#fef08a' : '#475569', borderRadius: 2 }} />
              <div style={{ width: 20, height: 25, background: i % 3 === 1 ? '#fef08a' : '#475569', borderRadius: 2 }} />
              <div style={{ width: 20, height: 25, background: i % 4 === 2 ? '#fef08a' : '#475569', borderRadius: 2 }} />
              <div style={{ width: 20, height: 25, background: i % 5 === 0 ? '#fef08a' : '#475569', borderRadius: 2 }} />
            </div>
          ))}
        </div>

        {/* Bat silhouette */}
        <div
          style={{
            position: 'absolute',
            top: '45%',
            left: '45%',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Simple bat shape using divs */}
          <div style={{ position: 'relative', width: 120, height: 60 }}>
            {/* Body */}
            <div
              style={{
                position: 'absolute',
                top: 15,
                left: 45,
                width: 30,
                height: 30,
                background: '#1e1b4b',
                borderRadius: '50%',
              }}
            />
            {/* Left wing */}
            <div
              style={{
                position: 'absolute',
                top: 20,
                left: 0,
                width: 50,
                height: 25,
                background: '#312e81',
                borderRadius: '50% 10% 50% 50%',
                transform: 'rotate(-10deg)',
              }}
            />
            {/* Right wing */}
            <div
              style={{
                position: 'absolute',
                top: 20,
                right: 0,
                width: 50,
                height: 25,
                background: '#312e81',
                borderRadius: '10% 50% 50% 50%',
                transform: 'rotate(10deg)',
              }}
            />
            {/* Eyes */}
            <div
              style={{
                position: 'absolute',
                top: 22,
                left: 48,
                width: 8,
                height: 5,
                background: '#fef08a',
                borderRadius: '50%',
                boxShadow: '0 0 10px #fef08a',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: 22,
                left: 64,
                width: 8,
                height: 5,
                background: '#fef08a',
                borderRadius: '50%',
                boxShadow: '0 0 10px #fef08a',
              }}
            />
          </div>
        </div>

        {/* Ground */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 60,
            background: '#1e293b',
          }}
        />

        {/* Title */}
        <div
          style={{
            position: 'absolute',
            top: 80,
            left: 0,
            right: 0,
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              fontFamily: 'ui-monospace, monospace',
              fontSize: 72,
              fontWeight: 700,
              color: '#fef08a',
              letterSpacing: 8,
              textShadow: '0 0 40px rgba(254,240,138,0.5)',
            }}
          >
            BAT DASH
          </div>
          <div
            style={{
              fontFamily: 'ui-monospace, monospace',
              fontSize: 20,
              color: '#a855f7',
              letterSpacing: 4,
              marginTop: 10,
            }}
          >
            soar through gotham
          </div>
        </div>

        {/* Pixelpit branding */}
        <div
          style={{
            position: 'absolute',
            bottom: 80,
            fontFamily: 'ui-monospace, monospace',
            fontSize: 16,
            letterSpacing: 4,
            display: 'flex',
          }}
        >
          <span style={{ color: '#fef08a' }}>pixel</span>
          <span style={{ color: '#a855f7' }}>pit</span>
          <span style={{ color: '#f8fafc', opacity: 0.6, marginLeft: 4 }}> arcade</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
