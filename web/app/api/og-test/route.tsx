import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const host = request.headers.get('host')
    const debug = searchParams.get('debug')

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#000',
            color: '#fff',
            fontSize: 32,
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>
            ✅ OG TEST WORKING
          </div>
          <div style={{ fontSize: '24px', marginBottom: '10px' }}>
            Host: {host}
          </div>
          <div style={{ fontSize: '18px' }}>
            {debug ? `Debug: ${debug}` : 'API routes are accessible'}
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    )
  } catch (e: any) {
    console.error('OG test error:', e)
    return new Response(`OG Test Error: ${e.message}`, { status: 500 })
  }
} 