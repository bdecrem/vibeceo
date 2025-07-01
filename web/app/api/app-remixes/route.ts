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
    const app_slug = searchParams.get('app')
    const user_slug = searchParams.get('user')
    
    if (!app_slug || !user_slug) {
      return NextResponse.json({ error: 'Missing app or user slug' }, { status: 400 })
    }
    
    // First get the parent app ID
    const { data: parentApp, error: parentError } = await supabase
      .from('wtaf_content')
      .select('id, app_slug, user_slug, original_prompt, created_at')
      .eq('app_slug', app_slug)
      .eq('user_slug', user_slug)
      .eq('status', 'published')
      .single()

    if (parentError || !parentApp) {
      return NextResponse.json({ error: 'App not found' }, { status: 404 })
    }

    // Get all remixes of this app from the lineage table
    const { data: remixes, error: remixError } = await supabase
      .from('wtaf_remix_lineage')
      .select(`
        *,
        child_content:wtaf_content!wtaf_remix_lineage_child_app_id_fkey(
          app_slug,
          user_slug,
          original_prompt,
          created_at
        )
      `)
      .eq('parent_app_id', parentApp.id)
      .order('created_at', { ascending: false })

    if (remixError) {
      console.error('Error fetching remixes:', remixError)
      return NextResponse.json({ error: 'Failed to fetch remixes' }, { status: 500 })
    }

    // Get genealogy tree (recursively find all descendants)
    const { data: genealogy, error: genealogyError } = await supabase
      .rpc('get_app_genealogy', { app_id: parentApp.id })
      .single()

    return NextResponse.json({
      success: true,
      parent_app: parentApp,
      direct_remixes: remixes || [],
      remix_count: remixes?.length || 0,
      genealogy_tree: genealogy || null
    })
    
  } catch (error: any) {
    console.error('Error in app-remixes API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 