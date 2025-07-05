"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useParams } from 'next/navigation'
import { notFound } from 'next/navigation'
import CreationsUI from "@/components/wtaf/creations-ui"
import Pagination from "@/components/ui/pagination"

// Force dynamic rendering
export const dynamic = 'force-dynamic'

interface WtafApp {
  id: string
  app_slug: string
  user_slug?: string
  original_prompt: string
  created_at: string
  remix_count: number
  total_descendants?: number
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

interface PaginationData {
  page: number
  limit: number
  totalCount: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

interface CreationsData {
  success: boolean
  apps: WtafApp[]
  user_stats: UserStats
  pagination: PaginationData
}

export default function CreationsPage() {
  const params = useParams()
  const userSlug = params?.user_slug as string
  
  const [data, setData] = useState<CreationsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const limit = 20

  const fetchCreationsData = useCallback(async (page: number) => {
    if (!userSlug) return
    
    try {
      setLoading(true)
      const response = await fetch(`/api/user-creations?user_slug=${userSlug}&page=${page}&limit=${limit}`, {
        cache: 'no-store'
      })
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('User not found')
        }
        throw new Error(`Failed to fetch user creations: ${response.status}`)
      }
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error('Failed to fetch user creations')
      }
      
      setData(result)
      setError(null)
    } catch (err) {
      console.error('Error fetching user creations:', err)
      setError(err instanceof Error ? err.message : 'Failed to load user creations')
    } finally {
      setLoading(false)
    }
  }, [userSlug, limit])

  useEffect(() => {
    if (userSlug) {
      // Set page title
      document.title = `@${userSlug} creations`
      fetchCreationsData(currentPage)
    }
  }, [userSlug, currentPage, fetchCreationsData])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    // Scroll to top when changing pages
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (!userSlug) {
    return notFound()
  }

  if (loading) {
    return (
      <div style={{ padding: '50px', textAlign: 'center', color: '#ff6600' }}>
        <h1>Loading {userSlug}&apos;s creations...</h1>
        <p>Please wait...</p>
      </div>
    )
  }

  if (error) {
    if (error.includes('not found')) {
      return notFound()
    }
    
    return (
      <div style={{ padding: '50px', textAlign: 'center', color: '#ff6600' }}>
        <h1>Failed to load creations</h1>
        <p>{error}</p>
        <button 
          onClick={() => fetchCreationsData(currentPage)}
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

  if (!data) {
    return notFound()
  }

  // Ensure all apps have user_slug
  const appsWithUserSlug = data.apps.map(app => ({
    ...app,
    user_slug: userSlug
  }))

  return (
    <>
      <CreationsUI 
        apps={appsWithUserSlug} 
        userStats={data.user_stats} 
        userSlug={userSlug} 
      />
      {data.pagination && data.pagination.totalPages > 1 && (
        <Pagination
          currentPage={data.pagination.page}
          totalPages={data.pagination.totalPages}
          onPageChange={handlePageChange}
          hasNextPage={data.pagination.hasNextPage}
          hasPreviousPage={data.pagination.hasPreviousPage}
          totalCount={data.pagination.totalCount}
          limit={data.pagination.limit}
          theme="green"
        />
      )}
    </>
  )
} 