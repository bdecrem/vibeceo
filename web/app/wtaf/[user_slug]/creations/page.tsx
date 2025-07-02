import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import { WtafPageLayout, WtafAppGrid, WtafApp } from '@/components/wtaf'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

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
        Forget
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

  const userStatsForLayout = [
    {
      label: 'Apps Created',
      value: userStats.published_apps,
      color: 'cyan' as const
    },
    {
      label: 'Total Remixes',
      value: userStats.total_remixes_received,
      color: 'pink' as const
    },
    {
      label: 'Followers',
      value: userStats.follower_count,
      color: 'yellow' as const
    }
  ]

  return (
    <WtafPageLayout
      title={`${params.user_slug.toUpperCase()}'S CREATIONS`}
      subtitle="Vibecoded chaos, shipped via SMS"
      stats={userStatsForLayout}
      backLink={{
        href: `/${params.user_slug}`,
        text: `Back to ${params.user_slug}'s profile`
      }}
    >
      <WtafAppGrid 
        apps={apps}
        emptyState={{
          icon: '🤷‍♂️',
          title: 'No apps yet!',
          description: `${params.user_slug} hasn't created any apps yet. Check back later!`
        }}
      />
    </WtafPageLayout>
  )
} 