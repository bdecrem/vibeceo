import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const offset = (page - 1) * limit

    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json({ error: 'Invalid pagination parameters' }, { status: 400 })
    }

    // TEMPORARY OVERRIDE: Manual curation only - comment out to restore algorithmic trending
    // Get ALL manually marked trending apps, ordered by total remix count then recency
    const { data: trendingApps, error: trendingError } = await supabase
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
        is_trending,
        Fave,
        Forget,
        landscape_image_url,
        og_image_url,
        type
      `)
      .eq('is_trending', true)             // OVERRIDE: Only manually marked trending apps
      .not('Forget', 'is', true)           // Exclude only explicitly forgotten apps (not null or false)
      .order('total_descendants', { ascending: false, nullsFirst: false })  // Most descendants first, nulls last
      .order('created_at', { ascending: false })          // Recency as tiebreaker
      .range(offset, offset + limit - 1)

    if (trendingError) {
      console.error('Error fetching trending apps:', trendingError)
      return NextResponse.json({ error: 'Failed to fetch trending apps' }, { status: 500 })
    }

    // No backfill, no filtering - just use what we got from the query
    const allApps = trendingApps || []

    // Get total count for pagination metadata
    const { count: totalCount, error: countError } = await supabase
      .from('wtaf_content')
      .select('*', { count: 'exact', head: true })
      .eq('is_trending', true)
      .not('Forget', 'is', true)

    /* ORIGINAL COUNT LOGIC - Uncomment to restore automatic counting
    const { count: totalCount, error: countError } = await supabase
      .from('trending_apps_7d')
      .select('*', { count: 'exact', head: true })
      .not('Forget', 'is', true)
    */

    if (countError) {
      console.error('Error getting total count:', countError)
    }

    // No additional filtering needed - already filtered in query
    // Just ensure type field exists (for backwards compatibility)
    const finalApps = (allApps || [])
      .map((app: any) => ({ ...app, type: app.type || 'web' })) // Default type if missing

    const totalTrendingApps = finalApps.length
    const totalRemixesThisWeek = finalApps.reduce((sum: number, app: any) => sum + (app.total_descendants || 0), 0)
    const appsWithRecentActivity = finalApps.filter((app: any) => (app.total_descendants || 0) > 0).length

    /* ORIGINAL STATS LOGIC - Uncomment to restore recent_remixes calculations
    const totalRemixesThisWeek = trendingApps.reduce((sum: number, app: any) => sum + (app.recent_remixes || 0), 0)
    const appsWithRecentActivity = trendingApps.filter((app: any) => (app.recent_remixes || 0) > 0).length
    */

    return NextResponse.json({
      apps: finalApps,
      stats: {
        totalTrendingApps,
        totalRemixesThisWeek,
        appsWithRecentActivity,
        period: '7 days'
      },
      pagination: {
        page,
        limit,
        totalCount: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limit),
        hasNextPage: page < Math.ceil((totalCount || 0) / limit),
        hasPreviousPage: page > 1
      }
    })

  } catch (error) {
    console.error('Error in trending API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 