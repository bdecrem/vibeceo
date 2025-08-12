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
    const includeAll = searchParams.get('all') === 'true'  // Show hidden/forgotten apps if ?all=true
    const offset = (page - 1) * limit

    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json({ error: 'Invalid pagination parameters' }, { status: 400 })
    }

    // Build query for recent apps
    let query = supabase
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
      .eq('status', 'published')  // Only published apps

    // Only exclude forgotten apps if not showing all
    if (!includeAll) {
      query = query.not('Forget', 'is', true)
    }

    // Get recent apps, ordered by creation date
    const { data: recentApps, error: appsError } = await query
      .order('created_at', { ascending: false })  // Most recent first
      .range(offset, offset + limit - 1)

    if (appsError) {
      console.error('Error fetching recent apps:', appsError)
      return NextResponse.json({ error: 'Failed to fetch recent apps' }, { status: 500 })
    }

    // Get total count for pagination metadata
    let countQuery = supabase
      .from('wtaf_content')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'published')
    
    if (!includeAll) {
      countQuery = countQuery.not('Forget', 'is', true)
    }

    const { count: totalCount, error: countError } = await countQuery

    if (countError) {
      console.error('Error getting total count:', countError)
    }

    // Calculate stats for recent apps
    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    
    const appsToday = (recentApps || []).filter((app: any) => 
      new Date(app.created_at) > oneDayAgo
    ).length
    
    const appsThisWeek = (recentApps || []).filter((app: any) => 
      new Date(app.created_at) > oneWeekAgo
    ).length

    return NextResponse.json({
      apps: recentApps || [],
      stats: {
        totalApps: totalCount || 0,
        appsToday,
        appsThisWeek,
        period: 'all time'
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
    console.error('Error in recents API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}