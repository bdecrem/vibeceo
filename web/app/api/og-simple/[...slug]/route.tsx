import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string[] } }
) {
  try {
    const { slug } = params
    
    let user_slug = ''
    let app_slug = ''
    
    if (slug.length >= 2) {
      user_slug = slug[0]
      app_slug = slug[1]
    } else if (slug.length === 1) {
      app_slug = slug[0]
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
            backgroundColor: '#000',
            color: '#fff',
            fontSize: 48,
            flexDirection: 'column',
          }}
        >
          <div>WTAF.me - WORKING</div>
          <div style={{ fontSize: '32px' }}>User: {user_slug}</div>
          <div style={{ fontSize: '32px' }}>App: {app_slug}</div>
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