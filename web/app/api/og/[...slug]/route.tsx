import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string[] } }
) {
  try {
    const { slug } = params
    
    console.log('🔍 OG Route Debug - Slug array:', slug)
    
    // Extract user_slug and app_slug from the slug array
    let user_slug = ''
    let app_slug = ''
    
    if (slug && slug.length >= 2) {
      user_slug = slug[0]
      app_slug = slug[1]
    } else if (slug && slug.length === 1) {
      app_slug = slug[0]
      user_slug = 'unknown'
    } else {
      // Fallback if no slug provided
      user_slug = 'unknown'
      app_slug = 'wtaf-app'
    }

    console.log('🔍 OG Image Debug - user_slug:', user_slug, 'app_slug:', app_slug)

    // Generate title from app slug
    const appTitle = app_slug === 'wtaf-app' ? 'WTAF Creation' : 
      app_slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    
    console.log('🔍 OG Image Debug - Using title:', appTitle)

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
    console.error(`Failed to generate OG image:`, e)
    
    // Return a basic fallback image on error
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
          WTAF.me - Error
        </div>
      ),
      { width: 1200, height: 630 }
    )
  }
} 