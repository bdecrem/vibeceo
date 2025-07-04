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
    const user_slug = searchParams.get('user_slug')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const offset = (page - 1) * limit
    
    if (!user_slug) {
      return NextResponse.json({ error: 'Missing user slug' }, { status: 400 })
    }

    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json({ error: 'Invalid pagination parameters' }, { status: 400 })
    }
    
    // Fetch user's published apps with social stats and pagination
    const { data: apps, error } = await supabase
      .from('wtaf_content')
      .select(`
        id,
        app_slug,
        original_prompt,
        created_at,
        remix_count,
        is_remix,
        parent_app_id,
        is_featured,
        last_remixed_at,
        type,
        Fave,
        Forget
      `)
      .eq('user_slug', user_slug)
      .eq('status', 'published')
      .or('Forget.is.null,Forget.eq.false')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching user apps:', error)
      return NextResponse.json({ error: 'Failed to fetch apps' }, { status: 500 })
    }

    // Get total count for pagination metadata
    const { count: totalCount, error: countError } = await supabase
      .from('wtaf_content')
      .select('*', { count: 'exact', head: true })
      .eq('user_slug', user_slug)
      .eq('status', 'published')
      .or('Forget.is.null,Forget.eq.false')

    if (countError) {
      console.error('Error getting total count:', countError)
    }

    // Get user's social stats
    const { data: userStats, error: statsError } = await supabase
      .from('user_social_stats')
      .select('*')
      .eq('user_slug', user_slug)
      .single()

    if (statsError) {
      console.warn('Error fetching user stats:', statsError)
    }

    return NextResponse.json({
      success: true,
      apps: apps || [],
      user_stats: userStats || {
        user_slug,
        follower_count: 0,
        following_count: 0,
        total_remix_credits: 0,
        apps_created_count: totalCount || 0,
        published_apps: totalCount || 0,
        total_remixes_received: 0
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
    
  } catch (error: any) {
    console.error('Error in user-creations API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 