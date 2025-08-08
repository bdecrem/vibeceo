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
        og_image_url
      `)
      .eq('is_featured', true)  // Only featured apps
      .order('featured_at', { ascending: false })  // Most recently featured first
      .limit(20)

    if (featuredError) {
      console.error('Error fetching featured apps:', featuredError)
      return NextResponse.json({ error: 'Failed to fetch featured apps' }, { status: 500 })
    }

    let allApps = featuredApps || []

    // DISABLED: Auto-backfill with highly remixed apps - Featured now shows only manually curated apps
    /*
    if (allApps.length < 20) {
      const { data: popularApps, error: popularError } = await supabase
        .from('trending_apps_7d')
        .select(`
          id,
          app_slug,
          user_slug,
          original_prompt,
          created_at,
          remix_count,
          total_descendants,
          last_remixed_at,
          recent_remixes,
          is_remix,
          parent_app_id,
          is_featured,
          Fave,
          Forget
        `)
        .gt('total_descendants', 1)  // Apps with multiple total descendants
        .order('total_descendants', { ascending: false })  // Most descendants first
        .limit(20 - allApps.length)  // Fill remaining slots

      if (!popularError && popularApps) {
        // Filter out apps already in featuredApps to avoid duplicates
        const existingSlugs = new Set(allApps.map((app: any) => `${app.user_slug}/${app.app_slug}`))
        const uniquePopularApps = popularApps.filter((app: any) => 
          !existingSlugs.has(`${app.user_slug}/${app.app_slug}`)
        )
        allApps = [...allApps, ...uniquePopularApps]
      }
    }
    */

    // Filter out forgotten apps in JavaScript
    const featuredAppsList = (allApps || []).filter((app: any) => !app.Forget)

    // No need to fetch type data separately - we already have it from the main query

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
