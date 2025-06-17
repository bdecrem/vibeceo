import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const user_slug = searchParams.get('user') || 'unknown'
    const app_slug = searchParams.get('app') || 'wtaf-app'
    
    const pageTitle = "Finally, Someone Who Actually Wants to Hear About Your Startup Idea"
    const theme = { bgColor: '#14b8a6', textColor: 'white' } // Teal theme

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
            background: `linear-gradient(135deg, ${theme.bgColor} 0%, ${theme.bgColor}dd 100%)`,
            fontSize: 32,
            fontWeight: 600,
            color: theme.textColor,
            padding: '60px',
            textAlign: 'center',
          }}
        >
          <div style={{ 
            fontSize: '48px', 
            marginBottom: '40px',
            textShadow: '0 2px 4px rgba(0,0,0,0.3)' 
          }}>
            WTAF.me
          </div>
          
          <div style={{ 
            fontSize: '28px', 
            marginBottom: '30px',
            textAlign: 'center',
            maxWidth: '900px',
            lineHeight: 1.2,
            textShadow: '0 1px 2px rgba(0,0,0,0.2)'
          }}>
            {pageTitle}
          </div>
          
          <div style={{ 
            fontSize: '20px', 
            opacity: 0.9,
            textAlign: 'center',
            marginBottom: '20px'
          }}>
            Vibecoded chaos, shipped via SMS
          </div>
          
          <div style={{ 
            fontSize: '16px', 
            opacity: 0.7,
            fontFamily: 'monospace'
          }}>
            wtaf.me/{user_slug}/{app_slug}
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
          WTAF.me ERROR
        </div>
      ),
      { width: 1200, height: 630 }
    )
  }
} 