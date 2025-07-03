import React from "react"
import TrendingUI from "@/components/wtaf/trending-ui"

export const dynamic = 'force-dynamic'

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
}

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
      <div style={{ padding: '50px', textAlign: 'center', color: '#ff6600' }}>
        <h1>Failed to load trending data</h1>
        <p>Please try again later</p>
      </div>
    )
  }

  return <TrendingUI apps={data.apps} stats={data.stats} />
}
