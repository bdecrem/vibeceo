import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'PHASE - Pixelpit Arcade';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#0a0a0a',
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
        {/* Clock tower lines */}
        <div style={{ position: 'absolute', top: 0, left: 200, width: 1, height: '100%', background: '#22d3ee', opacity: 0.06 }} />
        <div style={{ position: 'absolute', top: 0, left: 400, width: 1, height: '100%', background: '#22d3ee', opacity: 0.06 }} />
        <div style={{ position: 'absolute', top: 0, right: 200, width: 1, height: '100%', background: '#22d3ee', opacity: 0.06 }} />
        <div style={{ position: 'absolute', top: 0, right: 400, width: 1, height: '100%', background: '#22d3ee', opacity: 0.06 }} />

        {/* Gear outlines */}
        <div style={{ position: 'absolute', top: 80, left: 350, width: 140, height: 140, borderRadius: 9999, border: '4px solid #2a2a2e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 80, height: 40, background: '#22d3ee', borderRadius: 9999, opacity: 0.4, boxShadow: '0 0 20px #22d3ee40' }} />
        </div>
        <div style={{ position: 'absolute', top: 80, right: 350, width: 140, height: 140, borderRadius: 9999, border: '4px solid #2a2a2e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 80, height: 40, background: '#d946ef', borderRadius: 9999, opacity: 0.4, boxShadow: '0 0 20px #d946ef40' }} />
        </div>
        <div style={{ position: 'absolute', bottom: 120, left: 450, width: 120, height: 120, borderRadius: 9999, border: '4px solid #2a2a2e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 60, height: 30, background: '#facc15', borderRadius: 9999, opacity: 0.4, boxShadow: '0 0 20px #facc1540' }} />
        </div>

        {/* Ghost */}
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 9999,
            background: '#ffffff',
            boxShadow: '0 0 40px #22d3ee80, 0 0 80px #22d3ee40',
            marginBottom: 30,
          }}
        />

        {/* Title */}
        <div style={{ fontSize: 140, fontWeight: 700, color: '#22d3ee', letterSpacing: 20, textShadow: '0 0 60px #22d3ee80', marginBottom: 10 }}>
          PHASE
        </div>

        {/* Subtitle */}
        <div style={{ fontSize: 28, color: '#d946ef', letterSpacing: 8, marginBottom: 40 }}>
          SHIFT THROUGH THE GEARS
        </div>

        {/* Branding */}
        <div style={{ position: 'absolute', bottom: 40, fontSize: 24, color: '#ffffff', letterSpacing: 6, opacity: 0.6 }}>
          PIXELPIT ARCADE
        </div>

        {/* Corners */}
        <div style={{ position: 'absolute', top: 30, left: 30, width: 40, height: 40, borderTop: '3px solid #facc15', borderLeft: '3px solid #facc15' }} />
        <div style={{ position: 'absolute', top: 30, right: 30, width: 40, height: 40, borderTop: '3px solid #facc15', borderRight: '3px solid #facc15' }} />
        <div style={{ position: 'absolute', bottom: 30, left: 30, width: 40, height: 40, borderBottom: '3px solid #facc15', borderLeft: '3px solid #facc15' }} />
        <div style={{ position: 'absolute', bottom: 30, right: 30, width: 40, height: 40, borderBottom: '3px solid #facc15', borderRight: '3px solid #facc15' }} />
      </div>
    ),
    { ...size }
  );
}
