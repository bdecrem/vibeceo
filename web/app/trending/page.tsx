"use client"

import React, { useState, useEffect, useCallback } from "react"
import TrendingUI from "@/components/wtaf/trending-ui"
import Pagination from "@/components/ui/pagination"

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

interface TrendingStats {
  totalTrendingApps: number
  totalRemixesThisWeek: number
  appsWithRecentActivity: number
  period: string
}

interface PaginationData {
  page: number
  limit: number
  totalCount: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

interface TrendingData {
  apps: WtafApp[]
  stats: TrendingStats
  pagination: PaginationData
}

export default function TrendingPage() {
  const [data, setData] = useState<TrendingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const limit = 20

  const fetchTrendingData = useCallback(async (page: number) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/trending-wtaf?page=${page}&limit=${limit}`, {
        cache: 'no-store'
      })
      
      if (!response.ok) {
        throw new Error(`Failed to fetch trending data: ${response.status}`)
      }
      
      const result = await response.json()
      setData(result)
      setError(null)
    } catch (err) {
      console.error('Error fetching trending data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load trending data')
    } finally {
      setLoading(false)
    }
  }, [limit])

  useEffect(() => {
    // Set page title
    document.title = "Trending"
    fetchTrendingData(currentPage)
  }, [currentPage, fetchTrendingData])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    // Scroll to top when changing pages
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

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
        <button 
          onClick={() => fetchTrendingData(currentPage)}
          style={{
            marginTop: '20px',
            padding: '10px 20px',
            background: '#ff6600',
            border: 'none',
            borderRadius: '5px',
            color: 'white',
            cursor: 'pointer'
          }}
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <>
      <TrendingUI apps={data.apps} stats={data.stats} />
      {data.pagination && (
        <Pagination
          currentPage={data.pagination.page}
          totalPages={data.pagination.totalPages}
          onPageChange={handlePageChange}
          hasNextPage={data.pagination.hasNextPage}
          hasPreviousPage={data.pagination.hasPreviousPage}
          totalCount={data.pagination.totalCount}
          limit={data.pagination.limit}
        />
      )}
    </>
  )
}
