import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function GET() {
  try {
    // Get featured apps directly from wtaf_content table (not from view which may be cached)
    const { data: featuredApps, error: featuredError } = await supabase
      .from('wtaf_content')
      .select(`
        id,
        app_slug,
        user_slug,
        original_prompt,
        created_at,
        remix_count,
        total_descendants,
        last_remixed_at,
        is_remix,
        parent_app_id,
        is_featured,
        featured_at,
        Fave,
        Forget,
        type,
        landscape_image_url,
        og_image_url,
        status
      `)
      .eq('is_featured', true)  // Only featured apps
      .not('Forget', 'is', true)  // Exclude only explicitly forgotten apps
      .order('featured_at', { ascending: false })  // Most recently featured first
      .limit(20)

    if (featuredError) {
      console.error('Error fetching featured apps:', featuredError)
      return NextResponse.json({ error: 'Failed to fetch featured apps' }, { status: 500 })
    }

    // featuredApps already has all the data we need including type and image URLs
    const featuredAppsList = featuredApps || []

    // Calculate recent_remixes for each app (last 7 days activity)
    for (const app of featuredAppsList) {
      // Get remix activity from the last 7 days
      const { data: recentRemixData } = await supabase
        .from('wtaf_remix_lineage')
        .select('id')
        .eq('parent_app_id', app.id)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      
      ;(app as any).recent_remixes = recentRemixData?.length || 0
    }

    const totalFeaturedApps = featuredAppsList.length
    const totalRemixes = featuredAppsList.reduce((sum: number, app: any) => sum + (app.total_descendants || 0), 0)
    const appsWithRemixes = featuredAppsList.filter((app: any) => (app.total_descendants || 0) > 0).length

    return NextResponse.json({
      apps: featuredAppsList,
      stats: {
        totalTrendingApps: totalFeaturedApps,
        totalRemixesThisWeek: totalRemixes,  
        appsWithRecentActivity: appsWithRemixes,
        period: 'featured'
      }
    })

  } catch (error) {
    console.error('Error in featured API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
