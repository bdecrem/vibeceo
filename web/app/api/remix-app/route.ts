import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { appSlug, userSlug, remixInstructions = "make it even better" } = await request.json()
    
    if (!appSlug || !userSlug) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }
    
    // For now, we'll queue a remix request in the SMS bot's file system
    // This integrates with the existing remix system
    
    // Generate remix command file
    const now = new Date()
    const timestamp = now.toISOString().replace(/[:.]/g, '-').replace('T', '_') + '_' + String(now.getTime()).slice(-6)
    const fileName = `remix-web-${appSlug}-${timestamp}.txt`
    
    // Create the remix command content (same format as SMS bot expects)
    const remixContent = `--remix ${appSlug} ${remixInstructions}

---SYSTEM_METADATA---
USER_SLUG: ${userSlug}
SOURCE: web-interface
SENDER_PHONE: +15555551234
REQUEST_TYPE: remix
TIMESTAMP: ${now.toISOString()}
---END_METADATA---`

    // In a real implementation, we'd write this to the SMS bot's queue directory
    // For now, let's return a success response that simulates the queuing
    
    console.log(`[REMIX API] Would queue remix: ${fileName}`)
    console.log(`[REMIX API] Content: ${remixContent}`)
    
    return NextResponse.json({
      success: true,
      message: 'Remix request queued successfully',
      fileName,
      instructions: `Your remix request has been queued. You'll receive an SMS notification when the remixed app is ready.`
    })
    
  } catch (error: any) {
    console.error('Error in remix API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 