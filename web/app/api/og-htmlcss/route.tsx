import { NextRequest, NextResponse } from 'next/server'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

// Load environment variables from .env.local
const envPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath })
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userSlug = searchParams.get('user') || 'wtaf'
    const appSlug = searchParams.get('app') || 'test-app'
    
    const appTitle = appSlug.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
    
    console.log(`🎨 Generating OG via HTMLCSStoImage for: ${userSlug}/${appSlug}`)
    
    // Get credentials from environment
    const userId = process.env.HTMLCSS_USER_ID
    const apiKey = process.env.HTMLCSS_API_KEY
    
    if (!userId || !apiKey) {
      throw new Error('HTMLCSStoImage credentials not found in environment variables')
    }
    
    // HTML template for the OG image
    const html = `
      <div style="
        width: 1200px;
        height: 630px;
        background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: white;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        position: relative;
        overflow: hidden;
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
          font-size: 36px;
          font-weight: 600;
          margin-bottom: 20px;
          text-align: center;
          max-width: 800px;
          line-height: 1.2;
          text-shadow: 0 1px 2px rgba(0,0,0,0.3);
        ">
          ${appTitle}
        </div>
        
        <div style="
          font-size: 20px;
          opacity: 0.9;
          text-align: center;
          margin-bottom: 30px;
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
        
        <!-- Decorative elements -->
        <div style="
          position: absolute;
          top: -50px;
          right: -50px;
          width: 200px;
          height: 200px;
          background: rgba(255,255,255,0.1);
          border-radius: 50%;
        "></div>
        
        <div style="
          position: absolute;
          bottom: -30px;
          left: -30px;
          width: 150px;
          height: 150px;
          background: rgba(255,255,255,0.05);
          border-radius: 50%;
        "></div>
      </div>
    `
    
    // Create authorization header
    const auth = Buffer.from(`${userId}:${apiKey}`).toString('base64')
    
    // Call HTMLCSStoImage API
    const response = await fetch('https://hcti.io/v1/image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`
      },
      body: JSON.stringify({
        html: html,
        viewport_width: 1200,
        viewport_height: 630,
        device_scale_factor: 1
      })
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTMLCSStoImage API error: ${response.status} - ${errorText}`)
    }
    
    const data = await response.json()
    
    console.log(`✅ OG image generated: ${data.url}`)
    
    // Return the image URL
    return NextResponse.json({
      success: true,
      image_url: data.url,
      user_slug: userSlug,
      app_slug: appSlug,
      app_title: appTitle
    })
    
  } catch (error: any) {
    console.error('❌ HTMLCSStoImage OG generation failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
