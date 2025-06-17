import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

// HTMLCSStoImage credentials
const HTMLCSS_USER_ID = process.env.HTMLCSS_USER_ID!
const HTMLCSS_API_KEY = process.env.HTMLCSS_API_KEY!

function extractMainTitle(htmlContent: string): string {
  // Look for h1 tags first
  const h1Match = htmlContent.match(/<h1[^>]*>(.*?)<\/h1>/i)
  if (h1Match) {
    return h1Match[1].replace(/<[^>]*>/g, '').trim()
  }
  
  // Look for title tag
  const titleMatch = htmlContent.match(/<title[^>]*>(.*?)<\/title>/i)
  if (titleMatch) {
    const title = titleMatch[1].replace(/<[^>]*>/g, '').trim()
    if (title && !title.includes('WTAF')) {
      return title
    }
  }
  
  return "WTAF Creation"
}

function extractThemeColors(htmlContent: string): { background: string, textColor: string } {
  // Look for hot pink theme
  if (htmlContent.includes('#ff69b4') || htmlContent.includes('#ff1493')) {
    return {
      background: 'linear-gradient(45deg, #ff69b4, #ff1493, #ff69b4, #ff1493)',
      textColor: 'white'
    }
  }
  
  // Look for purple theme (tattoo parlors)
  if (htmlContent.includes('#610c6f') || htmlContent.includes('#2d0a3e') || htmlContent.includes('purple')) {
    return {
      background: 'linear-gradient(240deg, #1a1a1a, #2d0a3e, #610c6f, #1a1a1a)',
      textColor: 'white'
    }
  }
  
  // Look for other gradient backgrounds
  if (htmlContent.includes('#FF6B6B') || htmlContent.includes('#4ECDC4')) {
    return {
      background: 'linear-gradient(45deg, #FF6B6B, #4ECDC4, #45B7D1, #96E6B3)',
      textColor: '#2D3436'
    }
  }
  
  // Default teal theme
  return {
    background: 'linear-gradient(135deg, #14b8a6, #0891b2)',
    textColor: 'white'
  }
}

function createOGTemplate(title: string, theme: { background: string, textColor: string }, userSlug: string, appSlug: string): string {
  return `
  <div style="
    width: 1200px;
    height: 630px;
    background: ${theme.background};
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: ${theme.textColor};
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    padding: 80px;
    box-sizing: border-box;
    text-align: center;
  ">
    <div style="
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      border-radius: 20px;
      padding: 60px;
      max-width: 900px;
      border: 1px solid rgba(255, 255, 255, 0.2);
    ">
      <div style="
        font-size: 48px;
        font-weight: bold;
        margin-bottom: 30px;
        text-shadow: 0 2px 4px rgba(0,0,0,0.3);
      ">
        WTAF.me
      </div>
      
      <div style="
        font-size: ${title.length > 40 ? '32px' : '40px'};
        font-weight: 600;
        line-height: 1.2;
        margin-bottom: 30px;
        text-shadow: 0 1px 2px rgba(0,0,0,0.2);
      ">
        ${title}
      </div>
      
      <div style="
        font-size: 20px;
        opacity: 0.9;
        margin-bottom: 20px;
      ">
        Vibecoded chaos, shipped via SMS
      </div>
      
      <div style="
        font-size: 16px;
        opacity: 0.7;
        font-family: monospace;
      ">
        wtaf.me/${userSlug}/${appSlug}
      </div>
    </div>
  </div>`
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userSlug = searchParams.get('user')
    const appSlug = searchParams.get('app')
    
    if (!userSlug || !appSlug) {
      return NextResponse.json({ error: 'Missing user or app slug' }, { status: 400 })
    }

    console.log(`🎨 Generating OG image for: ${userSlug}/${appSlug}`)
    
    // 1. Fetch the real page content from Supabase
    const { data, error } = await supabase
      .from('wtaf_content')
      .select('html_content, original_prompt, created_at')
      .eq('user_slug', userSlug)
      .eq('app_slug', appSlug)
      .eq('status', 'published')
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 })
    }

    // 2. Extract key elements
    const mainTitle = extractMainTitle(data.html_content)
    const theme = extractThemeColors(data.html_content)
    
    console.log(`📝 Extracted title: "${mainTitle}"`)
    
    // 3. Create proper OG template
    const ogHTML = createOGTemplate(mainTitle, theme, userSlug, appSlug)
    
    // 4. Send to HTMLCSStoImage
    const auth = Buffer.from(`${HTMLCSS_USER_ID}:${HTMLCSS_API_KEY}`).toString('base64')
    
    const imageResponse = await fetch('https://hcti.io/v1/image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`
      },
      body: JSON.stringify({
        html: ogHTML,
        viewport_width: 1200,
        viewport_height: 630,
        device_scale_factor: 1
      })
    })
    
    if (!imageResponse.ok) {
      throw new Error(`HTMLCSStoImage failed: ${imageResponse.status}`)
    }
    
    const imageData = await imageResponse.json()
    
    console.log(`✅ OG image generated: ${imageData.url}`)
    
    return NextResponse.json({
      success: true,
      image_url: imageData.url,
      title: mainTitle,
      user_slug: userSlug,
      app_slug: appSlug
    })
    
  } catch (error: any) {
    console.error('❌ Error generating OG image:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
} 