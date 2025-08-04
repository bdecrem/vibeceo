import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

/* ====== TEMPORARY SIMPLIFIED OG SYSTEM ======
 * Each app type gets a standard OG image:
 * - games → og-type-game.png
 * - web → og-type-web.png  
 * - music → og-type-music.png
 * - ZAD/apps → og-type-app.png
 * - fallback → og-type-fallback.png
 * - MEMES continue using their generated images
 * ============================================ */

// Map app types to their OG images
function getOGImageForType(type: string | null): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://theaf.us'
  
  switch (type?.toLowerCase()) {
    case 'game':
      return `${baseUrl}/og-types/og-type-game.png`
    case 'web':
      return `${baseUrl}/og-types/og-type-web.png`
    case 'music':
      return `${baseUrl}/og-types/og-type-music.png`
    case 'zad':
    case 'app':
      return `${baseUrl}/og-types/og-type-app.png`
    default:
      return `${baseUrl}/og-types/og-type-fallback.png`
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userSlug = searchParams.get('user')
    const appSlug = searchParams.get('app')
    
    if (!userSlug || !appSlug) {
      return NextResponse.json({ error: 'Missing user or app slug' }, { status: 400 })
    }

    console.log(`🎨 Checking OG image for: ${userSlug}/${appSlug}`)
    
    // 1. FIRST CHECK: If og_second_chance exists, use it (for memes and other special cases)
    const { data: contentData } = await supabase
      .from('wtaf_content')
      .select('type, og_image_url, og_second_chance')
      .eq('user_slug', userSlug)
      .eq('app_slug', appSlug)
      .single()
    
    console.log(`🔍 Content check for ${userSlug}/${appSlug}: type="${contentData?.type}", og_second_chance="${contentData?.og_second_chance?.substring(0, 80)}..."`)
    
    // If og_second_chance exists, always use it (this is our override field)
    if (contentData?.og_second_chance) {
      console.log(`🎯 Using og_second_chance image for ${userSlug}/${appSlug}`)
      return NextResponse.json({
        success: true,
        image_url: contentData.og_second_chance,
        cached: true,
        from_second_chance: true,
        user_slug: userSlug,
        app_slug: appSlug
      })
    }
    
    // For memes - check if it's a MEME type or has meme in the og_image_url
    if (contentData?.type === 'MEME' && contentData.og_image_url) {
      console.log(`🎨 Using existing meme OG image for ${userSlug}/${appSlug}`)
      return NextResponse.json({
        success: true,
        image_url: contentData.og_image_url,
        cached: true,
        is_meme: true,
        user_slug: userSlug,
        app_slug: appSlug
      })
    }
    
    // ALSO CHECK: If og_image_url contains "meme-" in the filename, it's a meme!
    if (contentData?.og_image_url && contentData.og_image_url.includes('/meme-')) {
      console.log(`🎨 Detected meme by URL pattern for ${userSlug}/${appSlug}`)
      return NextResponse.json({
        success: true,
        image_url: contentData.og_image_url,
        cached: true,
        is_meme: true,
        user_slug: userSlug,
        app_slug: appSlug
      })
    }
    
    // === SIMPLIFIED TYPE-BASED OG SYSTEM ===
    // Return standard OG image based on app type
    const ogImageUrl = getOGImageForType(contentData?.type)
    console.log(`📐 Using type-based OG image for ${userSlug}/${appSlug} (type: ${contentData?.type || 'fallback'})`)
    
    return NextResponse.json({
      success: true,
      image_url: ogImageUrl,
      cached: true,
      type_based: true,
      app_type: contentData?.type || 'fallback',
      user_slug: userSlug,
      app_slug: appSlug
    })
    
  } catch (error: any) {
    console.error('❌ Error with OG image:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

/* ====== ORIGINAL GENERATION CODE ======
 * The original OG generation code has been removed to simplify the system.
 * It included:
 * - ChatGPT analysis of HTML content
 * - Custom image generation based on app styling
 * - HTML-to-image conversion via HTMLCSS service
 * - Automatic upload to Supabase storage
 * 
 * This code is preserved in the documentation and git history
 * if we need to restore it in the future.
 * ====================================== */