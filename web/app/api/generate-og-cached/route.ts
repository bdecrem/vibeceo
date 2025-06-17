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
    
    // 1. Check if we already have this image in Supabase Storage
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
    
    // 2. Fetch the real page content from Supabase
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

    // 3. Generate OG image via HTMLCSStoImage
    const auth = Buffer.from(`${HTMLCSS_USER_ID}:${HTMLCSS_API_KEY}`).toString('base64')
    
    const imageResponse = await fetch('https://hcti.io/v1/image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`
      },
      body: JSON.stringify({
        html: pageData.html_content,
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
    await supabase
      .from('wtaf_content')
      .update({ 
        og_image_url: supabaseUrl,
        og_image_cached_at: new Date().toISOString()
      })
      .eq('user_slug', userSlug)
      .eq('app_slug', appSlug)
    
    return NextResponse.json({
      success: true,
      image_url: supabaseUrl,
      cached: false,
      title: extractMainTitle(pageData.html_content),
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