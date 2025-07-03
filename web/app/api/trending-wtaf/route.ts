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

    // Step 1: Get apps with remixes, ordered by total remix count
    const { data: remixedApps, error: remixError } = await supabase
      .from('trending_apps_7d')
      .select(`
        id,
        app_slug,
        user_slug,
        original_prompt,
        created_at,
        remix_count,
        last_remixed_at,
        recent_remixes,
        is_remix,
        parent_app_id,
        is_featured,
        Fave,
        Forget
      `)
      .gt('remix_count', 0)  // Only apps with remixes
      .order('remix_count', { ascending: false })  // Most remixed first
      .order('recent_remixes', { ascending: false })  // Recent activity as tiebreaker
      .range(offset, offset + limit - 1)

    if (remixError) {
      console.error('Error fetching remixed apps:', remixError)
      return NextResponse.json({ error: 'Failed to fetch trending apps' }, { status: 500 })
    }

    let allApps = remixedApps || []

    // Step 2: If we have less than requested limit, backfill with recent apps
    if (allApps.length < limit) {
      const remainingLimit = limit - allApps.length
      const { data: recentApps, error: recentError } = await supabase
        .from('trending_apps_7d')
        .select(`
          id,
          app_slug,
          user_slug,
          original_prompt,
          created_at,
          remix_count,
          last_remixed_at,
          recent_remixes,
          is_remix,
          parent_app_id,
          is_featured,
          Fave,
          Forget
        `)
        .eq('remix_count', 0)  // Only apps with no remixes
        .order('created_at', { ascending: false })  // Most recent first
        .range(0, remainingLimit - 1)  // Fill remaining slots

      if (!recentError && recentApps) {
        allApps = [...allApps, ...recentApps]
      }
    }

    // Get total count for pagination metadata
    const { count: totalCount, error: countError } = await supabase
      .from('trending_apps_7d')
      .select('*', { count: 'exact', head: true })
      .not('Forget', 'is', true)

    if (countError) {
      console.error('Error getting total count:', countError)
    }

    // Filter out forgotten apps in JavaScript and add default type
    const trendingApps = (allApps || [])
      .filter((app: any) => !app.Forget)
      .map((app: any) => ({ ...app, type: 'web' })) // Default type for trending apps

    const totalTrendingApps = trendingApps.length
    const totalRemixesThisWeek = trendingApps.reduce((sum: number, app: any) => sum + (app.recent_remixes || 0), 0)
    const appsWithRecentActivity = trendingApps.filter((app: any) => (app.recent_remixes || 0) > 0).length

    return NextResponse.json({
      apps: trendingApps,
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