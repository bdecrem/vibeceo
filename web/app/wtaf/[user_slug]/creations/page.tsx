"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useParams } from 'next/navigation'
import { notFound } from 'next/navigation'
import Link from "next/link"
import TruncatedPrompt from "@/components/truncated-prompt"
import Pagination from "@/components/ui/pagination"
import CopiedModal from "../../../components/ui/copied-modal"

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
  const [copiedNotification, setCopiedNotification] = useState({ show: false, text: "" })
  const limit = 20

  // Separate pinned and recent apps
  const pinnedApps = data?.apps.filter(app => app.Fave) || []
  const recentApps = data?.apps.filter(app => !app.Fave) || []

  const userData = {
    displayName: userSlug ? userSlug.charAt(0).toUpperCase() + userSlug.slice(1) : "",
    bio: "Creative technologist crafting unique digital experiences with WEBTOYS",
    joinDate: "2024",
    avatar: "🎨"
  }

  const showCopiedNotification = (text: string) => {
    setCopiedNotification({ show: true, text })
    setTimeout(() => {
      setCopiedNotification({ show: false, text: "" })
    }, 3000)
  }

  const closeCopiedModal = () => {
    setCopiedNotification({ show: false, text: "" })
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch (err) {
      console.error("Failed to copy text: ", err)
      return false
    }
  }

  const handleRemixClick = async (appSlug: string) => {
    const remixCommand = `REMIX ${appSlug}`
    const success = await copyToClipboard(remixCommand)
    if (success) {
      showCopiedNotification(remixCommand)
    }
  }

  const handlePromptClick = async (e: React.MouseEvent, prompt: string) => {
    const success = await copyToClipboard(prompt)
    if (success) {
      showCopiedNotification(prompt)
    }
    // Add clicked class for animation
    const target = e.target as HTMLElement
    target.classList.add("clicked")
    setTimeout(() => {
      target.classList.remove("clicked")
    }, 600)
  }

  const getTimestampLabel = (createdAt: string) => {
    const now = new Date()
    const created = new Date(createdAt)
    const diffInHours = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60))
    const diffInDays = Math.floor(diffInHours / 24)
    
    if (diffInHours < 24) return "Born today"
    if (diffInDays === 1) return "Created yesterday"
    if (diffInDays <= 6) return `Created ${diffInDays} days ago`
    return `Created ${diffInDays} days ago`
  }

  const getRemixInfo = (app: WtafApp) => {
    if (app.type === 'ZAD') {
      return "Born today"
    }
    const totalRemixes = app.total_descendants || app.remix_count || 0
    if (totalRemixes > 0) {
      return `${totalRemixes} ${totalRemixes === 1 ? 'remix' : 'remixes'}`
    }
    return getTimestampLabel(app.created_at)
  }

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
      document.title = `@${userSlug} creations - WEBTOYS`
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
      <div className="loading-container">
        <div className="loading-content">
          <div className="loading-icon">🎨</div>
          <h3 className="loading-title">Loading @{userSlug}'s creations...</h3>
          <p className="loading-subtitle">Gathering their creative masterpieces</p>
        </div>
      </div>
    )
  }

  if (error) {
    if (error.includes('not found')) {
      return notFound()
    }
    
    return (
      <div className="error-container">
        <div className="error-content">
          <div className="error-icon">😅</div>
          <h3 className="error-title">Oops! Something went wrong</h3>
          <p className="error-subtitle">{error}</p>
          <button 
            onClick={() => fetchCreationsData(currentPage)}
            className="retry-btn"
          >
            Try Again
          </button>
        </div>
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

  const pinnedAppsWithSlug = appsWithUserSlug.filter(app => app.Fave)
  const recentAppsWithSlug = appsWithUserSlug.filter(app => !app.Fave)

  return (
    <>
      {/* Copied Modal */}
      <CopiedModal 
        show={copiedNotification.show}
        text={copiedNotification.text}
        onClose={closeCopiedModal}
      />

      {/* Floating shapes */}
      <div className="floating-shape shape1"></div>
      <div className="floating-shape shape2"></div>
      <div className="floating-shape shape3"></div>
      <div className="floating-shape shape4"></div>
      <div className="floating-shape shape5"></div>

      {/* Navigation */}
      <nav className="nav">
        <div className="nav-container">
          <Link href="/" className="logo">WEBTOYS</Link>
          <div className="nav-links">
            <Link href="/trending" className="back-link">
              ← Back to Trending
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="main-content">
        {/* User Hero Section */}
        <section className="user-hero">
          <div className="hero-container">
            <div className="hero-content">
              <div className="user-avatar">
                <div className="avatar-circle">{userData.avatar}</div>
              </div>
              <h1 className="user-name">@{userSlug}</h1>
              <p className="user-display-name">{userData.displayName}</p>
              <p className="user-bio">{userData.bio}</p>
              <div className="user-stats">
                <div className="stat-item">
                  <div className="stat-number">{data.user_stats.published_apps}</div>
                  <div className="stat-label">Creations</div>
                </div>
                <div className="stat-item">
                  <div className="stat-number">{data.user_stats.total_remixes_received}</div>
                  <div className="stat-label">Total Remixes</div>
                </div>
                <div className="stat-item">
                  <div className="stat-number">{data.user_stats.follower_count}</div>
                  <div className="stat-label">Followers</div>
                </div>
                <div className="stat-item">
                  <div className="stat-number">{userData.joinDate}</div>
                  <div className="stat-label">Member Since</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pinned Creations */}
        {pinnedAppsWithSlug.length > 0 && (
          <section className="pinned-section">
            <div className="section-container">
              <h2 className="section-title">
                📌 Pinned Creations
              </h2>
              <div className="creations-grid">
                {pinnedAppsWithSlug.map((app: WtafApp, index: number) => (
                  <div key={app.id} className="creation-card pinned-card" style={{ animationDelay: `${index * 0.1}s` }}>
                    <div className="pin-badge">📌</div>
                    <div className="image-container">
                      <img 
                        src={`https://tqniseocczttrfwtpbdr.supabase.co/storage/v1/object/public/og-images/${app.user_slug}-${app.app_slug}.png`} 
                        alt={app.app_slug} 
                        className="creation-image" 
                      />
                      <div className="image-overlay">
                        <Link href={`/${app.user_slug}/${app.app_slug}?demo=true`} className="try-app-btn">
                          🚀 Try This App
                        </Link>
                      </div>
                    </div>
                    <div className="card-content">
                      <div className="creation-stats">
                        <div className="remix-info">
                          {(app.total_descendants || app.remix_count || 0) > 0 ? (
                            <Link href={`/wtaf/${app.user_slug}/${app.app_slug}/remix-tree`} className="remix-count-link">
                              <span className="remix-number">{app.total_descendants || app.remix_count || 0}</span>
                              <span className="remix-label">{(app.total_descendants || app.remix_count || 0) === 1 ? 'remix' : 'remixes'}</span>
                            </Link>
                          ) : (
                            <span className="timestamp-label">{getRemixInfo(app)}</span>
                          )}
                        </div>
                      </div>
                      <div className="prompt-label">The Text Message:</div>
                      <TruncatedPrompt
                        prompt={app.original_prompt}
                        maxLength={120}
                        className="prompt-showcase"
                        copyOnClick={true}
                      />
                      {app.type !== 'ZAD' && (
                        <button className="remix-btn" onClick={() => handleRemixClick(app.app_slug)}>
                          <span className="remix-icon">🎨</span>
                          <span>Remix This</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Recent Creations */}
        <section className="recent-section">
          <div className="section-container">
            <h2 className="section-title">Recent Creations</h2>
            <div className="creations-grid">
              {recentAppsWithSlug.map((app: WtafApp, index: number) => (
                <div key={app.id} className="creation-card" style={{ animationDelay: `${(index + pinnedAppsWithSlug.length) * 0.1}s` }}>
                  <div className="image-container">
                    <img 
                      src={`https://tqniseocczttrfwtpbdr.supabase.co/storage/v1/object/public/og-images/${app.user_slug}-${app.app_slug}.png`} 
                      alt={app.app_slug} 
                      className="creation-image" 
                    />
                    <div className="image-overlay">
                      <Link href={`/${app.user_slug}/${app.app_slug}?demo=true`} className="try-app-btn">
                        🚀 Try This App
                      </Link>
                    </div>
                  </div>
                  <div className="card-content">
                    <div className="creation-stats">
                      <div className="remix-info">
                        {(app.total_descendants || app.remix_count || 0) > 0 ? (
                          <Link href={`/wtaf/${app.user_slug}/${app.app_slug}/remix-tree`} className="remix-count-link">
                            <span className="remix-number">{app.total_descendants || app.remix_count || 0}</span>
                            <span className="remix-label">{(app.total_descendants || app.remix_count || 0) === 1 ? 'remix' : 'remixes'}</span>
                          </Link>
                        ) : (
                          <span className="timestamp-label">{getRemixInfo(app)}</span>
                        )}
                      </div>
                    </div>
                    <div className="prompt-label">The Text Message:</div>
                    <TruncatedPrompt
                      prompt={app.original_prompt}
                      maxLength={120}
                      className="prompt-showcase"
                      copyOnClick={true}
                    />
                    {app.type !== 'ZAD' && (
                      <button className="remix-btn" onClick={() => handleRemixClick(app.app_slug)}>
                        <span className="remix-icon">🎨</span>
                        <span>Remix This</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pagination */}
        {data.pagination && data.pagination.totalPages > 1 && (
          <section className="pagination-section">
            <div className="pagination-container">
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
            </div>
          </section>
        )}

        {/* Call to Action */}
        <section className="cta-section">
          <div className="cta-container">
            <h2 className="cta-title">Want to Create Like @{userSlug}?</h2>
            <p className="cta-description">
              Join the WEBTOYS community and bring your wildest ideas to life with just a text message.
            </p>
            <a href="sms:+18663300015" className="cta-button">
              <span>📱</span>
              <span>Text (866) 330-0015 Now</span>
            </a>
          </div>
        </section>
      </main>

      <style jsx global>{`
        /* WEBTOYS GRAND Design System */
        :root {
          /* Core WEBTOYS DNA Colors */
          --cream: #FEFEF5;
          --yellow: #FFD63D;
          --yellow-soft: #FFF4CC;
          --blue: #6ECBFF;
          --blue-deep: #4A9FD4;
          --red: #FF4B4B;
          --red-soft: #FF7A7A;
          --purple-shadow: #C9C2F940;
          --purple-accent: #8B7FD4;
          --green-mint: #B6FFB3;
          --green-sage: #7FB069;
          --pink: #FF69B4;
          --pink-soft: #FFB6C1;
          
          /* Professional Additions */
          --charcoal: #2A2A2A;
          --gray-warm: #6B6B6B;
          --white-pure: #FFFFFF;
          --black-soft: #1A1A1A;
        }
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: var(--cream);
          color: var(--charcoal);
          line-height: 1.6;
          overflow-x: hidden;
        }

        /* Loading and Error States */
        .loading-container, .error-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--cream);
        }

        .loading-content, .error-content {
          text-align: center;
          background: var(--white-pure);
          padding: 3rem;
          border-radius: 2rem;
          box-shadow: 0 12px 0 var(--pink), 0 24px 60px var(--purple-shadow);
          border: 5px solid var(--pink);
          max-width: 500px;
        }

        .loading-icon, .error-icon {
          font-size: 4rem;
          margin-bottom: 1.5rem;
          animation: bounce 2s ease-in-out infinite;
        }

        .loading-title, .error-title {
          font-size: 1.8rem;
          color: var(--charcoal);
          margin-bottom: 1rem;
          font-weight: 800;
        }

        .loading-subtitle, .error-subtitle {
          color: var(--gray-warm);
          font-size: 1.1rem;
          margin-bottom: 1.5rem;
        }

        .retry-btn {
          background: var(--pink);
          color: white;
          padding: 0.8rem 2rem;
          border: none;
          border-radius: 2rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 0 var(--pink-soft);
        }

        .retry-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 0 var(--pink-soft);
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }


        /* Floating shapes */
        .floating-shape {
          position: fixed;
          opacity: 0.12;
          animation: float-shape 35s infinite ease-in-out;
          pointer-events: none;
          z-index: 1;
        }
        
        .shape1 {
          width: 220px;
          height: 220px;
          background: var(--pink);
          border-radius: 50%;
          top: 12%;
          left: 6%;
          animation-delay: 0s;
        }
        
        .shape2 {
          width: 180px;
          height: 180px;
          background: var(--blue);
          border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%;
          top: 65%;
          right: 10%;
          animation-delay: 12s;
        }
        
        .shape3 {
          width: 120px;
          height: 120px;
          background: var(--yellow);
          clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
          bottom: 25%;
          left: 20%;
          animation-delay: 24s;
        }

        .shape4 {
          width: 160px;
          height: 160px;
          background: var(--purple-accent);
          border-radius: 20% 80% 20% 80% / 80% 20% 80% 20%;
          top: 40%;
          right: 25%;
          animation-delay: 18s;
        }

        .shape5 {
          width: 100px;
          height: 100px;
          background: var(--green-mint);
          border-radius: 50% 0 50% 0;
          top: 75%;
          right: 45%;
          animation-delay: 6s;
        }
        
        @keyframes float-shape {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(30px, -30px) rotate(90deg); }
          50% { transform: translate(-25px, 25px) rotate(180deg); }
          75% { transform: translate(35px, 12px) rotate(270deg); }
        }

        /* Navigation */
        .nav {
          position: fixed;
          top: 0;
          width: 100%;
          background: var(--white-pure);
          border-bottom: 5px solid var(--pink);
          box-shadow: 0 4px 20px var(--purple-shadow);
          z-index: 1000;
          transition: all 0.3s ease;
        }
        
        .nav-container {
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 2rem;
        }
        
        .logo {
          font-size: 1.8rem;
          font-weight: 800;
          background: linear-gradient(135deg, var(--pink) 0%, var(--purple-accent) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .logo::before {
          content: "👩‍🎨";
          font-size: 2rem;
          animation: wiggle 3s ease-in-out infinite;
        }
        
        @keyframes wiggle {
          0%, 100% { transform: rotate(-5deg); }
          50% { transform: rotate(5deg); }
        }

        .back-link {
          color: var(--blue-deep);
          text-decoration: none;
          font-weight: 600;
          padding: 0.5rem 1.5rem;
          border-radius: 2rem;
          transition: all 0.3s ease;
        }

        .back-link:hover {
          background: var(--blue);
          color: white;
          transform: translateY(-2px);
        }

        /* Main Content */
        .main-content {
          margin-top: 90px;
        }

        /* User Hero Section */
        .user-hero {
          padding: 4rem 2rem;
          background: linear-gradient(135deg, var(--pink-soft) 0%, var(--cream) 60%, rgba(255,105,180,0.1) 100%);
        }

        .hero-container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .hero-content {
          text-align: center;
          background: var(--white-pure);
          border: 6px solid var(--pink);
          border-radius: 3rem;
          padding: 3rem 2rem;
          box-shadow: 0 15px 0 var(--purple-accent), 0 30px 80px var(--purple-shadow);
          position: relative;
          z-index: 2;
        }

        .user-avatar {
          margin-bottom: 1.5rem;
        }

        .avatar-circle {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--pink) 0%, var(--purple-accent) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 3.5rem;
          margin: 0 auto;
          box-shadow: 0 8px 0 var(--pink-soft);
          border: 4px solid var(--white-pure);
        }

        .user-name {
          font-size: clamp(2.2rem, 5vw, 3.5rem);
          font-weight: 900;
          color: var(--pink);
          margin-bottom: 0.5rem;
          text-transform: lowercase;
          letter-spacing: -1px;
        }

        .user-display-name {
          font-size: 1.5rem;
          color: var(--charcoal);
          font-weight: 700;
          margin-bottom: 1rem;
        }

        .user-bio {
          font-size: 1.2rem;
          color: var(--gray-warm);
          margin-bottom: 2.5rem;
          font-weight: 500;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
          line-height: 1.5;
        }

        .user-stats {
          display: flex;
          justify-content: center;
          gap: 2.5rem;
          flex-wrap: wrap;
        }

        .stat-item {
          text-align: center;
        }

        .stat-number {
          font-size: 2.2rem;
          font-weight: 900;
          color: var(--purple-accent);
          display: block;
          text-shadow: 2px 2px 0 var(--purple-shadow);
        }

        .stat-label {
          font-size: 0.9rem;
          color: var(--gray-warm);
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: 600;
        }

        /* Sections */
        .pinned-section, .recent-section {
          padding: 4rem 2rem;
        }

        .pinned-section {
          background: var(--white-pure);
        }

        .recent-section {
          background: linear-gradient(135deg, var(--cream) 0%, rgba(182,255,179,0.1) 100%);
        }

        .section-container {
          max-width: 1400px;
          margin: 0 auto;
        }

        .section-title {
          font-size: 2.5rem;
          font-weight: 900;
          color: var(--charcoal);
          margin-bottom: 3rem;
          text-align: center;
          text-transform: uppercase;
          letter-spacing: -1px;
        }

        .creations-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 3rem;
        }

        .creation-card {
          background: var(--cream);
          border: 5px solid var(--yellow);
          border-radius: 2rem;
          overflow: hidden;
          box-shadow: 0 12px 0 var(--blue);
          transition: all 0.3s ease;
          position: relative;
          animation: cardSlideIn 0.6s ease-out both;
        }

        .pinned-card {
          border-color: var(--pink);
          box-shadow: 0 12px 0 var(--purple-accent);
        }

        .pin-badge {
          position: absolute;
          top: 15px;
          right: 15px;
          background: var(--pink);
          color: white;
          padding: 0.5rem;
          border-radius: 50%;
          font-size: 1.2rem;
          z-index: 3;
          box-shadow: 0 4px 0 var(--pink-soft);
          animation: pin-glow 2s ease-in-out infinite;
        }

        @keyframes pin-glow {
          0%, 100% { transform: scale(1) rotate(-10deg); }
          50% { transform: scale(1.1) rotate(-15deg); }
        }

        @keyframes cardSlideIn {
          0% {
            opacity: 0;
            transform: translateY(30px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .creation-card:hover {
          transform: translateY(-10px);
          box-shadow: 0 22px 0 var(--blue);
        }

        .pinned-card:hover {
          box-shadow: 0 22px 0 var(--purple-accent);
        }

        .image-container {
          position: relative;
          overflow: hidden;
          background: var(--white-pure);
        }

        .creation-image {
          width: 100%;
          height: auto;
          aspect-ratio: 3 / 2;
          object-fit: cover;
          transition: all 0.3s ease;
          display: block;
        }

        .image-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: all 0.3s ease;
        }

        .image-container:hover .image-overlay {
          opacity: 1;
        }

        .image-container:hover .creation-image {
          transform: scale(1.05);
        }

        .try-app-btn {
          background: var(--blue);
          color: white;
          padding: 1rem 2rem;
          border-radius: 2rem;
          font-weight: 700;
          font-size: 1rem;
          text-decoration: none;
          transition: all 0.3s ease;
          text-transform: uppercase;
          letter-spacing: 1px;
          box-shadow: 0 4px 0 var(--blue-deep);
        }

        .try-app-btn:hover {
          background: var(--blue-deep);
          transform: translateY(-2px);
          box-shadow: 0 6px 0 var(--blue);
        }

        .card-content {
          padding: 2rem;
        }

        .creation-stats {
          display: flex;
          justify-content: center;
          margin-bottom: 1.5rem;
        }

        .remix-info {
          display: flex;
          align-items: center;
        }

        .remix-count-link {
          display: flex;
          align-items: baseline;
          gap: 0.5rem;
          text-decoration: none;
          color: inherit;
          cursor: pointer;
          transition: all 0.3s ease;
          border-radius: 1rem;
          padding: 0.5rem 1rem;
          background: var(--purple-accent);
          color: white;
        }

        .remix-count-link:hover {
          background: var(--purple-shadow);
          transform: translateY(-2px);
        }

        .remix-number {
          font-weight: 700;
          font-size: 1.1rem;
        }

        .remix-label {
          font-size: 0.9rem;
          font-weight: 500;
        }

        .timestamp-label {
          background: var(--yellow);
          color: var(--charcoal);
          padding: 0.5rem 1rem;
          border-radius: 1rem;
          font-size: 0.9rem;
          font-weight: 600;
        }

        .prompt-label {
          font-size: 0.9rem;
          color: var(--gray-warm);
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 0.8rem;
          font-weight: 600;
          text-align: center;
        }

        .prompt-showcase {
          background: var(--white-pure);
          border: 3px solid var(--green-mint);
          border-radius: 1.5rem;
          padding: 1.2rem;
          margin-bottom: 1.5rem;
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--charcoal);
          cursor: pointer;
          transition: all 0.3s ease;
          line-height: 1.4;
          text-align: left;
        }

        .prompt-showcase:hover {
          background: var(--green-mint);
          transform: translateY(-2px);
        }

        .prompt-showcase.clicked {
          animation: copyPulse 0.6s ease-out;
        }

        @keyframes copyPulse {
          0% {
            transform: scale(1);
            background: var(--white-pure);
          }
          50% {
            transform: scale(1.02);
            background: var(--green-mint);
          }
          100% {
            transform: scale(1);
            background: var(--white-pure);
          }
        }

        .remix-btn {
          background: var(--white-pure);
          border: 3px solid var(--pink);
          color: var(--pink);
          padding: 0.8rem 1.5rem;
          border-radius: 2rem;
          font-weight: 700;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin: 0 auto;
        }

        .remix-btn:hover {
          background: var(--pink);
          color: white;
          transform: translateY(-2px);
        }

        .remix-icon {
          font-size: 1.2rem;
        }

        /* Pagination Section */
        .pagination-section {
          padding: 3rem 2rem;
          background: var(--cream);
        }

        .pagination-container {
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          justify-content: center;
        }

        /* Call to Action */
        .cta-section {
          padding: 5rem 2rem;
          background: var(--blue-deep);
          color: white;
          text-align: center;
        }

        .cta-container {
          max-width: 800px;
          margin: 0 auto;
        }

        .cta-title {
          font-size: 3rem;
          font-weight: 900;
          margin-bottom: 1.5rem;
          text-transform: uppercase;
        }

        .cta-description {
          font-size: 1.3rem;
          margin-bottom: 2.5rem;
          opacity: 0.9;
        }

        .cta-button {
          display: inline-flex;
          align-items: center;
          gap: 1rem;
          background: var(--yellow);
          color: var(--charcoal);
          padding: 1.5rem 3rem;
          border-radius: 3rem;
          font-size: 1.3rem;
          font-weight: 800;
          text-decoration: none;
          transition: all 0.3s ease;
          box-shadow: 0 8px 0 var(--yellow-soft);
        }

        .cta-button:hover {
          transform: translateY(-3px);
          box-shadow: 0 11px 0 var(--yellow-soft);
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .nav-container {
            padding: 1rem;
          }

          .hero-content {
            padding: 2rem 1.5rem;
          }

          .user-stats {
            gap: 2rem;
          }

          .stat-number {
            font-size: 1.8rem;
          }

          .creations-grid {
            grid-template-columns: 1fr;
            gap: 2rem;
          }

          .creation-stats {
            justify-content: center;
            text-align: center;
          }

          .cta-title {
            font-size: 2.2rem;
          }
        }

        @media (max-width: 480px) {
          .user-name {
            font-size: 2.5rem;
          }

          .creation-card {
            border-width: 3px;
          }

          .card-content {
            padding: 1.5rem;
          }

          .cta-button {
            padding: 1.2rem 2rem;
            font-size: 1.1rem;
          }

          .avatar-circle {
            width: 100px;
            height: 100px;
            font-size: 3rem;
          }

          .user-stats {
            flex-direction: column;
            gap: 1.5rem;
          }
        }
      `}</style>
    </>
  )
}