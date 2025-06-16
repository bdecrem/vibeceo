import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string[] } }
) {
  try {
    const { slug } = params
    
    const user_slug = slug?.[0] || 'unknown'
    const app_slug = slug?.[1] || 'test-app'
    
    const appTitle = app_slug.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
    
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
          <div style={{ fontSize: '36px', marginBottom: '20px', textAlign: 'center' }}>
            {appTitle}
          </div>
          <div style={{ fontSize: '16px', opacity: 0.6 }}>
            {user_slug}/{app_slug}
          </div>
          <div style={{ fontSize: '12px', opacity: 0.5, marginTop: '20px' }}>
            ✅ DYNAMIC ROUTE WORKS!
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
