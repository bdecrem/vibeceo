import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userSlug = searchParams.get('user') || 'bart'
    const appSlug = searchParams.get('app') || 'test-app'
    
    const appTitle = appSlug.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
    
    console.log(`🧪 WORKING Dynamic OG for: ${userSlug}/${appSlug}`)
    
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
          <div style={{ fontSize: '20px', opacity: 0.8, textAlign: 'center' }}>
            Vibecoded chaos, shipped via SMS
          </div>
          <div style={{ fontSize: '16px', opacity: 0.6, marginTop: '20px' }}>
            wtaf.me/{userSlug}/{appSlug}
          </div>
          <div style={{ fontSize: '12px', opacity: 0.5, marginTop: '15px' }}>
            ✅ DYNAMIC OG WORKS!
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
