import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string[] } }
) {
  try {
    const { slug } = params
    
    // Extract user_slug and app_slug from the slug array
    let user_slug = ''
    let app_slug = ''
    
    if (slug.length >= 2) {
      user_slug = slug[0]
      app_slug = slug[1]
    } else if (slug.length === 1) {
      app_slug = slug[0]
    }

    // Skip Supabase for now - just use static values
    const appTitle = `Debug: ${app_slug}`
    const appDescription = 'Debug OG Image Generation'

    // Generate the OG image with simpler styling
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
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>
            🔧 DEBUG MODE
          </div>
          
          <div style={{ fontSize: '24px', marginBottom: '10px' }}>
            User: {user_slug || 'none'}
          </div>
          
          <div style={{ fontSize: '24px', marginBottom: '10px' }}>
            App: {app_slug || 'none'}
          </div>

          <div style={{ fontSize: '18px' }}>
            {appDescription}
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    )
  } catch (e: any) {
    console.log(`Failed to generate debug image: ${e.message}`)
    return new Response(`Failed to generate debug image: ${e.message}`, {
      status: 500,
    })
  }
} 