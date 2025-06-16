import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

// NO EDGE RUNTIME

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string[] } }
) {
  try {
    const { slug } = params
    const userSlug = slug?.[0] || 'unknown'
    const appSlug = slug?.[1] || 'test'
    
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
            backgroundColor: '#7c3aed',
            color: 'white',
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '30px' }}>
            WTAF.me
          </div>
          <div style={{ fontSize: '36px', marginBottom: '20px' }}>
            {appSlug.replace(/-/g, ' ')}
          </div>
          <div style={{ fontSize: '16px', opacity: 0.6 }}>
            {userSlug}/{appSlug}
          </div>
          <div style={{ fontSize: '12px', opacity: 0.5, marginTop: '20px' }}>
            ✅ DYNAMIC FIXED!
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    )
  } catch (e: any) {
    return new Response(`Error: ${e.message}`, { status: 500 })
  }
}
