'use client';

import Link from 'next/link';

export default function ThreadsPage() {
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
        <div style={{ fontSize: 64, marginBottom: 16 }}>🧵</div>

        <h1 style={{
          fontSize: 32,
          fontWeight: 900,
          color: '#00FFAA',
          letterSpacing: 4,
          marginBottom: 24,
        }}>
          THREADS
        </h1>

        <a
          href="https://www.pixelpit.gg/pixelpit/threads.html"
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
            display: 'inline-block',
          }}
        >
          PLAY PROTOTYPE
        </a>

        <div style={{ marginTop: 40 }}>
          <Link
            href="/pixelpit"
            style={{
              color: '#4B5563',
              fontSize: 13,
              textDecoration: 'none',
            }}
          >
            back to the pit
          </Link>
        </div>
      </div>
    </div>
  );
}
