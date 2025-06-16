import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

// Remove edge runtime to allow external fetch
// export const runtime = 'edge'

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Fetching real WTAF page data')
    
    // Fetch the actual page
    const pageUrl = 'https://www.wtaf.me/bart/sapphire-elephant-dreaming'
    const response = await fetch(pageUrl)
    const html = await response.text()
    
    console.log('✅ Fetched page HTML')
    
    // Extract OG data from the HTML
    const ogTitleMatch = html.match(/<meta property="og:title" content="([^"]*)"/)
    const ogDescMatch = html.match(/<meta property="og:description" content="([^"]*)"/)
    const ogImageMatch = html.match(/<meta property="og:image" content="([^"]*)"/)
    const titleMatch = html.match(/<title>([^<]*)<\/title>/)
    
    const pageData = {
      title: ogTitleMatch?.[1] || titleMatch?.[1] || 'WTAF Page',
      description: ogDescMatch?.[1] || 'Vibecoded chaos, shipped via SMS.',
      ogImageUrl: ogImageMatch?.[1] || '',
      userSlug: 'bart',
      appSlug: 'sapphire-elephant-dreaming',
      appTitle: 'Sapphire Elephant Dreaming'
    }
    
    console.log('✅ Extracted data:', pageData)
    
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
            {pageUrl}
          </div>
          
          <div style={{ 
            fontSize: '12px', 
            opacity: 0.5,
            marginTop: '20px',
            textAlign: 'center'
          }}>
            🧪 Generated from REAL page data
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    )
  } catch (e: any) {
    console.error('❌ Real page OG generation failed:', e)
    
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
            backgroundColor: '#dc2626',
            fontSize: 24,
            color: 'white',
          }}
        >
          <div>❌ Error Loading Real Page</div>
          <div style={{ fontSize: '16px', marginTop: '20px', opacity: 0.8 }}>
            {e.message}
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    )
  }
}
