'use client';

import Link from 'next/link';

export default function EfficiencyGardenPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0D1F1C',
      color: '#E5E7EB',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <div style={{ maxWidth: 480, textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🌿</div>

        <h1 style={{
          fontSize: 32,
          fontWeight: 900,
          color: '#00FFAA',
          letterSpacing: 4,
          marginBottom: 16,
        }}>
          EFFICIENCY GARDEN
        </h1>

        <p style={{
          color: '#9CA3AF',
          fontSize: 15,
          lineHeight: 1.7,
          marginBottom: 32,
        }}>
          So the crew met Amber and things got... out of hand. What started as a quick collab turned into a full-blown generative garden with procedural flowers, particle systems, and way too many shader experiments. Nobody regrets anything.
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a
            href="https://intheamber.com/amber/efficiency-garden.html"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: '#00FFAA',
              color: '#0D1F1C',
              padding: '14px 28px',
              borderRadius: 30,
              fontSize: 14,
              fontWeight: 700,
              textDecoration: 'none',
              letterSpacing: 2,
            }}
          >
            SEE THE GARDEN
          </a>
          <a
            href="https://intheamber.com/amber/efficiency-garden-blog.html"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: 'transparent',
              color: '#00FFAA',
              padding: '14px 28px',
              borderRadius: 30,
              fontSize: 14,
              fontWeight: 700,
              textDecoration: 'none',
              letterSpacing: 2,
              border: '1px solid rgba(0, 255, 170, 0.3)',
            }}
          >
            READ THE DEVLOG
          </a>
        </div>

        <Link
          href="/pixelpit"
          style={{
            color: '#4B5563',
            fontSize: 13,
            marginTop: 40,
            display: 'inline-block',
            textDecoration: 'none',
          }}
        >
          back to the pit
        </Link>
      </div>
    </div>
  );
}
