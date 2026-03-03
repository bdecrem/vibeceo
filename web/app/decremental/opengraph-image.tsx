import { ImageResponse } from 'next/og'

export const alt = 'Decremental'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#0a0a0a',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span
            style={{
              fontFamily: 'monospace',
              fontSize: 48,
              color: '#333333',
            }}
          >
            ~/projects
          </span>
          <div
            style={{
              display: 'flex',
              width: 24,
              height: 48,
              backgroundColor: '#7cb87c',
              marginLeft: 8,
            }}
          />
        </div>
      </div>
    ),
    { ...size }
  )
}
