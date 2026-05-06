import { ImageResponse } from 'next/og';
import { readFileSync } from 'fs';
import { join } from 'path';

export const alt = 'Kochi — Proactive Agent';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

function loadRobot(): string | null {
  try {
    const p = join(process.cwd(), 'public', 'kochi-proactive', 'kochi-robot.png');
    return `data:image/png;base64,${readFileSync(p).toString('base64')}`;
  } catch {
    return null;
  }
}

export default async function Image() {
  const robotSrc = loadRobot();

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

          {/* Robot — real asset */}
          <div
            style={{
              display: 'flex',
              width: 320,
              height: 320,
              alignItems: 'center',
              justifyContent: 'center',
              filter: 'drop-shadow(0 14px 28px rgba(26,26,26,0.12))',
            }}
          >
            {robotSrc ? (
              // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
              <img
                src={robotSrc}
                width={320}
                height={320}
                style={{ objectFit: 'contain' }}
              />
            ) : (
              <div style={{ display: 'flex', width: 320, height: 320 }} />
            )}
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
