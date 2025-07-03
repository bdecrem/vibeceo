import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import CreationsUI from "@/components/wtaf/creations-ui"

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: { user_slug: string } }): Promise<Metadata> {
  return {
    title: params.user_slug
  }
}

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

interface WtafApp {
  id: string
  app_slug: string
  user_slug: string
  original_prompt: string
  created_at: string
  remix_count: number
  recent_remixes?: number
  is_remix: boolean
  parent_app_id: string | null
  is_featured: boolean
  last_remixed_at: string | null
  Fave?: boolean
  Forget?: boolean
  type: string
}

interface UserStats {
  user_slug: string
  follower_count: number
  following_count: number
  total_remix_credits: number
  apps_created_count: number
  published_apps: number
  total_remixes_received: number
}

async function getUserCreations(userSlug: string): Promise<{ apps: WtafApp[], userStats: UserStats } | null> {
  try {
    // Fetch user's published apps with social stats (including FAVE and FORGET flags)
    const { data: allApps, error } = await supabase
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
        Fave,
        Forget,
        type
      `)
      .eq('user_slug', userSlug)
      .eq('status', 'published')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching user apps:', error)
      return null
    }

    // Filter out forgotten apps (same as SMS INDEX command)
    const visibleApps = allApps?.filter(app => !app.Forget) || []
    
    // Sort favorites to the top, then by creation date
    const apps = visibleApps.sort((a, b) => {
      // Favorites go first
      if (a.Fave && !b.Fave) return -1
      if (!a.Fave && b.Fave) return 1
      // Then sort by date (newest first)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

    // Count followers from wtaf_social_connections table
    const { data: followersData, error: followersError } = await supabase
      .from('wtaf_social_connections')
      .select('follower_user_slug')
      .eq('following_user_slug', userSlug)
      .eq('connection_type', 'follow')

    const followerCount = followersData?.length || 0

    // Count following from wtaf_social_connections table  
    const { data: followingData, error: followingError } = await supabase
      .from('wtaf_social_connections')
      .select('following_user_slug')
      .eq('follower_user_slug', userSlug)
      .eq('connection_type', 'follow')

    const followingCount = followingData?.length || 0

    // Calculate total remixes received (sum of remix_count from all user's apps)
    const totalRemixesReceived = apps?.reduce((sum, app) => sum + (app.remix_count || 0), 0) || 0

    // Get remix credits from sms_subscribers as fallback
    const { data: subscriberData } = await supabase
      .from('sms_subscribers')
      .select('total_remix_credits')
      .eq('slug', userSlug)
      .single()

    const totalRemixCredits = subscriberData?.total_remix_credits || 0

    return {
      apps: apps?.map(app => ({
        ...app,
        user_slug: userSlug // Ensure user_slug is included
      })) || [],
      userStats: {
        user_slug: userSlug,
        follower_count: followerCount,
        following_count: followingCount,
        total_remix_credits: totalRemixCredits,
        apps_created_count: apps?.length || 0,
        published_apps: apps?.length || 0,
        total_remixes_received: totalRemixesReceived
      }
    }
  } catch (error) {
    console.error('Error in getUserCreations:', error)
    return null
  }
}

export default async function CreationsPage({ params }: { params: { user_slug: string } }) {
  const data = await getUserCreations(params.user_slug)
  
  if (!data) {
    notFound()
  }

  const { apps, userStats } = data

  return (
    <CreationsUI 
      apps={apps} 
      userStats={userStats} 
      userSlug={params.user_slug} 
    />
  )
} 