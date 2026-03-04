'use client'

import Link from 'next/link'

export default function BubbaloopPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0D1117',
      color: '#E6EDF3',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '80px 24px 60px',
    }}>
      {/* Hero */}
      <h1 style={{
        fontFamily: '"SF Mono", "Fira Code", "Fira Mono", Menlo, Consolas, monospace',
        fontSize: 'clamp(48px, 10vw, 80px)',
        fontWeight: 700,
        letterSpacing: '-2px',
        margin: 0,
        background: 'linear-gradient(135deg, #58A6FF, #3FB950)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      }}>
        bubbaloop
      </h1>

      <p style={{
        fontSize: 'clamp(16px, 3vw, 20px)',
        color: '#8B949E',
        marginTop: 12,
        marginBottom: 0,
        textAlign: 'center',
      }}>
        open source home automation on a Mac Mini
      </p>

      {/* Description */}
      <div style={{
        maxWidth: 600,
        marginTop: 48,
        lineHeight: 1.7,
        fontSize: 16,
        color: '#C9D1D9',
        textAlign: 'center',
      }}>
        <p style={{ margin: 0 }}>
          A fully open source home automation stack built on{' '}
          <a href="https://github.com/bdecrem/openclaw" style={{ color: '#58A6FF', textDecoration: 'none' }}>OpenClaw</a>.
          Connect RTSP cameras, smart speakers, and local AI — all running on your own hardware.
          No cloud dependencies. No subscriptions. Just your house, your code, your rules.
        </p>
      </div>

      {/* Stack */}
      <div style={{
        marginTop: 48,
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        fontFamily: '"SF Mono", "Fira Code", "Fira Mono", Menlo, Consolas, monospace',
        fontSize: 14,
        width: '100%',
        maxWidth: 400,
      }}>
        <div style={{ color: '#8B949E', marginBottom: 12, fontSize: 12, textTransform: 'uppercase', letterSpacing: 2 }}>
          The Stack
        </div>
        {[
          { name: 'OpenClaw', desc: 'orchestration layer' },
          { name: 'RTSP cameras', desc: 'local video feeds' },
          { name: 'Smart speakers', desc: 'audio output' },
          { name: 'Ollama', desc: 'local AI inference' },
          { name: 'Mac Mini', desc: 'home server' },
        ].map((item, i) => (
          <div key={i} style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '10px 0',
            borderBottom: '1px solid #21262D',
          }}>
            <span style={{ color: '#E6EDF3' }}>{item.name}</span>
            <span style={{ color: '#484F58' }}>{item.desc}</span>
          </div>
        ))}
      </div>

      {/* GitHub CTA */}
      <a
        href="https://github.com/bdecrem/bubbaloop"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          marginTop: 56,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          padding: '14px 28px',
          background: '#21262D',
          border: '1px solid #30363D',
          borderRadius: 8,
          color: '#E6EDF3',
          fontSize: 16,
          fontWeight: 600,
          textDecoration: 'none',
          transition: 'border-color 0.2s',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 16 16" fill="#E6EDF3">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
        </svg>
        View on GitHub
      </a>

      {/* Footer */}
      <div style={{
        marginTop: 'auto',
        paddingTop: 80,
        fontSize: 13,
        color: '#484F58',
      }}>
        <Link href="/whisperer" style={{ color: '#484F58', textDecoration: 'none' }}>
          ← whisperer
        </Link>
      </div>
    </div>
  )
}
