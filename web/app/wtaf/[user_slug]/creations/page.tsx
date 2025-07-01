import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import RemixButton from '@/components/remix-button'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

interface App {
  id: string
  app_slug: string
  original_prompt: string
  created_at: string
  remix_count: number
  is_remix: boolean
  parent_app_id: string | null
  is_featured: boolean
  last_remixed_at: string | null
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

async function getUserCreations(userSlug: string): Promise<{ apps: App[], userStats: UserStats } | null> {
  try {
    // Fetch user's published apps with social stats
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
        last_remixed_at
      `)
      .eq('user_slug', userSlug)
      .eq('status', 'published')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching user apps:', error)
      return null
    }

    // Get user's social stats
    const { data: userStats, error: statsError } = await supabase
      .from('user_social_stats')
      .select('*')
      .eq('user_slug', userSlug)
      .single()

    if (statsError) {
      console.warn('Error fetching user stats:', statsError)
    }

    return {
      apps: apps || [],
      userStats: userStats || {
        user_slug: userSlug,
        follower_count: 0,
        following_count: 0,
        total_remix_credits: 0,
        apps_created_count: apps?.length || 0,
        published_apps: apps?.length || 0,
        total_remixes_received: 0
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
    <div 
      className="min-h-screen py-8 px-4"
      style={{
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d1b69 25%, #8b0000 50%, #4b0082 75%, #000000 100%)',
        backgroundSize: '400% 400%'
      }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 
            className="text-5xl font-bold text-white mb-4"
            style={{
              fontFamily: 'Space Grotesk, sans-serif',
              textShadow: '0 0 15px #00ffff'
            }}
          >
            {params.user_slug}'s Creations
          </h1>
          <p 
            className="text-xl mb-8"
            style={{
              color: '#ff0080',
              fontWeight: '500',
              letterSpacing: '1px'
            }}
          >
            Vibecoded chaos, shipped via SMS
          </p>
          
          {/* User Stats */}
          <div className="flex justify-center gap-8 text-white mb-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-cyan-400">{userStats.published_apps}</div>
              <div className="text-sm text-gray-300">Apps Created</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-pink-400">{userStats.total_remixes_received}</div>
              <div className="text-sm text-gray-300">Total Remixes</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-400">{userStats.follower_count}</div>
              <div className="text-sm text-gray-300">Followers</div>
            </div>
          </div>
        </div>

        {/* Apps List */}
        {apps.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🤷‍♂️</div>
            <h3 className="text-2xl text-white mb-4">No apps yet!</h3>
            <p className="text-gray-300 text-lg">
              {params.user_slug} hasn't created any apps yet. Check back later!
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {apps.map((app) => (
              <div 
                key={app.id} 
                className="relative bg-black/40 backdrop-blur-sm border border-white/10 rounded-3xl overflow-hidden transition-all duration-300 hover:bg-black/60 hover:-translate-y-2"
                style={{
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
                }}
              >
                <div className="flex flex-col lg:flex-row items-center gap-12 p-8">
                  {/* OG Image */}
                  <div className="flex-shrink-0 w-full lg:flex-1 lg:max-w-[60%] relative">
                    <Link href={`/${params.user_slug}/${app.app_slug}`}>
                      <img
                        src={`https://tqniseocczttrfwtpbdr.supabase.co/storage/v1/object/public/og-images/${params.user_slug}-${app.app_slug}.png`}
                        alt={`${app.app_slug} preview`}
                        className="w-full h-auto rounded-2xl border-2 border-white/30 transition-all duration-300 hover:scale-[1.02] cursor-pointer"
                        style={{
                          filter: 'drop-shadow(0 0 20px rgba(255, 0, 128, 0.5))',
                          aspectRatio: '2/1'
                        }}
                      />
                      {/* Slug Overlay */}
                      <div 
                        className="absolute bottom-4 left-4 px-3 py-1 rounded-lg text-xs font-medium tracking-wider uppercase backdrop-blur-sm border transition-all duration-300 hover:bg-black/80"
                        style={{
                          background: 'rgba(0, 0, 0, 0.7)',
                          color: '#00ffff',
                          borderColor: 'rgba(0, 255, 255, 0.3)',
                          fontFamily: 'Space Grotesk, monospace',
                          textShadow: '0 0 8px rgba(0, 255, 255, 0.5)',
                          fontSize: '10px',
                          letterSpacing: '0.5px'
                        }}
                      >
                        {app.app_slug}
                      </div>
                    </Link>
                  </div>

                  {/* Content */}
                  <div className="flex-1 lg:max-w-[40%] space-y-6">
                    {/* The Prompt Label */}
                    <div className="text-gray-400 text-lg font-semibold tracking-wider uppercase">
                      THE PROMPT:
                    </div>

                    {/* Prompt Text */}
                    <div className="bg-black/30 border-2 border-cyan-400/50 rounded-2xl p-6">
                      <p 
                        className="text-cyan-300 text-xl font-medium leading-relaxed"
                        style={{
                          fontFamily: 'Space Grotesk, monospace',
                          fontStyle: 'italic'
                        }}
                      >
                        "{app.original_prompt}"
                      </p>
                    </div>

                    {/* Meta Info */}
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <span className="text-gray-300">
                        Created {new Date(app.created_at).toLocaleDateString()}
                      </span>
                      {app.remix_count > 0 && (
                        <span className="bg-orange-500/20 text-orange-300 px-3 py-1 rounded-full border border-orange-500/30">
                          🔥 {app.remix_count} remix{app.remix_count !== 1 ? 'es' : ''}
                        </span>
                      )}
                      {app.is_remix && (
                        <span className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full border border-blue-500/30">
                          🔄 Remix
                        </span>
                      )}
                      {app.is_featured && (
                        <span className="bg-yellow-500/20 text-yellow-300 px-3 py-1 rounded-full border border-yellow-500/30">
                          ⭐ Featured
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex justify-center">
                      <RemixButton appSlug={app.app_slug} userSlug={params.user_slug} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Back to Profile */}
        <div className="text-center mt-16">
          <Link
            href={`/${params.user_slug}`}
            className="inline-flex items-center gap-2 text-cyan-300 hover:text-white transition-colors text-lg"
          >
            ← Back to {params.user_slug}'s profile
          </Link>
        </div>
      </div>
    </div>
  )
} 