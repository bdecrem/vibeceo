import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Particle Life — Pixelpit Arcade';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  // Generate deterministic particle positions for the OG image
  const particles: { x: number; y: number; color: string; size: number }[] = [];
  const colors = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#a29bfe', '#55efc4', '#fd79a8'];

  // Create clusters of particles
  const clusters = [
    { cx: 350, cy: 280, color: 0, count: 15 },
    { cx: 500, cy: 350, color: 1, count: 12 },
    { cx: 700, cy: 250, color: 2, count: 14 },
    { cx: 850, cy: 380, color: 3, count: 11 },
    { cx: 600, cy: 180, color: 4, count: 13 },
    { cx: 450, cy: 450, color: 5, count: 10 },
  ];

  let seed = 42;
  const rand = () => { seed = (seed * 16807 + 0) % 2147483647; return seed / 2147483647; };

  for (const cluster of clusters) {
    for (let i = 0; i < cluster.count; i++) {
      particles.push({
        x: cluster.cx + (rand() - 0.5) * 120,
        y: cluster.cy + (rand() - 0.5) * 100,
        color: colors[cluster.color],
        size: 4 + rand() * 6,
      });
    }
  }

  // Scatter particles
  for (let i = 0; i < 30; i++) {
    particles.push({
      x: 100 + rand() * 1000,
      y: 80 + rand() * 470,
      color: colors[Math.floor(rand() * 6)],
      size: 3 + rand() * 4,
    });
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
        {/* Particles */}
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

        {/* Title */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          zIndex: 10,
        }}>
          <div style={{
            fontSize: 72,
            fontWeight: 900,
            color: '#ffffff',
            letterSpacing: 8,
            fontFamily: 'monospace',
          }}>
            PARTICLE LIFE
          </div>
          <div style={{
            fontSize: 20,
            color: '#ffffff50',
            letterSpacing: 6,
            fontFamily: 'monospace',
            marginTop: 12,
          }}>
            WATCH LIFE EMERGE FROM CHAOS
          </div>
        </div>

        {/* Pixelpit branding */}
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
