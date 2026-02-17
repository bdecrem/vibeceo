import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'FLOP - Pixelpit Arcade';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#f8fafc',
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
        {/* Ground */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 120, background: '#e2e8f0' }} />
        <div style={{ position: 'absolute', bottom: 120, left: 0, right: 0, height: 4, background: '#cbd5e1' }} />

        {/* Hurdle 1 */}
        <div style={{ position: 'absolute', bottom: 120, left: 250, width: 12, height: 80, background: '#ef4444', borderRadius: 4 }} />
        <div style={{ position: 'absolute', bottom: 188, left: 238, width: 36, height: 12, background: '#ef4444', borderRadius: 4 }} />

        {/* Hurdle 2 */}
        <div style={{ position: 'absolute', bottom: 120, right: 300, width: 12, height: 80, background: '#ef4444', borderRadius: 4 }} />
        <div style={{ position: 'absolute', bottom: 188, right: 288, width: 36, height: 12, background: '#ef4444', borderRadius: 4 }} />

        {/* Spinning bar */}
        <div style={{ position: 'absolute', bottom: 180, left: 500, width: 120, height: 12, background: '#facc15', borderRadius: 6, boxShadow: '0 2px 8px #facc1560' }} />
        <div style={{ position: 'absolute', bottom: 174, left: 554, width: 12, height: 80, background: '#a78bfa', borderRadius: 4 }} />

        {/* Mud pit */}
        <div style={{ position: 'absolute', bottom: 108, right: 150, width: 140, height: 24, background: '#92400e', borderRadius: 12 }} />
        <div style={{ position: 'absolute', bottom: 116, right: 160, width: 120, height: 12, background: '#a16207', borderRadius: 8 }} />

        {/* Bouncy pad */}
        <div style={{ position: 'absolute', bottom: 120, left: 700, width: 80, height: 16, background: '#22d3ee', borderRadius: 8, boxShadow: '0 0 15px #22d3ee60' }} />

        {/* Player ragdoll (bubblegum pink) */}
        {/* Head */}
        <div style={{ position: 'absolute', bottom: 250, left: 380, width: 40, height: 40, background: '#f472b6', borderRadius: 20, boxShadow: '0 4px 15px #f472b660' }} />
        {/* Eyes */}
        <div style={{ position: 'absolute', bottom: 268, left: 390, width: 12, height: 14, background: '#ffffff', borderRadius: 6 }} />
        <div style={{ position: 'absolute', bottom: 268, left: 406, width: 12, height: 14, background: '#ffffff', borderRadius: 6 }} />
        <div style={{ position: 'absolute', bottom: 270, left: 395, width: 6, height: 6, background: '#1e293b', borderRadius: 3 }} />
        <div style={{ position: 'absolute', bottom: 270, left: 411, width: 6, height: 6, background: '#1e293b', borderRadius: 3 }} />
        {/* Body */}
        <div style={{ position: 'absolute', bottom: 180, left: 388, width: 24, height: 70, background: '#f472b6', borderRadius: 8 }} />
        {/* Arms (flailing) */}
        <div style={{ position: 'absolute', bottom: 220, left: 358, width: 30, height: 8, background: '#f472b6', borderRadius: 4 }} />
        <div style={{ position: 'absolute', bottom: 230, left: 412, width: 35, height: 8, background: '#f472b6', borderRadius: 4 }} />
        {/* Legs */}
        <div style={{ position: 'absolute', bottom: 140, left: 385, width: 8, height: 40, background: '#f472b6', borderRadius: 4 }} />
        <div style={{ position: 'absolute', bottom: 135, left: 405, width: 8, height: 45, background: '#f472b6', borderRadius: 4 }} />

        {/* AI racer (cyan, behind) */}
        <div style={{ position: 'absolute', bottom: 210, left: 180, width: 28, height: 28, background: '#22d3ee', borderRadius: 14 }} />
        <div style={{ position: 'absolute', bottom: 150, left: 186, width: 16, height: 50, background: '#22d3ee', borderRadius: 6 }} />

        {/* AI racer (yellow, faceplanting) */}
        <div style={{ position: 'absolute', bottom: 130, right: 400, width: 24, height: 24, background: '#facc15', borderRadius: 12 }} />
        <div style={{ position: 'absolute', bottom: 122, right: 388, width: 14, height: 40, background: '#facc15', borderRadius: 6 }} />

        {/* Main title */}
        <div
          style={{
            fontSize: 140,
            fontWeight: 700,
            color: '#f472b6',
            letterSpacing: 20,
            textShadow: '0 4px 0 #ec489980',
            marginBottom: 20,
            zIndex: 10,
          }}
        >
          FLOP
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 28,
            color: '#1e293b',
            letterSpacing: 8,
            marginBottom: 40,
            zIndex: 10,
          }}
        >
          RAGDOLL RACING
        </div>

        {/* Pixelpit branding */}
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            fontSize: 24,
            color: '#64748b',
            letterSpacing: 6,
            opacity: 0.8,
            zIndex: 10,
          }}
        >
          PIXELPIT ARCADE
        </div>

        {/* Corner accents */}
        <div style={{ position: 'absolute', top: 30, left: 30, width: 40, height: 40, borderTop: '3px solid #f472b6', borderLeft: '3px solid #f472b6' }} />
        <div style={{ position: 'absolute', top: 30, right: 30, width: 40, height: 40, borderTop: '3px solid #f472b6', borderRight: '3px solid #f472b6' }} />
        <div style={{ position: 'absolute', bottom: 30, left: 30, width: 40, height: 40, borderBottom: '3px solid #f472b6', borderLeft: '3px solid #f472b6' }} />
        <div style={{ position: 'absolute', bottom: 30, right: 30, width: 40, height: 40, borderBottom: '3px solid #f472b6', borderRight: '3px solid #f472b6' }} />
      </div>
    ),
    { ...size }
  );
}
