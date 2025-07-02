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
    // Get featured apps - first try apps explicitly marked as featured
    const { data: featuredApps, error: featuredError } = await supabase
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
      .eq('is_featured', true)  // Only featured apps
      .order('created_at', { ascending: false })  // Most recent first
      .limit(20)

    if (featuredError) {
      console.error('Error fetching featured apps:', featuredError)
      return NextResponse.json({ error: 'Failed to fetch featured apps' }, { status: 500 })
    }

    let allApps = featuredApps || []

    // If we have less than 20 featured apps, backfill with highly remixed apps
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
          last_remixed_at,
          recent_remixes,
          is_remix,
          parent_app_id,
          is_featured,
          Fave,
          Forget
        `)
        .gt('remix_count', 1)  // Apps with multiple remixes
        .order('remix_count', { ascending: false })  // Most remixed first
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

    // Filter out forgotten apps in JavaScript
    const featuredAppsList = (allApps || []).filter((app: any) => !app.Forget)

    // Get type data for each app
    for (const app of featuredAppsList) {
      const { data: contentData } = await supabase
        .from('wtaf_content')
        .select('type')
        .eq('user_slug', app.user_slug)
        .eq('app_slug', app.app_slug)
        .single()
      
      ;(app as any).type = contentData?.type || 'web'
    }

    const totalFeaturedApps = featuredAppsList.length
    const totalRemixes = featuredAppsList.reduce((sum: number, app: any) => sum + (app.remix_count || 0), 0)
    const appsWithRemixes = featuredAppsList.filter((app: any) => (app.remix_count || 0) > 0).length

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
