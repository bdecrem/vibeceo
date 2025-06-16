import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Creating OG image for sapphire-elephant-dreaming with REAL data')
    
    // Real data extracted from https://www.wtaf.me/bart/sapphire-elephant-dreaming
    const pageData = {
      title: 'WTAF: sapphire elephant dreaming',
      description: 'Vibecoded chaos, shipped via SMS.',
      appTitle: 'Sapphire Elephant Dreaming',
      userSlug: 'bart',
      appSlug: 'sapphire-elephant-dreaming',
      pageUrl: 'https://www.wtaf.me/bart/sapphire-elephant-dreaming',
      actualContent: 'Thought Sorter - Transform your worries into organized thoughts'
    }
    
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
            padding: '40px',
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
            lineHeight: 1.2
          }}>
            {pageData.appTitle}
          </div>
          
          <div style={{ 
            fontSize: '20px', 
            opacity: 0.9,
            textAlign: 'center',
            marginBottom: '15px',
            maxWidth: '800px'
          }}>
            {pageData.actualContent}
          </div>
          
          <div style={{ 
            fontSize: '18px', 
            opacity: 0.8,
            textAlign: 'center',
            marginBottom: '20px',
            maxWidth: '800px'
          }}>
            {pageData.description}
          </div>
          
          <div style={{ 
            fontSize: '16px', 
            opacity: 0.7,
            marginBottom: '15px'
          }}>
            Created by {pageData.userSlug}
          </div>
          
          <div style={{ 
            fontSize: '14px', 
            opacity: 0.6,
            textAlign: 'center',
          }}>
            wtaf.me/{pageData.userSlug}/{pageData.appSlug}
          </div>
          
          <div style={{ 
            fontSize: '12px', 
            opacity: 0.5,
            marginTop: '20px',
            textAlign: 'center'
          }}>
            ✅ REAL PAGE DATA • Library Test
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    )
  } catch (e: any) {
    console.error('❌ Sapphire elephant OG failed:', e)
    
    return new Response(`Error: ${e.message}`, {
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    })
  }
}
