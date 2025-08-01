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
  const h1Match = htmlContent.match(/<h1[^>]*>(.*?)<\/h1>/i)
  if (h1Match) {
    return h1Match[1].replace(/<[^>]*>/g, '').trim()
  }
  
  const titleMatch = htmlContent.match(/<title[^>]*>(.*?)<\/title>/i)
  if (titleMatch) {
    const title = titleMatch[1].replace(/<[^>]*>/g, '').trim()
    if (title && !title.includes('WTAF')) {
      return title
    }
  }
  
  return "WTAF Creation"
}

// Function to extract styling from HTML content
function extractStyling(htmlContent: string) {
  const styling = {
    backgroundColor: '#1a1a1a', // Dark fallback
    titleColor: '#ffffff',      // White fallback
    titleFont: 'Space Grotesk', // Default font
    titleSize: '72px',          // Default size
    textTransform: 'none',      // Default capitalization
    letterSpacing: 'normal',    // Default letter spacing
    gradient: null as string | null
  }
  
  // Extract inline styles from body
  const bodyMatch = htmlContent.match(/<body[^>]*style=['"](.*?)['"][^>]*>/i)
  if (bodyMatch) {
    const bodyStyle = bodyMatch[1]
    
    // Look for background color
    const bgColorMatch = bodyStyle.match(/background-color:\s*([^;]+)/i)
    if (bgColorMatch) {
      styling.backgroundColor = bgColorMatch[1].trim()
    }
    
    // Look for background gradient
    const gradientMatch = bodyStyle.match(/background:\s*(linear-gradient[^;]+)/i)
    if (gradientMatch) {
      styling.gradient = gradientMatch[1].trim()
    }
  }
  
  // Extract all CSS from style tags (handle multiple style tags)
  const styleTagMatches = htmlContent.match(/<style[^>]*>([\s\S]*?)<\/style>/gi)
  if (styleTagMatches) {
    for (const styleMatch of styleTagMatches) {
      const css = styleMatch.replace(/<style[^>]*>|<\/style>/gi, '')
      
      // Look for body background (handle multi-line gradients)
      const bodyStyleMatch = css.match(/body\s*{([^}]*)}/i)
      if (bodyStyleMatch) {
        const bodyCSS = bodyStyleMatch[1]
        
        // Look for background-color first (most specific)
        const bgColorMatch = bodyCSS.match(/background-color:\s*([^;]+)/i)
        if (bgColorMatch) {
          styling.backgroundColor = bgColorMatch[1].trim()
        }
        
        // Look for ALL background declarations (to handle multiple background properties)
        const backgroundMatches = bodyCSS.match(/background(?:-image|):\s*([^;]+)/gi)
        if (backgroundMatches) {
          // Process all background declarations and prioritize gradients
          let foundGradient = false
          for (const match of backgroundMatches) {
            const bg = match.replace(/background(?:-image|)?:\s*/i, '').trim()
            if (bg.includes('linear-gradient') || bg.includes('radial-gradient')) {
              // Clean up multi-line gradients
              styling.gradient = bg.replace(/\s+/g, ' ').trim()
              foundGradient = true
              console.log('🎨 Found gradient in background declaration:', styling.gradient)
            } else if (!foundGradient && !bgColorMatch) {
              // Only use as background color if we didn't find a gradient or background-color
              styling.backgroundColor = bg
            }
          }
        }
        
        // Alternative approach: look for lines containing "background:" and "linear-gradient" 
        if (!styling.gradient) {
          const gradientLineMatch = bodyCSS.match(/background:\s*([^;]*linear-gradient[^;]*)/i)
          if (gradientLineMatch) {
            styling.gradient = gradientLineMatch[1].trim().replace(/\s+/g, ' ')
            console.log('🎨 Found gradient via line match:', styling.gradient)
          }
        }
        
        // Fallback: look for background without colon (handles "background linear-gradient...")
        if (!styling.gradient && !bgColorMatch) {
          const bgFallbackMatch = bodyCSS.match(/background\s+(linear-gradient[^;]*)/i)
          if (bgFallbackMatch) {
            styling.gradient = bgFallbackMatch[1].trim().replace(/\s+/g, ' ')
            console.log('🎨 Found gradient via fallback match:', styling.gradient)
          }
        }
        
        // Look for font-family in body
        const bodyFontMatch = bodyCSS.match(/font-family:\s*([^;]+)/i)
        if (bodyFontMatch) {
          styling.titleFont = bodyFontMatch[1].replace(/['"]/g, '').trim()
        }
      }
      
      // Look for h1 styling (handle multi-line)
      const h1Match = css.match(/h1[^{]*{([^}]*)}/i)
      if (h1Match) {
        const h1Style = h1Match[1]
        
        const colorMatch = h1Style.match(/color:\s*([^;]+)/i)
        if (colorMatch) {
          styling.titleColor = colorMatch[1].trim()
        }
        
        const fontMatch = h1Style.match(/font-family:\s*([^;]+)/i)
        if (fontMatch) {
          styling.titleFont = fontMatch[1].replace(/['"]/g, '').trim()
        }
        
        const sizeMatch = h1Style.match(/font-size:\s*([^;]+)/i)
        if (sizeMatch) {
          styling.titleSize = sizeMatch[1].trim()
        }
        
        const transformMatch = h1Style.match(/text-transform:\s*([^;]+)/i)
        if (transformMatch) {
          styling.textTransform = transformMatch[1].trim()
        }
        
        const spacingMatch = h1Style.match(/letter-spacing:\s*([^;]+)/i)
        if (spacingMatch) {
          styling.letterSpacing = spacingMatch[1].trim()
        }
      }
      
      // Look for common title classes
      const titleClassMatch = css.match(/\.(title|main|heading|hero|headline|container h1)[^{]*{([^}]*)}/i)
      if (titleClassMatch) {
        const titleStyle = titleClassMatch[2]
        
        const colorMatch = titleStyle.match(/color:\s*([^;]+)/i)
        if (colorMatch) {
          styling.titleColor = colorMatch[1].trim()
        }
      }
    }
  }
  
  // Handle different units and convert to pixels for OG image
  if (styling.titleSize.includes('vw')) {
    const vwValue = parseFloat(styling.titleSize.replace('vw', ''))
    // Convert vw to pixels assuming 1200px viewport width
    styling.titleSize = `${Math.round(vwValue * 12)}px`
  } else if (styling.titleSize.includes('em')) {
    const emValue = parseFloat(styling.titleSize.replace('em', ''))
    // Convert em to pixels assuming 16px base font size
    styling.titleSize = `${Math.round(emValue * 16)}px`
  } else if (styling.titleSize.includes('rem')) {
    const remValue = parseFloat(styling.titleSize.replace('rem', ''))
    // Convert rem to pixels assuming 16px root font size
    styling.titleSize = `${Math.round(remValue * 16)}px`
  }
  
  console.log('🎨 Extracted styling:', styling)
  return styling
}

// Function to generate custom HTML for OG image
function generateCustomHTML(title: string, userSlug: string, appSlug: string, styling: any) {
  // Use extracted styling or fallbacks
  const background = styling.gradient || `background-color: ${styling.backgroundColor}`
  const titleFontFamily = styling.titleFont.includes(',') ? styling.titleFont : `'${styling.titleFont}', 'Space Grotesk', sans-serif`
  
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            width: 1200px;
            height: 630px;
            ${background.startsWith('background') ? background : `background: ${background}`};
            font-family: ${titleFontFamily};
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            position: relative;
            overflow: hidden;
        }
        
        .headline {
            font-size: 96px;
            font-weight: 700;
            color: ${styling.titleColor};
            text-shadow: 4px 4px 0px rgba(0,0,0,0.4);
            text-align: center;
            text-transform: ${styling.textTransform};
            letter-spacing: ${styling.letterSpacing};
            z-index: 10;
            max-width: 90%;
            word-wrap: break-word;
            line-height: 1.1;
        }
        
        .floating-emoji {
            position: absolute;
            font-size: 120px;
            animation: float 3s ease-in-out infinite;
            opacity: 0.8;
        }
        
        .emoji-1 {
            top: 80px;
            left: 150px;
            animation-delay: 0s;
        }
        
        .emoji-2 {
            top: 150px;
            right: 120px;
            animation-delay: 1s;
        }
        
        .emoji-3 {
            bottom: 150px;
            left: 120px;
            animation-delay: 2s;
        }
        
        .badge {
            position: absolute;
            bottom: 30px;
            right: 30px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 12px 20px;
            border-radius: 25px;
            font-size: 16px;
            font-weight: 600;
            border: 2px solid rgba(255, 255, 255, 0.3);
            z-index: 10;
        }
        
        @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-15px) rotate(3deg); }
        }
    </style>
</head>
<body>
    <div class="floating-emoji emoji-1">✨</div>
    <div class="floating-emoji emoji-2">🚀</div>
    <div class="floating-emoji emoji-3">⚡</div>
    
    <h1 class="headline">${title}</h1>
    
    <div class="badge">Built with WTAF ⚡</div>
</body>
</html>
`
}

async function downloadImageFromURL(imageUrl: string): Promise<ArrayBuffer> {
  const response = await fetch(imageUrl)
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status}`)
  }
  return response.arrayBuffer()
}

async function uploadToSupabaseStorage(
  imageBuffer: ArrayBuffer, 
  fileName: string
): Promise<string> {
  // Ensure bucket exists
  const { data: buckets } = await supabase.storage.listBuckets()
  const bucketExists = buckets?.some(bucket => bucket.name === 'og-images')
  
  if (!bucketExists) {
    console.log('📦 Creating og-images bucket...')
    const { error: bucketError } = await supabase.storage.createBucket('og-images', {
      public: true,
      allowedMimeTypes: ['image/png', 'image/jpeg']
    })
    
    if (bucketError) {
      throw new Error(`Failed to create bucket: ${bucketError.message}`)
    }
  }

  // Upload to Supabase Storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('og-images')
    .upload(fileName, imageBuffer, {
      contentType: 'image/png',
      upsert: true // Replace if exists
    })

  if (uploadError) {
    throw new Error(`Supabase upload failed: ${uploadError.message}`)
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('og-images')
    .getPublicUrl(fileName)

  return urlData.publicUrl
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userSlug = searchParams.get('user')
    const appSlug = searchParams.get('app')
    
    if (!userSlug || !appSlug) {
      return NextResponse.json({ error: 'Missing user or app slug' }, { status: 400 })
    }

    const fileName = `${userSlug}-${appSlug}.png`
    
    console.log(`🎨 Checking cached OG image for: ${userSlug}/${appSlug}`)
    
    // 1. FIRST CHECK: If og_second_chance exists, use it (for memes and other special cases)
    const { data: contentData } = await supabase
      .from('wtaf_content')
      .select('type, og_image_url, og_second_chance')
      .eq('user_slug', userSlug)
      .eq('app_slug', appSlug)
      .single()
    
    console.log(`🔍 Content check for ${userSlug}/${appSlug}: type="${contentData?.type}", og_second_chance="${contentData?.og_second_chance?.substring(0, 80)}...", og_image_url="${contentData?.og_image_url?.substring(0, 80)}..."`)
    
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
    
    // Legacy checks for backwards compatibility
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
    
    // 2. Check if we already have this image in Supabase Storage
    const { data: existingFile } = await supabase.storage
      .from('og-images')
      .list('', { search: fileName })
    
    if (existingFile && existingFile.length > 0) {
      console.log(`⚡ Using cached OG image for ${userSlug}/${appSlug}`)
      
      const { data: urlData } = supabase.storage
        .from('og-images')
        .getPublicUrl(fileName)
      
      return NextResponse.json({
        success: true,
        image_url: urlData.publicUrl,
        cached: true,
        user_slug: userSlug,
        app_slug: appSlug
      })
    }
    
    console.log(`🔄 Generating new OG image for: ${userSlug}/${appSlug}`)
    
    // 3. Fetch the real page content from Supabase
    const { data: pageData, error: pageError } = await supabase
      .from('wtaf_content')
      .select('html_content, original_prompt, created_at')
      .eq('user_slug', userSlug)
      .eq('app_slug', appSlug)
      .eq('status', 'published')
      .single()

    if (pageError || !pageData) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 })
    }

    // 3. Generate custom OG image with extracted styling
    console.log('🎨 Extracting styling from page content...')
    
    // Extract title from the HTML content
    let title = extractMainTitle(pageData.html_content)
    console.log(`📝 Extracted title: "${title}"`)
    
    // Extract styling from the HTML content
    const styling = extractStyling(pageData.html_content)
    
    // Apply text transformation to title if specified
    if (styling.textTransform === 'uppercase') {
      title = title.toUpperCase()
      console.log(`🔤 Applied uppercase transformation: "${title}"`)
    } else if (styling.textTransform === 'lowercase') {
      title = title.toLowerCase()
      console.log(`🔤 Applied lowercase transformation: "${title}"`)
    } else if (styling.textTransform === 'capitalize') {
      title = title.replace(/\b\w/g, l => l.toUpperCase())
      console.log(`🔤 Applied capitalize transformation: "${title}"`)
    }
    
    // Generate custom HTML with the extracted title and styling
    const customHTML = generateCustomHTML(title, userSlug, appSlug, styling)
    console.log('🖼️ Generated custom branded OG HTML')
    
    const auth = Buffer.from(`${HTMLCSS_USER_ID}:${HTMLCSS_API_KEY}`).toString('base64')
    
    const imageResponse = await fetch('https://hcti.io/v1/image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`
      },
      body: JSON.stringify({
        html: customHTML,
        viewport_width: 1200,
        viewport_height: 630,
        device_scale_factor: 1
      })
    })
    
    if (!imageResponse.ok) {
      throw new Error(`HTMLCSStoImage failed: ${imageResponse.status}`)
    }
    
    const imageData = await imageResponse.json()
    console.log(`✅ Generated image via HTMLCSStoImage: ${imageData.url}`)
    
    // 4. Download the image
    const imageBuffer = await downloadImageFromURL(imageData.url)
    console.log(`📥 Downloaded image (${imageBuffer.byteLength} bytes)`)
    
    // 5. Upload to Supabase Storage
    const supabaseUrl = await uploadToSupabaseStorage(imageBuffer, fileName)
    console.log(`📤 Uploaded to Supabase Storage: ${supabaseUrl}`)
    
    // 6. Update the wtaf_content record with the cached URL
    // ONLY update if there's no existing meme image
    const { data: existingContent } = await supabase
      .from('wtaf_content')
      .select('og_image_url')
      .eq('user_slug', userSlug)
      .eq('app_slug', appSlug)
      .single()
    
    // Don't overwrite existing meme images
    if (!existingContent?.og_image_url?.includes('/meme-')) {
      await supabase
        .from('wtaf_content')
        .update({ 
          og_image_url: supabaseUrl,
          og_image_cached_at: new Date().toISOString()
        })
        .eq('user_slug', userSlug)
        .eq('app_slug', appSlug)
      
      console.log(`✅ Updated og_image_url to: ${supabaseUrl}`)
    } else {
      console.log(`⚠️ Skipping update - existing meme image found: ${existingContent.og_image_url}`)
    }
    
    return NextResponse.json({
      success: true,
      image_url: supabaseUrl,
      cached: false,
      title: title,
      user_slug: userSlug,
      app_slug: appSlug
    })
    
  } catch (error: any) {
    console.error('❌ Error generating cached OG image:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
} 