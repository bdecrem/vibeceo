import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Kochi — Proactive Agent';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          backgroundColor: '#f2ebdf',
          color: '#1a1a1a',
          padding: '56px 80px',
          flexDirection: 'column',
          justifyContent: 'space-between',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 22,
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: '#1a1a1a',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                display: 'flex',
                width: 14,
                height: 14,
                borderRadius: 999,
                backgroundColor: '#1a1a1a',
              }}
            />
            <div style={{ display: 'flex' }}>kochi.to</div>
          </div>
          <div style={{ display: 'flex', color: '#8c8276' }}>proactive agent</div>
        </div>

        {/* Main row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 60,
          }}
        >
          {/* Headline + subhead */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                fontSize: 128,
                fontWeight: 700,
                lineHeight: 0.93,
                letterSpacing: -5,
              }}
            >
              <div style={{ display: 'flex' }}>Proactive</div>
              <div style={{ display: 'flex' }}>
                <span>agent</span>
                <span style={{ color: '#e55b26' }}>.</span>
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: 30,
                marginTop: 30,
                color: '#1a1a1a',
                opacity: 0.85,
              }}
            >
              The AI agent that never rests.
            </div>
          </div>

          {/* Robot */}
          <div
            style={{
              display: 'flex',
              width: 300,
              height: 300,
              alignItems: 'center',
              justifyContent: 'center',
              filter: 'drop-shadow(0 14px 28px rgba(26,26,26,0.12))',
            }}
          >
            <svg width="300" height="300" viewBox="0 0 100 100">
              {/* left antenna */}
              <circle cx="32" cy="6" r="5.5" fill="#1a1a1a" />
              <rect x="30" y="8" width="4" height="22" fill="#1a1a1a" />
              {/* right antenna */}
              <circle cx="68" cy="6" r="5.5" fill="#1a1a1a" />
              <rect x="66" y="8" width="4" height="22" fill="#1a1a1a" />
              {/* head */}
              <rect x="8" y="26" width="84" height="64" rx="14" fill="#1a1a1a" />
              {/* face cutout */}
              <rect x="20" y="40" width="60" height="38" rx="12" fill="#f2ebdf" />
              {/* eyes */}
              <circle cx="38" cy="59" r="6" fill="#1a1a1a" />
              <circle cx="62" cy="59" r="6" fill="#1a1a1a" />
            </svg>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 22,
            borderTop: '1px solid rgba(26,26,26,0.12)',
            fontSize: 18,
            color: '#8c8276',
            letterSpacing: 1.5,
            textTransform: 'uppercase',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                display: 'flex',
                width: 12,
                height: 12,
                borderRadius: 999,
                backgroundColor: '#e55b26',
              }}
            />
            <div style={{ display: 'flex' }}>
              openclaw chat client · ios 26 · invite only
            </div>
          </div>
          <div style={{ display: 'flex' }}>— you&apos;re welcome.</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
