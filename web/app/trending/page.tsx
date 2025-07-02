import { WtafPageLayout, WtafAppGrid, WtafApp } from '@/components/wtaf'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

interface TrendingStats {
  totalTrendingApps: number
  totalRemixesThisWeek: number
  appsWithRecentActivity: number
  period: string
}

interface TrendingData {
  apps: WtafApp[]
  stats: TrendingStats
}

async function getTrendingData(): Promise<TrendingData | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/trending-wtaf`, {
      cache: 'no-store'
    })
    
    if (!response.ok) {
      console.error('Failed to fetch trending data:', response.status)
      return null
    }
    
    return await response.json()
  } catch (error) {
    console.error('Error fetching trending data:', error)
    return null
  }
}

export default async function TrendingPage() {
  const data = await getTrendingData()
  
  if (!data) {
    return (
      <WtafPageLayout
        title="TRENDING"
        subtitle="Apps going viral via SMS"
      >
        <div className="text-center py-12">
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-2xl text-white mb-4">Failed to load trending</h3>
          <p className="text-gray-300 text-lg">
            Try refreshing the page or check back later.
          </p>
        </div>
      </WtafPageLayout>
    )
  }

  const { apps, stats } = data
  
  const trendingStats = [
    {
      label: 'Trending Apps',
      value: stats.totalTrendingApps,
      color: 'orange' as const
    },
    {
      label: 'Total Remixes', 
      value: stats.totalRemixesThisWeek,
      color: 'pink' as const
    },
    {
      label: 'With Remixes',
      value: stats.appsWithRecentActivity,
      color: 'cyan' as const
    }
  ]

  return (
    <WtafPageLayout
      title="TRENDING"
      subtitle="Apps going viral via SMS (last 7 days)"
      stats={trendingStats}
    >
      <WtafAppGrid 
        apps={apps}
        showUserInMeta={true}
        emptyState={{
          icon: '📈',
          title: 'No trending apps yet!',
          description: 'Create and remix some apps to see them trending here.'
        }}
      />
    </WtafPageLayout>
  )
} 