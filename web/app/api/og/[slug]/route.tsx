import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params
    
    // Extract user_slug and app_slug from the full slug
    // Expected format: "user-123/golden-fox-dancing" or just "golden-fox-dancing"
    let user_slug = ''
    let app_slug = slug
    
    if (slug.includes('/')) {
      const parts = slug.split('/')
      user_slug = parts[0]
      app_slug = parts[1]
    }

    // Fetch app data from Supabase (if available)
    let appTitle = 'WTAF Creation'
    let appDescription = 'Built with WTAF.me - Ship from your flip phone'
    let requestType = 'website'
    
    try {
      // Try to fetch from Supabase if we have the proper URL structure
      if (user_slug && app_slug) {
        const supabaseUrl = process.env.SUPABASE_URL
        const supabaseKey = process.env.SUPABASE_SERVICE_KEY
        
        if (supabaseUrl && supabaseKey) {
          const response = await fetch(
            `${supabaseUrl}/rest/v1/wtaf_content?user_slug=eq.${user_slug}&app_slug=eq.${app_slug}&select=original_prompt`,
            {
              headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json'
              }
            }
          )
          
          if (response.ok) {
            const data = await response.json()
            if (data && data.length > 0) {
              const prompt = data[0].original_prompt || ''
              appTitle = prompt.length > 60 ? prompt.substring(0, 57) + '...' : prompt
              
              // Detect type for better description
              const promptLower = prompt.toLowerCase()
              if (promptLower.includes('game') || promptLower.includes('pong') || promptLower.includes('tetris')) {
                requestType = 'game'
                appDescription = '🎮 Interactive game built via SMS'
              } else if (promptLower.includes('calculator') || promptLower.includes('tool') || promptLower.includes('app')) {
                requestType = 'app'
                appDescription = '🔧 Productivity tool built via SMS'
              }
            }
          }
        }
      }
    } catch (error) {
      console.log('Could not fetch app data:', error)
    }

    // Generate the OG image
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
            backgroundImage: 'linear-gradient(135deg, #7c3aed 0%, #3b0764 50%, #000000 100%)',
            fontSize: 32,
            fontWeight: 600,
          }}
        >
          {/* Background decorative elements */}
          <div
            style={{
              position: 'absolute',
              top: '50px',
              left: '50px',
              fontSize: '80px',
              opacity: 0.3,
            }}
          >
            💀
          </div>
          <div
            style={{
              position: 'absolute',
              bottom: '50px',
              right: '50px',
              fontSize: '80px',
              opacity: 0.3,
            }}
          >
            🔥
          </div>
          
          {/* Main content */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '80px',
              textAlign: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              borderRadius: '24px',
              border: '2px solid rgba(167, 139, 250, 0.3)',
              backdropFilter: 'blur(16px)',
              maxWidth: '900px',
            }}
          >
            {/* WTAF.me branding */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '32px',
              }}
            >
              <div style={{ marginRight: '16px', fontSize: '48px' }}>💀</div>
              <div
                style={{
                  fontSize: '64px',
                  fontWeight: 800,
                  background: 'linear-gradient(90deg, #ec4899, #a855f7, #ec4899)',
                  backgroundClip: 'text',
                  color: 'transparent',
                }}
              >
                WTAF.me
              </div>
              <div style={{ marginLeft: '16px', fontSize: '48px' }}>🔥</div>
            </div>

            {/* App title */}
            <div
              style={{
                fontSize: '36px',
                fontWeight: 700,
                color: 'white',
                marginBottom: '16px',
                lineHeight: 1.2,
              }}
            >
              {appTitle}
            </div>

            {/* App description */}
            <div
              style={{
                fontSize: '24px',
                color: '#d1d5db',
                marginBottom: '24px',
              }}
            >
              {appDescription}
            </div>

            {/* Type indicator */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: 'rgba(236, 72, 153, 0.2)',
                padding: '12px 24px',
                borderRadius: '9999px',
                border: '1px solid rgba(236, 72, 153, 0.3)',
              }}
            >
              <span style={{ marginRight: '8px', fontSize: '20px' }}>
                {requestType === 'game' ? '🎮' : requestType === 'app' ? '🔧' : '🌐'}
              </span>
              <span style={{ color: '#fbb6ce', fontSize: '18px', fontWeight: 600 }}>
                {requestType === 'game' ? 'Game' : requestType === 'app' ? 'App' : 'Website'}
              </span>
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