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
    const format = searchParams.get('format') || 'tree' // 'tree' or 'flat'
    
    if (!app_slug || !user_slug) {
      return NextResponse.json({ error: 'Missing app or user slug' }, { status: 400 })
    }
    
    // Get the parent app
    const { data: parentApp, error: parentError } = await supabase
      .from('wtaf_content')
      .select('id, app_slug, user_slug, original_prompt, created_at, remix_count')
      .eq('app_slug', app_slug)
      .eq('user_slug', user_slug)
      .eq('status', 'published')
      .single()

    if (parentError || !parentApp) {
      return NextResponse.json({ error: 'App not found' }, { status: 404 })
    }

    // Get complete genealogy data using the recursive function
    const { data: genealogyData, error: genealogyError } = await supabase
      .rpc('get_app_genealogy', { app_id: parentApp.id })

    if (genealogyError) {
      console.error('Error fetching genealogy data:', genealogyError)
      return NextResponse.json({ error: 'Failed to fetch genealogy data' }, { status: 500 })
    }

    // Get genealogy statistics
    const { data: genealogyStats, error: statsError } = await supabase
      .rpc('get_app_genealogy_stats', { app_id: parentApp.id })

    if (statsError) {
      console.error('Error fetching genealogy stats:', statsError)
    }

    // Process the genealogy data
    const stats = genealogyStats?.[0] || {
      total_descendants: 0,
      max_generation: 0,
      direct_remixes: 0,
      most_recent_remix: null,
      deepest_path: []
    }

    if (format === 'flat') {
      // Return flat structure (list of all descendants)
      return NextResponse.json({
        success: true,
        parent_app: {
          id: parentApp.id,
          app_slug: parentApp.app_slug,
          user_slug: parentApp.user_slug,
          original_prompt: parentApp.original_prompt,
          created_at: parentApp.created_at,
          remix_count: parentApp.remix_count || 0,
          generation_level: 0
        },
        descendants: genealogyData || [],
        stats,
        format: 'flat'
      })
    } else {
      // Return tree structure (organized by generation)
      const treeStructure = buildTreeStructure(genealogyData || [])
      
      return NextResponse.json({
        success: true,
        parent_app: {
          id: parentApp.id,
          app_slug: parentApp.app_slug,
          user_slug: parentApp.user_slug,
          original_prompt: parentApp.original_prompt,
          created_at: parentApp.created_at,
          remix_count: parentApp.remix_count || 0,
          generation_level: 0
        },
        genealogy_tree: treeStructure,
        stats,
        format: 'tree'
      })
    }
    
  } catch (error: any) {
    console.error('Error in genealogy API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function buildTreeStructure(descendants: any[]): any {
  // Group descendants by the generation level calculated by SQL (don't override it!)
  const generations = descendants.reduce((acc, item) => {
    // Use the generation level from the SQL function - it's already correct!
    const generation = item.generation_level || 1
    if (!acc[generation]) {
      acc[generation] = []
    }
    acc[generation].push({
      id: item.child_app_id,
      app_slug: item.child_app_slug,
      user_slug: item.child_user_slug,
      original_prompt: item.child_prompt,
      created_at: item.child_created_at,
      remix_prompt: item.remix_prompt,
      generation_level: generation, // Use SQL-calculated generation (not path-based)
      parent_app_id: item.parent_app_id,
      parent_app_slug: item.parent_app_slug,
      parent_user_slug: item.parent_user_slug,
      path: item.path,
      depth: item.path ? item.path.length - 1 : 0
    })
    return acc
  }, {} as Record<number, any[]>)

  // Sort each generation by creation date
  Object.keys(generations).forEach(gen => {
    generations[parseInt(gen)].sort((a: any, b: any) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
  })

  return {
    generations,
    generation_count: Object.keys(generations).length,
    max_generation: Math.max(...Object.keys(generations).map(g => parseInt(g)), 0),
    total_descendants: descendants.length
  }
} 