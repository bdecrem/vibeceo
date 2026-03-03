import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Home Whisperer'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#F5F0EB',
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
            fontSize: 80,
            fontWeight: 700,
            color: '#2C2C2C',
            letterSpacing: '-0.02em',
            marginBottom: 12,
          }}
        >
          Home Whisperer
        </div>
        <div
          style={{
            fontSize: 32,
            color: '#88807060',
          }}
        >
          a smart camera, quietly watching
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginTop: 40,
          }}
        >
          <div
            style={{
              width: 16,
              height: 16,
              borderRadius: 9999,
              backgroundColor: '#8B9E7E',
            }}
          />
          <div style={{ fontSize: 24, color: '#A09888' }}>live</div>
        </div>
      </div>
    ),
    { ...size }
  )
}
