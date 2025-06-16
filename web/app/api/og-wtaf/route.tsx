import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const user_slug = searchParams.get('user') || 'unknown'
    const app_slug = searchParams.get('app') || 'wtaf-app'
    
    // Generate title from app slug
    const appTitle = app_slug === 'wtaf-app' ? 'WTAF Creation' : 
      app_slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

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
            fontSize: 32,
            fontWeight: 600,
            color: 'white',
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '30px' }}>
            WTAF.me
          </div>
          
          <div style={{ 
            fontSize: '32px', 
            marginBottom: '20px',
            textAlign: 'center',
            maxWidth: '800px',
            lineHeight: 1.2
          }}>
            {appTitle}
          </div>
          
          <div style={{ 
            fontSize: '18px', 
            opacity: 0.8,
            textAlign: 'center' 
          }}>
            Built with WTAF • Vibecoded chaos
          </div>
          
          <div style={{ 
            fontSize: '16px', 
            opacity: 0.6,
            marginTop: '20px' 
          }}>
            {user_slug}/{app_slug}
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    )
  } catch (e: any) {
    console.error('WTAF OG generation error:', e)
    // Return a basic fallback image
    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#1f2937',
            fontSize: 48,
            color: 'white',
          }}
        >
          WTAF.me
        </div>
      ),
      { width: 1200, height: 630 }
    )
  }
} 