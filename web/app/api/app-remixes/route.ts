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

    // Get direct remixes (generation 1 only)
    const { data: directRemixes, error: directError } = await supabase
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
      .eq('generation_level', 1)
      .order('created_at', { ascending: false })

    if (directError) {
      console.error('Error fetching direct remixes:', directError)
      return NextResponse.json({ error: 'Failed to fetch direct remixes' }, { status: 500 })
    }

    // Get complete genealogy tree using the new recursive function
    const { data: genealogyTree, error: genealogyError } = await supabase
      .rpc('get_app_genealogy_json', { app_id: parentApp.id })

    if (genealogyError) {
      console.error('Error fetching genealogy tree:', genealogyError)
      // Don't fail the request if genealogy fails, just return null
    }

    // Get genealogy statistics
    const { data: genealogyStats, error: statsError } = await supabase
      .rpc('get_app_genealogy_stats', { app_id: parentApp.id })

    if (statsError) {
      console.error('Error fetching genealogy stats:', statsError)
    }

    // Parse the genealogy JSON result if it's a string
    let parsedGenealogyTree = null
    if (genealogyTree) {
      try {
        parsedGenealogyTree = typeof genealogyTree === 'string' ? JSON.parse(genealogyTree) : genealogyTree
      } catch (e) {
        console.error('Error parsing genealogy JSON:', e)
        parsedGenealogyTree = genealogyTree
      }
    }

    return NextResponse.json({
      success: true,
      parent_app: parentApp,
      direct_remixes: directRemixes || [],
      remix_count: directRemixes?.length || 0,
      genealogy_tree: parsedGenealogyTree,
      genealogy_stats: genealogyStats?.[0] || {
        total_descendants: 0,
        max_generation: 0,
        direct_remixes: 0,
        most_recent_remix: null,
        deepest_path: []
      }
    })
    
  } catch (error: any) {
    console.error('Error in app-remixes API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 