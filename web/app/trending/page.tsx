"use client"

import React, { useState, useEffect } from "react"
import TrendingUI from "@/components/wtaf/trending-ui"

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

export default function TrendingPage() {
  const [data, setData] = useState<TrendingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTrendingData = async () => {
      try {
        const response = await fetch('/api/trending-wtaf', {
          cache: 'no-store'
        })
        
        if (!response.ok) {
          throw new Error(`Failed to fetch trending data: ${response.status}`)
        }
        
        const result = await response.json()
        setData(result)
      } catch (err) {
        console.error('Error fetching trending data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load trending data')
      } finally {
        setLoading(false)
      }
    }

    fetchTrendingData()
  }, [])

  if (loading) {
    return (
      <div style={{ padding: '50px', textAlign: 'center', color: '#ff6600' }}>
        <h1>Loading trending data...</h1>
        <p>Please wait...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div style={{ padding: '50px', textAlign: 'center', color: '#ff6600' }}>
        <h1>Failed to load trending data</h1>
        <p>{error || 'Please try again later'}</p>
      </div>
    )
  }

  return <TrendingUI apps={data.apps} stats={data.stats} />
}
