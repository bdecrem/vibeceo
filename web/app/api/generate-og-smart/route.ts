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

function analyzePageContent(htmlContent: string, originalPrompt: string) {
  const content = (htmlContent + ' ' + originalPrompt).toLowerCase()
  
  // Detect content type - order matters! More specific patterns first
  let contentType = 'general'
  let emoji = '⚡'
  let layoutStyle = 'simple'
  
  // Check for testimonials/apex predator FIRST (more specific)
  if (content.includes('testimonial') || content.includes('apex') || content.includes('predator') || 
      content.includes('bart decrem') || content.includes('decrem')) {
    contentType = 'testimonial'
    emoji = '🦅'
    layoutStyle = 'bold'
  }
  // Check for pets/animals SECOND  
  else if (content.includes('dog') || content.includes('pet') || content.includes('animal') || 
           content.includes('gorgeous') || content.includes('friend') || content.includes('puppy')) {
    contentType = 'pets'
    emoji = '🐕'
    layoutStyle = 'cute'
  }
  // Check for business content
  else if (content.includes('business') || content.includes('restaurant') || content.includes('shop')) {
    contentType = 'business'
    emoji = '🏪'
    layoutStyle = 'professional'
  }
  // Games last (least specific)
  else if (content.includes('game') || content.includes('play') || content.includes('puzzle')) {
    contentType = 'game'
    emoji = '🎮'
    layoutStyle = 'fun'
  }
  
  return { contentType, emoji, layoutStyle }
}

function extractAdvancedTheme(htmlContent: string, contentType: string) {
  const html = htmlContent.toLowerCase()
  
  // Hot pink theme
  if (html.includes('#ff69b4') || html.includes('#ff1493') || html.includes('hotpink')) {
    return {
      background: 'linear-gradient(45deg, #ff69b4, #ff1493, #ff69b4, #ff1493)',
      textColor: 'white',
      accentColor: '#ff69b4'
    }
  }
  
  // Red theme (testimonials)
  if (html.includes('#ff0000') || html.includes('red') || contentType === 'testimonial') {
    return {
      background: 'linear-gradient(-45deg, #FF0000, #FF4D4D, #800000, #2B0000)',
      textColor: 'white',
      accentColor: '#FF4D4D'
    }
  }
  
  // Pastel theme (pets/cute content)
  if (contentType === 'pets' || html.includes('pastel') || html.includes('cute')) {
    return {
      background: 'linear-gradient(45deg, #ffd6a5, #ffb4a2, #e7c6ff, #b5deff)',
      textColor: '#2d3436',
      accentColor: '#ff9a9e'
    }
  }
  
  // Purple gaming theme
  if (contentType === 'game' || html.includes('purple') || html.includes('game')) {
    return {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      textColor: 'white',
      accentColor: '#667eea'
    }
  }
  
  // Professional blue theme
  if (contentType === 'business' || html.includes('business')) {
    return {
      background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
      textColor: 'white',
      accentColor: '#2a5298'
    }
  }
  
  // Default teal theme
  return {
    background: 'linear-gradient(135deg, #14b8a6, #0891b2)',
    textColor: 'white',
    accentColor: '#14b8a6'
  }
}

function createSmartOGTemplate(
  title: string, 
  theme: any, 
  contentType: string, 
  emoji: string, 
  layoutStyle: string,
  userSlug: string, 
  appSlug: string
): string {
  
  const floatingElements = {
    game: ['🎮', '🕹️', '⚡', '🎯'],
    testimonial: ['🦅', '⚡', '🔥', '💻'],
    pets: ['🐕', '🌸', '✨', '🎨'],
    business: ['🏪', '💼', '📈', '⭐'],
    general: ['⚡', '🚀', '✨', '💫']
  }
  
  const emojis = floatingElements[contentType as keyof typeof floatingElements] || floatingElements.general
  
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;700;900&family=Inter:wght@300;400;500;600&display=swap');
      
      body {
        margin: 0;
        font-family: 'Inter', sans-serif;
        width: 1200px;
        height: 630px;
        background: ${theme.background};
        background-size: 400% 400%;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        overflow: hidden;
        color: ${theme.textColor};
        animation: gradientShift 15s ease infinite;
      }
      
      @keyframes gradientShift {
        0%, 100% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
      }
      
      @keyframes float {
        0%, 100% { transform: translateY(0px) rotate(0deg); }
        50% { transform: translateY(-15px) rotate(5deg); }
      }
      
      .floating-emoji {
        position: absolute;
        font-size: 2.5rem;
        opacity: 0.6;
        animation: float 6s ease-in-out infinite;
      }
      
      #emoji1 { top: 8%; left: 8%; animation-delay: 0s; }
      #emoji2 { top: 15%; right: 12%; animation-delay: 2s; }
      #emoji3 { bottom: 15%; left: 10%; animation-delay: 1s; }
      #emoji4 { bottom: 8%; right: 8%; animation-delay: 3s; }
      
      .container {
        background: rgba(255, 255, 255, 0.15);
        backdrop-filter: blur(15px);
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: 25px;
        padding: 50px;
        text-align: center;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
        max-width: 900px;
        width: 90%;
      }
      
      .brand {
        font-family: 'Space Grotesk', sans-serif;
        font-size: 3rem;
        font-weight: 700;
        margin-bottom: 25px;
        text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        letter-spacing: -1px;
      }
      
      .title {
        font-family: 'Space Grotesk', sans-serif;
        font-size: ${title.length > 30 ? '2.5rem' : '3rem'};
        font-weight: 600;
        line-height: 1.2;
        margin-bottom: 25px;
        text-shadow: 0 1px 2px rgba(0,0,0,0.2);
      }
      
      .subtitle {
        font-size: 1.3rem;
        opacity: 0.9;
        margin-bottom: 20px;
        font-weight: 400;
      }
      
      .url {
        font-family: monospace;
        font-size: 1rem;
        opacity: 0.7;
        background: rgba(255, 255, 255, 0.2);
        padding: 10px 20px;
        border-radius: 12px;
        display: inline-block;
        border: 1px solid rgba(255, 255, 255, 0.3);
      }
      
      .content-emoji {
        font-size: 4rem;
        margin: 20px 0;
        opacity: 0.8;
      }
    </style>
  </head>
  <body>
    <div class="floating-emoji" id="emoji1">${emojis[0]}</div>
    <div class="floating-emoji" id="emoji2">${emojis[1]}</div>
    <div class="floating-emoji" id="emoji3">${emojis[2]}</div>
    <div class="floating-emoji" id="emoji4">${emojis[3]}</div>
    
    <div class="container">
      <div class="brand">WTAF.me</div>
      <div class="title">${title}</div>
      <div class="content-emoji">${emoji}</div>
      <div class="subtitle">Vibecoded chaos, shipped via SMS</div>
      <div class="url">wtaf.me/${userSlug}/${appSlug}</div>
    </div>
  </body>
  </html>`
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userSlug = searchParams.get('user')
    const appSlug = searchParams.get('app')
    
    if (!userSlug || !appSlug) {
      return NextResponse.json({ error: 'Missing user or app slug' }, { status: 400 })
    }

    console.log(`🎨 Smart OG generation for: ${userSlug}/${appSlug}`)
    
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

    // 2. Smart analysis of content
    const mainTitle = extractMainTitle(data.html_content)
    const { contentType, emoji, layoutStyle } = analyzePageContent(data.html_content, data.original_prompt)
    const theme = extractAdvancedTheme(data.html_content, contentType)
    
    console.log(`📝 Analyzed: "${mainTitle}" | Type: ${contentType} | Style: ${layoutStyle}`)
    
    // 3. Send the ACTUAL page HTML to get real screenshot
    const auth = Buffer.from(`${HTMLCSS_USER_ID}:${HTMLCSS_API_KEY}`).toString('base64')
    
    const imageResponse = await fetch('https://hcti.io/v1/image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`
      },
      body: JSON.stringify({
        html: data.html_content,  // Use the REAL page HTML
        viewport_width: 1200,
        viewport_height: 630,
        device_scale_factor: 1
      })
    })
    
    if (!imageResponse.ok) {
      throw new Error(`HTMLCSStoImage failed: ${imageResponse.status}`)
    }
    
    const imageData = await imageResponse.json()
    
    console.log(`✅ Smart OG image generated: ${imageData.url}`)
    
    return NextResponse.json({
      success: true,
      image_url: imageData.url,
      title: mainTitle,
      content_type: contentType,
      user_slug: userSlug,
      app_slug: appSlug
    })
    
  } catch (error: any) {
    console.error('❌ Error generating smart OG image:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
} 