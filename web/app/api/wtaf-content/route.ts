import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const user_slug = searchParams.get('user')
    const app_slug = searchParams.get('app')
    
    if (!user_slug || !app_slug) {
      return NextResponse.json({ error: 'Missing user or app slug' }, { status: 400 })
    }
    
    // Fetch the WTAF content from Supabase
    const { data, error } = await supabase
      .from('wtaf_content')
      .select('html_content, coach, original_prompt, created_at')
      .eq('user_slug', user_slug)
      .eq('app_slug', app_slug)
      .eq('status', 'published')
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Error fetching WTAF content:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 