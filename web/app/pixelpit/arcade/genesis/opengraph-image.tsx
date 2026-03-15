import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Genesis — Pixelpit Arcade';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  const colors = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#a29bfe', '#55efc4', '#fd79a8'];
  const particles: { x: number; y: number; color: string; size: number }[] = [];

  let seed = 99;
  const rand = () => { seed = (seed * 16807 + 0) % 2147483647; return seed / 2147483647; };

  // Create two clusters (level 1 vibe)
  const clusters = [
    { cx: 400, cy: 300, color: 0, count: 25 },
    { cx: 800, cy: 320, color: 1, count: 25 },
  ];

  for (const cluster of clusters) {
    for (let i = 0; i < cluster.count; i++) {
      particles.push({
        x: cluster.cx + (rand() - 0.5) * 100,
        y: cluster.cy + (rand() - 0.5) * 80,
        color: colors[cluster.color],
        size: 4 + rand() * 5,
      });
    }
  }

  return new ImageResponse(
    (
      <div style={{
        background: '#0a0a0f',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}>
        {particles.map((p, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: p.x - p.size / 2,
              top: p.y - p.size / 2,
              width: p.size,
              height: p.size,
              borderRadius: 9999,
              background: p.color,
              boxShadow: `0 0 ${p.size * 3}px ${p.color}60`,
            }}
          />
        ))}

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          zIndex: 10,
        }}>
          <div style={{
            fontSize: 80,
            fontWeight: 900,
            color: '#ffffff',
            letterSpacing: 10,
            fontFamily: 'monospace',
          }}>
            GENESIS
          </div>
          <div style={{
            fontSize: 20,
            color: '#ffffff50',
            letterSpacing: 6,
            fontFamily: 'monospace',
            marginTop: 12,
          }}>
            SET THE RULES. WATCH LIFE UNFOLD.
          </div>
        </div>

        <div style={{
          position: 'absolute',
          bottom: 24,
          right: 32,
          fontSize: 14,
          color: '#ffffff30',
          letterSpacing: 4,
          fontFamily: 'monospace',
        }}>
          PIXELPIT ARCADE
        </div>
      </div>
    ),
    { ...size }
  );
}
