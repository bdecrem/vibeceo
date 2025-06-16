import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  
  // Disable test routes in production
  if (process.env.NODE_ENV !== 'development') {
    return new Response('Test route disabled in production', { status: 404 });
  }
  try {
    const { searchParams } = new URL(request.url)
    const user_slug = searchParams.get('user') || ''
    const app_slug = searchParams.get('app') || ''
    
    // Generate title from app slug
    let appTitle = 'WTAF Creation'
    if (app_slug) {
      appTitle = app_slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    }

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#7c3aed',
            fontSize: 32,
            color: 'white',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>
              WTAF.me
            </div>
            <div style={{ fontSize: '24px' }}>
              {appTitle}
            </div>
            <div style={{ fontSize: '16px', marginTop: '10px' }}>
              User: {user_slug} | App: {app_slug}
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    )
  } catch (e: any) {
    console.log(`Failed to generate image: ${e.message}`)
    return new Response(`Failed to generate image`, {
      status: 500,
    })
  }
} 