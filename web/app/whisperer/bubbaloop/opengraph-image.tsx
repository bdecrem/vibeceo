import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'bubbaloop — open source home automation'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#0D1117',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            fontSize: 96,
            fontWeight: 700,
            letterSpacing: -3,
            color: '#58A6FF',
            fontFamily: 'monospace',
          }}
        >
          bubbaloop
        </div>
        <div
          style={{
            fontSize: 28,
            color: '#8B949E',
            marginTop: 16,
          }}
        >
          open source home automation on a Mac Mini
        </div>
        <div
          style={{
            display: 'flex',
            gap: 24,
            marginTop: 40,
            fontSize: 18,
            color: '#484F58',
          }}
        >
          <span>OpenClaw</span>
          <span style={{ color: '#30363D' }}>|</span>
          <span>RTSP</span>
          <span style={{ color: '#30363D' }}>|</span>
          <span>Ollama</span>
          <span style={{ color: '#30363D' }}>|</span>
          <span>Mac Mini</span>
        </div>
      </div>
    ),
    { ...size }
  )
}
