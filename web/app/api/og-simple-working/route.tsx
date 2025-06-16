import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

// Remove edge runtime to avoid issues
// export const runtime = 'edge'

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Creating ACTUAL preview for golden-fox-painting page (no edge runtime)')
    
    // Data for golden-fox-painting page
    const pageData = {
      user_slug: 'bart',
      app_slug: 'golden-fox-painting',
      coach: 'Claude',
      title: 'Golden Fox Painting'
    }
    
    const publicUrl = `https://wtaf.me/${pageData.user_slug}/${pageData.app_slug}`
    
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
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <div style={{ fontSize: '48px', fontWeight: 'bold', marginBottom: '30px' }}>
            WTAF.me
          </div>
          
          <div style={{ 
            fontSize: '36px', 
            fontWeight: '600',
            marginBottom: '25px',
            textAlign: 'center',
            maxWidth: '900px',
          }}>
            {pageData.title}
          </div>
          
          <div style={{ 
            fontSize: '20px', 
            opacity: 0.9,
            textAlign: 'center',
            marginBottom: '15px'
          }}>
            Built with WTAF • Vibecoded chaos
          </div>
          
          <div style={{ 
            fontSize: '18px', 
            opacity: 0.8,
            marginBottom: '10px'
          }}>
            Coach: {pageData.coach}
          </div>
          
          <div style={{ 
            fontSize: '16px', 
            opacity: 0.7,
            marginBottom: '15px'
          }}>
            Created by {pageData.user_slug}
          </div>
          
          <div style={{ 
            fontSize: '14px', 
            opacity: 0.6,
            textAlign: 'center',
          }}>
            {publicUrl}
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    )
  } catch (e: any) {
    console.error('❌ OG generation failed:', e)
    
    return new Response(`Error: ${e.message}`, {
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    })
  }
}
