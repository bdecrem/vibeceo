import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'CTRL SHIFT* LAB'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default async function Image() {
  // Load IBM Plex Mono font
  const fontData = await fetch(
    new URL('https://fonts.gstatic.com/s/ibmplexmono/v19/-F63fjptAgt5VM-kVkqdyU8n5igg1l9kn-s.woff2')
  ).then((res) => res.arrayBuffer())

  return new ImageResponse(
    (
      <div
        style={{
          background: '#000',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: '"IBM Plex Mono"',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              fontSize: 72,
              fontWeight: 500,
              color: '#fff',
              letterSpacing: '-0.02em',
              display: 'flex',
              alignItems: 'baseline',
            }}
          >
            <span>CTRL SHIFT</span>
            <span style={{ color: '#8b8b8b', marginLeft: 8 }}>*</span>
          </div>
          <div
            style={{
              fontSize: 32,
              fontWeight: 400,
              color: '#8b8b8b',
              marginTop: 16,
              letterSpacing: '0.2em',
            }}
          >
            LAB
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: 'IBM Plex Mono',
          data: fontData,
          style: 'normal',
          weight: 500,
        },
      ],
    }
  )
}
